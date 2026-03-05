/**
 * modelClient.js
 * ───────────────
 * Wrapper for local LLM inference via Ollama.
 *
 * Model: Qwen2.5-Coder (code-specialized, runs locally)
 * Endpoint: http://localhost:11434/api/generate
 *
 * Usage:
 *   const client = require('./modelClient');
 *   const response = await client.generate("Explain this code...");
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";
const DEFAULT_TIMEOUT = 60000; // 60s for code analysis

/**
 * Generate a completion from the local Ollama LLM.
 *
 * @param {string} prompt     - The full prompt text
 * @param {object} options    - Optional overrides
 * @param {string} options.model   - Model name (default: qwen2.5-coder:7b)
 * @param {number} options.timeout - Request timeout in ms
 * @returns {string} The model's text response
 */
async function generate(prompt, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,     // low temp for deterministic code analysis
          num_predict: 2048,    // max output tokens
          top_p: 0.9,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.response || "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Check if Ollama is running and the model is available.
 *
 * @returns {{ available: boolean, model: string, error?: string }}
 */
async function healthCheck() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    const hasModel = models.some((m) => m.includes(DEFAULT_MODEL.split(":")[0]));

    return {
      available: true,
      model: DEFAULT_MODEL,
      hasModel,
      installedModels: models,
    };
  } catch (error) {
    return {
      available: false,
      model: DEFAULT_MODEL,
      error: error.message,
    };
  }
}

module.exports = { generate, healthCheck };
