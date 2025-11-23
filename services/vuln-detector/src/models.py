from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from .database import Base
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# SQLAlchemy Models
class VulnerabilityReport(Base):
    __tablename__ = "vulnerability_reports"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    findings = Column(JSON)

# Pydantic Models
class ScanRequest(BaseModel):
    logs: List[Dict[str, Any]]
    scan_id: Optional[str] = None

class Vulnerability(BaseModel):
    rule_id: str
    severity: str
    description: str
    affected_resource: str
    remediation: Optional[str] = None

class ScanResponse(BaseModel):
    scan_id: str
    vulnerabilities: List[Vulnerability]
    summary: Dict[str, int]
