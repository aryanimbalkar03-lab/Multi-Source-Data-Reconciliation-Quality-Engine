"""BSE cash-market bhavcopy adapter.

Source: https://www.bseindia.com/download/BhavCopy/Equity/BhavCopy_BSE_CM_0_0_0_YYYYMMDD_F_0000.CSV
This is the newer unified CSV. It contains ISIN and both equity and non-equity
instruments; we keep cash equity only (SctySrs in the equity set).
"""
from __future__ import annotations

import io
from datetime import date

import pandas as pd

from ..normalize import finalize
from . import _http

_URL = (
    "https://www.bseindia.com/download/BhavCopy/Equity/"
    "BhavCopy_BSE_CM_0_0_0_{yyyymmdd}_F_0000.CSV"
)

# BSE equity series codes for ordinary cash equity.
_EQUITY_SERIES = {"A", "B", "T", "E", "X", "XT", "Z", "ZP", "M", "MT", "MS"}


def fetch_bse_bhavcopy(trade_date: date) -> pd.DataFrame:
    """Return a normalized frame of BSE cash-equity rows for `trade_date`."""
    yyyymmdd = trade_date.strftime("%Y%m%d")
    raw = _http.get(
        _URL.format(yyyymmdd=yyyymmdd),
        cache_name=f"bse_bhav_{yyyymmdd}.csv",
        referer="https://www.bseindia.com/markets/equity/EQReports/Bhavcopy.aspx",
    )
    df = pd.read_csv(io.BytesIO(raw))
    df.columns = [c.strip() for c in df.columns]

    df = df[df["FinInstrmTp"].astype(str).str.strip().isin({"STK", "EQ"})]
    df = df[df["SctySrs"].astype(str).str.strip().isin(_EQUITY_SERIES)]

    mapped = pd.DataFrame({
        "trade_date": df["TradDt"],
        "ticker": df["TckrSymb"],
        "isin": df["ISIN"],
        "series": df["SctySrs"].astype(str).str.strip(),
        "open": df["OpnPric"],
        "high": df["HghPric"],
        "low": df["LwPric"],
        "close": df["ClsPric"],
        "prev_close": df["PrvsClsgPric"],
        "volume": df["TtlTradgVol"],
        "turnover": df["TtlTrfVal"],
        "name": df["FinInstrmNm"],
    })
    return finalize(mapped, source="BSE")
