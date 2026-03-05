/**
 * routes/jobs.js
 * ───────────────
 * REST API endpoints for job lifecycle management.
 *
 * POST /jobs             — Create a new job
 * GET  /jobs             — List all jobs (optional state filter)
 * GET  /jobs/:id         — Get job details
 * PUT  /jobs/:id/accept  — Freelancer accepts a job
 * POST /jobs/:id/fund    — Client funds escrow (CREATED → FUNDED)
 * POST /jobs/:id/submit  — Freelancer submits work
 */

const express = require("express");
const router = express.Router();
const escrowService = require("../services/escrowService");
const crypto = require("crypto");

const prisma = require("../db/prismaClient");

/**
 * POST /jobs
 * Create a new job with requirements and test suite.
 */
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      clientAddress,
      freelancerAddress,
      deadline,
      testSuite,
      paymentAmountINR,
      requirementsHash: incomingReqHash,
      testSuiteHash: incomingTestHash,
      techStack,
      expectedDeliverable,
    } = req.body;

    if (!description || !clientAddress) {
      return res.status(400).json({ error: "description and clientAddress are required" });
    }

    // Generate hashes if not provided by frontend
    const requirementsHash =
      incomingReqHash ||
      crypto.createHash("sha256").update(description).digest("hex");

    const testSuiteHash =
      incomingTestHash ||
      (testSuite
        ? crypto.createHash("sha256").update(JSON.stringify(testSuite)).digest("hex")
        : null);

    const job = await prisma.job.create({
      data: {
        title: title || null,
        description,
        clientAddress,
        freelancerAddress: freelancerAddress || null,
        deadline: deadline ? new Date(deadline) : null,
        requirementsHash,
        testSuiteHash,
        testSuiteJson: testSuite || null,
        paymentAmountINR: paymentAmountINR ? String(paymentAmountINR) : null,
        techStack: techStack || null,
        expectedDeliverable: expectedDeliverable || null,
        state: "CREATED",
        repoUrl: null,
        submissionHash: null,
        createdAt: new Date(),
      },
    });

    console.log(`[Jobs] Created job #${job.id}: "${job.title || 'untitled'}" state=${job.state} payment=₹${paymentAmountINR || 0}`);

    // If blockchain interaction is enabled and all required data present
    if (freelancerAddress && deadline) {
      try {
        const txHash = await escrowService.createJobOnChain({
          requirementsHash,
          testSuiteHash,
          freelancerAddress,
          deadline,
        });

        await prisma.job.update({
          where: { id: job.id },
          data: { createTxHash: txHash },
        });

        console.log(`[Jobs] On-chain creation tx: ${txHash}`);
      } catch (err) {
        console.warn("[Jobs] On-chain creation failed (continuing off-chain):", err.message);
      }
    }

    res.status(201).json(job);

  } catch (error) {
    console.error("[Jobs] Create error:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});


/**
 * GET /jobs
 * List all jobs with optional state filter.
 * Supports comma-separated states: ?state=CREATED,FUNDED
 */
router.get("/", async (req, res) => {
  try {
    const { state } = req.query;

    let jobs = await prisma.job.findMany();

    if (state) {
      const states = state.toUpperCase().split(",").map(s => s.trim());
      jobs = jobs.filter((j) => states.includes(j.state));
    }

    console.log(`[Jobs] Fetched ${jobs.length} jobs${state ? ` (filter: ${state})` : ''}`);
    res.json(jobs);

  } catch (error) {
    console.error("[Jobs] Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});


/**
 * GET /jobs/:id
 * Get full job details.
 */
router.get("/:id", async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    console.log(`[Jobs] Fetched job #${job.id} state=${job.state}`);
    res.json(job);

  } catch (error) {
    console.error("[Jobs] Get error:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});


/**
 * PUT /jobs/:id/accept
 * Freelancer accepts a job. Sets freelancerAddress on the job.
 */
router.put("/:id/accept", async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.state !== "CREATED" && job.state !== "FUNDED") {
      return res.status(400).json({ error: `Cannot accept job in state: ${job.state}` });
    }

    if (job.freelancerAddress) {
      return res.status(400).json({ error: "Job already accepted by another freelancer" });
    }

    const { freelancerAddress } = req.body;

    if (!freelancerAddress) {
      return res.status(400).json({ error: "freelancerAddress is required" });
    }

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: { freelancerAddress },
    });

    console.log(`[Jobs] Job #${job.id} accepted by ${freelancerAddress}`);
    res.json(updatedJob);

  } catch (error) {
    console.error("[Jobs] Accept error:", error);
    res.status(500).json({ error: "Failed to accept job" });
  }
});


/**
 * POST /jobs/:id/fund
 * Client confirms payment / funds escrow. Transitions CREATED → FUNDED.
 */
router.post("/:id/fund", async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.state !== "CREATED") {
      return res.status(400).json({ error: `Cannot fund job in state: ${job.state}` });
    }

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: {
        state: "FUNDED",
        fundedAt: new Date(),
      },
    });

    console.log(`[Jobs] Job #${job.id} funded → FUNDED`);
    res.json(updatedJob);

  } catch (error) {
    console.error("[Jobs] Fund error:", error);
    res.status(500).json({ error: "Failed to fund job" });
  }
});


