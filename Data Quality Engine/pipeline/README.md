# Multi-Source Data Reconciliation & Quality Engine

Ingests **three independent Indian-equity data sources** that *should* agree —
**NSE** bhavcopy, **BSE** bhavcopy, and **Yahoo Finance** quotes — normalizes
them into one schema, loads them into SQL, and reconciles the same event across
venues, across time, and across sources. It scores every record for drift, runs
routine data-quality checks, alerts when the match rate degrades, and exports a
JSON feed for the dashboard.

All data is **real and public**. No mock data anywhere in the pipeline.

## What it reconciles

| Check | Join | Question it answers |
|-------|------|---------------------|
| `cross_venue` | NSE close ⋈ BSE close on `ticker + date` | Do the two exchanges agree on the day's close? |
| `temporal` | close(T) ⋈ prev_close(T+1) on `ticker` (self-join) | Is the feed internally continuous day-over-day? |
| `tri_source` | NSE ⋈ BSE ⋈ Yahoo, median-of-three | **When two venues disagree, which one is the outlier?** |

The third source is the key upgrade: two feeds can only tell you *that* they
disagree. A third independent source (Yahoo) takes the median of the three and
identifies *which* source is wrong — turning "NSE and BSE differ" into "BSE is
the outlier by 19%". To keep per-ticker requests bounded, Yahoo is pulled only
for the already-flagged securities (`RECON_YAHOO_LIMIT`, default 150), and one
3-month history request per ticker is cached across the whole backfill.

Temporal gaps are cross-referenced against a **corporate-actions** feed, so a
dividend/split/bonus is reported as `EXPLAINED` rather than a data error.

Every compared record gets a **0–100 mismatch score** and a `MATCH / MINOR /
MAJOR` status driven by the thresholds in `src/recon/config.py`.

## Data sources (all live, no keys)

- **NSE full bhavcopy** — `nsearchives.nseindia.com/products/content/sec_bhavdata_full_DDMMYYYY.csv`
- **BSE cash bhavcopy** — `bseindia.com/download/BhavCopy/Equity/BhavCopy_BSE_CM_..._YYYYMMDD_F_0000.CSV`
- **Yahoo Finance** — `query1.finance.yahoo.com/v8/finance/chart/{TICKER}.NS` (independent daily OHLC, keyless)
- **Corporate actions** — NSE JSON API when reachable, else a CSV drop via
  `RECON_CA_CSV` (the live JSON API is behind Akamai bot-protection and returns
  403 from many hosts/CI; the pipeline degrades gracefully and still runs).

## Quick start

```bash
cd pipeline
uv venv && uv pip install -e .

.venv/bin/recon --date 2025-09-26   # one specific trading day
.venv/bin/recon --latest            # most recent trading day
.venv/bin/recon --backfill 8        # last 8 trading days (builds the trend)
```

Output goes to SQLite (`pipeline/data/recon.db`) and a dashboard feed at
`public/recon/summary.json`. Raw vendor files are cached under `pipeline/data/raw/`
for audit and fast re-runs.

## Configuration (env vars)

| Var | Purpose | Default |
|-----|---------|---------|
| `DATABASE_URL` | Any SQLAlchemy URL (swap in Postgres for prod) | SQLite under `data/` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for alerts | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `ALERT_EMAIL_TO` | Email alerts | — |
| `RECON_CA_CSV` | Path to a corporate-actions CSV (`symbol, ex_date, purpose`) | — |

If no alert channel is configured, alerts print to stdout so the signal is never lost.

## SQL schema

See [`src/recon/schema.sql`](src/recon/schema.sql). Portable across SQLite and
PostgreSQL: normalized `prices`, `corporate_actions`, `recon_results` (per-record
scores), `quality_issues` (per-field failures), and `recon_runs` (the time series
behind the dashboard trend).

## Scheduling

[`.github/workflows/reconcile.yml`](../.github/workflows/reconcile.yml) runs the
pipeline on a cron (14:00 UTC / 19:30 IST, weekdays — after EOD files publish)
and on demand, uploading `summary.json` as an artifact.

## Tests

```bash
.venv/bin/python -m pytest -q
```

Covers format normalization (both venue date/ticker formats, currency cleaning)
and the reconciliation scoring/classification, including the corporate-action
downgrade path — all offline with synthetic drift.

## Dashboard

The React app in the repo root (`src/App.tsx`) reads `public/recon/summary.json`
and renders the match-rate trend, top failing fields, and a drill-down queue of
flagged records.
