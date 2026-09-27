"""Multi-Source Data Reconciliation & Quality Engine.

Ingests NSE + BSE equity bhavcopy flat files, normalizes them into a common
schema, loads them into SQL, then reconciles the same event across venues and
across time. Flags data-quality drift and alerts when the match rate degrades.
"""

__version__ = "0.1.0"
