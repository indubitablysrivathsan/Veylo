/**
 * testGenerator.js
 * ─────────────────
 * Converts natural-language job descriptions into structured
 * validation test suites using a local LLM.
 *
 * The generated test suite includes:
 *   - required files and directories
 *   - required functions
 *   - test cases with inputs/outputs
 *   - language and test command
 */

const modelClient = require("./modelClient");

/**
 * Generate a validation test suite from a job description.
 *
 * @param {string} jobDescription - Natural language job spec
 * @returns {object} Structured test suite
 */
async function generateTestSuite(jobDescription) {
  const prompt = `You are a QA engineer. Given a job description, generate a structured validation test suite.

## Job Description
${jobDescription}

## Output Format
Respond ONLY with valid JSON (no markdown fences, no extra text):
{
  "language": "python" | "javascript",
  "test_cases": [
    { "input": "...", "expected_output": "...", "description": "..." }
  ],
  "testCommand": "python -m pytest tests/ -v",
  "testFile": "tests/test_generated.py",
  "testCode": "# pytest test code here..."
}

Generate realistic, comprehensive tests. Include edge cases.`;

  try {
    const response = await modelClient.generate(prompt);
    const suite = parseTestSuite(response);
    return suite;
  } catch (error) {
    console.error("[TestGenerator] Failed to generate test suite:", error.message);
    return getDefaultTestSuite(jobDescription);
  }
}

/**
 * Parse LLM response into a structured test suite.
 */
function parseTestSuite(raw) {
  try {
    return JSON.parse(raw.trim());
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not parse test suite from LLM response");
  }
}

/**
 * Fallback test suite when LLM is unavailable.
 */
function getDefaultTestSuite(description) {
  const isPython = /python|flask|django|fastapi/i.test(description);
  const language = isPython ? "python" : "javascript";

  return {
    language,
    test_cases: [
      { input: "basic_test", expected_output: "success", description: "Basic functionality test" },
    ],
    testCommand: isPython ? "python -m pytest -v" : "npm test",
    testFile: isPython ? "tests/test_generated.py" : "tests/test.js",
    testCode: "// Auto-generated fallback — manual review needed",
  };
}

module.exports = { generateTestSuite };
