/**
 * services/reportService.js
 * ──────────────────────────
 * Handles storage and retrieval of validation reports.
 *
 * Currently uses in-memory + JSON file persistence.
 * Swap for PostgreSQL/SQLite in production.
 */

const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "..", "..", "data", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// In-memory cache
const reportCache = new Map();

/**
 * Store a validation report.
 *
 * @param {number} jobId
 * @param {object} report
 */
async function storeReport(jobId, report) {
  // Cache in memory
  reportCache.set(jobId, report);

  // Persist to file
  const filePath = path.join(REPORTS_DIR, `report-${jobId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

  console.log(`[ReportService] Report stored for job ${jobId} (score: ${report.overallScore})`);
}

/**
 * Retrieve a validation report.
 *
 * @param {number} jobId
 * @returns {object|null}
 */
async function getReport(jobId) {
  // Check cache first
  if (reportCache.has(jobId)) {
    return reportCache.get(jobId);
  }

  // Try loading from file
  const filePath = path.join(REPORTS_DIR, `report-${jobId}.json`);
  if (fs.existsSync(filePath)) {
    const report = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    reportCache.set(jobId, report);
    return report;
  }

  return null;
}

/**
 * List all stored reports (summary view).
 *
 * @returns {object[]}
 */
async function listReports() {
  const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const report = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), "utf-8"));
    return {
      jobId: parseInt(f.match(/report-(\d+)/)?.[1] || 0),
      overallScore: report.overallScore,
      verdict: report.verdict,
      timestamp: report.metadata?.timestamp,
    };
  });
}

module.exports = { storeReport, getReport, listReports };
