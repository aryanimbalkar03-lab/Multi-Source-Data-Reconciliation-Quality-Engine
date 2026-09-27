"""Pipeline orchestrator / CLI entry point.

Usage:
    recon --date 2025-09-26          # reconcile one specific trading day
    recon --latest                   # most recent available trading day
    recon --backfill 5               # last 5 available trading days (builds trend)

Each run: fetch -> quality-check -> load -> reconcile -> score -> alert -> export.
"""
from __future__ import annotations

import argparse
import os
import uuid
from datetime import date, datetime, timedelta, timezone

import pandas as pd

from . import db, quality, reconcile
from .alerts import maybe_alert
from .config import load_config
from .dashboard_export import export
from .sources import fetch_bse_bhavcopy, fetch_nse_bhavcopy, fetch_yahoo_closes
from .sources._http import FeedUnavailable
from .sources.corporate_actions import fetch_corporate_actions

# Cap on how many securities we adjudicate against Yahoo per run (keeps the
# per-ticker requests bounded; the flagged set is prioritized).
YAHOO_LIMIT = int(os.getenv("RECON_YAHOO_LIMIT", "150"))


def _ingest_day(engine, cfg, run_id: str, day: date) -> tuple[int, pd.DataFrame]:
    """Fetch + quality-check + load both venues for one day. Returns (rows, issues)."""
    frames, issues = [], []
    for name, fetch in (("NSE", lambda: fetch_nse_bhavcopy(day)),
                        ("BSE", lambda: fetch_bse_bhavcopy(day))):
        df = fetch()
        frames.append(df)
        issues.append(quality.check_frame(df, run_id))
        print(f"  [{day}] {name}: {len(df)} rows")

    all_prices = pd.concat(frames, ignore_index=True)
    all_issues = pd.concat(issues, ignore_index=True)
    db.upsert_prices(engine, all_prices)
    db.write_frame(engine, "quality_issues", all_issues)
    return len(all_prices), all_issues


def _run_one(engine, cfg, day: date) -> dict | None:
    run_id = uuid.uuid4().hex[:12]
    print(f"[run {run_id}] reconciling {day}")

    try:
        _ingest_day(engine, cfg, run_id, day)
    except FeedUnavailable as exc:
        print(f"  skipped {day}: {exc}")
        return None

    # Corporate actions are global enrichment; refresh once per run.
    db.replace_corporate_actions(engine, fetch_corporate_actions(day))

    th = cfg.thresholds
    iso = day.isoformat()
    results = pd.concat([
        reconcile.reconcile_cross_venue(engine, run_id, th, iso),
        reconcile.reconcile_temporal(engine, run_id, th, iso, source="NSE"),
    ], ignore_index=True)
    db.write_frame(engine, "recon_results", results)

    # ---- Third source: adjudicate the flagged breaks against Yahoo Finance ----
    cv_flagged = results[(results["check_type"] == "cross_venue") & (results["status"] != "MATCH")]
    universe = list(cv_flagged.sort_values("mismatch_score", ascending=False)["ticker"])[:YAHOO_LIMIT]
    if universe:
        yahoo = fetch_yahoo_closes(universe, day, suffix="NS")
        db.upsert_prices(engine, yahoo)
        print(f"  [{day}] YAHOO: {len(yahoo)} rows (adjudicating {len(universe)} breaks)")
        tri = reconcile.reconcile_tri_source(engine, run_id, th, iso)
        db.write_frame(engine, "tri_source_results", tri)
        adjudicated = int((tri["status"] != "MATCH").sum()) if not tri.empty else 0
        print(f"  tri-source: {len(tri)} adjudicated, {adjudicated} confirmed breaks")

    # Cross-venue records are the primary match-rate denominator.
    cv = results[results["check_type"] == "cross_venue"]
    compared = len(cv)
    matched = int((cv["status"] == "MATCH").sum())
    minor = int((cv["status"] == "MINOR").sum())
    major = int((cv["status"] == "MAJOR").sum())
    match_rate = matched / compared if compared else 1.0

    flagged = results[results["status"] != "MATCH"]
    top_field = (
        flagged["field"].value_counts().idxmax() if not flagged.empty else None
    )
    q_issues = int(pd.read_sql(
        "SELECT COUNT(*) c FROM quality_issues WHERE run_id=:r",
        engine, params={"r": run_id}).iloc[0]["c"])

    run = {
        "run_id": run_id,
        "run_ts": datetime.now(timezone.utc).isoformat(),
        "trade_date": day.isoformat(),
        "records_compared": compared,
        "matched": matched,
        "minor": minor,
        "major": major,
        "match_rate": round(match_rate, 6),
        "quality_issues": q_issues,
        "top_failing_field": top_field,
    }
    db.record_run(engine, run)
    print(f"  compared={compared} match_rate={match_rate:.2%} "
          f"major={major} minor={minor} quality_issues={q_issues}")

    maybe_alert(cfg, {**run, "threshold": th.min_match_rate})
    return run


def _resolve_days(args) -> list[date]:
    if args.date:
        return [datetime.strptime(args.date, "%Y-%m-%d").date()]
    # --latest / --backfill: walk back from today, cap the search window.
    want = 1 if args.latest or not args.backfill else args.backfill
    days, cursor, guard = [], date.today(), 0
    while len(days) < want and guard < want + 20:
        if cursor.weekday() < 5:  # skip weekends up front
            days.append(cursor)
        cursor -= timedelta(days=1)
        guard += 1
    return list(reversed(days))


def main() -> int:
    parser = argparse.ArgumentParser(description="Multi-source reconciliation engine")
    g = parser.add_mutually_exclusive_group()
    g.add_argument("--date", help="specific trading day, YYYY-MM-DD")
    g.add_argument("--latest", action="store_true", help="most recent trading day")
    g.add_argument("--backfill", type=int, help="reconcile the last N trading days")
    args = parser.parse_args()

    cfg = load_config()
    engine = db.make_engine(cfg.database_url)
    db.init_schema(engine)

    last_run_id = None
    for day in _resolve_days(args):
        run = _run_one(engine, cfg, day)
        if run:
            last_run_id = run["run_id"]

    if last_run_id:
        out = export(engine, cfg, last_run_id)
        print(f"[export] dashboard data -> {out}")
    else:
        print("[warn] no trading days reconciled (feeds unavailable?)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
