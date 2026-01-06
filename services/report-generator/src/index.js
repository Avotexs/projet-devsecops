const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { connectWithRetry, initDatabase, getReportById, saveReport, getVulnerabilities } = require('./database');
const ReportGenerator = require('./reportGenerator');

const app = express();
const PORT = process.env.PORT || 8000;
const reportGenerator = new ReportGenerator();

app.use(cors()); // Enable CORS for all origins
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'report-generator' });
});

/**
 * GET /report/:id
 * Generate a security report in the specified format (pdf, html, sarif)
 * 
 * Query params:
 * - format: 'pdf' | 'html' | 'sarif' (default: 'html')
 * - scan_id: Optional scan ID to fetch vulnerabilities from
 */
app.get('/report/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const format = (req.query.format || 'html').toLowerCase();
        const scanId = req.query.scan_id;

        // Try to get existing report from database
        let reportData = await getReportById(id);

        if (!reportData) {
            // Create new report with sample/fetched data
            const vulnerabilities = scanId ? await getVulnerabilities(scanId) : getSampleVulnerabilities();

            reportData = {
                id,
                scan_id: scanId || 'demo-scan',
                vulnerabilities,
                suggestions: [
                    { title: 'Update dependencies', description: 'Run npm audit fix to update vulnerable packages' },
                    { title: 'Enable security headers', description: 'Add Helmet.js middleware for HTTP security headers' },
                    { title: 'Implement rate limiting', description: 'Protect APIs from brute force attacks' }
                ],
                pipeline_history: [
                    { date: new Date().toISOString().split('T')[0], score: 85, status: 'completed' },
                    { date: '2024-01-15', score: 78, status: 'completed' },
                    { date: '2024-01-10', score: 72, status: 'completed' }
                ],
                format
            };

            // Save to database
            await saveReport(reportData);
        }

        // Generate report in requested format
        switch (format) {
            case 'pdf':
                const pdfBuffer = await reportGenerator.generatePDF(reportData);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
                return res.send(pdfBuffer);

            case 'sarif':
                const sarifData = reportGenerator.generateSARIF(reportData);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="report-${id}.sarif.json"`);
                return res.send(sarifData);

            case 'html':
            default:
                const html = await reportGenerator.generateHTML(reportData);
                res.setHeader('Content-Type', 'text/html');
                return res.send(html);
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report', details: error.message });
    }
});

/**
 * POST /report
 * Create a new report with custom data
 */
app.post('/report', async (req, res) => {
    try {
        const { vulnerabilities, suggestions, pipeline_history, scan_id } = req.body;
        const id = uuidv4();

        const reportData = {
            id,
            scan_id: scan_id || id,
            vulnerabilities: vulnerabilities || [],
            suggestions: suggestions || [],
            pipeline_history: pipeline_history || [],
            format: 'created'
        };

        await saveReport(reportData);

        res.status(201).json({
            id,
            message: 'Report created successfully',
            links: {
                html: `/report/${id}?format=html`,
                pdf: `/report/${id}?format=pdf`,
                sarif: `/report/${id}?format=sarif`
            }
        });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Failed to create report', details: error.message });
    }
});

/**
 * GET /reports
 * List all reports
 */
app.get('/reports', async (req, res) => {
    try {
        const { pool } = require('./database');
        const result = await pool.query(
            'SELECT id, scan_id, created_at, status FROM security_reports ORDER BY created_at DESC LIMIT 50'
        );
        res.json({ reports: result.rows });
    } catch (error) {
        console.error('Error listing reports:', error);
        res.status(500).json({ error: 'Failed to list reports', details: error.message });
    }
});

// Sample vulnerabilities for demo
function getSampleVulnerabilities() {
    return [
        {
            rule_id: 'SEC-001',
            severity: 'HIGH',
            description: 'SQL Injection vulnerability detected in user input handling',
            affected_resource: 'src/api/users.js',
            remediation: 'Use parameterized queries instead of string concatenation'
        },
        {
            rule_id: 'SEC-002',
            severity: 'HIGH',
            description: 'Hardcoded credentials found in configuration file',
            affected_resource: 'config/database.js',
            remediation: 'Move credentials to environment variables'
        },
        {
            rule_id: 'SEC-003',
            severity: 'MEDIUM',
            description: 'Missing HTTPS enforcement in production',
            affected_resource: 'server.js',
            remediation: 'Enable HTTPS redirect and HSTS headers'
        },
        {
            rule_id: 'SEC-004',
            severity: 'MEDIUM',
            description: 'Outdated dependency with known vulnerability',
            affected_resource: 'package.json',
            remediation: 'Update lodash to version 4.17.21 or later'
        },
        {
            rule_id: 'SEC-005',
            severity: 'LOW',
            description: 'Verbose error messages in production',
            affected_resource: 'src/middleware/error.js',
            remediation: 'Disable detailed error messages in production mode'
        }
    ];
}

// Start server
async function startServer() {
    try {
        await connectWithRetry();
        await initDatabase();

        app.listen(PORT, () => {
            console.log(`ReportGenerator service running on port ${PORT}`);
            console.log('Available endpoints:');
            console.log(`  GET  /health`);
            console.log(`  GET  /report/:id?format=html|pdf|sarif`);
            console.log(`  POST /report`);
            console.log(`  GET  /reports`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
