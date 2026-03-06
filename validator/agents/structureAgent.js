/**
 * structureAgent.js
 * ─────────────────
 * Layer 1 — Structure / Viability Validation
 *
 * STRUCTURE-AGNOSTIC: Does NOT require hardcoded filenames like app.py or index.js.
 * Instead, checks for: source code existence, dependency files, detectable entry points
 * (via signature scanning), test files, and documentation.
 *
 * Input:  repoPath (string), entryPoint (object, from discovery)
 * Output: { structureScore: 0-100, passed, total, details, checks }
 */

const fs = require("fs");
const path = require("path");

/**
 * Validate repository viability — structure-agnostic.
 *
 * @param {string} repoPath    - Absolute path to cloned repo
 * @param {object} [entryPoint] - Discovery result from entryPointDiscovery.js
 * @returns {{ structureScore: number, passed: number, total: number, details: object[], checks: object }}
 */
async function validateStructure(repoPath, entryPoint = {}) {
  const files = listRepoFiles(repoPath);

  const checks = {
    hasSourceCode: {
      label: "Contains source code files",
      pass: files.some(f => /\.(py|js|ts|jsx|tsx|java|cpp|go|rs|rb)$/.test(f)),
      weight: 40,
    },
    hasDependencyFile: {
      label: "Has dependency/manifest file",
      pass: files.some(f =>
        ["requirements.txt", "pyproject.toml", "package.json", "Pipfile", "setup.py", "Cargo.toml", "go.mod", "Gemfile", "pom.xml", "build.gradle"].includes(f)
      ),
      weight: 20,
    },
    hasDetectableEntry: {
      label: "Entry point is detectable (framework signatures found)",
      pass: entryPoint.confidence > 0 && entryPoint.entryFile !== null,
      weight: 15,
    },
    hasTests: {
      label: "Contains test files",
      pass: files.some(f =>
        f.includes("test") || f.includes("spec") || f.includes("__tests__")
      ),
      weight: 15,
    },
    hasReadme: {
      label: "Has README documentation",
      pass: files.some(f => f.toLowerCase().startsWith("readme")),
      weight: 10,
    },
  };

  // Calculate score and pass/total counts
  let score = 0;
  let passed = 0;
  const total = Object.keys(checks).length;
  const details = [];

  for (const [key, check] of Object.entries(checks)) {
    if (check.pass) {
      score += check.weight;
      passed++;
    }
    details.push({
      check: key,
      label: check.label,
      passed: check.pass,
      weight: check.weight,
    });
  }

  return {
    structureScore: score,
    passed,
    total,
    details,
    checks: Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [k, v.pass])
    ),
  };
}

/**
 * Recursively list all filenames in a repo (max depth 4).
 */
function listRepoFiles(repoPath, depth = 0) {
  if (depth > 4) return [];

  let files = [];

  try {
    for (const entry of fs.readdirSync(repoPath, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__" || entry.name === "venv" || entry.name === ".venv") continue;

      const full = path.join(repoPath, entry.name);

      if (entry.isDirectory()) {
        files = files.concat(listRepoFiles(full, depth + 1));
      } else {
        files.push(entry.name);
      }
    }
  } catch {
    // Permission or read error
  }

  return files;
}

module.exports = { validateStructure };
