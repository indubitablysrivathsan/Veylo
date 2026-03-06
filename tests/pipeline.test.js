/**
 * tests/pipeline.test.js
 * ───────────────────────
 * Unit and integration tests for the validation pipeline.
 *
 * Tests:
 *   1. Entry point discovery (framework signature detection)
 *   2. Score aggregation determinism
 *   3. Report hash determinism
 *   4. Structure agent (agnostic, no hardcoded filenames)
 *   5. Orchestrator error handling (agent crash fallback)
 */

const { describe, test, expect, beforeAll, afterAll } = require("@jest/globals");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ─── Test Setup ───────────────────────────────────────────────────────
const TEST_DIR = path.join(os.tmpdir(), "pipeline-test-" + Date.now());

function createMockRepo(structure) {
    const repoDir = path.join(TEST_DIR, "repo-" + Math.random().toString(36).slice(2, 8));
    fs.mkdirSync(repoDir, { recursive: true });

    for (const [filePath, content] of Object.entries(structure)) {
        const full = path.join(repoDir, filePath);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
    }

    return repoDir;
}

beforeAll(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
    try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch { }
});

// ─── Test 1: Entry Point Discovery ────────────────────────────────────
describe("Entry Point Discovery", () => {
    const { discoverEntryPoint } = require("../validator/pipeline/entryPointDiscovery");

    test("detects FastAPI project from import signature", () => {
        const repoDir = createMockRepo({
            "requirements.txt": "fastapi\nuvicorn\n",
            "src/main.py": `
from fastapi import FastAPI

app = FastAPI()

@app.get("/fibonacci")
def fibonacci(n: int):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return {"result": a}
`,
        });

        const result = discoverEntryPoint(repoDir, "python");
        expect(result.framework).toBe("fastapi");
        expect(result.entryFile).toContain("main.py");
        expect(result.confidence).toBeGreaterThan(0);
    });

    test("detects Express project from require signature", () => {
        const repoDir = createMockRepo({
            "package.json": '{"name": "test", "scripts": {"test": "jest"}}',
            "server.js": `
const express = require('express');
const app = express();
app.get('/fibonacci', (req, res) => res.json({result: 42}));
app.listen(3000);
`,
        });

        const result = discoverEntryPoint(repoDir, "javascript");
        expect(result.framework).toBe("express");
        expect(result.detectedPort).toBe(3000);
    });

    test("handles repos with no recognizable entry point gracefully", () => {
        const repoDir = createMockRepo({
            "README.md": "# Empty project\n",
        });

        const result = discoverEntryPoint(repoDir, "python");
        expect(result.confidence).toBeLessThanOrEqual(10);
    });
});

// ─── Test 2: Score Aggregation ────────────────────────────────────────
describe("Score Aggregation", () => {
    const { aggregateScores, getVerdict, computeReportHash } = require("../validator/pipeline/scoreAggregator");

    test("correctly applies weighted formula (0.50/0.10/0.20/0.20)", () => {
        const score = aggregateScores({
            execution: 100,
            structure: 100,
            lint: 100,
            semantic: 100,
        });
        expect(score).toBe(100);

        const score2 = aggregateScores({
            execution: 80,
            structure: 60,
            lint: 70,
            semantic: 90,
        });
        // 0.50*80 + 0.10*60 + 0.20*70 + 0.20*90 = 40 + 6 + 14 + 18 = 78
        expect(score2).toBe(78);
    });

    test("clamps scores to 0-100 range", () => {
        const score = aggregateScores({
            execution: 200,
            structure: -50,
            lint: 100,
            semantic: 100,
        });
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });

    test("verdict thresholds are correct", () => {
        expect(getVerdict(75)).toBe("PASS");
        expect(getVerdict(100)).toBe("PASS");
        expect(getVerdict(74)).toBe("DISPUTE");
        expect(getVerdict(50)).toBe("DISPUTE");
        expect(getVerdict(49)).toBe("FAIL");
        expect(getVerdict(0)).toBe("FAIL");
    });

    test("computeReportHash produces deterministic output", () => {
        const report = {
            overallScore: 78,
            verdict: "PASS",
            execution: { score: 80, testsPassed: 4, testsTotal: 5, timedOut: false },
            structure: { score: 60, passed: 3, total: 5 },
            lint: { score: 70, errorCount: 5, warningCount: 10 },
            semantic: { score: 90 },
            metadata: { language: "python", durationMs: 12345, timestamp: "2026-01-01T00:00:00Z" },
        };

        const hash1 = computeReportHash(report);
        const hash2 = computeReportHash(report);

        // Same input → same hash
        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 hex

        // Changing timestamp should NOT change hash
        const reportWithDifferentTime = {
            ...report,
            metadata: { ...report.metadata, timestamp: "2026-12-31T23:59:59Z", durationMs: 99999 },
        };
        const hash3 = computeReportHash(reportWithDifferentTime);
        expect(hash3).toBe(hash1);
    });

    test("computeReportHash changes when scores change", () => {
        const report1 = {
            overallScore: 78,
            verdict: "PASS",
            execution: { score: 80, testsPassed: 4, testsTotal: 5, timedOut: false },
            structure: { score: 60, passed: 3, total: 5 },
            lint: { score: 70, errorCount: 5, warningCount: 10 },
            semantic: { score: 90 },
            metadata: { language: "python" },
        };

        const report2 = { ...report1, overallScore: 50, verdict: "DISPUTE" };

        const hash1 = computeReportHash(report1);
        const hash2 = computeReportHash(report2);
        expect(hash1).not.toBe(hash2);
    });
});

