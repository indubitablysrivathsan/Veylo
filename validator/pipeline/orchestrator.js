/**
 * orchestrator.js
 * ────────────────
 * Main validation pipeline orchestrator.
 *
 * Runs all four validation agents in sequence:
 *   1. Structure → 2. Execution → 3. Lint → 4. Semantic
 *
 * Then aggregates scores and produces the final validation report.
 */

const { validateStructure } = require("../agents/structureAgent");
const { executeTests } = require("../agents/executionAgent");
const { runLintAnalysis } = require("../agents/lintAgent");
const { analyzeSemantics, extractSignatures } = require("../agents/semanticAgent");
const { aggregateScores, getVerdict } = require("./scoreAggregator");
const { detectJobType } = require("./jobTypeDetector");
const crypto = require("crypto");

/**
 * Run the full validation pipeline for a job submission.
 *
 * @param {object} params
 * @param {string} params.repoPath          - Path to cloned submission repo
 * @param {string} params.taskDescription    - Original job spec text
 * @param {object} params.testSuite          - Generated test suite config
 * @param {object} params.requirements       - Structure requirements
 * @returns {object} Full validation report
 */

function listRepoFiles(repoPath) {
  const files = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) walk(full);
      else files.push(full.replace(repoPath + path.sep, ""));
    }
  }

  walk(repoPath);
  return files;
}

async function runValidationPipeline({ repoPath, taskDescription, testSuite, requirements }) {
  const startTime = Date.now();
  const language = detectJobType(repoPath, testSuite);

  console.log(`[Orchestrator] Starting validation pipeline for: ${repoPath}`);
  console.log(`[Orchestrator] Detected language: ${language}`);

  // ─── Layer 1: Structure ─────────────────────────────────────────
  console.log("[Orchestrator] Running structure validation...");
  const structureResult = await validateStructure(repoPath);

  // ─── Layer 2: Execution ─────────────────────────────────────────
  console.log("[Orchestrator] Running sandboxed execution...");
  const executionResult = await executeTests(repoPath, { ...testSuite, language });

  // ─── Layer 3: Lint ──────────────────────────────────────────────
  console.log("[Orchestrator] Running static analysis...");
  const lintResult = await runLintAnalysis(repoPath, language);

  // ─── Layer 4: Semantic AI ───────────────────────────────────────
  console.log("[Orchestrator] Running semantic analysis...");
  const signatures = await extractSignatures(repoPath, language);
  const semanticResult = await analyzeSemantics({
    taskDescription,
    repoFiles: listRepoFiles(repoPath),
    testResults: `Passed: ${executionResult.testsPassed}/${executionResult.testsTotal}`,
    functionSignatures: signatures,
  });

  // ─── Aggregate ──────────────────────────────────────────────────
  const finalScore = aggregateScores({
    execution: executionResult.executionScore,
    structure: structureResult.structureScore,
    lint: lintResult.lintScore,
    semantic: semanticResult.semanticScore,
  });

  const verdict = getVerdict(finalScore);
  const durationMs = Date.now() - startTime;

  // ─── Build Report ───────────────────────────────────────────────
  const report = {
    overallScore: finalScore,
    verdict,
    execution: {
      score: executionResult.executionScore,
      testsPassed: executionResult.testsPassed,
      testsTotal: executionResult.testsTotal,
      timedOut: executionResult.timedOut,
    },
    structure: {
      score: structureResult.structureScore,
      passed: structureResult.passed,
      total: structureResult.total,
      details: structureResult.details,
    },
    lint: {
      score: lintResult.lintScore,
      errorCount: lintResult.errorCount,
      warningCount: lintResult.warningCount,
    },
    semantic: {
      score: semanticResult.semanticScore,
      reasoning: semanticResult.reasoning,
      missingRequirements: semanticResult.missingRequirements || [],
      strengths: semanticResult.strengths || [],
    },
    metadata: {
      language,
      durationMs,
      timestamp: new Date().toISOString(),
    },
  };

  // Compute report hash for on-chain storage
  report.reportHash = crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");

  console.log(`[Orchestrator] Pipeline complete. Score: ${finalScore}, Verdict: ${verdict}`);
  return report;
}

module.exports = { runValidationPipeline };
