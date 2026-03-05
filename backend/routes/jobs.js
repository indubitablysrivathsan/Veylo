/**
 * routes/jobs.js
 * ───────────────
 * REST API endpoints for job lifecycle management.
 *
 * POST /jobs           — Create a new job
 * GET  /jobs           — List all jobs
 * GET  /jobs/:id       — Get job details
 * POST /jobs/:id/fund  — Record escrow funding
 * POST /jobs/:id/submit — Freelancer submits work
 */

const express = require("express");
const router = express.Router();
const escrowService = require("../services/escrowService");
const crypto = require("crypto");

// Database store (Prisma/PostgreSQL)
const prisma = require("../db/prismaClient");

/**
 * POST /jobs
 * Create a new job with requirements and test suite.
 */
router.post("/", async (req, res) => {
  try {
    const { title, description, freelancerAddress, clientAddress, deadline, testSuite, paymentAmountINR } = req.body;

    if (!description || !clientAddress) {
      return res.status(400).json({ error: "description and clientAddress are required" });
    }

    const requirementsHash = crypto.createHash("sha256").update(description).digest("hex");

    const testSuiteHash = testSuite
      ? crypto.createHash("sha256").update(JSON.stringify(testSuite)).digest("hex")
      : null;

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
        state: "CREATED",
        repoUrl: null,
        submissionHash: null,
        createdAt: new Date(),
      },
    });

    // If blockchain interaction is enabled, create on-chain
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
 */
router.get("/", async (req, res) => {
  try {

    const { state } = req.query;

    let jobs = await prisma.job.findMany();

    if (state) {
      jobs = jobs.filter((j) => j.state === state.toUpperCase());
    }

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

    res.json(updatedJob);

  } catch (error) {
    console.error("[Jobs] Accept error:", error);
    res.status(500).json({ error: "Failed to accept job" });
  }
});


/**
 * POST /jobs/:id/submit
 * Freelancer submits their completed work.
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

    const { repoUrl } = req.body;

    if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

    const submissionHash = crypto
      .createHash("sha256")
      .update(repoUrl + Date.now())
      .digest("hex");

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: {
        repoUrl,
        submissionHash,
        state: "WORK_SUBMITTED",
        submittedAt: new Date(),
      },
    });

    res.json({
      message: "Work submitted",
      jobId: updatedJob.id,
      submissionHash,
    });

  } catch (error) {
    console.error("[Jobs] Submit error:", error);
    res.status(500).json({ error: "Failed to submit work" });
  }
});


module.exports = router;

