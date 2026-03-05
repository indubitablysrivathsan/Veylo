/**
 * scripts/runValidator.ts
 * ────────────────────────
 * CLI script to manually trigger validation on a local repo.
 * Useful for testing the pipeline without the full API server.
 *
 * Usage:
 *   npx ts-node scripts/runValidator.ts --repo ./sample-submission --desc "Build a Fibonacci API"
 *   npx ts-node scripts/runValidator.ts --repo /path/to/repo
 */

import { runValidationPipeline } from "../validator/pipeline/orchestrator";
import { generateTestSuite } from "../validator/ai/testGenerator";
import { healthCheck } from "../validator/ai/modelClient";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Blockchain Escrow — Validator Runner   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Check Ollama availability
  console.log("Checking AI model availability...");
  const health = await healthCheck();
  if (health.available) {
    console.log(`  ✓ Ollama is running. Model available: ${health.hasModel}`);
  } else {
    console.log(`  ✗ Ollama not available: ${health.error}`);
    console.log("  → Semantic analysis will use fallback scoring\n");
  }

  const repoPath = args.repo || "./sample-submission";
  const description = args.desc || "Build a Python REST API that returns Fibonacci numbers";

  console.log(`\nRepo path: ${repoPath}`);
  console.log(`Description: ${description}\n`);

  // Generate test suite if not provided
  console.log("Generating test suite from description...");
  let testSuite;
  try {
    testSuite = await generateTestSuite(description);
    console.log("Test suite generated:", JSON.stringify(testSuite, null, 2).slice(0, 500));
  } catch (err: any) {
    console.warn("Test generation failed, using defaults:", err.message);
    testSuite = {
      language: "python",
      required_files: ["app.py", "requirements.txt"],
      required_dirs: [],
      testCommand: "python -m pytest -v",
    };
  }

  // Run the pipeline
  console.log("\n─── Running Validation Pipeline ───\n");

  const report = await runValidationPipeline({
    repoPath,
    taskDescription: description,
    testSuite,
    requirements: {
      required_files: testSuite.required_files || [],
      required_dirs: testSuite.required_dirs || [],
    },
  });

  // Pretty-print results
  console.log("\n═══════════════════════════════════");
  console.log("        VALIDATION REPORT");
  console.log("═══════════════════════════════════");
  console.log(`Overall Score : ${report.overallScore}/100`);
  console.log(`Verdict       : ${report.verdict}`);
  console.log(`Report Hash   : ${report.reportHash}`);
  console.log("───────────────────────────────────");
  console.log(`Execution     : ${report.execution.score}/100 (${report.execution.testsPassed}/${report.execution.testsTotal} tests)`);
  console.log(`Structure     : ${report.structure.score}/100 (${report.structure.passed}/${report.structure.total} items)`);
  console.log(`Lint          : ${report.lint.score}/100 (${report.lint.errorCount} errors, ${report.lint.warningCount} warnings)`);
  console.log(`Semantic      : ${report.semantic.score}/100`);
  console.log(`Duration      : ${report.metadata.durationMs}ms`);
  console.log("───────────────────────────────────");

  if (report.semantic.reasoning) {
    console.log(`\nAI Reasoning: ${report.semantic.reasoning}`);
  }

  if (report.verdict === "PASS") {
    console.log("\n✅ PASS — Payment would be released to freelancer.");
  } else if (report.verdict === "DISPUTE") {
    console.log("\n⚠️  DISPUTE — Score in dispute range (50-74). Dispute window opens.");
  } else {
    console.log("\n❌ FAIL — Refund would be issued to client.");
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && argv[i + 1]) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

main().catch((err) => {
  console.error("Validator failed:", err);
  process.exit(1);
});
