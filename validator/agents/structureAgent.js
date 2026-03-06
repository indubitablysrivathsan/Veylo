/**
 * structureAgent.js
 * ─────────────────
 * Layer 1 — Structure Validation
 *
 * Checks that the submitted repository contains all required files
 * and directories as defined in the test suite spec.
 *
 * Input:  repoPath (string), requiredStructure (object)
 * Output: { structureScore: 0-100, details: [...] }
 */

const fs = require("fs");
const path = require("path");

/**
 * Validate repository structure against requirements.
 *
 * @param {string} repoPath - Absolute path to cloned repo
 * @param {object} testSuite - { required_files: string[], required_dirs?: string[] }
 * @returns {{ structureScore: number, details: object[] }}
 */

function listRepoFiles(repoPath, depth = 0) {
  if (depth > 4) return [];

  let files = [];

  for (const entry of fs.readdirSync(repoPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const full = path.join(repoPath, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(listRepoFiles(full, depth + 1));
    } else {
      files.push(entry.name);
    }
  }

  return files;
}

async function validateStructure(repoPath) {
  const files = listRepoFiles(repoPath);

  const checks = {
    hasSourceCode: files.some(f => /\.(py|js|ts|java|cpp|go)$/.test(f)),
    hasDependencyFile: files.some(f =>
      ["requirements.txt","pyproject.toml","package.json","Pipfile","setup.py"].includes(f)
    ),
    hasEntrypoint: files.some(f =>
      ["main.py","app.py","index.js","server.js"].includes(f)
    ),
    hasTests: files.some(f =>
      f.includes("test") || f.includes("__tests__")
    ),
    hasReadme: files.some(f =>
      f.toLowerCase().startsWith("readme")
    )
  };
  
  let score = 0;

  if (checks.hasSourceCode) score += 40;
  if (checks.hasDependencyFile) score += 20;
  if (checks.hasEntrypoint) score += 15;
  if (checks.hasTests) score += 15;
  if (checks.hasReadme) score += 10;

  return {
    structureScore: score,
    checks
  };
}

module.exports = { validateStructure };
