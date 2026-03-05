export const SEPOLIA_CHAIN_ID = 11155111

export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'

export const CONTRACT_ABI = [
    'function createJob(bytes32 reqHash, bytes32 testHash, address freelancer, uint256 deadline)',
    'function fundJob(uint256 jobId) payable',
    'function submitWork(uint256 jobId, string repoUrl, bytes32 submissionHash)',
    'function claimTimeout(uint256 jobId)',
    'function getJob(uint256 jobId) view returns (tuple)',
    'event JobCreated(uint256 jobId, address client, address freelancer)',
    'event JobFunded(uint256 jobId, uint256 amount)',
    'event WorkSubmitted(uint256 jobId, string repoUrl, bytes32 submissionHash)',
    'event ValidationRecorded(uint256 jobId, uint256 score, uint8 outcome)',
    'event PaymentReleased(uint256 jobId, address to, uint256 amount)',
    'event TimeoutClaimed(uint256 jobId, uint8 outcome)',
]

export const API_BASE_URL = '/api'

export const SCORE_WEIGHTS = {
    execution: 0.40,
    structure: 0.20,
    lint: 0.20,
    semantic: 0.20,
} as const

export const SCORE_THRESHOLDS = {
    pass: 75,
    dispute: 50,
} as const

export const ETHERSCAN_BASE = 'https://sepolia.etherscan.io'
