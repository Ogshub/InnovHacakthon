"""
LinguaLink — SQLAlchemy Database Models

Updated:
  - Job model for async job tracking (id, status, created_at, completed_at, error, config_json)
  - DatasetRecord gets cluster_id and confidence_score columns
"""

from sqlalchemy import Column, Integer, String, Text, Float, JSON
from app.database import Base


class DatasetRecord(Base):
    __tablename__ = "dataset_records"

    id               = Column(Integer, primary_key=True, index=True)
    project_id       = Column(String, index=True)

    name             = Column(Text, nullable=False)
    description      = Column(Text, nullable=True)
    language         = Column(String, index=True)
    category         = Column(String, index=True)
    translated_to_en = Column(Text, nullable=True)

    duplicate_type   = Column(String, index=True)
    record_group_id  = Column(String, index=True)

    # Added: filled in after pipeline run
    cluster_id       = Column(Integer, nullable=True, index=True)
    confidence_score = Column(Float, nullable=True)


class Job(Base):
    """Persisted record of an async detection job."""
    __tablename__ = "jobs"

    id           = Column(String, primary_key=True, index=True)  # job_id (e.g. "detect-abc123")
    status       = Column(String, nullable=False, default="pending")  # pending|running|done|error
    created_at   = Column(Float, nullable=False)   # Unix timestamp
    completed_at = Column(Float, nullable=True)
    error        = Column(Text, nullable=True)
    config_json  = Column(JSON, nullable=True)     # DetectionConfig as dict
