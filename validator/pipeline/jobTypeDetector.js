/**
 * jobTypeDetector.js
 * ───────────────────
 * Detects the primary language/framework of a submitted repository.
 * Used by the orchestrator to select the correct linter and test runner.
 */

const fs = require("fs");
const path = require("path");

/**
 * Detect the primary language of a repo.
 *
 * @param {string} repoPath   - Path to the repo
 * @param {object} testSuite  - Test suite config (may contain language hint)
 * @returns {"python" | "javascript" | "typescript" | "unknown"}
 */
function detectJobType(repoPath, testSuite = {}) {
  // If test suite explicitly declares language, trust it
  if (testSuite.language) return testSuite.language;

  // Check for language-specific marker files
  const markers = {
    python: ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile"],
    javascript: ["package.json"],
    typescript: ["tsconfig.json"],
  };

  for (const [lang, files] of Object.entries(markers)) {
    for (const file of files) {
      if (fs.existsSync(path.join(repoPath, file))) {
        // Distinguish TS from JS when package.json exists
        if (lang === "javascript" && fs.existsSync(path.join(repoPath, "tsconfig.json"))) {
          return "typescript";
        }
        return lang;
      }
    }
  }

  // Fallback: count file extensions
  const extCounts = { py: 0, js: 0, ts: 0 };
  countExtensions(repoPath, extCounts);

  if (extCounts.py > extCounts.js && extCounts.py > extCounts.ts) return "python";
  if (extCounts.ts > extCounts.js) return "typescript";
  if (extCounts.js > 0) return "javascript";

  return "unknown";
}

function countExtensions(dir, counts, depth = 0) {
  if (depth > 3) return; // limit recursion
  if (!fs.existsSync(dir)) return;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        countExtensions(full, counts, depth + 1);
      } else {
        const ext = path.extname(entry.name).slice(1);
        if (ext in counts) counts[ext]++;
      }
    }
  } catch {}
}

module.exports = { detectJobType };
