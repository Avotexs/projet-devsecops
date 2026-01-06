from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


# ==================== SQLAlchemy Models ====================

class AnomalyReport(Base):
    """Stores anomaly detection results."""
    __tablename__ = "anomaly_reports"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    anomalies = Column(JSON)
    summary = Column(JSON)
    model_used = Column(String)  # 'isolation_forest' or 'autoencoder'


class BehaviorHistory(Base):
    """Stores historical execution data for learning patterns."""
    __tablename__ = "behavior_history"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, index=True)
    timestamp = Column(DateTime(timezone=True), index=True)
    duration_ms = Column(Float)
    status = Column(String)
    resource_usage = Column(JSON)  # CPU, memory, etc.
    exec_metadata = Column(JSON)  # execution metadata (renamed from 'metadata' which is reserved)


# ==================== Pydantic Models ====================

class ExecutionData(BaseModel):
    """Single execution record."""
    timestamp: datetime
    duration_ms: float
    status: str = "success"
    resource_usage: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None


class AnomalyRequest(BaseModel):
    """Request payload for anomaly detection."""
    job_id: str
    executions: List[ExecutionData]
    use_autoencoder: bool = False  # Use IsolationForest by default
    learn_from_history: bool = True


class AnomalyResult(BaseModel):
    """Individual anomaly detection result."""
    execution_index: int
    timestamp: datetime
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: Optional[str] = None  # 'duration', 'behavior_change', 'delay', etc.
    description: str


class AnomalyResponse(BaseModel):
    """Response from anomaly detection."""
    job_id: str
    model_used: str
    total_executions: int
    anomalies_found: int
    results: List[AnomalyResult]
    summary: Dict[str, Any]
