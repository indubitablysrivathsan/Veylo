/**
 * routes/validation.js
 * ─────────────────────
 * REST API endpoints for the validation pipeline.
 *
 * POST /validation/run        — Trigger validation for a job
 * GET  /validation/:jobId     — Get validation report
 * POST /validation/generate-tests — Generate test suite from description
 * POST /validation/check-ambiguity — Check spec for ambiguities
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

    if (job.state !== "WORK_SUBMITTED") {
      return res.status(400).json({
        error: `Job must be in WORK_SUBMITTED state, currently: ${job.state}`
      });
    }

    // Run validation pipeline
    const report = await validationService.validateJob(job);

    // Store report in database
    await prisma.validationReport.create({
      data: {
        jobId: job.id,
        overallScore: report.overallScore,
        verdict: report.verdict,
        executionScore: report.executionScore || null,
        testsPassed: report.testsPassed || null,
        testsTotal: report.testsTotal || null,
        structureScore: report.structureScore || null,
        lintScore: report.lintScore || null,
        semanticScore: report.semanticScore || null,
        semanticReasoning: report.semanticReasoning || null,
        reportHash: report.reportHash,
        reportJson: report
      }
    });

    // Update job state
    await prisma.job.update({
      where: { id: job.id },
      data: {
        state: "VALIDATED",
        validatedAt: new Date()
      }
    });

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
 * GET /validation/:jobId
 * Retrieve the validation report for a job.
 */
router.get("/:jobId", async (req, res) => {
  try {

    const report = await prisma.validationReport.findFirst({
      where: { jobId: parseInt(req.params.jobId) },
      orderBy: { createdAt: "desc" }
    });

    if (!report)
      return res.status(404).json({ error: "No validation report found for this job" });

    res.json(report);

  } catch (error) {
    console.error("[Validation] Fetch report error:", error);
    res.status(500).json({ error: "Failed to fetch validation report" });
  }
});


/**
 * POST /validation/generate-tests
 * Generate a test suite from a natural language job description.
 *
 * Body: { description: string }
 */
router.post("/generate-tests", async (req, res) => {
  try {
    const description = req.body;

    if (!description)
      return res.status(400).json({ error: "description is required" });

    const testSuite = await generateTestSuite(description);

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
 */
router.post("/check-ambiguity", async (req, res) => {
  try {

    const description = req.body;

    if (!description)
      return res.status(400).json({ error: "description is required" });

    const result = await detectAmbiguity(description);

    res.json(result);

  } catch (error) {
    console.error("[Validation] Ambiguity check error:", error);
    res.status(500).json({ error: "Failed to check ambiguity" });
  }
});

module.exports = router;


