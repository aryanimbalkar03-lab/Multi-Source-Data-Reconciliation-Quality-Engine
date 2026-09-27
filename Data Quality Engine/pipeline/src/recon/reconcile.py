"""The reconciliation engine.

Two independent checks, both expressed as SQL joins on (ticker, date):

  cross_venue : NSE close  vs  BSE close        for the same ticker+date
  temporal    : close(T)   vs  prev_close(T+1)  for the same ticker (self-join)

Every compared record gets a 0-100 mismatch score and a MATCH/MINOR/MAJOR
status. Temporal gaps are cross-referenced against corporate actions so that a
dividend/split is reported as EXPLAINED rather than a data error.
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from .config import Thresholds

# NSE close vs BSE close for the same instrument on the same day.
_CROSS_VENUE_SQL = """
SELECT n.trade_date            AS trade_date,
       n.ticker                AS ticker,
       n.close                 AS nse_close,
       b.close                 AS bse_close
FROM   prices n
JOIN   prices b
       ON  n.ticker = b.ticker
       AND n.trade_date = b.trade_date
WHERE  n.source = 'NSE' AND b.source = 'BSE'
       AND n.trade_date = :trade_date
       AND n.close IS NOT NULL AND b.close IS NOT NULL
       AND n.close > 0 AND b.close > 0
"""

# Today's close should equal tomorrow's prev_close (self-join on the same feed).
_TEMPORAL_SQL = """
SELECT t0.trade_date           AS trade_date,
       t0.ticker               AS ticker,
       t0.close                AS close_t,
       t1.prev_close           AS prev_close_t1,
       t1.trade_date           AS next_date
FROM   prices t0
JOIN   prices t1
       ON  t0.ticker = t1.ticker
       AND t0.source = t1.source
       AND t1.trade_date > t0.trade_date
WHERE  t0.source = :source
       AND t1.trade_date = :trade_date
       AND t0.close IS NOT NULL AND t1.prev_close IS NOT NULL
       AND t1.trade_date = (
           SELECT MIN(x.trade_date) FROM prices x
           WHERE x.ticker = t0.ticker AND x.source = t0.source
                 AND x.trade_date > t0.trade_date
       )
