# ReportGenerator Service

Node.js microservice for generating DevSecOps security reports in multiple formats.

## Overview

This service generates global security reports integrating vulnerability findings, security metrics, remediation suggestions, and pipeline history evolution.

## Technologies

- **Node.js** with **Express** - Web framework
- **PDFKit** - PDF generation
- **Handlebars** - HTML templating
- **SARIF** - Static Analysis Results Interchange Format
- **PostgreSQL** - Database storage

## API Endpoints

### GET /report/:id

Generate a security report in the specified format.

**Query Parameters:**
- `format` - Output format: `html` (default), `pdf`, or `sarif`
- `scan_id` - Optional scan ID to fetch vulnerability data from

**Examples:**
```bash
# HTML report
curl http://localhost:8004/report/my-report-id

# PDF report
curl http://localhost:8004/report/my-report-id?format=pdf -o report.pdf

# SARIF report (GitHub/GitLab compatible)
curl http://localhost:8004/report/my-report-id?format=sarif
```

### POST /report

Create a new report with custom data.

```bash
curl -X POST http://localhost:8004/report \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "scan-123",
    "vulnerabilities": [...],
    "suggestions": [...],
    "pipeline_history": [...]
  }'
```

### GET /reports

List all generated reports.

### GET /health

Health check endpoint.

## Report Contents

- **Security Score** - 0-100 score with grade (A-F)
- **Vulnerability Summary** - Count by severity (HIGH/MEDIUM/LOW)
- **Vulnerability Details** - Full findings with remediation
- **Suggestions** - Automated fix recommendations
- **Pipeline History** - Score evolution over time

## SARIF Integration

The SARIF format output can be directly uploaded to:
- **GitHub Actions** - Security tab integration
- **GitLab CI** - SAST report integration
- **Azure DevOps** - Security scanning results

## Running Locally

```bash
docker-compose up -d postgres report-generator
curl http://localhost:8004/health
```
