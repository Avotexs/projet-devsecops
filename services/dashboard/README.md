# Dashboard Service

React-based frontend dashboard for CI/CD security monitoring.

## Overview

Visual dashboard providing real-time insights into CI/CD pipeline security health:
- Security score tracking
- Vulnerability summaries by severity
- Alerts timeline
- Fix history charts
- Pipeline filtering

## Technologies

- **React.js 18** - UI framework
- **TailwindCSS** - Styling
- **Chart.js** - Data visualization
- **Axios** - API integration

## Features

- 📊 **Security Score Cards** - At-a-glance metrics
- 📈 **Trend Charts** - Score progression over time
- 🔴 **Severity Distribution** - Donut chart breakdown
- ⚠️ **Vulnerability List** - Recent findings
- 🔔 **Alerts Timeline** - Real-time notifications
- 🔧 **Fix History** - Remediation tracking
- 🔍 **Filters** - Pipeline and time range selection

## Running Locally

```bash
# Development
cd services/dashboard
npm install
npm start

# Production (Docker)
docker-compose up -d dashboard
```

Access at: http://localhost:3000

## API Integration

The dashboard connects to:
- **vuln-detector** (port 8001) - Vulnerability data
- **fix-suggester** (port 8002) - Fix suggestions
- **anomaly-detector** (port 8003) - Anomaly reports
- **report-generator** (port 8004) - Security reports
