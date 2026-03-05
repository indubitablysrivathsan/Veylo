# Validation Pipeline

## Overview

The validation pipeline is the core intelligence of the platform. It automatically assesses freelancer submissions through four independent layers, each targeting a different quality dimension.

## Pipeline Execution Order

```
Submission received
    │
    ├─→ [1] Structure Agent    (fast, no dependencies)
    ├─→ [2] Execution Agent    (requires Docker)
    ├─→ [3] Lint Agent         (requires language tools)
    └─→ [4] Semantic Agent     (requires Ollama)
    │
    ▼
Score Aggregator → Final Score → Verdict → On-chain Recording
```

Agents run sequentially. Each agent is independent and produces its own score. If an agent fails, it returns a fallback score (configurable).

## Layer Details

### Layer 1 — Structure Validation

Checks that the repo matches the expected file structure from the test suite spec.

**What it checks:**
- Required source files exist (e.g., `app.py`, `index.js`)
- Required directories exist (e.g., `src/`, `tests/`)
- README.md is present (recommended)

**Runtime:** < 1 second

### Layer 2 — Sandboxed Execution

Runs the AI-generated test suite inside a Docker container with strict limits.

**Docker constraints:**
- `--network=none` (no internet)
- `--memory=512m`
- `--cpus=1`
- `--read-only` filesystem
- 30-second timeout

**Output:** test pass/fail counts, runtime output, exit code

### Layer 3 — Static Analysis

Runs language-appropriate linters.

- **Python:** flake8 (errors, warnings, style)
- **JavaScript/TypeScript:** eslint (configurable rules)

**Scoring:** deducts points per error/warning

### Layer 4 — Semantic AI Reasoning

Uses Qwen2.5-Coder (via Ollama) to evaluate requirement compliance at a conceptual level.

**Input to LLM:**
- Original task description
- File listing
- Test results summary
- Function signatures

**Output:** 0–100 score + reasoning text

## Adding New Validators

The pipeline is designed for extensibility. To add a new validation layer:

1. Create `validator/agents/myNewAgent.js` following the agent interface
2. Export an async function that returns `{ score: number, ...details }`
3. Register it in `validator/pipeline/orchestrator.js`
4. Add its weight to `config/scoringConfig.js`

## Error Handling

If any agent throws an error or times out, the pipeline continues with remaining agents and uses the configured fallback score for the failed agent.
