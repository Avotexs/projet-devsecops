from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from .models import (
    AnomalyRequest, AnomalyResponse, AnomalyResult,
    AnomalyReport, BehaviorHistory
)
from .anomaly_engine import AnomalyEngine
from datetime import datetime
import logging
import json
import numpy as np

logger = logging.getLogger(__name__)

# Helper to convert numpy types to Python native types for JSON serialization
def convert_to_json_serializable(obj):
    if isinstance(obj, dict):
        return {k: convert_to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_serializable(item) for item in obj]
    elif isinstance(obj, (np.bool_, np.bool8)):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

router = APIRouter()
anomaly_engine = AnomalyEngine(contamination=0.1)


@router.post("/anomaly", response_model=AnomalyResponse)
def detect_anomalies(request: AnomalyRequest, db: Session = Depends(get_db)):
    """
    Detect anomalies in execution data using ML models.
    
    This endpoint analyzes behavioral patterns to detect:
    - Unusual execution durations
    - Job behavior changes
    - Abnormal delays between executions
    - Resource usage anomalies
    
    Args:
        request: AnomalyRequest containing job_id and executions list
        
    Returns:
        AnomalyResponse with detection results and summary
    """
    try:
        # Convert executions to dict format for engine
        executions = [
            {
                'timestamp': exec_data.timestamp.isoformat(),
                'duration_ms': exec_data.duration_ms,
                'status': exec_data.status,
                'resource_usage': exec_data.resource_usage,
                'metadata': exec_data.metadata
            }
            for exec_data in request.executions
        ]
        
        # Fetch historical data if requested
        historical_data = []
        if request.learn_from_history:
            history_records = db.query(BehaviorHistory).filter(
                BehaviorHistory.job_id == request.job_id
            ).order_by(BehaviorHistory.timestamp.desc()).limit(100).all()
            
            historical_data = [
                {
                    'timestamp': record.timestamp.isoformat(),
                    'duration_ms': record.duration_ms,
                    'status': record.status,
                    'resource_usage': record.resource_usage
                }
                for record in history_records
            ]
        
        # Run anomaly detection
        if request.use_autoencoder:
            results, summary = anomaly_engine.detect_with_autoencoder(
                executions, historical_data
            )
            model_used = 'autoencoder'
        else:
            results, summary = anomaly_engine.detect_with_isolation_forest(
                executions, historical_data
            )
            model_used = 'isolation_forest'
        
        # Store current executions in history for future learning
        for exec_data in request.executions:
            history_entry = BehaviorHistory(
                job_id=request.job_id,
                timestamp=exec_data.timestamp,
                duration_ms=exec_data.duration_ms,
                status=exec_data.status,
                resource_usage=exec_data.resource_usage,
                exec_metadata=exec_data.metadata
            )
            db.add(history_entry)
        
        # Save detection report - convert numpy types to Python native for JSON storage
        serializable_results = convert_to_json_serializable(results)
        serializable_summary = convert_to_json_serializable(summary)
        
        anomaly_results = [r for r in serializable_results if r['is_anomaly']]
        report = AnomalyReport(
            job_id=request.job_id,
            anomalies=serializable_results,
            summary=serializable_summary,
            model_used=model_used
        )
        db.add(report)
        db.commit()
        
        # Build response
        response_results = [
            AnomalyResult(
                execution_index=r['execution_index'],
                timestamp=datetime.fromisoformat(r['timestamp']) if isinstance(r['timestamp'], str) else r['timestamp'],
                is_anomaly=r['is_anomaly'],
                anomaly_score=r['anomaly_score'],
                anomaly_type=r['anomaly_type'],
                description=r['description']
            )
            for r in results
        ]
        
        return AnomalyResponse(
            job_id=request.job_id,
            model_used=model_used,
            total_executions=len(executions),
            anomalies_found=len(anomaly_results),
            results=response_results,
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")


@router.get("/history/{job_id}")
def get_job_history(job_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Get historical execution data for a job."""
    records = db.query(BehaviorHistory).filter(
        BehaviorHistory.job_id == job_id
    ).order_by(BehaviorHistory.timestamp.desc()).limit(limit).all()
    
    return {
        "job_id": job_id,
        "total_records": len(records),
        "history": [
            {
                "timestamp": record.timestamp.isoformat(),
                "duration_ms": record.duration_ms,
                "status": record.status,
                "resource_usage": record.resource_usage
            }
            for record in records
        ]
    }


@router.get("/reports/{job_id}")
def get_anomaly_reports(job_id: str, limit: int = 10, db: Session = Depends(get_db)):
    """Get anomaly detection reports for a job."""
    reports = db.query(AnomalyReport).filter(
        AnomalyReport.job_id == job_id
    ).order_by(AnomalyReport.created_at.desc()).limit(limit).all()
    
    return {
        "job_id": job_id,
        "total_reports": len(reports),
        "reports": [
            {
                "id": report.id,
                "created_at": report.created_at.isoformat(),
                "model_used": report.model_used,
                "summary": report.summary,
                "anomalies": report.anomalies
            }
            for report in reports
        ]
    }
