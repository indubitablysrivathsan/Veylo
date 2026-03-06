/**
 * orchestrator.js
 * ────────────────
 * Main validation pipeline orchestrator — Discovery-First Architecture.
 *
 * Five-stage flow triggered by a submission:
 *   1. Entry Point Discovery (agnostic repo acquisition)
 *   2. Sandboxed Execution (hardened Docker container)
 *   3. Static Analysis (linters)
 *   4. Semantic AI Reasoning (Qwen2.5-Coder)
 *   5. Score Aggregation → Final Score → Verdict → On-chain Recording
 *
 * Each agent is wrapped in error handling with configurable fallback scores.
 * The reportHash is computed from deterministic fields only (no timestamps).
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { validateStructure } = require("../agents/structureAgent");
const { executeTests } = require("../agents/executionAgent");
const { runLintAnalysis } = require("../agents/lintAgent");
const { analyzeSemantics, extractSignatures } = require("../agents/semanticAgent");
const { aggregateScores, getVerdict, computeReportHash } = require("./scoreAggregator");
const { detectJobType } = require("./jobTypeDetector");
const { discoverEntryPoint } = require("./entryPointDiscovery");

const scoringConfig = require("../../config/scoringConfig");

// ─── Agent timeout (per-agent, prevents hanging) ─────────────────────
const AGENT_TIMEOUT_MS = 60_000; // 60 seconds per agent

/**
 * Run the full validation pipeline for a job submission.
 *
 * @param {object} params
 * @param {string} params.repoPath          - Path to cloned submission repo
 * @param {string} params.taskDescription   - Original job spec text
 * @param {object} params.testSuite         - Generated test suite config
 * @param {object} params.requirements      - Structure requirements
 * @param {string} [params.commitHash]      - Git commit hash for traceability
 * @returns {object} Full validation report
 */
async function runValidationPipeline({ repoPath, taskDescription, testSuite, requirements, commitHash }) {
  const startTime = Date.now();
  const language = detectJobType(repoPath, testSuite);

  console.log(`[Orchestrator] Starting validation pipeline for: ${repoPath}`);
  console.log(`[Orchestrator] Detected language: ${language}`);

  // ─── Stage 1: Entry Point Discovery ─────────────────────────────
  console.log("[Orchestrator] Stage 1: Discovering entry point...");
  const entryPoint = discoverEntryPoint(repoPath, language);
  console.log(`[Orchestrator] Discovered: ${entryPoint.framework} → ${entryPoint.entryFile || "none"} (confidence: ${entryPoint.confidence}%)`);

  // ─── Stage 2: Structure / Viability ─────────────────────────────
  console.log("[Orchestrator] Stage 2: Running structure/viability validation...");
  const structureResult = await runAgentSafe(
    "structure",
    () => validateStructure(repoPath, entryPoint),
  );

  // ─── Stage 3: Sandboxed Execution ───────────────────────────────
  console.log("[Orchestrator] Stage 3: Running sandboxed execution...");
  const executionResult = await runAgentSafe(
    "execution",
    () => executeTests(repoPath, { ...testSuite, language, entryPoint }),
  );

  // ─── Stage 4: Static Analysis (Lint) ────────────────────────────
  console.log("[Orchestrator] Stage 4: Running static analysis...");
  const lintResult = await runAgentSafe(
    "lint",
    () => runLintAnalysis(repoPath, language),
  );

  // ─── Stage 5: Semantic AI Reasoning ─────────────────────────────
  console.log("[Orchestrator] Stage 5: Running semantic analysis...");
  const signatures = await extractSignatures(repoPath, language).catch(() => []);
  const semanticResult = await runAgentSafe(
    "semantic",
    () => analyzeSemantics({
      taskDescription,
      repoFiles: listRepoFiles(repoPath),
      testResults: `Passed: ${executionResult.testsPassed || 0}/${executionResult.testsTotal || 0}`,
      functionSignatures: signatures,
      entryPoint,
    }),
  );

  // ─── Aggregate ──────────────────────────────────────────────────
  const finalScore = aggregateScores({
    execution: executionResult.executionScore ?? 0,
    structure: structureResult.structureScore ?? 0,
    lint: lintResult.lintScore ?? 0,
    semantic: semanticResult.semanticScore ?? 0,
  });

  const verdict = getVerdict(finalScore);
  const durationMs = Date.now() - startTime;

  // ─── Build Report ───────────────────────────────────────────────
  const report = {
    overallScore: finalScore,
    verdict,
    execution: {
      score: executionResult.executionScore ?? 0,
      testsPassed: executionResult.testsPassed ?? 0,
      testsTotal: executionResult.testsTotal ?? 0,
      timedOut: executionResult.timedOut ?? false,
    },
    structure: {
      score: structureResult.structureScore ?? 0,
      passed: structureResult.passed ?? 0,
      total: structureResult.total ?? 0,
      details: structureResult.details ?? structureResult.checks ?? {},
    },
    lint: {
      score: lintResult.lintScore ?? 0,
      errorCount: lintResult.errorCount ?? 0,
      warningCount: lintResult.warningCount ?? 0,
    },
    semantic: {
      score: semanticResult.semanticScore ?? 0,
      reasoning: semanticResult.reasoning ?? "",
      missingRequirements: semanticResult.missingRequirements || [],
      strengths: semanticResult.strengths || [],
    },
    entryPoint: {
      framework: entryPoint.framework,
      entryFile: entryPoint.entryFile,
      detectedPort: entryPoint.detectedPort,
      confidence: entryPoint.confidence,
    },
    metadata: {
      language,
      durationMs,
      timestamp: new Date().toISOString(),
      commitHash: commitHash || null,
    },
  };

  // ─── Deterministic Report Hash ──────────────────────────────────
  // Hash ONLY deterministic fields (scores, verdict, agent results)
  // NOT: timestamp, durationMs, commitHash
  report.reportHash = computeReportHash(report);

  console.log(`[Orchestrator] Pipeline complete. Score: ${finalScore}, Verdict: ${verdict}, Hash: ${report.reportHash.slice(0, 16)}...`);
  return report;
}

