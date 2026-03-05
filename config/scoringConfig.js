/**
 * config/scoringConfig.js
 * ────────────────────────
 * Central configuration for the weighted scoring formula and verdict thresholds.
 *
 * Formula:
 *   finalScore = 0.50 * execution + 0.10 * structure + 0.20 * lint + 0.20 * semantic
 *
 * Adjustable per-deployment. Weights must sum to 1.0.
 */

module.exports = {
  weights: {
    execution: parseFloat(process.env.WEIGHT_EXECUTION || "0.50"),
    structure: parseFloat(process.env.WEIGHT_STRUCTURE || "0.10"),
    lint: parseFloat(process.env.WEIGHT_LINT || "0.20"),
    semantic: parseFloat(process.env.WEIGHT_SEMANTIC || "0.20"),
  },

  thresholds: {
    pass: parseInt(process.env.THRESHOLD_PASS || "75"),  // score >= 75 → payment
    dispute: parseInt(process.env.THRESHOLD_DISPUTE || "50"),  // 50-74 → dispute window
    // Below 50 → automatic refund
  },

  // Validation pipeline settings
  pipeline: {
    // Skip agents that are unavailable (e.g., no Docker, no Ollama)
    skipUnavailable: process.env.SKIP_UNAVAILABLE !== "false",

    // Fallback scores when an agent fails
    fallbackScores: {
      execution: 0,     // strict — no tests = no score
      structure: 50,    // lenient — assume partial compliance
      lint: 70,         // lenient — no linter = decent default
      semantic: 50,     // neutral — no AI = middle score
    },
  },
};
