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

const prisma = require("../db/prismaClient");

/**
 * GET /reputation/:address
 * Get the reputation summary for a wallet address.
 */
router.get("/:address", async (req, res) => {
  try {

    const { address } = req.params;
    const key = address.toLowerCase();

    const rep = await prisma.reputation.findUnique({
      where: { address: key }
    });

    const badges = await prisma.badge.findMany({
      where: { address: key }
    });

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

    res.json({
      ...rep,
      badges: badges.map(b => b.badgeName)
    });

  } catch (error) {

    console.error("[Reputation] Fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch reputation"
    });

  }
});


/**
 * Internal: update reputation after a job is validated.
 * Called by validationService, not exposed as a public route.
 */
async function updateReputation(address, score) {

  const key = address.toLowerCase();

  let rep = await prisma.reputation.findUnique({
    where: { address: key }
  });

  if (!rep) {

    rep = await prisma.reputation.create({
      data: {
        address: key,
        totalJobs: 0,
        totalScore: 0,
        averageScore: 0,
        successfulJobs: 0,
        disputedJobs: 0,
        failedJobs: 0
      }
    });

  }

  let totalJobs = rep.totalJobs + 1;
  let totalScore = rep.totalScore + score;
  let averageScore = Math.round(totalScore / totalJobs);

  let successfulJobs = rep.successfulJobs;
  let disputedJobs = rep.disputedJobs;
  let failedJobs = rep.failedJobs;

  if (score >= 75) successfulJobs++;
  else if (score >= 50) disputedJobs++;
  else failedJobs++;

  const updated = await prisma.reputation.update({
    where: { address: key },
    data: {
      totalJobs,
      totalScore,
      averageScore,
      successfulJobs,
      disputedJobs,
      failedJobs
    }
  });

  // Award badges based on milestones
  const existingBadges = await prisma.badge.findMany({
    where: { address: key }
  });

  const badgeNames = existingBadges.map(b => b.badgeName);

  async function award(name) {
    if (!badgeNames.includes(name)) {
      await prisma.badge.create({
        data: {
          address: key,
          badgeName: name
        }
      });
    }
  }

  if (totalJobs === 1) await award("First Job");
  if (successfulJobs >= 5) await award("Reliable");
  if (successfulJobs >= 10) await award("Veteran");
  if (averageScore >= 90 && totalJobs >= 3) await award("Elite");

  return updated;
}


/**
 * GET /reputation/:address/badges
 * Get NFT badges for an address.
 */
router.get("/:address/badges", async (req, res) => {

  try{

    const key = req.params.address.toLowerCase();

    const badges = await prisma.badge.findMany({
      where: { address: key }
    });

    res.json({
      badges: badges.map(b => b.badgeName)
    });

  } catch (error) {

    console.error("[Reputation] Fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch reputation"
    });

  }
});


module.exports = router;
module.exports.updateReputation = updateReputation;

