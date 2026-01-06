const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@postgres:5432/vulndetector'
});

// Retry connection on startup
async function connectWithRetry(maxRetries = 5, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      console.log('Database connected successfully');
      client.release();
      return true;
    } catch (error) {
      console.log(`Database not ready, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Could not connect to database');
}

// Initialize database tables
async function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS security_reports (
      id VARCHAR(255) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      scan_id VARCHAR(255),
      vulnerabilities JSONB,
      metrics JSONB,
      suggestions JSONB,
      pipeline_history JSONB,
      format VARCHAR(50),
      status VARCHAR(50) DEFAULT 'generated'
    );
  `;
  
  try {
    await pool.query(createTableQuery);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error.message);
  }
}

// Get report by ID
async function getReportById(id) {
  const result = await pool.query(
    'SELECT * FROM security_reports WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// Save report
async function saveReport(report) {
  const query = `
    INSERT INTO security_reports (id, scan_id, vulnerabilities, metrics, suggestions, pipeline_history, format)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      vulnerabilities = $3,
      metrics = $4,
      suggestions = $5,
      pipeline_history = $6,
      format = $7
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    report.id,
    report.scan_id,
    JSON.stringify(report.vulnerabilities),
    JSON.stringify(report.metrics),
    JSON.stringify(report.suggestions),
    JSON.stringify(report.pipeline_history),
    report.format
  ]);
  
  return result.rows[0];
}

// Get all vulnerabilities for a report (from vuln-detector data)
async function getVulnerabilities(scanId) {
  try {
    const result = await pool.query(
      'SELECT * FROM vulnerability_reports WHERE scan_id = $1 ORDER BY created_at DESC LIMIT 1',
      [scanId]
    );
    return result.rows[0]?.findings || [];
  } catch (error) {
    console.log('No vulnerability data found:', error.message);
    return [];
  }
}

module.exports = {
  pool,
  connectWithRetry,
  initDatabase,
  getReportById,
  saveReport,
  getVulnerabilities
};
