const PDFDocument = require('pdfkit');
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

/**
 * ReportGenerator - Generates security reports in PDF, HTML, and SARIF formats
 */
class ReportGenerator {
    constructor() {
        this.templatePath = path.join(__dirname, 'templates', 'report.hbs');
    }

    /**
     * Calculate security score based on vulnerabilities
     */
    calculateSecurityScore(vulnerabilities) {
        if (!vulnerabilities || vulnerabilities.length === 0) {
            return { score: 100, grade: 'A', details: 'No vulnerabilities detected' };
        }

        let score = 100;
        const weights = { HIGH: 25, MEDIUM: 10, LOW: 3 };

        vulnerabilities.forEach(vuln => {
            const severity = vuln.severity?.toUpperCase() || 'LOW';
            score -= weights[severity] || 3;
        });

        score = Math.max(0, score);

        let grade;
        if (score >= 90) grade = 'A';
        else if (score >= 80) grade = 'B';
        else if (score >= 70) grade = 'C';
        else if (score >= 60) grade = 'D';
        else grade = 'F';

        return {
            score,
            grade,
            details: `${vulnerabilities.length} vulnerabilities found`
        };
    }

    /**
     * Generate PDF report
     */
    async generatePDF(reportData) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(24).fillColor('#1a365d').text('DevSecOps Security Report', { align: 'center' });
            doc.moveDown();

            // Report metadata
            doc.fontSize(12).fillColor('#4a5568');
            doc.text(`Report ID: ${reportData.id}`);
            doc.text(`Generated: ${new Date().toISOString()}`);
            doc.text(`Scan ID: ${reportData.scan_id || 'N/A'}`);
            doc.moveDown();

            // Security Score
            const metrics = reportData.metrics || this.calculateSecurityScore(reportData.vulnerabilities);
            doc.fontSize(16).fillColor('#1a365d').text('Security Score');
            doc.moveDown(0.5);

            const scoreColor = metrics.score >= 80 ? '#38a169' : metrics.score >= 60 ? '#d69e2e' : '#e53e3e';
            doc.fontSize(36).fillColor(scoreColor).text(`${metrics.score}/100 (${metrics.grade})`, { align: 'center' });
            doc.moveDown();

            // Vulnerabilities Summary
            doc.fontSize(16).fillColor('#1a365d').text('Vulnerabilities Summary');
            doc.moveDown(0.5);

            const vulns = reportData.vulnerabilities || [];
            const summary = {
                HIGH: vulns.filter(v => v.severity === 'HIGH').length,
                MEDIUM: vulns.filter(v => v.severity === 'MEDIUM').length,
                LOW: vulns.filter(v => v.severity === 'LOW').length
            };

            doc.fontSize(12).fillColor('#4a5568');
            doc.fillColor('#e53e3e').text(`HIGH: ${summary.HIGH}`, { continued: true });
            doc.fillColor('#d69e2e').text(`   MEDIUM: ${summary.MEDIUM}`, { continued: true });
            doc.fillColor('#38a169').text(`   LOW: ${summary.LOW}`);
            doc.moveDown();

            // Vulnerability Details
            if (vulns.length > 0) {
                doc.fontSize(16).fillColor('#1a365d').text('Vulnerability Details');
                doc.moveDown(0.5);

                vulns.slice(0, 10).forEach((vuln, index) => {
                    const sevColor = vuln.severity === 'HIGH' ? '#e53e3e' : vuln.severity === 'MEDIUM' ? '#d69e2e' : '#38a169';
                    doc.fontSize(12).fillColor(sevColor).text(`[${vuln.severity}] ${vuln.rule_id || vuln.id || `Vuln-${index + 1}`}`);
                    doc.fontSize(10).fillColor('#4a5568').text(vuln.description || 'No description');
                    if (vuln.remediation) {
                        doc.fontSize(10).fillColor('#2b6cb0').text(`Fix: ${vuln.remediation}`);
                    }
                    doc.moveDown(0.5);
                });

                if (vulns.length > 10) {
                    doc.fontSize(10).fillColor('#718096').text(`... and ${vulns.length - 10} more vulnerabilities`);
                }
            }

            // Suggestions
            if (reportData.suggestions && reportData.suggestions.length > 0) {
                doc.addPage();
                doc.fontSize(16).fillColor('#1a365d').text('Remediation Suggestions');
                doc.moveDown(0.5);

                reportData.suggestions.forEach((suggestion, index) => {
                    doc.fontSize(12).fillColor('#4a5568').text(`${index + 1}. ${suggestion.title || suggestion}`);
                    if (suggestion.description) {
                        doc.fontSize(10).text(suggestion.description);
                    }
                    doc.moveDown(0.3);
                });
            }

            // Pipeline History
            if (reportData.pipeline_history && reportData.pipeline_history.length > 0) {
                doc.moveDown();
                doc.fontSize(16).fillColor('#1a365d').text('Pipeline History');
                doc.moveDown(0.5);

                reportData.pipeline_history.slice(0, 5).forEach((entry, index) => {
                    doc.fontSize(10).fillColor('#4a5568')
                        .text(`${entry.date || 'N/A'}: Score ${entry.score || 'N/A'} - ${entry.status || 'completed'}`);
                });
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).fillColor('#a0aec0')
                .text('Generated by SafeOps-LogMiner ReportGenerator', { align: 'center' });

