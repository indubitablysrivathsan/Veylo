# Sandbox Dockerfile
# ───────────────────
# Multi-stage image for running untrusted code submissions.
# Supports both Python and Node.js projects.
#
# Security: no network, memory limits, read-only root, timeout enforced by host.

FROM python:3.11-slim AS python-base
RUN pip install --no-cache-dir pytest flake8 pylint requests flask fastapi uvicorn

FROM node:18-slim AS node-base
RUN npm install -g jest mocha eslint typescript ts-node

# Final combined image
FROM ubuntu:22.04

# Install both runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    nodejs npm \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-installed packages from builder stages
COPY --from=python-base /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=python-base /usr/local/bin /usr/local/bin
COPY --from=node-base /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node-base /usr/local/bin /usr/local/bin

# Create non-root user for execution
RUN useradd -m -s /bin/bash sandboxuser
WORKDIR /workspace

# Copy runner script
COPY runner.sh /usr/local/bin/runner.sh
RUN chmod +x /usr/local/bin/runner.sh

USER sandboxuser

ENTRYPOINT ["/usr/local/bin/runner.sh"]
