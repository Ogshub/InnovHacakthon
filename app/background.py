"""
LinguaLink — Background Task Runner

Provides async job execution for heavy pipeline runs.
Accepts a DataFrame, queues the pipeline in a thread, and tracks
status in the shared JobStore so the client can poll for results.
"""

import logging
import threading
from typing import Callable, Any

from app.cache import job_store, STATUS_RUNNING, STATUS_DONE, STATUS_ERROR

logger = logging.getLogger(__name__)


def run_pipeline_in_background(
    job_id: str,
    pipeline_fn: Callable[..., Any],
    *args,
    **kwargs,
) -> None:
    """
    Execute `pipeline_fn(*args, **kwargs)` in a background thread.
    Updates the JobStore with status transitions and the final result.

    Usage (inside a FastAPI route):
        job_id = generate_job_id("detect")
        job_store.create(job_id, config={...})
        run_pipeline_in_background(job_id, _run_pipeline, df, sample_size=200)
        return {"job_id": job_id, "status": "pending"}
    """

    def _worker():
        try:
            job_store.set_running(job_id)
            logger.info(f"[{job_id}] Pipeline started")

            result = pipeline_fn(*args, **kwargs)

            job_store.set_done(job_id, result)
            logger.info(f"[{job_id}] Pipeline completed successfully")
        except Exception as exc:
            logger.exception(f"[{job_id}] Pipeline failed: {exc}")
            job_store.set_error(job_id, str(exc))

    thread = threading.Thread(target=_worker, daemon=True, name=f"pipeline-{job_id}")
    thread.start()
    logger.info(f"[{job_id}] Background thread launched (thread={thread.name})")
