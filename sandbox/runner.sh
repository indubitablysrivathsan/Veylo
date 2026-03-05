#!/bin/bash
# ─────────────────────────────────────────────────────────
# runner.sh — Sandbox execution script
#
# Runs inside Docker container with strict resource limits.
# Detects project type, installs dependencies, runs tests.
#
# Usage (called by executionAgent via docker run):
#   docker run --rm --network=none --memory=512m --cpus=1 \
#     -v /path/to/repo:/workspace:ro sandbox-image
# ─────────────────────────────────────────────────────────

set -e

WORKSPACE="/workspace"
RESULTS_FILE="/tmp/test_results.json"
MAX_OUTPUT=10000  # Max characters of captured output

echo "========================================"
echo " Sandbox Runner — Starting Execution"
echo "========================================"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Copy workspace to writable temp (root is read-only)
cp -r "$WORKSPACE" /tmp/work 2>/dev/null || true
cd /tmp/work

# ─── Detect Project Type ──────────────────────────────────
if [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ]; then
    PROJECT_TYPE="python"
elif [ -f "package.json" ]; then
    PROJECT_TYPE="javascript"
else
    echo "ERROR: Could not detect project type."
    echo "No requirements.txt, setup.py, pyproject.toml, or package.json found."
    exit 1
fi

echo "Detected project type: $PROJECT_TYPE"
echo ""

# ─── Install Dependencies ─────────────────────────────────
echo "--- Installing dependencies ---"
if [ "$PROJECT_TYPE" = "python" ]; then
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt --quiet --no-cache-dir 2>&1 | tail -5
    fi
elif [ "$PROJECT_TYPE" = "javascript" ]; then
    if [ -f "package.json" ]; then
        npm install --silent 2>&1 | tail -5
    fi
fi
echo ""

# ─── Run Tests ─────────────────────────────────────────────
echo "--- Running test suite ---"
if [ "$PROJECT_TYPE" = "python" ]; then
    # Run pytest with verbose output
    python -m pytest -v --tb=short 2>&1 || true
elif [ "$PROJECT_TYPE" = "javascript" ]; then
    # Run npm test (package.json should define test script)
    npm test 2>&1 || true
fi

echo ""
echo "========================================"
echo " Sandbox Runner — Execution Complete"
echo "========================================"
