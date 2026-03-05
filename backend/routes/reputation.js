/**
 * routes/reputation.js
 * ─────────────────────
 * REST API endpoints for reputation management.
 *
 * GET /reputation/:address     — Get reputation for an address
 * GET /reputation/:address/badges — Get NFT badges
 */

const express = require("express");
const router = express.Router();

// In-memory reputation store (mirrors on-chain state for fast reads)
const reputations = new Map();

/**
 * GET /reputation/:address
 * Get the reputation summary for a wallet address.
 */
router.get("/:address", (req, res) => {
  const { address } = req.params;
  const rep = reputations.get(address.toLowerCase());

  if (!rep) {
    return res.json({
      address,
      totalJobs: 0,
      averageScore: 0,
      successfulJobs: 0,
      disputedJobs: 0,
      failedJobs: 0,
      badges: [],
    });
  }

  res.json(rep);
});

/**
 * Internal: update reputation after a job is validated.
 * Called by validationService, not exposed as a public route.
 */
function updateReputation(address, score) {
  const key = address.toLowerCase();
  let rep = reputations.get(key);

  if (!rep) {
    rep = {
      address: key,
      totalJobs: 0,
      totalScore: 0,
      averageScore: 0,
      successfulJobs: 0,
      disputedJobs: 0,
      failedJobs: 0,
      badges: [],
    };
  }

  rep.totalJobs++;
  rep.totalScore += score;
  rep.averageScore = Math.round(rep.totalScore / rep.totalJobs);

  if (score >= 75) rep.successfulJobs++;
  else if (score >= 50) rep.disputedJobs++;
  else rep.failedJobs++;

  // Award badges based on milestones
  if (rep.totalJobs === 1 && !rep.badges.includes("First Job")) {
    rep.badges.push("First Job");
  }
  if (rep.successfulJobs >= 5 && !rep.badges.includes("Reliable")) {
    rep.badges.push("Reliable");
  }
  if (rep.successfulJobs >= 10 && !rep.badges.includes("Veteran")) {
    rep.badges.push("Veteran");
  }
  if (rep.averageScore >= 90 && rep.totalJobs >= 3 && !rep.badges.includes("Elite")) {
    rep.badges.push("Elite");
  }

  reputations.set(key, rep);
  return rep;
}

/**
 * GET /reputation/:address/badges
 * Get NFT badges for an address.
 */
router.get("/:address/badges", (req, res) => {
  const rep = reputations.get(req.params.address.toLowerCase());
  res.json({ badges: rep ? rep.badges : [] });
});

module.exports = router;
module.exports.updateReputation = updateReputation;