// ─── Test 3: Structure Agent (Agnostic) ───────────────────────────────
describe("Structure Agent", () => {
    const { validateStructure } = require("../validator/agents/structureAgent");

    test("scores a well-structured repo without hardcoded filenames", async () => {
        const repoDir = createMockRepo({
            "requirements.txt": "fastapi\n",
            "src/fib_service.py": "from fastapi import FastAPI\napp = FastAPI()\n",
            "tests/test_fib.py": "def test_fib(): pass\n",
            "README.md": "# Fibonacci API\n",
        });

        const entryPoint = { framework: "fastapi", entryFile: "src/fib_service.py", confidence: 80 };
        const result = await validateStructure(repoDir, entryPoint);

        expect(result.structureScore).toBeGreaterThanOrEqual(80);
        expect(result.passed).toBeGreaterThan(0);
        expect(result.total).toBe(5);
        expect(result.details).toBeInstanceOf(Array);
    });

    test("returns low score for empty repo", async () => {
        const repoDir = createMockRepo({});
        const result = await validateStructure(repoDir, { confidence: 0 });
        expect(result.structureScore).toBeLessThan(20);
    });

    test("does NOT fail repos with non-standard naming", async () => {
        const repoDir = createMockRepo({
            "pyproject.toml": "[tool.poetry]\nname = 'test'\n",
            "my_custom_app/fibonacci_logic.py": "def compute_fib(n): pass\n",
        });

        const entryPoint = { framework: "script", entryFile: "my_custom_app/fibonacci_logic.py", confidence: 30 };
        const result = await validateStructure(repoDir, entryPoint);

        // Should get credit for source code, deps, and entry detection
        expect(result.structureScore).toBeGreaterThanOrEqual(55);
    });
});

// ─── Test 4: Logic Pattern Scanner ────────────────────────────────────
describe("Logic Pattern Scanner", () => {
    const { scanForLogicPattern } = require("../validator/pipeline/entryPointDiscovery");

    test("finds Fibonacci logic in code", () => {
        const repoDir = createMockRepo({
            "src/math_utils.py": `
def my_custom_fib(n):
    """Calculate fibonacci sequence"""
    if n <= 1:
        return n
    a, b = 0, 1
    for i in range(2, n + 1):
        a, b = b, a + b
    return b
`,
        });

        const result = scanForLogicPattern(repoDir, "fibonacci|fib");
        expect(result.found).toBe(true);
        expect(result.files.length).toBeGreaterThan(0);
    });

    test("returns false when pattern not found", () => {
        const repoDir = createMockRepo({
            "app.py": "print('hello world')\n",
        });

        const result = scanForLogicPattern(repoDir, "fibonacci|fib");
        expect(result.found).toBe(false);
    });
});

// ─── Test 5: Job Type Detector ────────────────────────────────────────
describe("Job Type Detector", () => {
    const { detectJobType } = require("../validator/pipeline/jobTypeDetector");

    test("detects Python from requirements.txt", () => {
        const repoDir = createMockRepo({
            "requirements.txt": "flask\n",
            "app.py": "from flask import Flask\n",
        });
        expect(detectJobType(repoDir)).toBe("python");
    });

    test("detects JavaScript from package.json", () => {
        const repoDir = createMockRepo({
            "package.json": '{"name":"test"}',
            "index.js": "const x = 1;\n",
        });
        expect(detectJobType(repoDir)).toBe("javascript");
    });

    test("detects TypeScript when tsconfig.json exists alongside package.json", () => {
        const repoDir = createMockRepo({
            "package.json": '{"name":"test"}',
            "tsconfig.json": '{}',
            "src/index.ts": "const x: number = 1;\n",
        });
        expect(detectJobType(repoDir)).toBe("typescript");
    });

    test("respects testSuite.language hint", () => {
        const repoDir = createMockRepo({});
        expect(detectJobType(repoDir, { language: "python" })).toBe("python");
    });
});
