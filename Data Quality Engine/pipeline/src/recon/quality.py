"""Routine data-quality checks run on each source frame at ingestion time.

These are the 'cleansing / routine checks' half of the JD: catch malformed rows
before they poison reconciliation. Each failing row becomes a quality_issue.
"""
from __future__ import annotations

import pandas as pd


def check_frame(df: pd.DataFrame, run_id: str) -> pd.DataFrame:
    """Return a frame of quality issues for one normalized source frame."""
    issues: list[dict] = []

    def flag(rows: pd.DataFrame, field: str, rule: str, detail: str) -> None:
        for _, r in rows.iterrows():
            issues.append({
                "run_id": run_id, "source": r["source"], "trade_date": r["trade_date"],
                "ticker": r["ticker"], "field": field, "rule": rule, "detail": detail,
            })

    # Missing/zero close price — the field everything downstream depends on.
    flag(df[df["close"].isna()], "close", "null_value", "close price missing")
    flag(df[df["close"] <= 0], "close", "non_positive", "close price <= 0")

    # OHLC internal consistency.
    ohlc = df.dropna(subset=["open", "high", "low", "close"])
    flag(ohlc[ohlc["high"] < ohlc["low"]], "high", "ohlc_inverted", "high < low")
    flag(
        ohlc[(ohlc["close"] > ohlc["high"]) | (ohlc["close"] < ohlc["low"])],
        "close", "ohlc_out_of_range", "close outside [low, high]",
    )

    # Deliverable quantity can never exceed traded quantity (NSE only).
    both = df.dropna(subset=["deliv_qty", "volume"])
    flag(
        both[both["deliv_qty"] > both["volume"]],
        "deliv_qty", "deliv_gt_volume", "deliverable qty > traded qty",
    )

    return pd.DataFrame(issues, columns=[
        "run_id", "source", "trade_date", "ticker", "field", "rule", "detail",
    ])
