"""Export reconciliation results to JSON for the React dashboard.

Writes a single `summary.json` the front-end fetches. Beyond the headline
numbers it ships coverage stats, score distribution, quality breakdowns and the
biggest breaks (enriched with company name + ISIN) so the UI reads like a real
data-quality report rather than a toy.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from .config import EXPORT_DIR, Config
from .db import read_run_history


def _scalar(engine: Engine, sql: str, **params):
    with engine.connect() as c:
        return c.execute(text(sql), params).scalar()


def _coverage(engine: Engine, trade_date: str) -> dict:
    """How the two universes overlap on the latest session."""
    nse = _scalar(engine, "SELECT COUNT(*) FROM prices WHERE source='NSE' AND trade_date=:d", d=trade_date) or 0
    bse = _scalar(engine, "SELECT COUNT(*) FROM prices WHERE source='BSE' AND trade_date=:d", d=trade_date) or 0
    overlap = _scalar(engine, """
        SELECT COUNT(*) FROM prices n JOIN prices b
          ON n.ticker=b.ticker AND n.trade_date=b.trade_date
        WHERE n.source='NSE' AND b.source='BSE' AND n.trade_date=:d
    """, d=trade_date) or 0
    return {
        "nse_symbols": int(nse),
        "bse_symbols": int(bse),
        "dual_listed": int(overlap),
        "nse_only": int(nse - overlap),
        "bse_only": int(bse - overlap),
    }


def export(engine: Engine, cfg: Config, latest_run_id: str) -> Path:
    history = read_run_history(engine, limit=60).sort_values("run_ts")
    latest = history.iloc[-1] if not history.empty else None
    trade_date = latest.trade_date if latest is not None else None

    trend = [
        {
            "trade_date": r.trade_date,
            "match_rate": round(float(r.match_rate), 4),
            "records_compared": int(r.records_compared),
            "matched": int(r.matched),
            "minor": int(r.minor),
            "major": int(r.major),
            "quality_issues": int(r.quality_issues),
        }
        for r in history.itertuples()
    ]

    results = pd.read_sql(
        text("SELECT * FROM recon_results WHERE run_id = :rid"),
        engine, params={"rid": latest_run_id},
    )
    flagged = results[results["status"] != "MATCH"]

    # Top failing fields across both check types.
    top_fields = (
        flagged.groupby(["check_type", "field"]).size()
        .reset_index(name="count").sort_values("count", ascending=False)
        .head(10).to_dict(orient="records")
    )

    # Per-check split (cross_venue vs temporal).
    check_split = [
        {
            "check_type": ct,
            "match": int((grp["status"] == "MATCH").sum()),
            "minor": int((grp["status"] == "MINOR").sum()),
            "major": int((grp["status"] == "MAJOR").sum()),
        }
        for ct, grp in results.groupby("check_type")
    ]

    # Mismatch-score distribution buckets.
    cv = results[results["check_type"] == "cross_venue"].copy()
    buckets = [("0–20", 0, 20), ("20–40", 20, 40), ("40–60", 40, 60),
              ("60–80", 60, 80), ("80–100", 80, 100.01)]
    score_buckets = [
        {"bucket": name, "count": int(((cv["mismatch_score"] >= lo) & (cv["mismatch_score"] < hi)).sum())}
        for name, lo, hi in buckets
    ]

    # Data-quality issues grouped by rule.
    quality_by_rule = pd.read_sql(
        text("SELECT rule, COUNT(*) AS count FROM quality_issues WHERE run_id=:r GROUP BY rule ORDER BY count DESC"),
        engine, params={"r": latest_run_id},
    ).to_dict(orient="records")

    # Biggest cross-venue breaks, enriched with company name + ISIN from BSE.
    biggest = pd.read_sql(text("""
        SELECT r.ticker, r.value_a AS nse, r.value_b AS bse, r.diff_abs, r.diff_pct,
               r.mismatch_score, r.status, b.name AS name, b.isin AS isin
        FROM recon_results r
        LEFT JOIN prices b ON b.ticker=r.ticker AND b.trade_date=r.trade_date AND b.source='BSE'
        WHERE r.run_id=:rid AND r.check_type='cross_venue' AND r.status='MAJOR'
        ORDER BY r.mismatch_score DESC, r.diff_pct DESC
        LIMIT 25
    """), engine, params={"rid": latest_run_id}).where(lambda d: d.notnull(), None).to_dict(orient="records")

    # ---- Third source: Yahoo adjudication of the flagged breaks ----
    tri = pd.read_sql(
        text("SELECT * FROM tri_source_results WHERE run_id=:rid ORDER BY spread_pct DESC"),
        engine, params={"rid": latest_run_id},
    )
    tri_flagged = tri[tri["status"] != "MATCH"] if not tri.empty else tri
    outlier_breakdown = (
        tri_flagged["outlier_source"].value_counts().reset_index()
        .rename(columns={"index": "source", "outlier_source": "source", "count": "count"})
        .to_dict(orient="records")
        if not tri_flagged.empty else []
    )
    # Normalize column naming across pandas versions.
    outlier_breakdown = [
        {"source": r.get("source") or r.get("outlier_source"), "count": int(r.get("count", 0))}
        for r in outlier_breakdown
    ]
    tri_table = (
        tri_flagged.head(30).where(pd.notnull(tri_flagged), None).to_dict(orient="records")
        if not tri_flagged.empty else []
    )
    tri_summary = {
        "adjudicated": int(len(tri)),
        "confirmed_breaks": int(len(tri_flagged)),
        "yahoo_rows": int(_scalar(engine, "SELECT COUNT(*) FROM prices WHERE source='YAHOO' AND trade_date=:d", d=trade_date) or 0) if trade_date else 0,
    }

    # Drill-down queue: worst offenders first.
    queue = (
        flagged.sort_values("mismatch_score", ascending=False)
        .head(300).where(pd.notnull(flagged), None).to_dict(orient="records")
    )

    # Cross-run rollups for a summary strip.
    totals = {
        "runs": len(history),
        "total_compared": int(history["records_compared"].sum()) if not history.empty else 0,
        "total_major": int(history["major"].sum()) if not history.empty else 0,
        "avg_match_rate": round(float(history["match_rate"].mean()), 4) if not history.empty else None,
    }

    avg_break = round(float(flagged["diff_pct"].mean()), 2) if not flagged.empty else 0.0
    worst_break = round(float(flagged["diff_pct"].max()), 2) if not flagged.empty else 0.0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "threshold": cfg.thresholds.min_match_rate,
        "latest": None if latest is None else {
            "trade_date": latest.trade_date,
            "match_rate": round(float(latest.match_rate), 4),
            "records_compared": int(latest.records_compared),
            "matched": int(latest.matched),
            "minor": int(latest.minor),
            "major": int(latest.major),
            "quality_issues": int(latest.quality_issues),
            "top_failing_field": latest.top_failing_field,
            "avg_break_pct": avg_break,
            "worst_break_pct": worst_break,
            **(_coverage(engine, trade_date) if trade_date else {}),
        },
        "totals": totals,
        "trend": trend,
        "check_split": check_split,
        "score_buckets": score_buckets,
        "quality_by_rule": quality_by_rule,
        "top_failing_fields": top_fields,
        "biggest_breaks": biggest,
        "tri_source": {
            "summary": tri_summary,
            "outlier_breakdown": outlier_breakdown,
            "rows": tri_table,
        },
        "queue": queue,
    }

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = EXPORT_DIR / "summary.json"
    out.write_text(json.dumps(payload, indent=2, default=str))
    return out
