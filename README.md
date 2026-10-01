 **Indian Capital Markets · Cross-Venue Data Integrity · Automated Quality Pipeline**

A  data reconciliation engine that validates financial data across **NSE**, **BSE**, **AMFI**, and **Yahoo Finance** — detecting discrepancies, adjudicating conflicts via three-way source comparison, and surfacing actionable insights through an analyst drill-down dashboard.

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![Python](https://img.shields.io/badge/Python-3.11-3776ab)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 🎯 Problem Statement

Indian equity markets have **dual-listed securities** traded on both NSE and BSE, often with divergent closing prices due to liquidity asymmetry, circuit filters, and settlement timing. Mutual fund NAVs (published by AMFI) depend on accurate underlying prices. A single stale or erroneous price can cascade into incorrect NAVs, affecting **₹50L+ Cr** of AUM.

This engine automatically:
- **Reconciles** closing prices, volumes, and turnover across NSE ↔ BSE
- **Validates** AMFI mutual fund NAVs against underlying index movements
- **Tracks** NSE index constituents (NIFTY 50, NIFTY BANK) for data integrity
- **Adjudicates** breaks using Yahoo Finance as an independent third source
- **Surfaces** actionable insights through a structured analyst queue

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  NSE Bhav    │  BSE Cash    │  AMFI NAVs   │  Yahoo Finance │
│  (CSV/API)   │  (CSV/API)   │  (XLSX)      │  (yfinance)    │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬────────┘
       │              │              │               │
       ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│              QUALITY CHECKS & CLEANSING                      │
│  • OHLC bounds  • Null detection  • ISIN validation         │
│  • Series codes • Volume sanity   • Deliverable checks      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              RECONCILIATION ENGINE                           │
│  • Cross-venue price matching (NSE ↔ BSE)                   │
│  • Mismatch scoring (0-100 weighted composite)              │
│  • Three-way adjudication (NSE ⋈ BSE ⋈ Yahoo)              │
│  • SLA threshold monitoring (95% match rate)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              DASHBOARD & ANALYST QUEUE                       │
│  • React + Recharts visualization                           │
│  • Drill-down queue with contextual notes                   │
│  • AMFI NAV explorer with category/AMC filters              │
│  • NSE Index constituent browser (NIFTY 50 / NIFTY BANK)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Coverage

| Source | Records | Description |
|--------|---------|-------------|
| **NSE Bhavcopy** | 2,245 symbols | Full equity cash segment closing prices |
| **BSE Cash Bhavcopy** | 5,132 symbols | BSE-listed equity closing prices |
| **Dual-listed (reconciled)** | 2,847 pairs | Cross-venue matched ticker×date |
| **AMFI Mutual Funds** | 22 schemes | NAVs across 10 categories (Large Cap, Flexi Cap, ELSS, Mid/Small Cap, Debt, Hybrid, Index, International, Gold ETF) |
| **NIFTY 50** | 50 constituents | Free-float market cap weights, sector allocation |
| **NIFTY BANK** | 12 constituents | Banking sector index constituents |
| **Yahoo Finance** | 24 adjudicated | Independent third-source for break confirmation |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5.7, Tailwind CSS 4, Recharts |
| **Backend / ETL** | Python 3.11, Pandas, yfinance |
| **Database** |  (dev) /  (prod) |
| **Build** | Vite 6, pnpm |
| **Deployment** | GitHub Actions (scheduled pipeline), Vercel (dashboard) |

---

## 🚀 Features

### 1. Reconciliation Overview
- Match-rate trend with SLA threshold monitoring
- Outcome split (Match / Minor / Major) with check-type breakdown
- Source coverage visualization (NSE vs BSE universe overlap)
- Mismatch-score distribution histogram
- Top failing fields and data-quality rule violations
- Largest reconciliation breaks with ISIN and severity

### 2. Three-Way Source Adjudication
- Yahoo Finance as independent arbiter
- Outlier identification (which source is wrong)
- Confirmed vs unconfirmed breaks
- Contextual analysis of BSE-side liquidity issues

### 3. AMFI Mutual Fund NAV Explorer
- 22 real mutual fund schemes across 10 categories
- Filter by category, AMC, and scheme name
- NAV distribution visualization
- Contextual notes explaining each fund's strategy, AUM, and track record

### 4. NSE Index Constituent Browser
- NIFTY 50 and NIFTY BANK constituents
- Real market caps, free-float factors, and index weights
- Sector-wise filtering and weight distribution charts
- Company-specific notes with business context

### 5. Analyst Drill-Down Queue
- Every flagged record, worst-scored first
- Filter by severity (MAJOR / MINOR) and search by ticker
- Contextual notes explaining *why* each break occurred
- Pagination with load-more pattern

---

## 📁 Project Structure

```
Data Quality Engine/
├── pipeline/                    # Python ETL pipeline
│   └── src/recon/
│       ├── dashboard_export.py  # Generates summary.json
│       ├── recon_engine.py      # Core reconciliation logic
│       └── quality_checks.py    # Data quality rules
├── src/
│   ├── App.tsx                  # Main dashboard (4 tabs)
│   ├── data/
│   │   ├── amfiNavs.ts          # 22 real AMFI mutual fund NAVs
│   │   ├── nseIndexConstituents.ts  # NIFTY 50 + NIFTY BANK data
│   │   └── reconSummary.ts      # Reconciliation output
│   ├── index.css                # Tailwind + custom styles
│   └── main.tsx                 # Entry point
├── public/recon/
│   └── summary.json             # Pipeline output
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔧 Setup & Run

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Run Python pipeline (generates reconciliation data)
cd pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m src.recon.dashboard_export --backfill 8
```

---

## 📈 Key Metrics (Latest Session)

| Metric | Value |
|--------|-------|
| Match Rate | 97.12% (SLA: 95%) |
| Records Compared | 2,847 |
| Major Breaks | 24 (0.84% of book) |
| Minor Drift | 58 (2.04% of book) |
| Average Break | 0.34% |
| Worst Break | 4.82% (BHEL — BSE stale price) |
| Three-Way Adjudicated | 24 records |
| Confirmed Breaks | 18 (BSE outlier: 15, NSE: 2, Yahoo: 1) |

---

## 🎓 Learning Outcomes

- **Financial data engineering**: Bhavcopy parsing, ISIN mapping, corporate action enrichment
- **Cross-venue reconciliation**: Handling liquidity asymmetry, circuit filters, settlement timing
- **Three-way adjudication**: Using independent sources to resolve two-party disputes
- **Mismatch scoring**: Weighted composite scoring (0-100) across multiple check dimensions
- **Dashboard design**: Analyst-first UX with contextual notes, drill-down queues, and severity filtering
- **Production pipeline**: Scheduled ETL with quality gates, SLA monitoring, and alerting

---

## 📄 License

MIT © [aryanimbalkar03-lab](https://github.com/aryanimbalkar03-lab)


## Scope
- 22 AMFI schemes
- Hardcoded index constituents
- 24 records adjudicated via Yahoo


## Limitations
- Proof of concept limited to small data samples
- Lacks dynamic scaling and comprehensive error handling


## Tests
- Ensure automated quality checks validate output accuracy.
