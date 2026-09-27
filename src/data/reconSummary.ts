// Reconciliation Summary Data
// This represents the output of the multi-source data reconciliation engine
// Comparing NSE vs BSE closing prices, AMFI NAVs, and index constituent data

export type ReconSummary = {
  generated_at: string;
  threshold: number;
  latest: {
    trade_date: string;
    match_rate: number;
    records_compared: number;
    matched: number;
    minor: number;
    major: number;
    quality_issues: number;
    top_failing_field: string | null;
    avg_break_pct: number;
    worst_break_pct: number;
    nse_symbols: number;
    bse_symbols: number;
    dual_listed: number;
    nse_only: number;
    bse_only: number;
    amfi_funds_tracked: number;
    nifty50_constituents: number;
    niftybank_constituents: number;
  };
  totals: {
    runs: number;
    total_compared: number;
    total_major: number;
    avg_match_rate: number | null;
  };
  trend: {
    trade_date: string;
    match_rate: number;
    records_compared: number;
    matched: number;
    minor: number;
    major: number;
    quality_issues: number;
  }[];
  check_split: {
    check_type: string;
    match: number;
    minor: number;
    major: number;
  }[];
  score_buckets: {
    bucket: string;
    count: number;
  }[];
  quality_by_rule: {
    rule: string;
    count: number;
  }[];
  top_failing_fields: {
    check_type: string;
    field: string;
    count: number;
  }[];
  biggest_breaks: {
    ticker: string;
    nse: number | null;
    bse: number | null;
    diff_abs: number | null;
    diff_pct: number | null;
    mismatch_score: number;
    status: string;
    name: string | null;
    isin: string | null;
  }[];
  tri_source: {
    summary: {
      adjudicated: number;
      confirmed_breaks: number;
      yahoo_rows: number;
    };
    outlier_breakdown: {
      source: string;
      count: number;
    }[];
    rows: {
      ticker: string;
      nse: number | null;
      bse: number | null;
      yahoo: number | null;
      median: number;
      spread_pct: number;
      outlier_source: string | null;
      status: string;
    }[];
  };
  queue: {
    check_type: string;
    trade_date: string;
    ticker: string;
    field: string;
    value_a: number | null;
    value_b: number | null;
    diff_pct: number | null;
    mismatch_score: number;
    status: "MATCH" | "MINOR" | "MAJOR";
    explanation: string | null;
  }[];
};

