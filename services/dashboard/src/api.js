import axios from 'axios';

// API base URLs - configurable via environment
const API_URLS = {
    vulnDetector: process.env.REACT_APP_VULN_API || 'http://localhost:8001',
    fixSuggester: process.env.REACT_APP_FIX_API || 'http://localhost:8002',
    anomalyDetector: process.env.REACT_APP_ANOMALY_API || 'http://localhost:8003',
    reportGenerator: process.env.REACT_APP_REPORT_API || 'http://localhost:8004',
};

// Create axios instances
const vulnApi = axios.create({ baseURL: API_URLS.vulnDetector });
const fixApi = axios.create({ baseURL: API_URLS.fixSuggester });
const anomalyApi = axios.create({ baseURL: API_URLS.anomalyDetector });
const reportApi = axios.create({ baseURL: API_URLS.reportGenerator });

// Dashboard API service
const api = {
    // Get vulnerability scan results
    async getVulnerabilities() {
        try {
            const response = await vulnApi.get('/scan');
            return response.data;
        } catch (error) {
            console.log('Using mock vulnerability data');
            return getMockVulnerabilities();
        }
    },

    // Get fix suggestions
    async getFixSuggestions() {
        try {
            const response = await fixApi.get('/suggestions');
            return response.data;
        } catch (error) {
            console.log('Using mock fix suggestions');
            return getMockSuggestions();
        }
    },

    // Get anomaly reports
    async getAnomalies() {
        try {
            const response = await anomalyApi.get('/reports/dashboard');
            return response.data;
        } catch (error) {
            console.log('Using mock anomaly data');
            return getMockAnomalies();
        }
    },

    // Detect anomalies with ML
    async detectAnomalies(jobId, executions, useAutoencoder = false) {
        const response = await anomalyApi.post('/anomaly', {
            job_id: jobId,
            executions: executions,
            use_autoencoder: useAutoencoder,
            learn_from_history: true
        });
        return response.data;
    },

    // Get security reports list
    async getReports() {
        try {
            const response = await reportApi.get('/reports');
            return response.data;
        } catch (error) {
            console.log('Using mock reports');
            return getMockReports();
        }
    },

    // Get dashboard summary data
    async getDashboardData() {
        try {
            // Aggregate data from all services
            const [vulns, fixes, anomalies, reports] = await Promise.all([
                this.getVulnerabilities(),
                this.getFixSuggestions(),
                this.getAnomalies(),
                this.getReports()
            ]);

            return {
                vulnerabilities: vulns,
                suggestions: fixes,
                anomalies: anomalies,
                reports: reports,
                summary: calculateSummary(vulns)
            };
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return getMockDashboardData();
        }
    },

    // Scan YAML content
    async scanYaml(yamlContent) {
        try {
            // 1. Pre-process YAML to simulate "logs" for vuln-detector
            // This is needed because vuln-detector expects structured logs, not raw YAML
            const simulatedLogs = [];

            // Add full content for secret scanning
            simulatedLogs.push({ source: 'yaml_content', log_content: yamlContent });

            // specific check for unpinned actions (regex parsing)
            const usesRegex = /uses:\s*([\w\-\/]+)@([^\s]+)/g;
            let match;
            while ((match = usesRegex.exec(yamlContent)) !== null) {
                simulatedLogs.push({
                    source: 'github_action',
                    action_name: match[1],
                    action_version: match[2], // e.g. "v2" or "main"
                    line: 0 // Placeholder
                });
            }

            // check for permissions
            if (yamlContent.includes('permissions: write-all') || yamlContent.includes('permissions:\n  write-all')) {
                simulatedLogs.push({ source: 'workflow_config', permissions: 'write-all' });
            }

            // 2. Call Vuln Detector
            const scanResponse = await vulnApi.post('/scan', {
                logs: simulatedLogs,
                scan_id: 'manual-scan-' + Date.now()
            });

            const vulnerabilities = scanResponse.data.vulnerabilities.map(v => ({
                type: mapRuleToType(v.rule_id),
                line: 0,
                details: v.description
            }));

            // 3. Call Fix Suggester if vulnerabilities found
            let fixedYaml = yamlContent;
            let fixes = [];

            if (vulnerabilities.length > 0) {
                const fixResponse = await fixApi.post('/fix', {
                    workflow_yaml: yamlContent,
                    vulnerabilities: vulnerabilities
                });

                fixes = fixResponse.data.fixes;
                fixedYaml = fixResponse.data.fixed_yaml;
            }

            return {
                vulnerabilities: scanResponse.data.vulnerabilities,
                fixes: fixes,
                fixedYaml: fixedYaml,
                summary: scanResponse.data.summary
            };

        } catch (error) {
            console.error("Scan failed:", error);
            throw error;
        }
    }
};

