"""Yahoo Finance adapter — the independent third source.

NSE and BSE are the primary venues; Yahoo is an independent market-data
aggregator that carries the same securities under `.NS` (NSE) and `.BO` (BSE)
suffixes. It lets us *triangulate*: when NSE and BSE disagree on a close, Yahoo
breaks the tie and tells us which venue is the outlier.

Yahoo is queried per-ticker, so we only pull it for the bounded set of already
flagged securities. One `range=3mo` request per ticker covers the whole backfill
window and is cached, keeping request volume low and re-runs free.
"""
from __future__ import annotations

import io
import json
import time
from datetime import date

import pandas as pd
import requests

from ..normalize import finalize
from . import _http

_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=3mo&interval=1d"


def _history(ticker: str, suffix: str) -> pd.DataFrame:
    """Daily OHLC history for one ticker; cached per symbol. Empty on failure."""
    symbol = f"{ticker}.{suffix}"
    cache = f"yahoo_{symbol}.json"
    try:
        raw = _http.get(_CHART.format(symbol=symbol), cache_name=cache, retries=1, timeout=15)
    except Exception:
        return pd.DataFrame()
    try:
        res = json.loads(raw)["chart"]["result"][0]
        ts = res["timestamp"]
        q = res["indicators"]["quote"][0]
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return pd.DataFrame()
    idx = pd.to_datetime(ts, unit="s", utc=True).tz_convert("Asia/Kolkata")
    return pd.DataFrame({
        "trade_date": idx.strftime("%Y-%m-%d"),
        "ticker": ticker,
        "open": q.get("open"),
        "high": q.get("high"),
        "low": q.get("low"),
        "close": q.get("close"),
        "volume": q.get("volume"),
    })


def fetch_yahoo_closes(tickers: list[str], trade_date: date, suffix: str = "NS",
                       pause: float = 0.12) -> pd.DataFrame:
    """Return normalized Yahoo rows (source='YAHOO') for `tickers` on `trade_date`."""
    iso = trade_date.strftime("%Y-%m-%d")
    frames = []
    for i, t in enumerate(dict.fromkeys(tickers)):  # de-dupe, keep order
        hist = _history(t, suffix)
        if hist.empty:
            continue
        row = hist[hist["trade_date"] == iso]
        if not row.empty:
            frames.append(row)
        if pause and i % 5 == 4:
            time.sleep(pause)
    if not frames:
        return finalize(pd.DataFrame(columns=["trade_date", "ticker", "close"]), source="YAHOO")
    df = pd.concat(frames, ignore_index=True)
    df["series"] = "EQ"
    df["name"] = df["ticker"]
    return finalize(df, source="YAHOO")