export const reconSummary: ReconSummary = {
  generated_at: "2025-01-24T18:30:00+05:30",
  threshold: 0.95,
  latest: {
    trade_date: "2025-01-24",
    match_rate: 0.9712,
    records_compared: 2847,
    matched: 2765,
    minor: 58,
    major: 24,
    quality_issues: 12,
    top_failing_field: "close_price",
    avg_break_pct: 0.34,
    worst_break_pct: 4.82,
    nse_symbols: 2245,
    bse_symbols: 5132,
    dual_listed: 2847,
    nse_only: 398,
    bse_only: 2285,
    amfi_funds_tracked: 22,
    nifty50_constituents: 50,
    niftybank_constituents: 12,
  },
  totals: {
    runs: 8,
    total_compared: 22776,
    total_major: 187,
    avg_match_rate: 0.9689,
  },
  trend: [
    { trade_date: "2025-01-17", match_rate: 0.9645, records_compared: 2812, matched: 2712, minor: 72, major: 28, quality_issues: 15 },
    { trade_date: "2025-01-18", match_rate: 0.9598, records_compared: 2815, matched: 2701, minor: 80, major: 34, quality_issues: 18 },
    { trade_date: "2025-01-20", match_rate: 0.9723, records_compared: 2830, matched: 2751, minor: 55, major: 24, quality_issues: 11 },
    { trade_date: "2025-01-21", match_rate: 0.9687, records_compared: 2838, matched: 2749, minor: 63, major: 26, quality_issues: 14 },
    { trade_date: "2025-01-22", match_rate: 0.9756, records_compared: 2842, matched: 2773, minor: 47, major: 22, quality_issues: 9 },
    { trade_date: "2025-01-23", match_rate: 0.9698, records_compared: 2845, matched: 2759, minor: 60, major: 26, quality_issues: 13 },
    { trade_date: "2025-01-24", match_rate: 0.9712, records_compared: 2847, matched: 2765, minor: 58, major: 24, quality_issues: 12 },
  ],
  check_split: [
    { check_type: "close_price", match: 2765, minor: 42, major: 18 },
    { check_type: "volume", match: 2790, minor: 35, major: 8 },
    { check_type: "turnover", match: 2778, minor: 48, major: 12 },
    { check_type: "isin_match", match: 2847, minor: 0, major: 0 },
    { check_type: "series_code", match: 2835, minor: 12, major: 0 },
  ],
  score_buckets: [
    { bucket: "0-20", count: 2765 },
    { bucket: "20-40", count: 42 },
    { bucket: "40-60", count: 16 },
    { bucket: "60-80", count: 12 },
    { bucket: "80-100", count: 12 },
  ],
  quality_by_rule: [
    { rule: "null_close_price", count: 3 },
    { rule: "negative_price", count: 0 },
    { rule: "ohlc_breach", count: 5 },
    { rule: "volume_zero_with_price", count: 2 },
    { rule: "deliverable_gt_volume", count: 2 },
  ],
  top_failing_fields: [
    { check_type: "close_price", field: "close_price", count: 42 },
    { check_type: "turnover", field: "turnover_cr", count: 28 },
    { check_type: "volume", field: "traded_volume", count: 18 },
    { check_type: "series_code", field: "series", count: 12 },
    { check_type: "close_price", field: "vwap", count: 8 },
  ],
  biggest_breaks: [
    { ticker: "BHEL", nse: 278.45, bse: 265.20, diff_abs: 13.25, diff_pct: 4.82, mismatch_score: 92, status: "MAJOR", name: "Bharat Heavy Electricals Ltd", isin: "INE257A01026" },
    { ticker: "IRFC", nse: 178.90, bse: 171.35, diff_abs: 7.55, diff_pct: 4.28, mismatch_score: 88, status: "MAJOR", name: "Indian Railway Finance Corp", isin: "INE911N01013" },
    { ticker: "NBCC", nse: 142.60, bse: 137.10, diff_abs: 5.50, diff_pct: 3.87, mismatch_score: 84, status: "MAJOR", name: "NBCC (India) Ltd", isin: "INE095N01031" },
    { ticker: "HUDCO", nse: 245.80, bse: 237.45, diff_abs: 8.35, diff_pct: 3.41, mismatch_score: 79, status: "MAJOR", name: "Housing & Urban Development Corp", isin: "INE031A01033" },
    { ticker: "IREDA", nse: 234.50, bse: 227.80, diff_abs: 6.70, diff_pct: 2.91, mismatch_score: 75, status: "MAJOR", name: "Indian Renewable Energy Development Agency", isin: "INE202E01019" },
    { ticker: "PFC", nse: 467.20, bse: 454.80, diff_abs: 12.40, diff_pct: 2.65, mismatch_score: 71, status: "MAJOR", name: "Power Finance Corp", isin: "INE134A01011" },
    { ticker: "RECLTD", nse: 534.60, bse: 521.40, diff_abs: 13.20, diff_pct: 2.49, mismatch_score: 68, status: "MAJOR", name: "REC Ltd", isin: "INE020B01018" },
    { ticker: "BEL", nse: 312.40, bse: 305.60, diff_abs: 6.80, diff_pct: 2.18, mismatch_score: 64, status: "MAJOR", name: "Bharat Electronics Ltd", isin: "INE263A01024" },
    { ticker: "HAL", nse: 5234.50, bse: 5138.20, diff_abs: 96.30, diff_pct: 1.84, mismatch_score: 58, status: "MAJOR", name: "Hindustan Aeronautics Ltd", isin: "INE066F01020" },
    { ticker: "COALINDIA", nse: 398.70, bse: 392.50, diff_abs: 6.20, diff_pct: 1.56, mismatch_score: 52, status: "MAJOR", name: "Coal India Ltd", isin: "INE522F01014" },
    { ticker: "TATAPOWER", nse: 445.30, bse: 439.80, diff_abs: 5.50, diff_pct: 1.23, mismatch_score: 45, status: "MINOR", name: "Tata Power Company Ltd", isin: "INE245A01021" },
    { ticker: "NTPC", nse: 367.80, bse: 363.50, diff_abs: 4.30, diff_pct: 1.17, mismatch_score: 42, status: "MINOR", name: "NTPC Ltd", isin: "INE733E01010" },
  ],
  tri_source: {
    summary: {
      adjudicated: 24,
      confirmed_breaks: 18,
      yahoo_rows: 24,
    },
    outlier_breakdown: [
      { source: "BSE", count: 15 },
      { source: "NSE", count: 2 },
      { source: "YAHOO", count: 1 },
    ],
    rows: [
      { ticker: "BHEL", nse: 278.45, bse: 265.20, yahoo: 277.80, median: 278.45, spread_pct: 4.82, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "IRFC", nse: 178.90, bse: 171.35, yahoo: 178.50, median: 178.90, spread_pct: 4.28, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "NBCC", nse: 142.60, bse: 137.10, yahoo: 142.20, median: 142.60, spread_pct: 3.87, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "HUDCO", nse: 245.80, bse: 237.45, yahoo: 245.10, median: 245.80, spread_pct: 3.41, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "IREDA", nse: 234.50, bse: 227.80, yahoo: 233.90, median: 234.50, spread_pct: 2.91, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "PFC", nse: 467.20, bse: 454.80, yahoo: 466.50, median: 467.20, spread_pct: 2.65, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "RECLTD", nse: 534.60, bse: 521.40, yahoo: 533.80, median: 534.60, spread_pct: 2.49, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "BEL", nse: 312.40, bse: 305.60, yahoo: 311.80, median: 312.40, spread_pct: 2.18, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "HAL", nse: 5234.50, bse: 5138.20, yahoo: 5228.00, median: 5234.50, spread_pct: 1.84, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "COALINDIA", nse: 398.70, bse: 392.50, yahoo: 398.10, median: 398.70, spread_pct: 1.56, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "OILINDIA", nse: 445.60, bse: 440.20, yahoo: 445.00, median: 445.60, spread_pct: 1.22, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "GAIL", nse: 212.30, bse: 210.10, yahoo: 212.00, median: 212.30, spread_pct: 1.04, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "ONGC", nse: 256.80, bse: 254.50, yahoo: 256.40, median: 256.80, spread_pct: 0.90, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "NTPC", nse: 367.80, bse: 363.50, yahoo: 367.20, median: 367.80, spread_pct: 1.17, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "POWERGRID", nse: 312.40, bse: 310.80, yahoo: 312.00, median: 312.40, spread_pct: 0.51, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "TATAPOWER", nse: 445.30, bse: 439.80, yahoo: 444.80, median: 445.30, spread_pct: 1.23, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "ADANIGREEN", nse: 1678.90, bse: 1665.40, yahoo: 1677.50, median: 1678.90, spread_pct: 0.81, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "SJVN", nse: 134.50, bse: 132.80, yahoo: 134.20, median: 134.50, spread_pct: 1.27, outlier_source: "BSE", status: "CONFIRMED" },
      { ticker: "VEDL", nse: 456.70, bse: 458.20, yahoo: 456.50, median: 456.70, spread_pct: 0.37, outlier_source: "BSE", status: "UNCONFIRMED" },
      { ticker: "NHPC", nse: 98.40, bse: 97.80, yahoo: 98.20, median: 98.40, spread_pct: 0.61, outlier_source: "NSE", status: "UNCONFIRMED" },
      { ticker: "CANBK", nse: 124.50, bse: 123.80, yahoo: 124.20, median: 124.50, spread_pct: 0.56, outlier_source: "NSE", status: "UNCONFIRMED" },
      { ticker: "BANKBARODA", nse: 267.80, bse: 266.20, yahoo: 267.50, median: 267.80, spread_pct: 0.60, outlier_source: "YAHOO", status: "UNCONFIRMED" },
      { ticker: "INDUSINDBK", nse: 1234.50, bse: 1228.60, yahoo: 1233.80, median: 1234.50, spread_pct: 0.48, outlier_source: null, status: "INCONCLUSIVE" },
      { ticker: "PNB", nse: 108.40, bse: 107.80, yahoo: 108.20, median: 108.40, spread_pct: 0.56, outlier_source: null, status: "INCONCLUSIVE" },
    ],
  },
  queue: [
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "BHEL", field: "close_price", value_a: 278.45, value_b: 265.20, diff_pct: 4.82, mismatch_score: 92, status: "MAJOR", explanation: "BSE closing price lagged NSE by ₹13.25. Likely stale last-traded price on BSE due to low liquidity in final 15 min. Yahoo confirms NSE price." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "IRFC", field: "close_price", value_a: 178.90, value_b: 171.35, diff_pct: 4.28, mismatch_score: 88, status: "MAJOR", explanation: "Govt PSU with recent IPO (Jan 2024). High retail interest causes BSE circuit filters to trigger earlier. NSE price reflects true market consensus." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "NBCC", field: "close_price", value_a: 142.60, value_b: 137.10, diff_pct: 3.87, mismatch_score: 84, status: "MAJOR", explanation: "PSU construction stock. BSE volume only 30% of NSE. Thin order book on BSE leads to wider bid-ask spread and stale closing prints." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "HUDCO", field: "close_price", value_a: 245.80, value_b: 237.45, diff_pct: 3.41, mismatch_score: 79, status: "MAJOR", explanation: "Housing finance PSU. BSE closing auction had fewer participants. Price discovery primarily on NSE. Recommend using NSE close for NAV computation." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "IREDA", field: "close_price", value_a: 234.50, value_b: 227.80, diff_pct: 2.91, mismatch_score: 75, status: "MAJOR", explanation: "Recently listed renewable energy PSU (Nov 2023 IPO). High volatility. BSE upper circuit hit early, freezing price while NSE continued discovery." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "PFC", field: "close_price", value_a: 467.20, value_b: 454.80, diff_pct: 2.65, mismatch_score: 71, status: "MAJOR", explanation: "Power finance PSU. Dividend yield ~5% attracts retail on BSE. BSE closing price reflects late-day profit booking not seen on NSE." },
    { check_type: "turnover", trade_date: "2025-01-24", ticker: "RELIANCE", field: "turnover_cr", value_a: 2845.67, value_b: 2838.42, diff_pct: 0.25, mismatch_score: 18, status: "MINOR", explanation: "Turnover difference of ₹7.25 Cr between exchanges. Likely due to block deals settling differently. Within acceptable tolerance." },
    { check_type: "volume", trade_date: "2025-01-24", ticker: "TCS", field: "traded_volume", value_a: 3456789, value_b: 3452100, diff_pct: 0.13, mismatch_score: 12, status: "MINOR", explanation: "Volume difference of 4,689 shares. Minor settlement timing difference. Both within closing auction tolerance." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "TATAPOWER", field: "close_price", value_a: 445.30, value_b: 439.80, diff_pct: 1.23, mismatch_score: 45, status: "MINOR", explanation: "Renewable energy stock. BSE price slightly lower due to institutional sell orders executed only on BSE in closing window." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "NTPC", field: "close_price", value_a: 367.80, value_b: 363.50, diff_pct: 1.17, mismatch_score: 42, status: "MINOR", explanation: "PSU power major. BSE closing print 4.30 lower. Likely due to lower BSE liquidity in final minutes. NSE price confirmed by Yahoo." },
    { check_type: "series_code", trade_date: "2025-01-24", ticker: "YESBANK", field: "series", value_a: 1, value_b: 0, diff_pct: null, mismatch_score: 35, status: "MINOR", explanation: "BSE data missing series code for YESBANK. NSE shows 'EQ' (normal trading). BSE may have coding delay for recently de-frozen stock." },
    { check_type: "close_price", trade_date: "2025-01-23", ticker: "ZOMATO", field: "close_price", value_a: 267.40, value_b: 264.80, diff_pct: 0.97, mismatch_score: 38, status: "MINOR", explanation: "New-age tech stock. High retail participation on both exchanges. Minor price difference due to different closing auction mechanics." },
    { check_type: "turnover", trade_date: "2025-01-24", ticker: "HDFCBANK", field: "turnover_cr", value_a: 4567.89, value_b: 4562.34, diff_pct: 0.12, mismatch_score: 10, status: "MINOR", explanation: "Turnover difference of ₹5.55 Cr. HDFC Bank is highest-weight stock in NIFTY 50. Minor variance within normal range." },
    { check_type: "close_price", trade_date: "2025-01-24", ticker: "SUZLON", field: "close_price", value_a: 78.45, value_b: 76.80, diff_pct: 2.11, mismatch_score: 55, status: "MINOR", explanation: "Wind energy stock with high retail interest. BSE price lower due to late-day selling. Stock at ₹78 level attracts circuit filter attention." },
    { check_type: "volume", trade_date: "2025-01-24", ticker: "ADANIENT", field: "traded_volume", value_a: 8765432, value_b: 8745600, diff_pct: 0.23, mismatch_score: 15, status: "MINOR", explanation: "Volume difference of ~20K shares. Adani stocks have high retail + FII activity. Minor exchange split difference." },
  ],
};
