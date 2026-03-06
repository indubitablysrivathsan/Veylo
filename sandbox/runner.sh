#!/bin/bash
# ─────────────────────────────────────────────────────────
# runner.sh — Sandbox execution script
#
# Runs inside Docker container with strict resource limits.
# Detects project type via signatures, installs deps, runs tests.
#
# Features:
#   - Signal trapping for clean exit
#   - Output truncation to prevent memory exhaustion
#   - Entry point discovery via framework signatures
#   - Structured JSON output on failure
#
# Usage (called by executionAgent via docker run):
#   docker run --rm --network=none --memory=512m --cpus=1 \
#     --pids-limit=64 --cap-drop=ALL --security-opt=no-new-privileges \
#     -v /path/to/repo:/workspace:ro sandbox-image
# ─────────────────────────────────────────────────────────

set -e

WORKSPACE="/workspace"
MAX_OUTPUT=10000  # Max characters of captured output

# ─── Signal Handling ──────────────────────────────────────
cleanup() {
  echo ""
  echo '{"status":"TERMINATED","reason":"signal_received"}'
  exit 143
}
trap cleanup SIGTERM SIGINT

echo "========================================"
echo " Sandbox Runner — Starting Execution"
echo "========================================"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Copy workspace to writable temp (root is read-only)
cp -r "$WORKSPACE" /tmp/work 2>/dev/null || {
  echo '{"status":"FAIL","reason":"workspace_copy_failed","error":"Could not copy workspace to writable tmp"}'
  exit 1
}
cd /tmp/work

# ─── Detect Project Type (Signature-Based) ─────────────────
detect_project_type() {
  # Check for Python markers
  if [ -f "requirements.txt" ] || [ -f "setup.py" ] || [ -f "pyproject.toml" ] || [ -f "Pipfile" ]; then
    echo "python"
    return
  fi

  # Check for Node/JS markers
  if [ -f "package.json" ]; then
    echo "javascript"
    return
  fi

  # Signature scan: look for Python source with framework imports
  if grep -rl "import fastapi\|from flask\|import django" --include="*.py" . 2>/dev/null | head -1 > /dev/null 2>&1; then
    echo "python"
    return
  fi

  # Signature scan: look for JS/TS source with framework imports
  if grep -rl "require.*express\|from.*express\|createServer" --include="*.js" --include="*.ts" . 2>/dev/null | head -1 > /dev/null 2>&1; then
    echo "javascript"
    return
  fi

  # Count files by extension as last resort
  PY_COUNT=$(find . -name "*.py" -not -path "*/\.*" 2>/dev/null | wc -l)
  JS_COUNT=$(find . -name "*.js" -o -name "*.ts" -not -path "*/\.*" -not -path "*/node_modules/*" 2>/dev/null | wc -l)

  if [ "$PY_COUNT" -gt "$JS_COUNT" ] && [ "$PY_COUNT" -gt 0 ]; then
    echo "python"
    return
  fi

  if [ "$JS_COUNT" -gt 0 ]; then
    echo "javascript"
    return
  fi

  echo "unknown"
}

PROJECT_TYPE=$(detect_project_type)

if [ "$PROJECT_TYPE" = "unknown" ]; then
  echo '{"status":"FAIL","reason":"unknown_project_type","error":"Could not detect project type. No requirements.txt, package.json, or recognizable source files found."}'
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
    if [ -f "setup.py" ]; then
        pip install -e . --quiet 2>&1 | tail -5
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
    # Run pytest with verbose output, truncate to prevent memory exhaustion
    python -m pytest -v --tb=short 2>&1 | head -n 500 || true
elif [ "$PROJECT_TYPE" = "javascript" ]; then
    # Run npm test, truncate output
    npm test 2>&1 | head -n 500 || true
fi

echo ""
echo "========================================"
echo " Sandbox Runner — Execution Complete"
echo "========================================"
