"""Format normalization — the heart of any reconciliation: make two feeds that
describe the same reality actually comparable.

NSE and BSE disagree on almost every surface detail: column names, date
formats, whitespace, ticker suffixes, how they encode 'not available'. We fold
all of that into one canonical `PriceRecord` shape before anything touches SQL.
"""
from __future__ import annotations

import re

import pandas as pd

# Canonical column order every source must produce.
CANONICAL_COLUMNS = [
    "source", "trade_date", "ticker", "isin", "series",
    "open", "high", "low", "close", "prev_close",
    "volume", "deliv_qty", "turnover", "name",
]

# Tickers that legitimately differ between venues get mapped here. NSE and BSE
# use the same symbol for the vast majority of equities, but a handful diverge.
TICKER_ALIASES = {
    "M&M": "M&M",
    "M&MFIN": "M&MFIN",
}

_WS = re.compile(r"\s+")


def norm_ticker(raw: object) -> str | None:
    """Uppercase, strip whitespace, drop trailing series suffixes, apply aliases."""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    t = _WS.sub("", str(raw)).upper()
    # BSE occasionally appends the ISIN-derived suffix; NSE uses "-RE"/"-BE" etc.
    t = re.sub(r"[-_](EQ|BE|BZ|RE|RL)$", "", t)
    if not t:
        return None
    return TICKER_ALIASES.get(t, t)


def norm_date(raw: object) -> str | None:
    """Return an ISO YYYY-MM-DD string regardless of the vendor's format."""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return None
    s = str(raw).strip()
    # NSE: '26-Sep-2025'  |  BSE: '2025-09-26' or '26/09/2025'
    for fmt in ("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y%m%d"):
        try:
            return pd.to_datetime(s, format=fmt).strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            continue
    try:  # last resort: let pandas guess
        return pd.to_datetime(s, dayfirst=True).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def to_number(series: pd.Series) -> pd.Series:
    """Coerce a currency/quantity column to float, tolerating commas, '-', blanks."""
    cleaned = (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.strip()
        .replace({"-": None, "": None, "nan": None, "NA": None, "None": None})
    )
    return pd.to_numeric(cleaned, errors="coerce")


def finalize(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Apply shared normalization and return a frame with exactly CANONICAL_COLUMNS."""
    df = df.copy()
    df["source"] = source
    df["ticker"] = df["ticker"].map(norm_ticker)
    df["trade_date"] = df["trade_date"].map(norm_date)

    for col in ("open", "high", "low", "close", "prev_close", "volume", "deliv_qty", "turnover"):
        if col in df.columns:
            df[col] = to_number(df[col])
        else:
            df[col] = pd.NA

    for col in ("isin", "series", "name"):
        if col not in df.columns:
            df[col] = pd.NA

    df = df[df["ticker"].notna() & df["trade_date"].notna()]
    df = df.drop_duplicates(subset=["source", "trade_date", "ticker", "series"])
    return df[CANONICAL_COLUMNS].reset_index(drop=True)
