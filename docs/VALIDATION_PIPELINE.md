# Validation Pipeline

## Overview

The validation pipeline is the core intelligence of the platform. It automatically assesses freelancer submissions through a **Discovery-First Architecture** — no hardcoded file paths or naming conventions required.

## Pipeline Architecture — Five Stages

```
Commit Hash / Repo URL submitted
    │
    ├─→ [1] Entry Point Discovery     (signature-based, agnostic)
    ├─→ [2] Structure / Viability     (source code, deps, entry, tests, readme)
    ├─→ [3] Sandboxed Execution       (hardened Docker, 512MB/1CPU/30s/no-net)
    ├─→ [4] Static Analysis (Lint)    (flake8 / eslint)
    └─→ [5] Semantic AI Reasoning     (Qwen2.5-Coder, structure-agnostic)
    │
    ▼
Score Aggregator → Final Score → Verdict → Report Hash → On-chain Recording
```

Each agent is wrapped in error handling. If an agent crashes or times out (60s per agent), the pipeline continues with fallback scores.

## Scoring Formula

```
Final Score = (0.50 × Execution) + (0.10 × Viability) + (0.20 × Lint) + (0.20 × Semantic)
```

Weights are configurable via environment variables (`WEIGHT_EXECUTION`, etc.) and validated at startup.

**Verdicts:**
| Score Range | Verdict | Action |
|-------------|---------|--------|
| ≥ 75 | PASS | Payment released |
| 50–74 | DISPUTE | Dispute window opens |
| < 50 | FAIL | Refund to client |

## Stage Details

### Stage 1 — Entry Point Discovery

**Structure-agnostic.** Scans source files for framework signatures instead of expecting hardcoded filenames.

**Detected frameworks:**
- Python: FastAPI, Flask, Django, pytest, plain scripts
- JavaScript: Express, Koa, Hapi, Next.js
- TypeScript: Express, Next.js

**Output:** `{ framework, entryFile, entryCommand, detectedPort, confidence }`

### Stage 2 — Structure / Viability

Checks five viability criteria (no hardcoded filenames):
1. Source code files exist (`.py`, `.js`, `.ts`, etc.)
2. Dependency manifest exists (`requirements.txt`, `package.json`, etc.)
3. Entry point is detectable (framework signatures found)
4. Test files exist
5. README documentation present

### Stage 3 — Sandboxed Execution

Runs tests inside a Docker container with strict security:

| Flag | Value | Purpose |
|------|-------|---------|
| `--network` | `none` | No internet access |
| `--memory` | `512m` | RAM limit |
| `--cpus` | `1` | CPU limit |
| `--read-only` | — | Immutable root filesystem |
| `--pids-limit` | `64` | Prevent fork bombs |
| `--security-opt` | `no-new-privileges` | No privilege escalation |
| `--cap-drop` | `ALL` | Drop all capabilities |
| `--ulimit nproc` | `64` | Process limit |
| `--ulimit fsize` | `10MB` | File size limit |

Timeout: 30 seconds (configurable). Force-killed 5s after timeout if still running.

### Stage 4 — Static Analysis

- **Python:** flake8 (errors × 3pts, warnings × 1pt deduction)
- **JavaScript/TypeScript:** eslint (supports `.tsx`)

### Stage 5 — Semantic AI Reasoning

Uses Qwen2.5-Coder (via Ollama) with `temperature: 0` and `seed: 42` for deterministic output.

**Key behavior:** If a test fails due to a naming mismatch but the functional logic exists, the AI gives partial credit (70-85 range). Creative structures are not penalized.

## Deterministic Report Hash

The `reportHash` (SHA-256) is computed from **only deterministic fields**:
- Overall score, verdict
- Per-agent scores
- Test pass/fail counts
- Error/warning counts
- Detected language

**Excluded** from hash: timestamp, duration, commitHash (these are metadata).

## Adding New Validators

1. Create `validator/agents/myNewAgent.js` following the agent interface
2. Export an async function that returns `{ score: number, ...details }`
3. Register it in `validator/pipeline/orchestrator.js`
4. Add its weight to `config/scoringConfig.js`
5. Add fallback score to `scoringConfig.pipeline.fallbackScores`

## Error Handling

- Each agent is wrapped in a 60-second timeout
- Crashed agents return fallback scores (configurable in `scoringConfig.js`)
- Pipeline crash returns structured `verdict: FAIL` with error details
- Job state resets to `WORK_SUBMITTED` on crash (allows retry)
- Docker containers are force-killed 5s after timeout

## Blockchain Integration

On completion:
1. `reportHash` is computed deterministically
2. `escrowService.recordValidationOnChain(jobId, score, reportHash)` is called
3. Smart contract transitions: `WORK_SUBMITTED → VALIDATED → PAID/REFUNDED/DISPUTED`