            doc.end();
        });
    }

    /**
     * Generate HTML report using Handlebars template
     */
    async generateHTML(reportData) {
        const metrics = reportData.metrics || this.calculateSecurityScore(reportData.vulnerabilities);
        const vulns = reportData.vulnerabilities || [];

        const templateData = {
            ...reportData,
            generatedAt: new Date().toISOString(),
            metrics,
            summary: {
                high: vulns.filter(v => v.severity === 'HIGH').length,
                medium: vulns.filter(v => v.severity === 'MEDIUM').length,
                low: vulns.filter(v => v.severity === 'LOW').length,
                total: vulns.length
            },
            scoreClass: metrics.score >= 80 ? 'good' : metrics.score >= 60 ? 'warning' : 'critical'
        };

        // Try to load template file, fall back to inline template
        let templateSource;
        try {
            templateSource = fs.readFileSync(this.templatePath, 'utf8');
        } catch (error) {
            templateSource = this.getInlineTemplate();
        }

        const template = Handlebars.compile(templateSource);
        return template(templateData);
    }

    /**
     * Generate SARIF format report (Static Analysis Results Interchange Format)
     */
    generateSARIF(reportData) {
        const vulns = reportData.vulnerabilities || [];

        const sarif = {
            $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
            version: '2.1.0',
            runs: [{
                tool: {
                    driver: {
                        name: 'SafeOps-LogMiner',
                        version: '1.0.0',
                        informationUri: 'https://github.com/safeops-logminer',
                        rules: vulns.map((vuln, index) => ({
                            id: vuln.rule_id || `RULE-${index + 1}`,
                            name: vuln.rule_id || `Vulnerability ${index + 1}`,
                            shortDescription: {
                                text: vuln.description || 'Security vulnerability detected'
                            },
                            fullDescription: {
                                text: vuln.description || 'Security vulnerability detected'
                            },
                            defaultConfiguration: {
                                level: this.mapSeverityToSARIF(vuln.severity)
                            },
                            helpUri: vuln.reference_url || undefined
                        }))
                    }
                },
                results: vulns.map((vuln, index) => ({
                    ruleId: vuln.rule_id || `RULE-${index + 1}`,
                    level: this.mapSeverityToSARIF(vuln.severity),
                    message: {
                        text: vuln.description || 'Security vulnerability detected'
                    },
                    locations: [{
                        physicalLocation: {
                            artifactLocation: {
                                uri: vuln.affected_resource || vuln.file || 'unknown'
                            }
                        }
                    }],
                    fixes: vuln.remediation ? [{
                        description: {
                            text: vuln.remediation
                        }
                    }] : undefined
                })),
                invocations: [{
                    executionSuccessful: true,
                    endTimeUtc: new Date().toISOString()
                }]
            }]
        };

        return JSON.stringify(sarif, null, 2);
    }

    /**
     * Map severity to SARIF level
     */
    mapSeverityToSARIF(severity) {
        const mapping = {
            'HIGH': 'error',
            'MEDIUM': 'warning',
            'LOW': 'note'
        };
        return mapping[severity?.toUpperCase()] || 'note';
    }

    /**
     * Inline HTML template fallback
     */
    getInlineTemplate() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Report - {{id}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f7fafc; color: #2d3748; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .meta { opacity: 0.9; font-size: 0.9rem; }
    .score-card { background: white; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
    .score { font-size: 4rem; font-weight: bold; }
    .score.good { color: #38a169; }
    .score.warning { color: #d69e2e; }
    .score.critical { color: #e53e3e; }
    .grade { font-size: 1.5rem; color: #718096; }
    .summary { display: flex; justify-content: center; gap: 2rem; margin-top: 1rem; }
    .summary-item { text-align: center; }
    .summary-count { font-size: 2rem; font-weight: bold; }
    .high { color: #e53e3e; }
    .medium { color: #d69e2e; }
    .low { color: #38a169; }
    .section { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .section h2 { color: #1a365d; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    .vuln-item { padding: 1rem; border-left: 4px solid; margin-bottom: 0.5rem; background: #f7fafc; }
    .vuln-item.HIGH { border-color: #e53e3e; }
    .vuln-item.MEDIUM { border-color: #d69e2e; }
    .vuln-item.LOW { border-color: #38a169; }
    .severity-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; color: white; }
    .severity-badge.HIGH { background: #e53e3e; }
    .severity-badge.MEDIUM { background: #d69e2e; }
    .severity-badge.LOW { background: #38a169; }
    .footer { text-align: center; color: #a0aec0; font-size: 0.85rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 DevSecOps Security Report</h1>
      <div class="meta">
        <p>Report ID: {{id}}</p>
        <p>Generated: {{generatedAt}}</p>
        <p>Scan ID: {{scan_id}}</p>
      </div>
    </div>
    
    <div class="score-card">
      <div class="score {{scoreClass}}">{{metrics.score}}/100</div>
      <div class="grade">Grade: {{metrics.grade}}</div>
      <div class="summary">
        <div class="summary-item">
          <div class="summary-count high">{{summary.high}}</div>
          <div>High</div>
        </div>
        <div class="summary-item">
          <div class="summary-count medium">{{summary.medium}}</div>
          <div>Medium</div>
        </div>
        <div class="summary-item">
          <div class="summary-count low">{{summary.low}}</div>
          <div>Low</div>
        </div>
      </div>
    </div>
    
    {{#if vulnerabilities.length}}
    <div class="section">
      <h2>Vulnerabilities ({{summary.total}})</h2>
      {{#each vulnerabilities}}
      <div class="vuln-item {{severity}}">
        <span class="severity-badge {{severity}}">{{severity}}</span>
        <strong>{{rule_id}}</strong>
        <p>{{description}}</p>
        {{#if remediation}}<p><em>Fix: {{remediation}}</em></p>{{/if}}
      </div>
      {{/each}}
    </div>
    {{/if}}
    
    <div class="footer">
      <p>Generated by SafeOps-LogMiner ReportGenerator</p>
    </div>
  </div>
</body>
</html>
    `;
    }
}

module.exports = ReportGenerator;
