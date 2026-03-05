/**
 * server.js
 * ──────────
 * Main entry point for the blockchain-escrow backend.
 *
 * Starts the Express API server and initializes services.
 *
 * Usage:
 *   node server.js
 *   PORT=4000 node server.js
 */

const express = require("express");
const cors = require("cors");
const escrowService = require("./backend/services/escrowService");
const modelClient = require("./validator/ai/modelClient");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────
app.use("/api/jobs", require("./backend/routes/jobs"));
app.use("/api/validation", require("./backend/routes/validation"));
app.use("/api/reputation", require("./backend/routes/reputation"));

// ─── Health Check ─────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  const ollamaHealth = await modelClient.healthCheck();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: true,
      blockchain: escrowService.isAvailable(),
      ollama: ollamaHealth.available,
      ollamaModel: ollamaHealth.hasModel || false,
    },
  });
});

// ─── API Overview ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Blockchain Escrow Platform",
    version: "0.1.0",
    endpoints: {
      "POST /api/jobs":                    "Create a new job",
      "GET  /api/jobs":                    "List all jobs",
      "GET  /api/jobs/:id":                "Get job details",
      "PUT  /api/jobs/:id/accept":          "Accept a job (freelancer)",
      "POST /api/jobs/:id/submit":         "Submit work for a job",
      "POST /api/validation/run":          "Trigger validation pipeline",
      "GET  /api/validation/:jobId":       "Get validation report",
      "POST /api/validation/generate-tests": "Generate test suite from description",
      "POST /api/validation/check-ambiguity": "Check spec for ambiguities",
      "GET  /api/reputation/:address":     "Get reputation for address",
      "GET  /api/health":                  "System health check",
    },
  });
});

// ─── Startup ──────────────────────────────────────────────
async function start() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Blockchain Escrow Platform — Backend API   ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Initialize blockchain connection (non-fatal)
  await escrowService.initialize();

  // Check Ollama status
  const ollamaHealth = await modelClient.healthCheck();
  if (ollamaHealth.available) {
    console.log(`[Startup] Ollama available. Model ${ollamaHealth.model}: ${ollamaHealth.hasModel ? "ready" : "needs pull"}`);
    if (!ollamaHealth.hasModel) {
      console.log(`[Startup] Run: ollama pull ${ollamaHealth.model}`);
    }
  } else {
    console.log("[Startup] Ollama not available — semantic analysis will use fallback scores");
  }

  app.listen(PORT, () => {
    console.log(`\n[Server] API running at http://localhost:${PORT}`);
    console.log("[Server] Try: GET http://localhost:${PORT}/health\n");
  });
}

start().catch(console.error);