// Helper to map rule IDs to fix-suggester types
function mapRuleToType(ruleId) {
    const mapping = {
        'UNPINNED_ACTION': 'unpinned_action',
        'EXPOSED_SECRET': 'hardcoded_secret',
        'BROAD_PERMISSIONS': 'excessive_permissions'
    };
    return mapping[ruleId] || 'unknown';
}

// Calculate summary from vulnerabilities
function calculateSummary(vulns) {
    const findings = vulns?.vulnerabilities || vulns?.findings || [];
    return {
        total: findings.length,
        high: findings.filter(v => v.severity === 'HIGH').length,
        medium: findings.filter(v => v.severity === 'MEDIUM').length,
        low: findings.filter(v => v.severity === 'LOW').length,
        score: Math.max(0, 100 - (findings.filter(v => v.severity === 'HIGH').length * 25)
            - (findings.filter(v => v.severity === 'MEDIUM').length * 10)
            - (findings.filter(v => v.severity === 'LOW').length * 3))
    };
}

// Mock data functions
function getMockVulnerabilities() {
    return {
        scan_id: 'demo-scan-001',
        vulnerabilities: [
            { rule_id: 'SEC-001', severity: 'HIGH', description: 'SQL Injection in user input', affected_resource: 'api/users.js' },
            { rule_id: 'SEC-002', severity: 'HIGH', description: 'Hardcoded credentials detected', affected_resource: 'config/db.js' },
            { rule_id: 'SEC-003', severity: 'MEDIUM', description: 'Missing HTTPS enforcement', affected_resource: 'server.js' },
            { rule_id: 'SEC-004', severity: 'MEDIUM', description: 'Outdated dependency: lodash', affected_resource: 'package.json' },
            { rule_id: 'SEC-005', severity: 'LOW', description: 'Verbose error messages', affected_resource: 'middleware/error.js' },
        ],
        summary: { HIGH: 2, MEDIUM: 2, LOW: 1 }
    };
}

function getMockSuggestions() {
    return {
        suggestions: [
            { id: 1, title: 'Use parameterized queries', priority: 'HIGH', status: 'pending' },
            { id: 2, title: 'Move secrets to environment variables', priority: 'HIGH', status: 'in_progress' },
            { id: 3, title: 'Enable HSTS headers', priority: 'MEDIUM', status: 'completed' },
        ]
    };
}

function getMockAnomalies() {
    return {
        reports: [
            { id: 1, job_id: 'build-001', anomalies_found: 2, created_at: new Date().toISOString() },
            { id: 2, job_id: 'deploy-002', anomalies_found: 0, created_at: new Date(Date.now() - 86400000).toISOString() },
        ]
    };
}

function getMockReports() {
    return {
        reports: [
            { id: 'rpt-001', scan_id: 'scan-001', created_at: new Date().toISOString(), status: 'generated' },
            { id: 'rpt-002', scan_id: 'scan-002', created_at: new Date(Date.now() - 86400000).toISOString(), status: 'generated' },
        ]
    };
}

function getMockDashboardData() {
    const vulns = getMockVulnerabilities();
    return {
        vulnerabilities: vulns,
        suggestions: getMockSuggestions(),
        anomalies: getMockAnomalies(),
        reports: getMockReports(),
        summary: calculateSummary(vulns),
        pipelineHistory: [
            { date: '2024-01-20', score: 85, vulns: 5 },
            { date: '2024-01-19', score: 78, vulns: 8 },
            { date: '2024-01-18', score: 72, vulns: 12 },
            { date: '2024-01-17', score: 68, vulns: 15 },
            { date: '2024-01-16', score: 65, vulns: 18 },
            { date: '2024-01-15', score: 60, vulns: 20 },
            { date: '2024-01-14', score: 55, vulns: 22 },
        ]
    };
}

export default api;
