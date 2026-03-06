/**
 * services/validationService.js
 * ──────────────────────────────
 * Bridges the REST API layer to the validator pipeline.
 *
 * Responsibilities:
 *   1. Clone/prepare the submitted repo (supports commit hash checkout)
 *   2. Run the orchestrator pipeline
 *   3. Store results
 *   4. Record report hash on-chain
 *   5. Return structured errors on crash (verdict: FAIL)
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
 * @param {object} job           - Job record from the database
 * @param {string} [commitHash]  - Optional commit hash for specific checkout
 * @returns {object} Validation report
 */
async function validateJob(job, commitHash) {
  console.log(`[ValidationService] Starting validation for job ${job.id}${commitHash ? ` at commit ${commitHash}` : ""}`);

  let repoPath;
  try {
    // Step 1: Clone or prepare the repo
    repoPath = await prepareRepo(job.id, job.repoUrl, commitHash);

    // Step 2: Run the full pipeline
    const report = await runValidationPipeline({
      repoPath,
      taskDescription: job.description,
      testSuite: job.testSuite || { language: "python", testCommand: "python -m pytest -v" },
      requirements: {
        required_files: job.testSuite?.required_files || [],
        required_dirs: job.testSuite?.required_dirs || [],
      },
      commitHash: commitHash || null,
    });

    // Step 3: Store report
    await reportService.storeReport(job.id, report);

    // Step 4: Record on-chain if available
    if (escrowService.isAvailable()) {
      try {
        await escrowService.recordValidationOnChain(job.id, report.overallScore, report.reportHash);
        report.onChainTxHash = "recorded";
        console.log(`[ValidationService] Validation recorded on-chain for job ${job.id}`);
      } catch (err) {
        console.warn("[ValidationService] On-chain recording failed:", err.message);
        report.onChainTxHash = null;
        report.onChainError = err.message;
      }
    }

    // Step 5: Cleanup
    cleanupRepo(repoPath);

    return report;

  } catch (error) {
    console.error(`[ValidationService] Pipeline crash for job ${job.id}:`, error.message);

    // Cleanup on error
    if (repoPath) cleanupRepo(repoPath);

    // Return structured FAIL response — never hang
    return {
      overallScore: 0,
      verdict: "FAIL",
      reportHash: null,
      execution: { score: 0, testsPassed: 0, testsTotal: 0, timedOut: false },
      structure: { score: 0, passed: 0, total: 0, details: {} },
      lint: { score: 0, errorCount: 0, warningCount: 0 },
      semantic: { score: 0, reasoning: `Pipeline crash: ${error.message}` },
      metadata: {
        language: "unknown",
        durationMs: 0,
        timestamp: new Date().toISOString(),
        commitHash: commitHash || null,
        error: error.message,
      },
    };
  }
}

/**
 * Clone or copy repo to a temp directory for validation.
 * Supports:
 *   - Git URLs (http/https) — shallow clone with optional commit checkout
 *   - Local paths — recursive copy
 *   - Fallback placeholder for inaccessible repos
 */
async function prepareRepo(jobId, repoUrl, commitHash) {
  const repoPath = path.join(REPOS_DIR, `job-${jobId}-${Date.now()}`);

  if (repoUrl && repoUrl.startsWith("http")) {
    // Clone from git (shallow)
    await new Promise((resolve, reject) => {
      const cloneCmd = commitHash
        ? `git clone "${repoUrl}" "${repoPath}" && cd "${repoPath}" && git checkout ${commitHash}`
        : `git clone --depth 1 "${repoUrl}" "${repoPath}"`;

      exec(cloneCmd, { timeout: 60000, shell: true }, (err) => {
        if (err) reject(new Error(`Git clone failed: ${err.message}`));
        else resolve();
      });
    });
  } else if (repoUrl && fs.existsSync(repoUrl)) {
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
