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

// In-memory store (swap for DB in production)
const jobs = new Map();
let nextJobId = 1;

/**
 * POST /jobs
 * Create a new job with requirements and test suite.
 */
router.post("/", async (req, res) => {
  try {
    const { description, freelancerAddress, clientAddress, deadline, testSuite } = req.body;

    if (!description || !clientAddress) {
      return res.status(400).json({ error: "description and clientAddress are required" });
    }

    const requirementsHash = crypto.createHash("sha256").update(description).digest("hex");
    const testSuiteHash = testSuite
      ? crypto.createHash("sha256").update(JSON.stringify(testSuite)).digest("hex")
      : null;

    const job = {
      id: nextJobId++,
      description,
      clientAddress,
      freelancerAddress: freelancerAddress || null,
      deadline: deadline || null,
      requirementsHash,
      testSuiteHash,
      testSuite: testSuite || null,
      state: "CREATED",
      repoUrl: null,
      submissionHash: null,
      validationReport: null,
      createdAt: new Date().toISOString(),
    };

    jobs.set(job.id, job);

    // If blockchain interaction is enabled, create on-chain
    if (freelancerAddress && deadline) {
      try {
        const txHash = await escrowService.createJobOnChain({
          requirementsHash,
          testSuiteHash,
          freelancerAddress,
          deadline,
        });
        job.createTxHash = txHash;
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
router.get("/", (req, res) => {
  const { state } = req.query;
  let result = Array.from(jobs.values());
  if (state) {
    result = result.filter((j) => j.state === state.toUpperCase());
  }
  res.json(result);
});

/**
 * GET /jobs/:id
 * Get full job details.
 */
router.get("/:id", (req, res) => {
  const job = jobs.get(parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/**
 * POST /jobs/:id/submit
 * Freelancer submits their completed work.
 */
router.post("/:id/submit", async (req, res) => {
  try {
    const job = jobs.get(parseInt(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.state !== "CREATED" && job.state !== "FUNDED") {
      return res.status(400).json({ error: `Cannot submit in state: ${job.state}` });
    }

    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

    const submissionHash = crypto.createHash("sha256").update(repoUrl + Date.now()).digest("hex");
    job.repoUrl = repoUrl;
    job.submissionHash = submissionHash;
    job.state = "WORK_SUBMITTED";
    job.submittedAt = new Date().toISOString();

    res.json({ message: "Work submitted", jobId: job.id, submissionHash });
  } catch (error) {
    console.error("[Jobs] Submit error:", error);
    res.status(500).json({ error: "Failed to submit work" });
  }
});

// Export both router and jobs store (for use by validation routes)
module.exports = router;
module.exports.jobsStore = jobs;
