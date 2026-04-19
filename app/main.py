"""
LinguaLink — FastAPI Main Entry Point
Multilingual Duplicate Record Detection Engine
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import router, init_engines

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load ML models. Shutdown: cleanup."""
    logger.info("🚀 LinguaLink starting up...")
    init_engines()
    logger.info("✅ All engines initialized")
    yield
    logger.info("👋 LinguaLink shutting down")


app = FastAPI(
    title="LinguaLink",
    description="Multilingual Duplicate Record Detection using Triple-Signal Matching",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(router, prefix="/api")

# Static files (dashboard)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