/**
 * Run an agent with timeout and error handling.
 * If the agent crashes or times out, return fallback scores.
 *
 * @param {string} agentName   - Name for logging/fallback lookup
 * @param {Function} agentFn   - Async function to execute
 * @returns {object} Agent result or fallback
 */
async function runAgentSafe(agentName, agentFn) {
  const fallbackScores = scoringConfig.pipeline?.fallbackScores || {};

  try {
    const result = await Promise.race([
      agentFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Agent "${agentName}" timed out after ${AGENT_TIMEOUT_MS}ms`)), AGENT_TIMEOUT_MS)
      ),
    ]);
    return result;
  } catch (error) {
    console.error(`[Orchestrator] Agent "${agentName}" failed: ${error.message}`);
    const fallbackScore = fallbackScores[agentName] ?? 0;

    // Return structured fallback based on agent type
    switch (agentName) {
      case "execution":
        return { executionScore: fallbackScore, testsPassed: 0, testsTotal: 0, timedOut: true, runtimeOutput: `Agent error: ${error.message}` };
      case "structure":
        return { structureScore: fallbackScore, passed: 0, total: 0, details: {}, checks: {} };
      case "lint":
        return { lintScore: fallbackScore, errorCount: 0, warningCount: 0, rawOutput: `Agent error: ${error.message}` };
      case "semantic":
        return { semanticScore: fallbackScore, reasoning: `Agent error: ${error.message}`, missingRequirements: [], strengths: [] };
      default:
        return { score: fallbackScore };
    }
  }
}

/**
 * Recursively list all files in a repo (excluding hidden dirs and node_modules).
 */
function listRepoFiles(repoPath) {
  const files = [];

  function walk(dir, depth) {
    if (depth > 5) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__" || entry.name === "venv") continue;

        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) walk(full, depth + 1);
        else files.push(full.replace(repoPath + path.sep, "").replace(/\\/g, "/"));
      }
    } catch {
      // Permission error — skip directory
    }
  }

  walk(repoPath, 0);
  return files;
}

module.exports = { runValidationPipeline };
