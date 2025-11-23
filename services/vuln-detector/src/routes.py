from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import ScanRequest, ScanResponse, VulnerabilityReport
from .rules_engine import RulesEngine
import uuid

router = APIRouter()
rules_engine = RulesEngine()

@router.post("/scan", response_model=ScanResponse)
def scan_logs(request: ScanRequest, db: Session = Depends(get_db)):
    scan_id = request.scan_id or str(uuid.uuid4())
    
    # Run rules engine
    vulnerabilities = rules_engine.evaluate(request.logs)
    
    # Calculate summary
    summary = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for v in vulnerabilities:
        if v.severity in summary:
            summary[v.severity] += 1
            
    # Save report to DB
    report = VulnerabilityReport(
        scan_id=scan_id,
        findings=[v.dict() for v in vulnerabilities]
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return ScanResponse(
        scan_id=scan_id,
        vulnerabilities=vulnerabilities,
        summary=summary
    )
