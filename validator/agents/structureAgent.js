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
 * @param {object} requirements - { required_files: string[], required_dirs?: string[] }
 * @returns {{ structureScore: number, details: object[] }}
 */
async function validateStructure(repoPath, requirements) {
  const results = [];
  const requiredFiles = requirements.required_files || [];
  const requiredDirs = requirements.required_dirs || [];

  let passed = 0;
  const total = requiredFiles.length + requiredDirs.length;

  // Check required files
  for (const file of requiredFiles) {
    const fullPath = path.join(repoPath, file);
    const exists = fs.existsSync(fullPath);
    results.push({
      type: "file",
      path: file,
      exists,
      status: exists ? "PASS" : "FAIL",
    });
    if (exists) passed++;
  }

  // Check required directories
  for (const dir of requiredDirs) {
    const fullPath = path.join(repoPath, dir);
    const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    results.push({
      type: "directory",
      path: dir,
      exists,
      status: exists ? "PASS" : "FAIL",
    });
    if (exists) passed++;
  }

  // Check for README (bonus — always expected)
  const hasReadme = ["README.md", "README.txt", "README"].some((f) =>
    fs.existsSync(path.join(repoPath, f))
  );
  if (!requiredFiles.some((f) => f.toLowerCase().startsWith("readme"))) {
    results.push({
      type: "file",
      path: "README.md",
      exists: hasReadme,
      status: hasReadme ? "PASS" : "WARN",
      note: "README recommended but not strictly required",
    });
  }

  const structureScore = total > 0 ? Math.round((passed / total) * 100) : 100;

  return {
    structureScore,
    passed,
    total,
    details: results,
  };
}

module.exports = { validateStructure };
