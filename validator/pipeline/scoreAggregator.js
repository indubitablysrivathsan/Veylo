/**
 * scoreAggregator.js
 * ───────────────────
 * Computes the final weighted score from all validation layers,
 * determines the payment verdict, and produces a deterministic report hash.
 *
 * Formula:
 *   finalScore = 0.50 * execution + 0.10 * structure + 0.20 * lint + 0.20 * semantic
 *
 * Verdicts:
 *   score >= 75  → PASS    (payment released)
 *   50–74        → DISPUTE (dispute window opens)
 *   < 50         → FAIL    (refund to client)
 */

const crypto = require("crypto");
const scoringConfig = require("../../config/scoringConfig");

/**
 * Aggregate individual layer scores into a final score.
 *
 * @param {{ execution: number, structure: number, lint: number, semantic: number }} scores
 * @returns {number} Final score 0-100 (rounded integer)
 */
function aggregateScores(scores) {
  const { weights } = scoringConfig;

  const finalScore =
    weights.execution * (scores.execution || 0) +
    weights.structure * (scores.structure || 0) +
    weights.lint * (scores.lint || 0) +
    weights.semantic * (scores.semantic || 0);

  return Math.round(Math.max(0, Math.min(100, finalScore)));
}

/**
 * Determine verdict based on final score.
 *
 * @param {number} score
 * @returns {"PASS" | "DISPUTE" | "FAIL"}
 */
function getVerdict(score) {
  const { thresholds } = scoringConfig;

  if (score >= thresholds.pass) return "PASS";
  if (score >= thresholds.dispute) return "DISPUTE";
  return "FAIL";
}

/**
 * Compute a deterministic SHA-256 hash of a validation report.
 *
 * CRITICAL: Only hashes deterministic fields (scores, verdict, agent details).
 * Excludes: metadata.timestamp, metadata.durationMs, metadata.commitHash
 *
 * This ensures identical submissions ALWAYS produce the same reportHash,
 * which is required for blockchain integrity.
 *
 * @param {object} report - The full validation report
 * @returns {string} SHA-256 hex hash
 */
function computeReportHash(report) {
  // Build a canonical, deterministic payload
  const hashPayload = {
    overallScore: report.overallScore,
    verdict: report.verdict,
    execution: {
      score: report.execution?.score ?? 0,
      testsPassed: report.execution?.testsPassed ?? 0,
      testsTotal: report.execution?.testsTotal ?? 0,
      timedOut: report.execution?.timedOut ?? false,
    },
    structure: {
      score: report.structure?.score ?? 0,
      passed: report.structure?.passed ?? 0,
      total: report.structure?.total ?? 0,
    },
    lint: {
      score: report.lint?.score ?? 0,
      errorCount: report.lint?.errorCount ?? 0,
      warningCount: report.lint?.warningCount ?? 0,
    },
    semantic: {
      score: report.semantic?.score ?? 0,
    },
    language: report.metadata?.language ?? "unknown",
  };

  // JSON.stringify with sorted keys for canonical ordering
  const canonical = JSON.stringify(hashPayload, Object.keys(hashPayload).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

module.exports = { aggregateScores, getVerdict, computeReportHash };
