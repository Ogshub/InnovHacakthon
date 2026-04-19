"""
LinguaLink — Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any

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

    model_config = ConfigDict(from_attributes=True)

class PaginatedRecords(BaseModel):
    total: int
    page: int
    size: int
    items: List[RecordResponse]
