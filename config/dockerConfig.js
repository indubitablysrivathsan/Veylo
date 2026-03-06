/**
 * config/dockerConfig.js
 * ───────────────────────
 * Configuration for the sandboxed Docker execution environment.
 * All limits are designed to prevent resource abuse from untrusted code.
 *
 * Security Hardening:
 *   --network=none         Blocks all network access
 *   --memory=512m          Hard RAM limit
 *   --cpus=1               Single CPU core
 *   --read-only            Immutable root filesystem
 *   --pids-limit=64        Prevents fork bombs
 *   --security-opt         Prevents privilege escalation (no-new-privileges)
 *   --cap-drop=ALL         Drops ALL Linux capabilities
 *   ulimit nproc=64        Max process count
 *   ulimit fsize=10MB      Max file write size
 */

module.exports = {
  // ─── Resource Limits ───────────────────────────────────────────
  memoryLimit: process.env.SANDBOX_MEMORY || "512m",
  cpuLimit: process.env.SANDBOX_CPUS || "1",
  timeout: parseInt(process.env.SANDBOX_TIMEOUT || "30"), // seconds

  // ─── Network Isolation — CRITICAL for security ─────────────────
  networkMode: "none",

  // ─── Process & Capability Restrictions ─────────────────────────
  pidsLimit: parseInt(process.env.SANDBOX_PIDS_LIMIT || "64"),
  securityOpt: "no-new-privileges",
  capDrop: "ALL",

  // ─── Filesystem ────────────────────────────────────────────────
  readOnly: true,
  tmpfsSize: "100m",

  // ─── Docker images per language ────────────────────────────────
  images: {
    python: process.env.DOCKER_IMAGE_PYTHON || "python:3.11-slim",
    javascript: process.env.DOCKER_IMAGE_NODE || "node:18-slim",
    typescript: process.env.DOCKER_IMAGE_NODE || "node:18-slim",
    default: "ubuntu:22.04",
  },

  // ─── Custom sandbox image (built from sandbox/Dockerfile) ──────
  customImage: process.env.SANDBOX_IMAGE || null,

  // ─── Volume mount options ──────────────────────────────────────
  mountOptions: "ro", // read-only mount for submitted repos

  // ─── Output limits ─────────────────────────────────────────────
  maxOutputBytes: parseInt(process.env.SANDBOX_MAX_OUTPUT || String(1024 * 1024)), // 1MB max captured output
};
