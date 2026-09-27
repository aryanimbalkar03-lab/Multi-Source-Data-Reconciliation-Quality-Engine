"""Corporate-actions adapter (optional enrichment).

Corporate actions (dividends, splits, bonuses) are the *legitimate* reason a
close and the next day's prev_close diverge, so we use them to classify temporal
mismatches as EXPLAINED vs UNEXPLAINED.

The NSE/BSE live JSON APIs sit behind Akamai bot-protection and return 403 from
many hosts (including CI). Rather than pretend, this adapter degrades cleanly:

  1. If RECON_CA_CSV points at a CSV drop, use it (recommended for scheduled runs
     — download the CF-CA report manually or from an allow-listed host).
  2. Otherwise try the NSE JSON API (works from residential IPs / browsers).
  3. Otherwise return an empty frame; reconciliation still runs, temporal
     mismatches are simply reported as UNEXPLAINED.

Expected CSV columns (case-insensitive): symbol, ex_date, purpose.
"""
from __future__ import annotations

import io
import os
from datetime import date

import pandas as pd
import requests

from ..normalize import norm_date, norm_ticker

_API = "https://www.nseindia.com/api/corporates-corporateActions?index=equities"


def _empty() -> pd.DataFrame:
    return pd.DataFrame(columns=["ticker", "ex_date", "purpose"])


def _from_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    lower = {c.lower().strip(): c for c in df.columns}
    sym = lower.get("symbol") or lower.get("ticker")
    ex = lower.get("ex_date") or lower.get("exdate") or lower.get("ex-date")
    pur = lower.get("purpose") or lower.get("subject")
    if not (sym and ex):
        return _empty()
    out = pd.DataFrame({
        "ticker": df[sym].map(norm_ticker),
        "ex_date": df[ex].map(norm_date),
        "purpose": df[pur] if pur else "",
    })
    return out.dropna(subset=["ticker", "ex_date"])


def _from_api() -> pd.DataFrame:
    # Single fast attempt, no retries: this API is behind Akamai and usually 403s
    # from data centers/CI. CA data is optional enrichment, so we never let it
    # slow the pipeline down — fail fast and return empty.
    try:
        sess = requests.Session()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json",
            "Referer": "https://www.nseindia.com/companies-listing/corporate-filings-actions",
        }
        sess.get("https://www.nseindia.com/", headers=headers, timeout=8)
        resp = sess.get(_API, headers=headers, timeout=8)
        resp.raise_for_status()
        rows = resp.json()
        out = pd.DataFrame([
            {
                "ticker": norm_ticker(r.get("symbol")),
                "ex_date": norm_date(r.get("exDate")),
                "purpose": r.get("subject", ""),
            }
            for r in rows
        ])
        return out.dropna(subset=["ticker", "ex_date"]) if not out.empty else _empty()
    except Exception:
        return _empty()


def fetch_corporate_actions(_trade_date: date | None = None) -> pd.DataFrame:
    """Return corporate actions as (ticker, ex_date, purpose). Never raises."""
    csv_path = os.getenv("RECON_CA_CSV")
    if csv_path and os.path.exists(csv_path):
        try:
            return _from_csv(csv_path)
        except Exception:
            return _empty()
    return _from_api()
