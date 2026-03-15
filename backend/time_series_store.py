"""
time_series_store.py
--------------------
In-memory circular buffer storing recent sentiment analyses with timestamps.
Max capacity: 200 entries. Used to power time-series charts in the dashboard.
"""

from __future__ import annotations
import time
from collections import deque
from threading import Lock

history_store: deque = deque(maxlen=200)
_lock = Lock()


def record_analysis(text: str, sentiment: str, source: str = "single") -> None:
    """Add a new analysis result to the history store."""
    with _lock:
        history_store.append({
            "timestamp": time.time(),
            "text_preview": text[:80],
            "full_text": text,
            "sentiment": sentiment,
            "source": source,  # 'single', 'reddit', 'amazon', 'youtube'
        })


def get_history(limit: int = 100) -> list[dict]:
    """Return the most recent `limit` entries in chronological order."""
    with _lock:
        entries = list(history_store)
    return entries[-limit:]


def get_timeseries(bucket_seconds: int = 60) -> list[dict]:
    """
    Aggregate entries into time buckets and return counts per sentiment per bucket.
    Returns a list of dicts suitable for a line/area chart.
    """
    with _lock:
        entries = list(history_store)

    if not entries:
        return []

    # Group by bucket
    buckets: dict[int, dict] = {}
    for entry in entries:
        bucket_key = int(entry["timestamp"] // bucket_seconds) * bucket_seconds
        if bucket_key not in buckets:
            buckets[bucket_key] = {"time": bucket_key, "Positive": 0, "Negative": 0, "Neutral": 0, "Irrelevant": 0}
        sentiment = entry.get("sentiment", "Neutral")
        if sentiment in buckets[bucket_key]:
            buckets[bucket_key][sentiment] += 1

    # Convert to sorted list with human-readable time
    result = []
    import datetime
    for bucket_key in sorted(buckets.keys()):
        row = buckets[bucket_key].copy()
        dt = datetime.datetime.fromtimestamp(bucket_key)
        row["label"] = dt.strftime("%H:%M")
        row["timestamp"] = bucket_key
        result.append(row)

    return result
