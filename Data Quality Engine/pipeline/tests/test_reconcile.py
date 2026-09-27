"""End-to-end reconciliation tests using an in-memory SQLite DB and synthetic
rows with known drift, so scoring/classification is verified without the network."""
import pandas as pd
from sqlalchemy import create_engine

from recon import db
from recon.config import Thresholds
from recon.reconcile import reconcile_cross_venue, reconcile_temporal


def _engine_with(prices, cas=None):
    eng = create_engine("sqlite:///:memory:")
    db.init_schema(eng)
    db.upsert_prices(eng, pd.DataFrame(prices))
    if cas:
        db.replace_corporate_actions(eng, pd.DataFrame(cas))
    return eng


def _row(source, date, ticker, close, prev_close=None, series="EQ"):
    return {"source": source, "trade_date": date, "ticker": ticker, "isin": None,
            "series": series, "open": close, "high": close, "low": close,
            "close": close, "prev_close": prev_close, "volume": 100,
            "deliv_qty": 10, "turnover": 1.0, "name": ticker}


def test_cross_venue_bands():
    eng = _engine_with([
        _row("NSE", "2025-09-26", "MATCHCO", 100.0),
        _row("BSE", "2025-09-26", "MATCHCO", 100.1),   # 0.1% -> MATCH
        _row("NSE", "2025-09-26", "MINORCO", 100.0),
        _row("BSE", "2025-09-26", "MINORCO", 101.0),   # ~1% -> MINOR
        _row("NSE", "2025-09-26", "MAJORCO", 100.0),
        _row("BSE", "2025-09-26", "MAJORCO", 110.0),   # ~10% -> MAJOR
    ])
    res = reconcile_cross_venue(eng, "r1", Thresholds(), "2025-09-26").set_index("ticker")
    assert res.loc["MATCHCO", "status"] == "MATCH"
    assert res.loc["MINORCO", "status"] == "MINOR"
    assert res.loc["MAJORCO", "status"] == "MAJOR"
    assert res.loc["MAJORCO", "mismatch_score"] >= 80


def test_temporal_gap_flagged_and_explained_by_corporate_action():
    prices = [
        _row("NSE", "2025-09-25", "SPLITCO", 200.0),
        _row("NSE", "2025-09-26", "SPLITCO", 100.0, prev_close=100.0),  # gap = 100
        _row("NSE", "2025-09-25", "CLEANCO", 50.0),
        _row("NSE", "2025-09-26", "CLEANCO", 51.0, prev_close=50.0),    # continuous
    ]
    eng = _engine_with(prices, cas=[
        {"ticker": "SPLITCO", "ex_date": "2025-09-26", "purpose": "Face Value Split"},
    ])
    res = reconcile_temporal(eng, "r1", Thresholds(), "2025-09-26", source="NSE").set_index("ticker")
    assert res.loc["CLEANCO", "status"] == "MATCH"
    # Big gap would be MAJOR, but the corporate action downgrades + explains it.
    assert res.loc["SPLITCO", "status"] == "MINOR"
    assert "corporate action" in res.loc["SPLITCO", "explanation"]
