-- Reconciliation engine schema.
-- Written to be portable across SQLite and PostgreSQL (no vendor-only types).

-- Canonical, normalized end-of-day records from every source feed.
CREATE TABLE IF NOT EXISTS prices (
    source       TEXT    NOT NULL,          -- 'NSE' | 'BSE'
    trade_date   TEXT    NOT NULL,          -- ISO YYYY-MM-DD
    ticker       TEXT    NOT NULL,
    isin         TEXT,
    series       TEXT,
    open         REAL,
    high         REAL,
    low          REAL,
    close        REAL,
    prev_close   REAL,
    volume       REAL,
    deliv_qty    REAL,
    turnover     REAL,
    name         TEXT,
    ingested_at  TEXT    NOT NULL,
    PRIMARY KEY (source, trade_date, ticker, series)
);
CREATE INDEX IF NOT EXISTS idx_prices_ticker_date ON prices (ticker, trade_date);

-- Corporate actions used to explain legitimate temporal price gaps.
CREATE TABLE IF NOT EXISTS corporate_actions (
    ticker   TEXT NOT NULL,
    ex_date  TEXT NOT NULL,
    purpose  TEXT,
    PRIMARY KEY (ticker, ex_date, purpose)
);

-- One row per run: the audit trail + time series behind the dashboard trend.
CREATE TABLE IF NOT EXISTS recon_runs (
    run_id            TEXT PRIMARY KEY,
    run_ts            TEXT NOT NULL,
    trade_date        TEXT NOT NULL,
    records_compared  INTEGER NOT NULL,
    matched           INTEGER NOT NULL,
    minor             INTEGER NOT NULL,
    major             INTEGER NOT NULL,
    match_rate        REAL    NOT NULL,
    quality_issues    INTEGER NOT NULL,
    top_failing_field TEXT
);

-- Per-record reconciliation outcomes (both cross-venue and temporal checks).
CREATE TABLE IF NOT EXISTS recon_results (
    run_id        TEXT NOT NULL,
    check_type    TEXT NOT NULL,   -- 'cross_venue' | 'temporal'
    trade_date    TEXT NOT NULL,
    ticker        TEXT NOT NULL,
    field         TEXT NOT NULL,   -- the field that was compared
    value_a       REAL,
    value_b       REAL,
    diff_abs      REAL,
    diff_pct      REAL,
    mismatch_score REAL NOT NULL,  -- 0 (perfect) .. 100 (severe)
    status        TEXT NOT NULL,   -- 'MATCH' | 'MINOR' | 'MAJOR'
    explanation   TEXT             -- e.g. corporate action that justifies a gap
);
CREATE INDEX IF NOT EXISTS idx_results_run ON recon_results (run_id, status);

-- Three-way adjudication: NSE vs BSE vs Yahoo. When two venues disagree, the
-- source furthest from the median of the three is flagged as the outlier.
CREATE TABLE IF NOT EXISTS tri_source_results (
    run_id         TEXT NOT NULL,
    trade_date     TEXT NOT NULL,
    ticker         TEXT NOT NULL,
    nse            REAL,
    bse            REAL,
    yahoo          REAL,
    median         REAL,
    spread_pct     REAL,            -- (max-min)/median across available sources
    outlier_source TEXT,            -- 'NSE' | 'BSE' | 'YAHOO' | NULL
    outlier_dev_pct REAL,           -- how far the outlier sits from the median
    status         TEXT NOT NULL,   -- 'MATCH' | 'MINOR' | 'MAJOR'
    sources_count  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tri_run ON tri_source_results (run_id, status);

-- Field-level data-quality issues found during ingestion.
CREATE TABLE IF NOT EXISTS quality_issues (
    run_id      TEXT NOT NULL,
    source      TEXT NOT NULL,
    trade_date  TEXT NOT NULL,
    ticker      TEXT NOT NULL,
    field       TEXT NOT NULL,
    rule        TEXT NOT NULL,   -- which check failed
    detail      TEXT
);
CREATE INDEX IF NOT EXISTS idx_quality_run ON quality_issues (run_id);
