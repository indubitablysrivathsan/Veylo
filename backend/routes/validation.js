/**
 * routes/validation.js
 * ─────────────────────
 * REST API endpoints for the validation pipeline.
 *
 * POST /validation/run              — Trigger validation for a job
 * GET  /validation/report/:jobId    — Get validation report
 * GET  /validation/:jobId           — Get validation report (alias)
 * POST /validation/generate-tests   — Generate test suite from description
 * POST /validation/check-ambiguity  — Check spec for ambiguities
 */

const express = require("express");
const router = express.Router();
const validationService = require("../services/validationService");
const { generateTestSuite } = require("../../validator/ai/testGenerator");
const { detectAmbiguity } = require("../../validator/ai/ambiguityDetector");

const prisma = require("../db/prismaClient");

/**
 * POST /validation/run
 * Trigger the full validation pipeline for a submitted job.
 *
 * Body: { jobId: number }
 */
router.post("/run", async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: "jobId is required" });

    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId) }
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.state !== "WORK_SUBMITTED" && job.state !== "VALIDATING") {
      return res.status(400).json({
        error: `Job must be in WORK_SUBMITTED state, currently: ${job.state}`
      });
    }

    console.log(`[Validation] Running pipeline for job #${jobId}...`);

    // Update state to VALIDATING
    await prisma.job.update({
      where: { id: job.id },
      data: { state: "VALIDATING" }
    });

    // Run validation pipeline
    const report = await validationService.validateJob(job);

    // Store report in database
    await prisma.validationReport.upsert({
      where: { jobId: job.id },
      update: {
        overallScore: report.overallScore,
        verdict: report.verdict,
        reportHash: report.reportHash,
        reportJson: report,
      },
      create: {
        jobId: job.id,
        overallScore: report.overallScore,
        verdict: report.verdict,
        reportHash: report.reportHash,
        reportJson: report,
      },
    });

    // Determine outcome based on verdict
    const outcome = report.verdict === "PASS" ? "PAID" : report.verdict === "FAIL" ? "REFUNDED" : "DISPUTED";

    // Update job state
    await prisma.job.update({
      where: { id: job.id },
      data: {
        state: "VALIDATED",
        outcome,
        validatedAt: new Date()
      }
    });

    console.log(`[Validation] Job #${jobId} complete: score=${report.overallScore}, verdict=${report.verdict}`);

    res.json({
      jobId,
      overallScore: report.overallScore,
      verdict: report.verdict,
      reportHash: report.reportHash,
      report
    });

  } catch (error) {
    console.error("[Validation] Run error:", error);
    res.status(500).json({
      error: "Validation pipeline failed",
      details: error.message
    });
  }
});


/**
 * GET /validation/report/:jobId
 * GET /validation/:jobId
 * Retrieve the validation report for a job.
 *
 * Returns the full ValidationReport object (unwrapped from reportJson).
 */
router.get("/report/:jobId", getReportHandler);
router.get("/:jobId", getReportHandler);

async function getReportHandler(req, res) {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(400).json({ error: "Invalid jobId" });
    }

    const report = await prisma.validationReport.findFirst({
      where: { jobId }
    });

    if (!report) {
      return res.status(404).json({ error: "No validation report found for this job" });
    }

    // Return the full report object (unwrapped from reportJson if available)
    if (report.reportJson && typeof report.reportJson === 'object') {
      return res.json(report.reportJson);
    }

    // Fallback: return the DB record fields
    res.json({
      overallScore: report.overallScore,
      verdict: report.verdict,
      reportHash: report.reportHash,
      execution: { score: report.executionScore || 0, testsPassed: report.testsPassed || 0, testsTotal: report.testsTotal || 0, timedOut: false },
      repoViability: { score: report.structureScore || 0, passed: 0, total: 0, details: [] },
      lint: { score: report.lintScore || 0, errorCount: 0, warningCount: 0 },
      semantic: { score: report.semanticScore || 0, reasoning: report.semanticReasoning || '', missingRequirements: [], strengths: [] },
      metadata: { language: 'unknown', durationMs: 0, timestamp: report.createdAt || new Date().toISOString() },
    });

  } catch (error) {
    console.error("[Validation] Fetch report error:", error);
    res.status(500).json({ error: "Failed to fetch validation report" });
  }
}


