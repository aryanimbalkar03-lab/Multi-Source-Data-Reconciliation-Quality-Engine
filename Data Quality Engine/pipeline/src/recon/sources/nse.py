"""NSE Securities full bhavcopy adapter.

Source: https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_DDMMYYYY.csv
This is the official end-of-day file for the NSE cash market. Columns carry
leading spaces in the header ('  SERIES'), which we strip on read.
"""
from __future__ import annotations

import io
from datetime import date

import pandas as pd

from ..normalize import finalize
from . import _http

_URL = "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{ddmmyyyy}.csv"


def fetch_nse_bhavcopy(trade_date: date, series: str = "EQ") -> pd.DataFrame:
    """Return a normalized frame of NSE equities for `trade_date` (SERIES=EQ by default)."""
    ddmmyyyy = trade_date.strftime("%d%m%Y")
    raw = _http.get(
        _URL.format(ddmmyyyy=ddmmyyyy),
        cache_name=f"nse_bhav_{ddmmyyyy}.csv",
        referer="https://www.nseindia.com/all-reports",
    )
    df = pd.read_csv(io.BytesIO(raw))
    df.columns = [c.strip() for c in df.columns]

    df = df[df["SERIES"].astype(str).str.strip() == series]

    mapped = pd.DataFrame({
        "trade_date": df["DATE1"],
        "ticker": df["SYMBOL"],
        "series": df["SERIES"].astype(str).str.strip(),
        "open": df["OPEN_PRICE"],
        "high": df["HIGH_PRICE"],
        "low": df["LOW_PRICE"],
        "close": df["CLOSE_PRICE"],
        "prev_close": df["PREV_CLOSE"],
        "volume": df["TTL_TRD_QNTY"],
        "deliv_qty": df["DELIV_QTY"],
        "turnover": df["TURNOVER_LACS"],
        "name": df["SYMBOL"],
    })
    return finalize(mapped, source="NSE")
