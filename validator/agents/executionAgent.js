/**
 * executionAgent.js
 * ─────────────────
 * Layer 2 — Sandboxed Execution
 *
 * Runs the AI-generated test suite against the submitted repo
 * inside a Docker container with strict resource limits.
 *
 * Returns test pass/fail counts and runtime output.
 */

const { exec } = require("child_process");
const path = require("path");
const dockerConfig = require("../../config/dockerConfig");

/**
 * Execute test suite in sandboxed Docker container.
 *
 * @param {string} repoPath      - Absolute path to cloned repo on host
 * @param {object} testSuite     - { language, testCommand, testFile? }
 * @returns {{ executionScore: number, testsPassed: number, testsTotal: number, runtimeOutput: string }}
 */
async function executeTests(repoPath, testSuite) {
  const { memoryLimit, cpuLimit, timeout, networkMode } = dockerConfig;
  const language = testSuite.language || "python";
  const testCommand = testSuite.testCommand || getDefaultTestCommand(language);
  const imageName = getDockerImage(language);

  // Build docker run command with security constraints
  const dockerCmd = [
    "docker run --rm",
    `--network=${networkMode}`,
    `--memory=${memoryLimit}`,
    `--cpus=${cpuLimit}`,
    "--read-only",
    "--tmpfs /tmp:rw,noexec,nosuid,size=100m",
    `-v ${repoPath}:/workspace:ro`,
    `-w /workspace`,
    imageName,
    `sh -c "${testCommand}"`,
  ].join(" ");

  return new Promise((resolve) => {
    const timeoutMs = timeout * 1000;

    const child = exec(dockerCmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const output = stdout + "\n" + stderr;
      const { passed, total } = parseTestOutput(output, language);

      const executionScore = total > 0 ? Math.round((passed / total) * 100) : 0;

      resolve({
        executionScore,
        testsPassed: passed,
        testsTotal: total,
        runtimeOutput: output.slice(0, 5000), // cap output size
        timedOut: error?.killed || false,
        exitCode: error?.code || 0,
      });
    });
  });
}

/**
 * Parse test runner output to extract pass/fail counts.
 * Supports pytest and jest/mocha style output.
 */
function parseTestOutput(output, language) {
  let passed = 0;
  let total = 0;

  if (language === "python") {
    // pytest format: "5 passed, 2 failed"
    const pytestMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    passed = pytestMatch ? parseInt(pytestMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    total = passed + failed;
  } else if (language === "javascript" || language === "typescript") {
    // jest format: "Tests: 5 passed, 2 failed, 7 total"
    const jestMatch = output.match(/Tests:\s+(\d+) passed.*?(\d+) total/);
    if (jestMatch) {
      passed = parseInt(jestMatch[1]);
      total = parseInt(jestMatch[2]);
    } else {
      // mocha format: "5 passing" / "2 failing"
      const passMatch = output.match(/(\d+) passing/);
      const failMatch = output.match(/(\d+) failing/);
      passed = passMatch ? parseInt(passMatch[1]) : 0;
      const failed = failMatch ? parseInt(failMatch[1]) : 0;
      total = passed + failed;
    }
  }

  return { passed, total };
}

function getDefaultTestCommand(language) {
  switch (language) {
    case "python":
      return "pip install -r requirements.txt --quiet 2>/dev/null; python -m pytest -v 2>&1";
    case "javascript":
    case "typescript":
      return "npm install --silent 2>/dev/null; npm test 2>&1";
    default:
      return "echo 'Unsupported language'";
  }
}

function getDockerImage(language) {
  switch (language) {
    case "python":      return "python:3.11-slim";
    case "javascript":  return "node:18-slim";
    case "typescript":  return "node:18-slim";
    default:            return "ubuntu:22.04";
  }
}

module.exports = { executeTests };
