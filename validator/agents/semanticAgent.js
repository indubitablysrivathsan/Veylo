/**
 * semanticAgent.js
 * ─────────────────
 * Layer 4 — Semantic AI Reasoning
 *
 * Uses a local LLM (Qwen2.5-Coder via Ollama) to evaluate whether
 * the submitted code actually fulfills the job requirements.
 *
 * KEY FEATURE: Structure-agnostic evaluation.
 * If a test fails due to a naming mismatch but the functional logic exists,
 * the AI gives partial credit based on functional intent.
 *
 * Temperature: 0 for deterministic output across runs.
 */

const modelClient = require("../ai/modelClient");
const fs = require("fs");
const path = require("path");

/**
 * Run semantic analysis using local LLM.
 *
 * @param {object} params
 * @param {string} params.taskDescription      - Original job spec
 * @param {string[]} params.repoFiles          - List of files in repo
 * @param {string} params.testResults          - Summary of test execution
 * @param {string[]} params.functionSignatures - Extracted function signatures
 * @param {object} [params.entryPoint]         - Discovered entry point info
 * @returns {{ semanticScore: number, reasoning: string, missingRequirements: string[], strengths: string[] }}
 */
async function analyzeSemantics({ taskDescription, repoFiles, testResults, functionSignatures, entryPoint }) {
  const prompt = buildPrompt({ taskDescription, repoFiles, testResults, functionSignatures, entryPoint });

  try {
    const response = await modelClient.generate(prompt, {
      temperature: 0,  // Deterministic output
    });
    const parsed = parseResponse(response);
    return parsed;
  } catch (error) {
    console.error("[SemanticAgent] LLM call failed:", error.message);
    // Graceful fallback — return neutral score
    return {
      semanticScore: 50,
      reasoning: "Semantic analysis unavailable — LLM service unreachable. Defaulting to neutral score.",
      missingRequirements: [],
      strengths: [],
    };
  }
}

/**
 * Build the evaluation prompt for the LLM.
 *
 * Includes explicit instructions for:
 * - Creative structure tolerance (no hardcoded filename requirements)
 * - Functional intent verification (naming mismatches → partial credit)
 * - Code-aware analysis
 */
function buildPrompt({ taskDescription, repoFiles, testResults, functionSignatures, entryPoint }) {
  const entryInfo = entryPoint
    ? `\n## Detected Entry Point\nFramework: ${entryPoint.framework}\nEntry File: ${entryPoint.entryFile || "not found"}\nDetected Port: ${entryPoint.detectedPort || "none"}\nConfidence: ${entryPoint.confidence}%`
    : "";

  return `You are a senior code reviewer evaluating whether submitted work fulfills job requirements.

## CRITICAL EVALUATION RULES
1. **Structure-Agnostic**: Do NOT penalize for file naming conventions. If the task asks for a "Fibonacci API" and the developer put it in "src/fib_service.py" instead of "app.py", that is VALID.
2. **Functional Intent**: If a test failed due to a naming mismatch (e.g., function called "calc_fib" instead of "fibonacci"), but the functional logic is correct, give PARTIAL CREDIT (70-85 range).
3. **Focus on OUTPUT ACCURACY**: Does the code produce the correct results? Internal naming is irrelevant.
4. **Creative solutions are valid**: Alternative architectures that achieve the same functional requirements should not be penalized.

## Job Requirements
${taskDescription}

## Repository Files
${repoFiles.join("\n")}
${entryInfo}

## Test Execution Results
${testResults}

## Function Signatures Found
${functionSignatures.join("\n")}

## Your Task
Evaluate how well this submission meets the FUNCTIONAL requirements above.
Consider: Does the code's logic match the task intent, even if naming differs?

Respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "score": <number 0-100>,
  "reasoning": "<brief explanation focusing on functional compliance>",
  "missingRequirements": ["<any truly unmet functional requirements>"],
  "strengths": ["<what was done well>"],
  "namingMismatches": ["<any naming differences that don't affect functionality>"]
}`;
}

/**
 * Parse LLM response into structured output.
 */
function parseResponse(raw) {
  try {
    // Try direct JSON parse
    const data = JSON.parse(raw.trim());
    return normalizeResponse(data);
  } catch {
    // Attempt to extract JSON from mixed output
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return normalizeResponse(data);
      } catch { }
    }

    // Complete fallback
    return {
      semanticScore: 50,
      reasoning: "Could not parse LLM response. Raw: " + raw.slice(0, 500),
      missingRequirements: [],
      strengths: [],
    };
  }
}

function normalizeResponse(data) {
  return {
    semanticScore: Math.max(0, Math.min(100, data.score || 50)),
    reasoning: data.reasoning || "No reasoning provided",
    missingRequirements: data.missingRequirements || [],
    strengths: data.strengths || [],
    namingMismatches: data.namingMismatches || [],
  };
}

/**
 * Extract function signatures from a repo (simple grep-based approach).
 * Supports: .py, .js, .ts, .tsx, .mjs
 */
async function extractSignatures(repoPath, language) {
  const signatures = [];
  const extensions = getSignatureExtensions(language);

  function walk(dir, depth) {
    if (depth > 4) return;
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__" || entry.name === "venv") continue;

        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          try {
            const content = fs.readFileSync(full, "utf-8");
            const lines = content.split("\n");
            for (const line of lines) {
              if (language === "python" && line.match(/^\s*def \w+/)) {
                signatures.push(`${entry.name}: ${line.trim()}`);
              } else if (language === "python" && line.match(/^\s*class \w+/)) {
                signatures.push(`${entry.name}: ${line.trim()}`);
              } else if (line.match(/^\s*(function|const|export|async\s+function)\s+\w+/)) {
                signatures.push(`${entry.name}: ${line.trim()}`);
              }
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Permission error
    }
  }

  walk(repoPath, 0);
  return signatures;
}

function getSignatureExtensions(language) {
  switch (language) {
    case "python": return [".py"];
    case "javascript": return [".js", ".mjs", ".cjs"];
    case "typescript": return [".ts", ".tsx", ".mts"];
    default: return [".py", ".js", ".ts"];
  }
}

module.exports = { analyzeSemantics, extractSignatures };
