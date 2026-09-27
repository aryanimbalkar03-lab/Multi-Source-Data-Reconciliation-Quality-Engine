"""Shared HTTP session with browser-like headers, retries and a raw-file cache.

Exchange archive hosts reject default user-agents and occasionally rate-limit,
so every download goes through here. Raw bytes are cached on disk so re-runs and
debugging never re-hit the vendor (and so we keep an audit copy of source data).
"""
from __future__ import annotations

import time
from pathlib import Path

import requests

from ..config import RAW_DIR

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept": "text/csv,application/zip,application/octet-stream,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


class FeedUnavailable(Exception):
    """Raised when a feed legitimately has no data (weekend/holiday/not published yet)."""


def get(url: str, *, cache_name: str, referer: str | None = None,
        retries: int = 3, timeout: int = 40) -> bytes:
    """Download `url`, caching the raw bytes under RAW_DIR/cache_name."""
    cached = RAW_DIR / cache_name
    if cached.exists() and cached.stat().st_size > 0:
        return cached.read_bytes()

    headers = dict(_HEADERS)
    if referer:
        headers["Referer"] = referer

    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code == 404:
                raise FeedUnavailable(f"404 for {url} (likely a non-trading day)")
            resp.raise_for_status()
            if not resp.content or b"Access Denied" in resp.content[:200]:
                raise requests.RequestException("empty or access-denied response")
            cached.parent.mkdir(parents=True, exist_ok=True)
            cached.write_bytes(resp.content)
            return resp.content
        except FeedUnavailable:
            raise
        except requests.RequestException as exc:
            last_exc = exc
            time.sleep(min(2 ** attempt, 8))
    raise RuntimeError(f"failed to download {url}: {last_exc}")
