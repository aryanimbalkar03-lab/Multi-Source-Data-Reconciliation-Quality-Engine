"""Database access layer. One thin wrapper over SQLAlchemy so the rest of the
pipeline is storage-agnostic (SQLite locally, Postgres in prod via DATABASE_URL).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

_SCHEMA = Path(__file__).with_name("schema.sql").read_text()


def make_engine(database_url: str) -> Engine:
    return create_engine(database_url, future=True)


def init_schema(engine: Engine) -> None:
    """Create all tables idempotently. Splits on ';' since SQLite's DBAPI runs
    one statement per execute()."""
    with engine.begin() as conn:
        for stmt in filter(str.strip, _SCHEMA.split(";")):
            conn.execute(text(stmt))


def upsert_prices(engine: Engine, df: pd.DataFrame) -> int:
    """Insert normalized price rows, replacing any existing row for the same key.

    We delete-then-insert per (source, trade_date) so re-running a day is safe and
    idempotent without depending on dialect-specific UPSERT syntax.
    """
    if df.empty:
        return 0
    df = df.copy()
    df["ingested_at"] = datetime.now(timezone.utc).isoformat()
    keys = df[["source", "trade_date"]].drop_duplicates().itertuples(index=False)
    with engine.begin() as conn:
        for source, trade_date in keys:
            conn.execute(
                text("DELETE FROM prices WHERE source=:s AND trade_date=:d"),
                {"s": source, "d": trade_date},
            )
    df.to_sql("prices", engine, if_exists="append", index=False)
    return len(df)


def replace_corporate_actions(engine: Engine, df: pd.DataFrame) -> int:
    if df.empty:
        return 0
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM corporate_actions"))
    df.drop_duplicates().to_sql("corporate_actions", engine, if_exists="append", index=False)
    return len(df)


def write_frame(engine: Engine, table: str, df: pd.DataFrame) -> None:
    if not df.empty:
        df.to_sql(table, engine, if_exists="append", index=False)


def record_run(engine: Engine, run: dict) -> None:
    write_frame(engine, "recon_runs", pd.DataFrame([run]))


def read_run_history(engine: Engine, limit: int = 60) -> pd.DataFrame:
    return pd.read_sql(
        text("SELECT * FROM recon_runs ORDER BY run_ts DESC LIMIT :n"),
        engine, params={"n": limit},
    )
