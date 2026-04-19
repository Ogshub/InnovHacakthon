"""
LinguaLink — SQLAlchemy Database Models
"""
from sqlalchemy import Column, Integer, String, Text, Float
from app.database import Base

class DatasetRecord(Base):
    __tablename__ = "dataset_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, index=True) # E.g., original record group ID
    
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String, index=True)
    category = Column(String, index=True)
    translated_to_en = Column(Text, nullable=True)
    
    duplicate_type = Column(String, index=True)
    record_group_id = Column(String, index=True)
