/**
 * scoreAggregator.js
 * ───────────────────
 * Computes the final weighted score from all validation layers
 * and determines the payment verdict.
 *
 * Formula:
 *   finalScore = 0.40 * execution + 0.20 * structure + 0.20 * lint + 0.20 * semantic
 *
 * Verdicts:
 *   score >= 75  → PASS    (payment released)
 *   50–74        → DISPUTE (dispute window opens)
 *   < 50         → FAIL    (refund to client)
 */

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
    weights.execution * scores.execution +
    weights.structure * scores.structure +
    weights.lint * scores.lint +
    weights.semantic * scores.semantic;

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

module.exports = { aggregateScores, getVerdict };
