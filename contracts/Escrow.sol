// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Escrow
 * @notice Decentralized freelance escrow with AI-powered validation.
 *         Manages job lifecycle: CREATED → FUNDED → WORK_SUBMITTED → VALIDATED → CLOSED
 * @dev Deploy on Sepolia testnet. Validator address is a trusted backend wallet.
 */
contract Escrow {
    // ─── State Machine ───────────────────────────────────────────────
    enum JobState { CREATED, FUNDED, WORK_SUBMITTED, VALIDATED, CLOSED }
    enum Outcome  { NONE, PAID, REFUNDED, DISPUTED }

    struct Job {
        address client;
        address freelancer;
        uint256 amount;
        bytes32 requirementsHash;   // IPFS / SHA-256 of spec
        bytes32 testSuiteHash;      // hash of AI-generated test suite
        bytes32 submissionHash;     // hash of submitted repo
        string  repoUrl;
        uint256 deadline;           // unix timestamp
        uint256 validationScore;    // 0-100 (stored as integer percentage)
        bytes32 reportHash;         // hash of full validation report
        JobState state;
        Outcome  outcome;
    }

    // ─── Storage ─────────────────────────────────────────────────────
    uint256 public nextJobId;
    mapping(uint256 => Job) public jobs;
    address public validator;       // trusted backend wallet that records scores
    address public owner;

    // ─── Scoring thresholds (out of 100) ─────────────────────────────
    uint256 public constant PASS_THRESHOLD    = 75;
    uint256 public constant DISPUTE_THRESHOLD = 50;

    // ─── Anti-ghosting ───────────────────────────────────────────────
    uint256 public constant CLIENT_CLAIM_WINDOW = 7 days;

    // ─── Events ──────────────────────────────────────────────────────
    event JobCreated(uint256 indexed jobId, address indexed client, address freelancer);
    event JobFunded(uint256 indexed jobId, uint256 amount);
    event WorkSubmitted(uint256 indexed jobId, string repoUrl, bytes32 submissionHash);
    event ValidationRecorded(uint256 indexed jobId, uint256 score, Outcome outcome);
    event PaymentReleased(uint256 indexed jobId, address to, uint256 amount);
    event TimeoutClaimed(uint256 indexed jobId, Outcome outcome);

    // ─── Modifiers ───────────────────────────────────────────────────
    modifier onlyClient(uint256 _jobId)    { require(msg.sender == jobs[_jobId].client,     "Not client");     _; }
    modifier onlyFreelancer(uint256 _jobId){ require(msg.sender == jobs[_jobId].freelancer,  "Not freelancer"); _; }
    modifier onlyValidator()               { require(msg.sender == validator,                 "Not validator");  _; }
    modifier inState(uint256 _jobId, JobState _s) { require(jobs[_jobId].state == _s, "Wrong state"); _; }

    constructor(address _validator) {
        owner = msg.sender;
        validator = _validator;
    }

    // ─── Core Functions ──────────────────────────────────────────────

    /**
     * @notice Client creates a new job and defines requirements + freelancer.
     */
    function createJob(
        bytes32 _reqHash,
        bytes32 _testHash,
        address _freelancer,
        uint256 _deadline
    ) external returns (uint256 jobId) {
        require(_freelancer != address(0), "Invalid freelancer");
        require(_deadline > block.timestamp, "Deadline in past");

        jobId = nextJobId++;
        Job storage j = jobs[jobId];
        j.client           = msg.sender;
        j.freelancer       = _freelancer;
        j.requirementsHash = _reqHash;
        j.testSuiteHash    = _testHash;
        j.deadline         = _deadline;
        j.state            = JobState.CREATED;
        j.outcome          = Outcome.NONE;

        emit JobCreated(jobId, msg.sender, _freelancer);
    }

    /**
     * @notice Client funds the escrow. Must be in CREATED state.
     */
    function fundJob(uint256 _jobId) external payable onlyClient(_jobId) inState(_jobId, JobState.CREATED) {
        require(msg.value > 0, "Must send ETH");
        jobs[_jobId].amount = msg.value;
        jobs[_jobId].state  = JobState.FUNDED;
        emit JobFunded(_jobId, msg.value);
    }

    /**
     * @notice Freelancer submits their work (repo URL + content hash).
     */
    function submitWork(
        uint256 _jobId,
        string calldata _repoUrl,
        bytes32 _submissionHash
    ) external onlyFreelancer(_jobId) inState(_jobId, JobState.FUNDED) {
        require(block.timestamp <= jobs[_jobId].deadline, "Deadline passed");

        Job storage j = jobs[_jobId];
        j.repoUrl        = _repoUrl;
        j.submissionHash = _submissionHash;
        j.state          = JobState.WORK_SUBMITTED;

        emit WorkSubmitted(_jobId, _repoUrl, _submissionHash);
    }

    /**
     * @notice Validator backend records the AI validation score + report hash.
     *         Automatically determines outcome based on thresholds.
     */
    function recordValidation(
        uint256 _jobId,
        uint256 _score,
        bytes32 _reportHash
    ) external onlyValidator inState(_jobId, JobState.WORK_SUBMITTED) {
        require(_score <= 100, "Score out of range");

        Job storage j = jobs[_jobId];
        j.validationScore = _score;
        j.reportHash      = _reportHash;
        j.state           = JobState.VALIDATED;

        if (_score >= PASS_THRESHOLD) {
            j.outcome = Outcome.PAID;
            j.state   = JobState.CLOSED;
            _transfer(j.freelancer, j.amount);
            emit PaymentReleased(_jobId, j.freelancer, j.amount);
        } else if (_score < DISPUTE_THRESHOLD) {
            j.outcome = Outcome.REFUNDED;
            j.state   = JobState.CLOSED;
            _transfer(j.client, j.amount);
            emit PaymentReleased(_jobId, j.client, j.amount);
        } else {
            j.outcome = Outcome.DISPUTED;
            // remains in VALIDATED state for dispute window
        }

        emit ValidationRecorded(_jobId, _score, j.outcome);
    }

    /**
     * @notice Anti-ghosting: anyone can trigger timeout resolution.
     *         - Freelancer missed deadline while FUNDED → refund client
     *         - Client inactive after VALIDATED dispute window → pay freelancer
     */
    function claimTimeout(uint256 _jobId) external {
        Job storage j = jobs[_jobId];

        // Case 1: freelancer missed deadline
        if (j.state == JobState.FUNDED && block.timestamp > j.deadline) {
            j.outcome = Outcome.REFUNDED;
            j.state   = JobState.CLOSED;
            _transfer(j.client, j.amount);
            emit TimeoutClaimed(_jobId, Outcome.REFUNDED);
            return;
        }

        // Case 2: client inactive after disputed validation
        if (j.state == JobState.VALIDATED && j.outcome == Outcome.DISPUTED) {
            require(block.timestamp > j.deadline + CLIENT_CLAIM_WINDOW, "Claim window active");
            j.outcome = Outcome.PAID;
            j.state   = JobState.CLOSED;
            _transfer(j.freelancer, j.amount);
            emit TimeoutClaimed(_jobId, Outcome.PAID);
            return;
        }

        revert("No timeout applicable");
    }

    // ─── View Helpers ────────────────────────────────────────────────

    function getJob(uint256 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }

    // ─── Internal ────────────────────────────────────────────────────

    function _transfer(address _to, uint256 _amount) internal {
        (bool ok, ) = payable(_to).call{value: _amount}("");
        require(ok, "Transfer failed");
    }
}
