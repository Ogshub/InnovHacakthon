"""
LinguaLink — FastAPI Main Entry Point
Multilingual Duplicate Record Detection Engine

Changes vs v1:
  - Creates DB tables on startup (models.Job, models.DatasetRecord)
  - Logs model name and warm-up timing
  - Adds X-Processing-Time response header middleware
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app import models
from app.routes import router, init_engines

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables, load ML models. Shutdown: cleanup."""
    # Create all SQLAlchemy tables
    logger.info("📋 Creating database tables...")
    models.Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables ready")

    # Load ML models (logs model name + warmup timing internally)
    import asyncio
    logger.info("🚀 LinguaLink starting up — loading ML engines...")
    t0 = time.time()
    await asyncio.to_thread(init_engines)
    logger.info(f"✅ All engines initialized in {time.time() - t0:.2f}s")

    yield

    logger.info("👋 LinguaLink shutting down")


app = FastAPI(
    title="LinguaLink",
    description="Multilingual Duplicate Record Detection using Triple-Signal Matching",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_processing_time_header(request: Request, call_next) -> Response:
    """Attach X-Processing-Time header to every response (milliseconds)."""
    t0 = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    response.headers["X-Processing-Time"] = f"{elapsed_ms:.1f}ms"
    return response


# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(router, prefix="/api")

# Static files (dashboard) — must be last so it doesn't shadow /api
app.mount("/", StaticFiles(directory="static", html=True), name="static")
