"""Central configuration, driven by environment variables with sane defaults.

Everything the pipeline needs to run is here so the same code path works on a
laptop (SQLite, no alerts) and in CI (Postgres + Slack) by only changing env.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Repo-relative locations. Keeping data/ out of the package makes it trivial to
# mount as a volume or cache between CI runs.
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("RECON_DATA_DIR", ROOT / "data"))
RAW_DIR = DATA_DIR / "raw"          # untouched vendor files, kept for audit
EXPORT_DIR = Path(os.getenv("RECON_EXPORT_DIR", ROOT.parent / "public" / "recon"))


@dataclass(frozen=True)
class Thresholds:
    """Business rules that decide when a record is 'drifted' vs acceptable."""

    # Cross-venue: NSE and BSE never print an identical close, but a healthy
    # spread stays tiny. Beyond these the record is worth a human's time.
    minor_close_pct: float = 0.50   # >0.50% deviation -> MINOR
    major_close_pct: float = 2.00   # >2.00% deviation -> MAJOR

    # Temporal: today's close should equal tomorrow's prev_close to the paisa.
    # Any gap is either a corporate action or a data error.
    temporal_tol_abs: float = 0.01

    # Run-level alert trigger.
    min_match_rate: float = 0.97    # alert if match rate drops below 97%


@dataclass(frozen=True)
class Config:
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'recon.db'}")
    )
    slack_webhook_url: str | None = field(default_factory=lambda: os.getenv("SLACK_WEBHOOK_URL"))
    smtp_host: str | None = field(default_factory=lambda: os.getenv("SMTP_HOST"))
    smtp_port: int = field(default_factory=lambda: int(os.getenv("SMTP_PORT", "587")))
    smtp_user: str | None = field(default_factory=lambda: os.getenv("SMTP_USER"))
    smtp_password: str | None = field(default_factory=lambda: os.getenv("SMTP_PASSWORD"))
    alert_email_to: str | None = field(default_factory=lambda: os.getenv("ALERT_EMAIL_TO"))
    thresholds: Thresholds = field(default_factory=Thresholds)

    def ensure_dirs(self) -> None:
        for d in (DATA_DIR, RAW_DIR, EXPORT_DIR):
            d.mkdir(parents=True, exist_ok=True)


def load_config() -> Config:
    cfg = Config()
    cfg.ensure_dirs()
    return cfg
