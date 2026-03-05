/**
 * semanticAgent.js
 * ─────────────────
 * Layer 4 — Semantic AI Reasoning
 *
 * Uses a local LLM (Qwen2.5-Coder via Ollama) to evaluate whether
 * the submitted code actually fulfills the job requirements.
 *
 * The model receives: task description, repo structure, test results,
 * and key function signatures, then returns a compliance score + reasoning.
 */

const modelClient = require("../ai/modelClient");
const fs = require("fs");
const path = require("path");

/**
 * Run semantic analysis using local LLM.
 *
 * @param {object} params
 * @param {string} params.taskDescription   - Original job spec
 * @param {string[]} params.repoFiles       - List of files in repo
 * @param {string} params.testResults       - Summary of test execution
 * @param {string[]} params.functionSignatures - Extracted function signatures
 * @returns {{ semanticScore: number, reasoning: string }}
 */
async function analyzeSemantics({ taskDescription, repoFiles, testResults, functionSignatures }) {
  const prompt = buildPrompt({ taskDescription, repoFiles, testResults, functionSignatures });

  try {
    const response = await modelClient.generate(prompt);
    const parsed = parseResponse(response);
    return parsed;
  } catch (error) {
    console.error("[SemanticAgent] LLM call failed:", error.message);
    // Graceful fallback — return neutral score
    return {
      semanticScore: 50,
      reasoning: "Semantic analysis unavailable — LLM service unreachable. Defaulting to neutral score.",
    };
  }
}

/**
 * Build the evaluation prompt for the LLM.
 */
function buildPrompt({ taskDescription, repoFiles, testResults, functionSignatures }) {
  return `You are a code reviewer evaluating whether submitted work fulfills job requirements.

## Job Requirements
${taskDescription}

## Repository Files
${repoFiles.join("\n")}

## Test Execution Results
${testResults}

## Function Signatures Found
${functionSignatures.join("\n")}

## Your Task
Evaluate how well this submission meets the requirements above.

Respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "score": <number 0-100>,
  "reasoning": "<brief explanation of score>",
  "missingRequirements": ["<any unmet requirements>"],
  "strengths": ["<what was done well>"]
}`;
}

/**
 * Parse LLM response into structured output.
 */
function parseResponse(raw) {
  try {
    // Try direct JSON parse
    const data = JSON.parse(raw.trim());
    return {
      semanticScore: Math.max(0, Math.min(100, data.score || 50)),
      reasoning: data.reasoning || "No reasoning provided",
      missingRequirements: data.missingRequirements || [],
      strengths: data.strengths || [],
    };
  } catch {
    // Attempt to extract JSON from mixed output
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return {
          semanticScore: Math.max(0, Math.min(100, data.score || 50)),
          reasoning: data.reasoning || "Parsed from mixed output",
          missingRequirements: data.missingRequirements || [],
          strengths: data.strengths || [],
        };
      } catch {}
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

/**
 * Extract function signatures from a repo (simple grep-based approach).
 */
async function extractSignatures(repoPath, language) {
  const signatures = [];
  const ext = language === "python" ? ".py" : ".js";

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(ext)) {
        const content = fs.readFileSync(full, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
          if (language === "python" && line.match(/^\s*def \w+/)) {
            signatures.push(`${entry.name}: ${line.trim()}`);
          } else if (line.match(/^\s*(function|const|export)\s+\w+/)) {
            signatures.push(`${entry.name}: ${line.trim()}`);
          }
        }
      }
    }
  }

  walk(repoPath);
  return signatures;
}

module.exports = { analyzeSemantics, extractSignatures };
