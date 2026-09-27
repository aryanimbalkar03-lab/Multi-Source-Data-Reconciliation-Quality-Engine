"""Alerting. Fires when a run's match rate drops below the configured threshold.

Slack (incoming webhook) and email (SMTP) are both optional — if neither is
configured the alert is logged to stdout so local runs still surface the signal.
"""
from __future__ import annotations

import json
import smtplib
from email.mime.text import MIMEText

import requests

from .config import Config


def _format(summary: dict) -> str:
    return (
        f"🚨 Reconciliation alert — {summary['trade_date']}\n"
        f"Match rate: {summary['match_rate']:.2%} "
        f"(threshold {summary['threshold']:.2%})\n"
        f"Compared: {summary['records_compared']} | "
        f"MAJOR: {summary['major']} | MINOR: {summary['minor']} | "
        f"Quality issues: {summary['quality_issues']}\n"
        f"Top failing field: {summary['top_failing_field']}"
    )


def maybe_alert(cfg: Config, summary: dict) -> bool:
    """Send an alert if match_rate is below threshold. Returns True if fired."""
    if summary["match_rate"] >= summary["threshold"]:
        return False

    message = _format(summary)
    delivered = False

    if cfg.slack_webhook_url:
        try:
            requests.post(cfg.slack_webhook_url, data=json.dumps({"text": message}),
                          headers={"Content-Type": "application/json"}, timeout=15)
            delivered = True
        except requests.RequestException as exc:
            print(f"[alerts] Slack delivery failed: {exc}")

    if cfg.smtp_host and cfg.alert_email_to:
        try:
            msg = MIMEText(message)
            msg["Subject"] = f"[Recon] Match rate {summary['match_rate']:.1%} on {summary['trade_date']}"
            msg["From"] = cfg.smtp_user or "recon@localhost"
            msg["To"] = cfg.alert_email_to
            with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=20) as s:
                s.starttls()
                if cfg.smtp_user:
                    s.login(cfg.smtp_user, cfg.smtp_password or "")
                s.send_message(msg)
            delivered = True
        except (smtplib.SMTPException, OSError) as exc:
            print(f"[alerts] Email delivery failed: {exc}")

    if not delivered:
        print("[alerts] (no channel configured)\n" + message)
    return True
