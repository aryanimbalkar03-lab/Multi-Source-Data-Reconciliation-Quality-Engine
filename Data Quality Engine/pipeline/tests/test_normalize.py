"""Unit tests for the normalization layer — the logic most likely to silently
corrupt a reconciliation if a vendor tweaks a format."""
import pandas as pd

from recon.normalize import finalize, norm_date, norm_ticker, to_number


def test_norm_ticker_strips_series_and_whitespace():
    assert norm_ticker("  reliance ") == "RELIANCE"
    assert norm_ticker("TCS-BE") == "TCS"
    assert norm_ticker("infy-EQ") == "INFY"
    assert norm_ticker(None) is None


def test_norm_date_handles_both_venue_formats():
    assert norm_date("26-Sep-2025") == "2025-09-26"   # NSE
    assert norm_date("2025-09-26") == "2025-09-26"     # BSE
    assert norm_date("26/09/2025") == "2025-09-26"
    assert norm_date("garbage") is None


def test_to_number_cleans_commas_and_placeholders():
    s = pd.Series(["1,234.50", "-", "", "99"])
    out = to_number(s)
    assert out[0] == 1234.50
    assert pd.isna(out[1]) and pd.isna(out[2])
    assert out[3] == 99.0


def test_finalize_drops_rows_missing_keys_and_orders_columns():
    df = pd.DataFrame({
        "trade_date": ["26-Sep-2025", None],
        "ticker": ["RELIANCE", "TCS"],
        "close": ["1,000.0", "2000"],
    })
    out = finalize(df, source="NSE")
    assert list(out.columns)[:4] == ["source", "trade_date", "ticker", "isin"]
    assert len(out) == 1  # row with null date dropped
    assert out.iloc[0]["close"] == 1000.0
    assert (out["source"] == "NSE").all()
