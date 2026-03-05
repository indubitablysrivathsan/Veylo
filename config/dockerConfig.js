/**
 * config/dockerConfig.js
 * ───────────────────────
 * Configuration for the sandboxed Docker execution environment.
 * All limits are designed to prevent resource abuse from untrusted code.
 */

module.exports = {
  // Resource limits
  memoryLimit: process.env.SANDBOX_MEMORY || "512m",
  cpuLimit: process.env.SANDBOX_CPUS || "1",
  timeout: parseInt(process.env.SANDBOX_TIMEOUT || "30"), // seconds

  // Network isolation — CRITICAL for security
  networkMode: "none",

  // Filesystem
  readOnly: true,
  tmpfsSize: "100m",

  // Docker images per language
  images: {
    python: process.env.DOCKER_IMAGE_PYTHON || "python:3.11-slim",
    javascript: process.env.DOCKER_IMAGE_NODE || "node:18-slim",
    typescript: process.env.DOCKER_IMAGE_NODE || "node:18-slim",
    default: "ubuntu:22.04",
  },

  // Custom sandbox image (built from sandbox/Dockerfile)
  customImage: process.env.SANDBOX_IMAGE || "escrow-sandbox:latest",

  // Volume mount options
  mountOptions: "ro", // read-only mount for submitted repos

  // Output limits
  maxOutputBytes: 1024 * 1024, // 1MB max captured output
};
