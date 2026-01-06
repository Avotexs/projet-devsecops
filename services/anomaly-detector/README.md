# AnomalyDetector Service

ML-powered anomaly detection service for behavioral analysis in the SafeOps-LogMiner project.

## Overview

This service uses Machine Learning to detect anomalous behaviors in job executions:
- **Unusual execution durations** - Jobs taking significantly longer or shorter than normal
- **Job behavior changes** - Sudden shifts in execution patterns
- **Abnormal delays** - Unexpected gaps between executions
- **Resource usage anomalies** - Unusual CPU/memory consumption

## Technologies

- **FastAPI** - Web framework
- **Scikit-learn** - IsolationForest for outlier detection
- **TensorFlow/Keras** - Autoencoder for pattern learning
- **TimescaleDB** - Time-series database for historical data
- **SQLAlchemy** - Database ORM

## API Endpoints

### POST /anomaly

Detect anomalies in execution data.

**Request:**
```json
{
  "job_id": "job-001",
  "executions": [
    {
      "timestamp": "2024-01-01T10:00:00Z",
      "duration_ms": 1200,
      "status": "success",
      "resource_usage": {"cpu": 45.2, "memory": 512.0}
    }
  ],
  "use_autoencoder": false,
  "learn_from_history": true
}
```

**Response:**
```json
{
  "job_id": "job-001",
  "model_used": "isolation_forest",
  "total_executions": 5,
  "anomalies_found": 1,
  "results": [
    {
      "execution_index": 3,
      "timestamp": "2024-01-01T10:15:00Z",
      "is_anomaly": true,
      "anomaly_score": 0.85,
      "anomaly_type": "duration_anomaly",
      "description": "Unusual duration detected: 15000ms"
    }
  ],
  "summary": {
    "total_analyzed": 5,
    "anomalies_detected": 1,
    "anomaly_rate": 0.2
  }
}
```

### GET /history/{job_id}

Retrieve historical execution data for a job.

### GET /reports/{job_id}

Get past anomaly detection reports.

### GET /health

Health check endpoint.

## Running Locally

```bash
# Start with Docker Compose
docker-compose up -d timescaledb anomaly-detector

# Test health endpoint
curl http://localhost:8003/health

# Test anomaly detection
curl -X POST http://localhost:8003/anomaly \
  -H "Content-Type: application/json" \
  -d '{"job_id": "test-job", "executions": [...]}'
```

## ML Models

### IsolationForest (Default)

- Best for: Quick outlier detection
- Works well with small datasets
- No training required

### Autoencoder

- Best for: Complex pattern learning
- Requires more data (10+ samples)
- Better for recurring patterns

Set `use_autoencoder: true` in the request to use the Autoencoder model.
