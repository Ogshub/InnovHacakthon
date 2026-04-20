"""
LinguaLink — Pydantic Schemas

Updated schemas including:
  - JobStatus, JobResult for async job polling
  - DetectionConfig for runtime-configurable pipeline parameters
  - ExplainedPair with reason, confidence_tier, duplicate_type
  - ClusterDetail with enriched fields (max/min confidence, signal breakdown)
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any


# ── Existing record schemas ────────────────────────────────────────────────────

class RecordBase(BaseModel):
    name: str
    description: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    translated_to_en: Optional[str] = None
    duplicate_type: Optional[str] = None
    record_group_id: Optional[str] = None

class RecordCreate(RecordBase):
    project_id: Optional[str] = None

class RecordResponse(RecordBase):
    id: int
    project_id: Optional[str] = None
    cluster_id: Optional[int] = None
    confidence_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedRecords(BaseModel):
    total: int
    page: int
    size: int
    items: List[RecordResponse]


# ── Detection configuration ───────────────────────────────────────────────────

class DetectionConfig(BaseModel):
    """Runtime pipeline configuration passed by the client."""
    threshold: float   = Field(0.55, ge=0.0, le=1.0, description="Fused score threshold for duplicate pairs")
    sample_size: int   = Field(200,  ge=1,   le=5000, description="Max records to process in one run")
    model: Optional[str] = Field(None, description="Embedding model override (leave None for default)")
    weight_semantic: Optional[float]   = Field(None, ge=0.0, le=1.0)
    weight_phonetic: Optional[float]   = Field(None, ge=0.0, le=1.0)
    weight_structural: Optional[float] = Field(None, ge=0.0, le=1.0)


# ── Explained pair ────────────────────────────────────────────────────────────

class SignalScores(BaseModel):
    semantic: float
    phonetic: float
    structural: float

class ExplainedPair(BaseModel):
    """A duplicate pair enriched with human-readable explanation."""
    i: int
    j: int
    name_a: str
    name_b: str
    fused_score: float
    confidence_tier: str              # high | medium | borderline
    duplicate_type: str               # transliteration | semantic | structural | near-exact | mixed-signal
    dominant_signal: str              # semantic | phonetic | structural
    reason: str                       # human-readable sentence
    signal_scores: SignalScores


# ── Cluster detail ────────────────────────────────────────────────────────────

class ClusterDetail(BaseModel):
    """Enriched cluster summary."""
    cluster_id: int
    members: List[int]
    size: int
    avg_confidence: float
    max_confidence: float
    min_confidence: float
    avg_semantic: float
    avg_phonetic: float
    avg_structural: float
    dominant_language: Optional[str] = None
    dominant_category: Optional[str] = None


# ── Async job schemas ─────────────────────────────────────────────────────────

class JobStatus(BaseModel):
    """Lightweight status response for polling."""
    job_id: str
    status: str        # pending | running | done | error
    progress: int      # 0–100
    created_at: float
    completed_at: Optional[float] = None
    error: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class JobResult(BaseModel):
    """Full job result including pipeline output."""
    job_id: str
    status: str
    progress: int
    created_at: float
    completed_at: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ── Compare endpoint ──────────────────────────────────────────────────────────

class CompareRequest(BaseModel):
    """Request body for POST /api/compare."""
    text_a: str
    text_b: str