"""


def _score(diff_pct: float, minor: float, major: float) -> tuple[float, str]:
    """Map a percentage deviation to a 0-100 score and a status band."""
    if diff_pct <= minor:
        # Linearly scale MATCH band into 0..40.
        return round(min(diff_pct / minor, 1.0) * 40, 2), "MATCH"
    if diff_pct <= major:
        span = (diff_pct - minor) / (major - minor)
        return round(40 + span * 40, 2), "MINOR"
    # Beyond major: 80..100, saturating at 3x the major threshold.
    span = min((diff_pct - major) / (2 * major), 1.0)
    return round(80 + span * 20, 2), "MAJOR"


def reconcile_cross_venue(engine: Engine, run_id: str, th: Thresholds,
                          trade_date: str) -> pd.DataFrame:
    df = pd.read_sql(_CROSS_VENUE_SQL, engine, params={"trade_date": trade_date})
    if df.empty:
        return _empty_results()
    diff_abs = (df["nse_close"] - df["bse_close"]).abs()
    mean = (df["nse_close"] + df["bse_close"]) / 2
    diff_pct = (diff_abs / mean * 100).round(4)
    scored = diff_pct.map(lambda p: _score(p, th.minor_close_pct, th.major_close_pct))

    return pd.DataFrame({
        "run_id": run_id,
        "check_type": "cross_venue",
        "trade_date": df["trade_date"],
        "ticker": df["ticker"],
        "field": "close",
        "value_a": df["nse_close"],
        "value_b": df["bse_close"],
        "diff_abs": diff_abs.round(4),
        "diff_pct": diff_pct,
        "mismatch_score": [s[0] for s in scored],
        "status": [s[1] for s in scored],
        "explanation": None,
    })


def reconcile_temporal(engine: Engine, run_id: str, th: Thresholds,
                       trade_date: str, source: str = "NSE") -> pd.DataFrame:
    df = pd.read_sql(_TEMPORAL_SQL, engine,
                     params={"source": source, "trade_date": trade_date})
    if df.empty:
        return _empty_results()

    ca = pd.read_sql("SELECT ticker, ex_date, purpose FROM corporate_actions", engine)

    diff_abs = (df["close_t"] - df["prev_close_t1"]).abs()
    diff_pct = (diff_abs / df["close_t"].abs() * 100).round(4)

    rows = []
    for i, r in df.iterrows():
        gap = diff_abs.iloc[i]
        status = "MATCH" if gap <= th.temporal_tol_abs else "MAJOR"
        score = 0.0 if status == "MATCH" else min(100.0, round(diff_pct.iloc[i] * 10, 2))
        explanation = None
        if status == "MAJOR" and not ca.empty:
            # An ex-date on the next session legitimately explains the gap.
            hit = ca[(ca["ticker"] == r["ticker"]) & (ca["ex_date"] == r["next_date"])]
            if not hit.empty:
                status = "MINOR"
                score = round(score / 3, 2)
                explanation = f"corporate action: {hit.iloc[0]['purpose']}"
        rows.append({
            "run_id": run_id, "check_type": "temporal", "trade_date": r["trade_date"],
            "ticker": r["ticker"], "field": "close->prev_close",
            "value_a": r["close_t"], "value_b": r["prev_close_t1"],
            "diff_abs": round(gap, 4), "diff_pct": diff_pct.iloc[i],
            "mismatch_score": score, "status": status, "explanation": explanation,
        })
    return pd.DataFrame(rows)


def reconcile_tri_source(engine: Engine, run_id: str, th: Thresholds,
                         trade_date: str) -> pd.DataFrame:
    """Three-way adjudication of NSE vs BSE vs Yahoo for one day.

    For each ticker with at least two of the three closes, take the median as the
    reference 'truth' and flag the source that deviates most. This is what turns a
    two-way 'they disagree' into an actionable 'BSE is the one that's wrong'.
    """
    wide = pd.read_sql(text("""
        SELECT ticker, source, close FROM prices
        WHERE trade_date = :d AND source IN ('NSE','BSE','YAHOO')
              AND close IS NOT NULL AND close > 0
    """), engine, params={"d": trade_date})
    if wide.empty:
        return _empty_tri()

    piv = wide.pivot_table(index="ticker", columns="source", values="close", aggfunc="first")
    for col in ("NSE", "BSE", "YAHOO"):
        if col not in piv.columns:
            piv[col] = pd.NA
    piv = piv.dropna(subset=["YAHOO"])  # tri-source only where Yahoo adjudicates

    rows = []
    for ticker, r in piv.iterrows():
        vals = {s: r[s] for s in ("NSE", "BSE", "YAHOO") if pd.notna(r[s])}
        if len(vals) < 2:
            continue
        med = pd.Series(list(vals.values())).median()
        spread_pct = round((max(vals.values()) - min(vals.values())) / med * 100, 4)
        outlier = max(vals, key=lambda s: abs(vals[s] - med))
        dev = round(abs(vals[outlier] - med) / med * 100, 4)
        if spread_pct <= th.minor_close_pct:
            status, outlier = "MATCH", None
        elif spread_pct <= th.major_close_pct:
            status = "MINOR"
        else:
            status = "MAJOR"
        rows.append({
            "run_id": run_id, "trade_date": trade_date, "ticker": ticker,
            "nse": round(float(r["NSE"]), 2) if pd.notna(r["NSE"]) else None,
            "bse": round(float(r["BSE"]), 2) if pd.notna(r["BSE"]) else None,
            "yahoo": round(float(r["YAHOO"]), 2) if pd.notna(r["YAHOO"]) else None,
            "median": round(med, 4), "spread_pct": spread_pct,
            "outlier_source": outlier, "outlier_dev_pct": dev if outlier else 0.0,
            "status": status, "sources_count": len(vals),
        })
    return pd.DataFrame(rows) if rows else _empty_tri()


def _empty_tri() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "run_id", "trade_date", "ticker", "nse", "bse", "yahoo", "median",
        "spread_pct", "outlier_source", "outlier_dev_pct", "status", "sources_count",
    ])


def _empty_results() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "run_id", "check_type", "trade_date", "ticker", "field",
        "value_a", "value_b", "diff_abs", "diff_pct",
        "mismatch_score", "status", "explanation",
    ])
