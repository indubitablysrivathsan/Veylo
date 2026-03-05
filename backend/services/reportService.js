/**
 * services/reportService.js
 */

const fs = require("fs");
const path = require("path");
const prisma = require("../db/prismaClient");

const REPORTS_DIR = path.join(__dirname, "..", "..", "data", "reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// In-memory cache
const reportCache = new Map();

/**
 * Store validation report
 */
async function storeReport(jobId, report) {

  await prisma.validationReport.upsert({
    where: { jobId },
    update: {
      overallScore: report.overallScore,
      verdict: report.verdict,
      reportJson: report
    },
    create: {
      jobId,
      overallScore: report.overallScore,
      verdict: report.verdict,
      reportJson: report
    }
  });

  reportCache.set(jobId, report);

  const filePath = path.join(REPORTS_DIR, `report-${jobId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
}

/**
 * Get validation report
 */
async function getReport(jobId) {

  const dbReport = await prisma.validationReport.findUnique({
    where: { jobId }
  });

  if (dbReport) return dbReport.reportJson;

  // fallback to file
  const filePath = path.join(REPORTS_DIR, `report-${jobId}.json`);

  if (fs.existsSync(filePath)) {
    const report = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    reportCache.set(jobId, report);
    return report;
  }

  return null;
}

/**
 * List reports
 */
async function listReports() {

  const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.endsWith(".json"));

  return files.map((f) => {
    const report = JSON.parse(
      fs.readFileSync(path.join(REPORTS_DIR, f), "utf-8")
    );

    return {
      jobId: parseInt(f.match(/report-(\d+)/)?.[1] || 0),
      overallScore: report.overallScore,
      verdict: report.verdict,
      timestamp: report.metadata?.timestamp
    };
  });
}

module.exports = { storeReport, getReport, listReports };