/**
 * POST /validation/generate-tests
 * Generate a test suite from a natural language job description.
 *
 * Body: { description: string }
 *
 * Returns: { testSuite: TestSuite }
 *   where TestSuite matches the frontend type:
 *   { language, testCommand, required_files?, required_dirs?, testCases? }
 */
router.post("/generate-tests", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description)
      return res.status(400).json({ error: "description is required" });

    console.log("[Validation] Generating test suite...");

    const rawSuite = await generateTestSuite(description);

    // Normalize the test suite to match frontend TestSuite type
    const testSuite = {
      language: rawSuite.language || "python",
      testCommand: rawSuite.testCommand || (rawSuite.language === "javascript" ? "npm test" : "python -m pytest -v"),
      required_files: rawSuite.required_files || [],
      required_dirs: rawSuite.required_dirs || [],
      testCases: normalizeTestCases(rawSuite.test_cases || rawSuite.testCases || []),
    };

    console.log(`[Validation] Test suite generated: ${testSuite.testCases.length} test cases`);
    res.json({ testSuite });

  } catch (error) {
    console.error("[Validation] Test generation error:", error);
    res.status(500).json({ error: "Failed to generate test suite" });
  }
});


/**
 * POST /validation/check-ambiguity
 * Check a job description for ambiguous requirements.
 *
 * Body: { description: string }
 *
 * Returns: AmbiguityResult matching the frontend type:
 *   { isClean: boolean, warnings: AmbiguityWarning[] }
 */
router.post("/check-ambiguity", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description)
      return res.status(400).json({ error: "description is required" });

    console.log("[Validation] Checking ambiguity...");

    const rawResult = await detectAmbiguity(description);

    // Transform backend format → frontend AmbiguityResult format
    // Backend returns: { isAmbiguous, issueCount, issues: [{type, term, suggestion, source}] }
    // Frontend expects: { isClean, warnings: [{originalText, reason, suggestion, severity}] }
    const warnings = (rawResult.issues || []).map((issue) => ({
      originalText: issue.term || issue.detail || issue.type || "Unclear requirement",
      reason: issue.type === "vague_term"
        ? `The term "${issue.term}" is vague and needs quantification.`
        : issue.type === "too_short"
          ? "The description is too short to define clear requirements."
          : issue.type === "no_numbers"
            ? "No quantifiable metrics found in the description."
            : issue.detail || `Issue detected: ${issue.type}`,
      suggestion: issue.suggestion || "Add specific, measurable criteria.",
      severity: issue.type === "vague_term" ? "high" :
        issue.type === "too_short" ? "medium" : "low",
    }));

    const result = {
      isClean: !rawResult.isAmbiguous && warnings.length === 0,
      warnings,
    };

    console.log(`[Validation] Ambiguity check: ${result.isClean ? "clean" : `${warnings.length} warnings`}`);
    res.json(result);

  } catch (error) {
    console.error("[Validation] Ambiguity check error:", error);
    res.status(500).json({ error: "Failed to check ambiguity" });
  }
});


/**
 * Normalize test cases from backend format to frontend format.
 * Backend: { input, expected_output, description }
 * Frontend: { id, description, input, expectedOutput, type }
 */
function normalizeTestCases(testCases) {
  if (!Array.isArray(testCases)) return [];

  return testCases.map((tc, index) => ({
    id: tc.id || `test-${index + 1}`,
    description: tc.description || `Test case ${index + 1}`,
    input: tc.input || "",
    expectedOutput: tc.expected_output || tc.expectedOutput || "",
    type: tc.type || (index === 0 ? "unit" : index < testCases.length - 1 ? "integration" : "edge_case"),
  }));
}


module.exports = router;
