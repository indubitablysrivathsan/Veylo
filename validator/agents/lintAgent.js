/**
 * lintAgent.js
 * ─────────────
 * Layer 3 — Static Analysis
 *
 * Runs language-specific linters on the submitted code and
 * computes a lint quality score.
 *
 * Supported: Python (flake8), JavaScript/TypeScript (eslint)
 *
 * Error handling: if the linter itself crashes or is not installed,
 * the agent returns a fallback score instead of crashing the pipeline.
 */

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Run static analysis on submitted repo.
 *
 * @param {string} repoPath  - Path to cloned repo
 * @param {string} language  - "python" | "javascript" | "typescript"
 * @returns {{ lintScore: number, issues: object[], errorCount: number, warningCount: number, rawOutput: string }}
 */
async function runLintAnalysis(repoPath, language) {
  try {
    switch (language) {
      case "python":
        return await runPythonLint(repoPath);
      case "javascript":
      case "typescript":
        return await runJSLint(repoPath, language);
      default:
        return { lintScore: 100, issues: [], errorCount: 0, warningCount: 0, rawOutput: "No linter for language: " + language };
    }
  } catch (error) {
    console.error(`[LintAgent] Linter crashed: ${error.message}`);
    return {
      lintScore: 70,
      issues: [],
      errorCount: 0,
      warningCount: 0,
      rawOutput: `Linter error: ${error.message}`,
    };
  }
}

/**
 * Python: run flake8 (lighter, faster).
 * Score = 100 - (errors * 3) - (warnings * 1), clamped to [0, 100]
 */
async function runPythonLint(repoPath) {
  return new Promise((resolve) => {
    // Use proper quoting for paths with spaces
    const cmd = `flake8 --count --statistics --max-line-length=120 "${repoPath}" 2>&1`;

    exec(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      const output = stdout || "";
      const lines = output.trim().split("\n").filter(Boolean);
      const issues = lines
        .filter((l) => l.includes(":"))
        .map((l) => {
          const match = l.match(/^(.+):(\d+):(\d+): (\w+) (.+)$/);
          if (!match) return { raw: l };
          return {
            file: match[1],
            line: parseInt(match[2]),
            col: parseInt(match[3]),
            code: match[4],
            message: match[5],
          };
        });

      // Count actual errors (E) vs warnings (W)
      const errorCount = issues.filter((i) => i.code && i.code.startsWith("E")).length;
      const warningCount = issues.filter((i) => i.code && i.code.startsWith("W")).length;

      // Score: deduct 3 points per error, 1 per warning, floor at 0
      const lintScore = Math.max(0, Math.min(100, 100 - errorCount * 3 - warningCount * 1));

      resolve({
        lintScore,
        issues,
        errorCount,
        warningCount,
        rawOutput: output.slice(0, 3000),
      });
    });
  });
}

/**
 * JavaScript/TypeScript: run eslint with default rules.
 * Score = 100 - (errors * 3 + warnings * 1), clamped to [0, 100]
 */
async function runJSLint(repoPath, language) {
  return new Promise((resolve) => {
    // Include .tsx files for TypeScript projects with JSX
    const extensions = language === "typescript" ? "js,ts,tsx" : "js";
    // Use proper quoting for paths with spaces
    const cmd = `npx eslint --no-eslintrc --rule '{"no-unused-vars":"warn","no-undef":"error"}' --format json "**/*.{${extensions}}" 2>&1`;

    exec(cmd, { timeout: 30000, maxBuffer: 1024 * 1024, cwd: repoPath }, (error, stdout) => {
      let errorCount = 0;
      let warningCount = 0;
      let issues = [];

      try {
        const results = JSON.parse(stdout);
        for (const file of results) {
          for (const msg of file.messages || []) {
            issues.push({
              file: file.filePath,
              line: msg.line,
              col: msg.column,
              code: msg.ruleId,
              severity: msg.severity === 2 ? "error" : "warning",
              message: msg.message,
            });
            if (msg.severity === 2) errorCount++;
            else warningCount++;
          }
        }
      } catch {
        // eslint output wasn't JSON — parse as text
        issues = [{ raw: (stdout || "").slice(0, 2000) }];
      }

      const lintScore = Math.max(0, Math.min(100, 100 - errorCount * 3 - warningCount * 1));

      resolve({
        lintScore,
        issues,
        errorCount,
        warningCount,
        rawOutput: (stdout || "").slice(0, 3000),
      });
    });
  });
}

module.exports = { runLintAnalysis };
