// ── Blockchain (for trust verification hashes only — NOT payments) ──
export const SEPOLIA_CHAIN_ID = 11155111

export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

// ABI for trust verification — hashes and validation only, no payment functions
export const CONTRACT_ABI = [
    'function createJob(bytes32 reqHash, bytes32 testHash, address freelancer, uint256 deadline)',
    'function submitWork(uint256 jobId, string repoUrl, bytes32 submissionHash)',
    'function recordValidation(uint256 jobId, uint256 score, bytes32 reportHash)',
    'function getJob(uint256 jobId) view returns (tuple)',
    'event JobCreated(uint256 jobId, address client, address freelancer)',
    'event WorkSubmitted(uint256 jobId, string repoUrl, bytes32 submissionHash)',
    'event ValidationRecorded(uint256 jobId, uint256 score, uint8 outcome)',
]

export const API_BASE_URL = '/api'

export const SCORE_WEIGHTS = {
    execution: 0.50,
    repoViability: 0.10,
    lint: 0.20,
    semantic: 0.20,
} as const

export const SCORE_THRESHOLDS = {
    pass: 75,
    dispute: 50,
} as const

export const BLOCK_EXPLORER_BASE = 'https://sepolia.etherscan.io'

/** @deprecated Use BLOCK_EXPLORER_BASE instead */
export const ETHERSCAN_BASE = BLOCK_EXPLORER_BASE