/**
 * POST /jobs/:id/submit
 * Freelancer submits their completed work.
 * Auto-triggers validation pipeline.
 */
router.post("/:id/submit", async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.state !== "CREATED" && job.state !== "FUNDED") {
      return res.status(400).json({ error: `Cannot submit in state: ${job.state}` });
    }

    const { repoUrl, commitHash, submissionNotes } = req.body;

    if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

    const submissionHash = crypto
      .createHash("sha256")
      .update(repoUrl + (commitHash || '') + Date.now())
      .digest("hex");

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: {
        repoUrl,
        submissionHash,
        commitHash: commitHash || null,
        submissionNotes: submissionNotes || null,
        state: "WORK_SUBMITTED",
        submittedAt: new Date(),
      },
    });

    console.log(`[Jobs] Job #${job.id} work submitted → WORK_SUBMITTED, repo: ${repoUrl}`);

    // Auto-trigger validation pipeline (async, don't block response)
    triggerValidation(updatedJob).catch(err => {
      console.error(`[Jobs] Auto-validation trigger failed for job #${job.id}:`, err.message);
    });

    res.json({
      message: "Work submitted — validation pipeline triggered",
      jobId: updatedJob.id,
      submissionHash,
    });

  } catch (error) {
    console.error("[Jobs] Submit error:", error);
    res.status(500).json({ error: "Failed to submit work" });
  }
});


/**
 * Trigger validation pipeline for a submitted job.
 * Called automatically after submission.
 */
async function triggerValidation(job) {
  const validationService = require("../services/validationService");

  console.log(`[Jobs] Auto-triggering validation for job #${job.id}...`);

  // Update state to VALIDATING
  await prisma.job.update({
    where: { id: job.id },
    data: { state: "VALIDATING" },
  });

  try {
    const report = await validationService.validateJob(job);

    // Store validation report in DB
    await prisma.validationReport.create({
      data: {
        jobId: job.id,
        overallScore: report.overallScore,
        verdict: report.verdict,
        executionScore: report.execution?.score || null,
        testsPassed: report.execution?.testsPassed || null,
        testsTotal: report.execution?.testsTotal || null,
        structureScore: report.structure?.score || report.repoViability?.score || null,
        lintScore: report.lint?.score || null,
        semanticScore: report.semantic?.score || null,
        semanticReasoning: report.semantic?.reasoning || null,
        reportHash: report.reportHash,
        reportJson: report,
      },
    });

    // Determine final state based on verdict
    const finalState = report.verdict === "PASS" ? "VALIDATED" : "VALIDATED";
    const outcome = report.verdict === "PASS" ? "PAID" : report.verdict === "FAIL" ? "REFUNDED" : "DISPUTED";

    await prisma.job.update({
      where: { id: job.id },
      data: {
        state: finalState,
        outcome,
        validatedAt: new Date(),
      },
    });

    console.log(`[Jobs] Job #${job.id} validation complete: score=${report.overallScore}, verdict=${report.verdict}, outcome=${outcome}`);

  } catch (err) {
    console.error(`[Jobs] Validation failed for job #${job.id}:`, err.message);
    // Revert to WORK_SUBMITTED so it can be retried
    await prisma.job.update({
      where: { id: job.id },
      data: { state: "WORK_SUBMITTED" },
    });
  }
}


module.exports = router;
