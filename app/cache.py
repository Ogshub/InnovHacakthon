"""
LinguaLink — In-Memory LRU Job Result Cache

Stores recent pipeline results keyed by job_id so the frontend can poll
or re-fetch results without re-running the expensive ML pipeline.
Also tracks server-wide metrics (total jobs, cache hits).
"""

import time
import hashlib
import json
import logging
from collections import OrderedDict
from threading import Lock
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Job Status constants
# ──────────────────────────────────────────────────────────────────────────────
STATUS_PENDING  = "pending"
STATUS_RUNNING  = "running"
STATUS_DONE     = "done"
STATUS_ERROR    = "error"


class LRUCache:
    """Thread-safe LRU cache with a configurable max size and TTL."""

    def __init__(self, max_size: int = 50, ttl_seconds: int = 3600):
        self._cache: OrderedDict[str, dict] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = Lock()
        self._hits = 0
        self._misses = 0

    # ── Public ────────────────────────────────────────────────────────────────

    def put(self, key: str, value: Any) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = {"value": value, "ts": time.time()}
            if len(self._cache) > self._max_size:
                evicted_key, _ = self._cache.popitem(last=False)
                logger.debug(f"Cache evicted: {evicted_key}")

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                self._misses += 1
                return None
            if time.time() - entry["ts"] > self._ttl:
                del self._cache[key]
                self._misses += 1
                return None
            self._cache.move_to_end(key)
            self._hits += 1
            return entry["value"]

    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    def size(self) -> int:
        with self._lock:
            return len(self._cache)

    @property
    def hit_rate(self) -> float:
        total = self._hits + self._misses
        return round(self._hits / total, 4) if total > 0 else 0.0

    @property
    def stats(self) -> dict:
        return {
            "size": self.size(),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self.hit_rate,
            "max_size": self._max_size,
            "ttl_seconds": self._ttl,
        }


class JobStore:
    """
    Stores async job metadata and results.
    Each job has:  status, created_at, completed_at, config, result, error
    """

    def __init__(self, max_jobs: int = 100):
        self._jobs: OrderedDict[str, dict] = OrderedDict()
        self._max_jobs = max_jobs
        self._lock = Lock()
        self._total_created = 0
        self._total_completed = 0

    # ── Public ────────────────────────────────────────────────────────────────

    def create(self, job_id: str, config: dict) -> dict:
        job = {
            "job_id": job_id,
            "status": STATUS_PENDING,
            "created_at": time.time(),
            "completed_at": None,
            "config": config,
            "result": None,
            "error": None,
            "progress": 0,
        }
        with self._lock:
            if len(self._jobs) >= self._max_jobs:
                self._jobs.popitem(last=False)
            self._jobs[job_id] = job
            self._total_created += 1
        logger.info(f"Job created: {job_id}")
        return job

    def set_running(self, job_id: str) -> None:
        self._update(job_id, status=STATUS_RUNNING, progress=10)

    def set_done(self, job_id: str, result: dict) -> None:
        self._update(
            job_id,
            status=STATUS_DONE,
            result=result,
            completed_at=time.time(),
            progress=100,
        )
        with self._lock:
            self._total_completed += 1
        logger.info(f"Job completed: {job_id}")

    def set_error(self, job_id: str, error: str) -> None:
        self._update(
            job_id,
            status=STATUS_ERROR,
            error=error,
            completed_at=time.time(),
            progress=0,
        )
        logger.error(f"Job failed: {job_id} — {error}")

    def set_progress(self, job_id: str, progress: int) -> None:
        self._update(job_id, progress=progress)

    def get(self, job_id: str) -> Optional[dict]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_recent(self, limit: int = 20) -> list[dict]:
        with self._lock:
            jobs = list(self._jobs.values())
        return sorted(jobs, key=lambda j: j["created_at"], reverse=True)[:limit]

    @property
    def totals(self) -> dict:
        return {
            "total_created": self._total_created,
            "total_completed": self._total_completed,
            "in_store": len(self._jobs),
        }

    # ── Private ───────────────────────────────────────────────────────────────

    def _update(self, job_id: str, **kwargs) -> None:
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(kwargs)


# ── Module-level singletons ───────────────────────────────────────────────────
result_cache = LRUCache(max_size=50, ttl_seconds=3600)
job_store    = JobStore(max_jobs=100)
_server_start = time.time()


def generate_job_id(prefix: str = "job") -> str:
    """Generate a short, unique job ID."""
    raw = f"{prefix}-{time.time()}-{id(object())}"
    return prefix + "-" + hashlib.sha1(raw.encode()).hexdigest()[:10]


def get_uptime() -> float:
    """Return server uptime in seconds."""
    return round(time.time() - _server_start, 1)
