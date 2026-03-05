/**
 * services/escrowService.js
 * ──────────────────────────
 * Service layer for blockchain trust verification.
 * Stores requirement hashes, submission hashes, and validation report
 * hashes on-chain for tamper-proof auditability.
 *
 * NOTE: Blockchain is used ONLY for trust hashes — NOT for payments.
 * Payments are handled in INR (₹) through the platform.
 */

const { ethers } = require("ethers");

// Config — override via environment variables
const RPC_URL = process.env.SEPOLIA_RPC_URL || "http://localhost:8545";
const PRIVATE_KEY = process.env.VALIDATOR_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat default #0
const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || null;

// Minimal ABI — only the functions we call from the backend
const ESCROW_ABI = [
  "function createJob(bytes32 reqHash, bytes32 testHash, address freelancer, uint256 deadline) returns (uint256)",
  "function submitWork(uint256 jobId, string repoUrl, bytes32 submissionHash)",
  "function recordValidation(uint256 jobId, uint256 score, bytes32 reportHash)",
  "function claimTimeout(uint256 jobId)",
  "function getJob(uint256 jobId) view returns (tuple(address client, address freelancer, uint256 amount, bytes32 requirementsHash, bytes32 testSuiteHash, bytes32 submissionHash, string repoUrl, uint256 deadline, uint256 validationScore, bytes32 reportHash, uint8 state, uint8 outcome))",
  "event JobCreated(uint256 indexed jobId, address indexed client, address freelancer)",
  "event ValidationRecorded(uint256 indexed jobId, uint256 score, uint8 outcome)",
];

let provider = null;
let signer = null;
let contract = null;

/**
 * Initialize blockchain connection.
 * Call once at startup. Non-fatal if it fails.
 */
async function initialize() {
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);

    if (ESCROW_ADDRESS) {
      contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      const network = await provider.getNetwork();
      console.log(`[EscrowService] Connected to chain ${network.chainId} as ${signer.address}`);
    } else {
      console.warn("[EscrowService] No ESCROW_CONTRACT_ADDRESS set — running in off-chain mode");
    }
  } catch (error) {
    console.warn("[EscrowService] Blockchain connection failed:", error.message);
    console.warn("[EscrowService] Running in off-chain mode");
  }
}

/**
 * Create a job on-chain.
 */
async function createJobOnChain({ requirementsHash, testSuiteHash, freelancerAddress, deadline }) {
  if (!contract) throw new Error("Contract not initialized");

  const reqHash = ethers.id(requirementsHash);
  const testHash = ethers.id(testSuiteHash || "");
  const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);

  const tx = await contract.createJob(reqHash, testHash, freelancerAddress, deadlineTs);
  const receipt = await tx.wait();
  console.log(`[EscrowService] Job created on-chain, tx: ${receipt.hash}`);
  return receipt.hash;
}

/**
 * Record validation result on-chain.
 */
async function recordValidationOnChain(jobId, score, reportHash) {
  if (!contract) throw new Error("Contract not initialized");

  const reportHashBytes = ethers.id(reportHash);
  const tx = await contract.recordValidation(jobId, score, reportHashBytes);
  const receipt = await tx.wait();
  console.log(`[EscrowService] Validation recorded on-chain, tx: ${receipt.hash}`);
  return receipt.hash;
}

/**
 * Get job state from chain.
 */
async function getJobFromChain(jobId) {
  if (!contract) throw new Error("Contract not initialized");
  return await contract.getJob(jobId);
}

/**
 * Check if blockchain is available.
 */
function isAvailable() {
  return contract !== null;
}

module.exports = {
  initialize,
  createJobOnChain,
  recordValidationOnChain,
  getJobFromChain,
  isAvailable,
};
