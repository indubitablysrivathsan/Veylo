/**
 * services/validationService.js
 * ──────────────────────────────
 * Bridges the REST API layer to the validator pipeline.
 *
 * Responsibilities:
 *   1. Clone/prepare the submitted repo
 *   2. Run the orchestrator pipeline
 *   3. Store results
 *   4. Optionally record on-chain
 */

const { runValidationPipeline } = require("../../validator/pipeline/orchestrator");
const escrowService = require("./escrowService");
const reportService = require("./reportService");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const REPOS_DIR = path.join(os.tmpdir(), "escrow-repos");

// Ensure repos directory exists
if (!fs.existsSync(REPOS_DIR)) {
  fs.mkdirSync(REPOS_DIR, { recursive: true });
}

/**
 * Validate a job submission end-to-end.
 *
 * @param {object} job - Job record from the jobs store
 * @returns {object} Validation report
 */
async function validateJob(job) {
  console.log(`[ValidationService] Starting validation for job ${job.id}`);

  // Step 1: Clone or prepare the repo
  const repoPath = await prepareRepo(job.id, job.repoUrl);

  // Step 2: Build requirements from job data
  const requirements = {
    required_files: job.testSuite?.required_files || [],
    required_dirs: job.testSuite?.required_dirs || [],
  };

  // Step 3: Run the full pipeline
  const report = await runValidationPipeline({
    repoPath,
    taskDescription: job.description,
    testSuite: job.testSuite || { language: "python", testCommand: "python -m pytest -v" },
    requirements,
  });

  // Step 4: Store report
  await reportService.storeReport(job.id, report);

  // Step 5: Record on-chain if available
  if (escrowService.isAvailable()) {
    try {
      await escrowService.recordValidationOnChain(job.id, report.overallScore, report.reportHash);
      report.onChainTxHash = "recorded";
    } catch (err) {
      console.warn("[ValidationService] On-chain recording failed:", err.message);
    }
  }

  // Step 6: Cleanup
  cleanupRepo(repoPath);

  return report;
}

/**
 * Clone or copy repo to a temp directory for validation.
 */
async function prepareRepo(jobId, repoUrl) {
  const repoPath = path.join(REPOS_DIR, `job-${jobId}-${Date.now()}`);

  if (repoUrl.startsWith("http")) {
    // Clone from git
    await new Promise((resolve, reject) => {
      exec(`git clone --depth 1 "${repoUrl}" "${repoPath}"`, { timeout: 30000 }, (err) => {
        if (err) reject(new Error(`Git clone failed: ${err.message}`));
        else resolve();
      });
    });
  } else if (fs.existsSync(repoUrl)) {
    // Local path — copy
    fs.cpSync(repoUrl, repoPath, { recursive: true });
  } else {
    // Create a placeholder for demo purposes
    fs.mkdirSync(repoPath, { recursive: true });
    fs.writeFileSync(path.join(repoPath, "README.md"), "# Submitted project\n");
    console.warn(`[ValidationService] Repo URL not accessible, using placeholder: ${repoUrl}`);
  }

  return repoPath;
}

function cleanupRepo(repoPath) {
  try {
    fs.rmSync(repoPath, { recursive: true, force: true });
  } catch (err) {
    console.warn("[ValidationService] Cleanup failed:", err.message);
  }
}

module.exports = { validateJob };
