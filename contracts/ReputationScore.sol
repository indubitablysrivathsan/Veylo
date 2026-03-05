// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ReputationScore
 * @notice Tracks on-chain reputation for freelancers and clients.
 *         Updated after each completed job based on validation scores.
 */
contract ReputationScore {
    struct Reputation {
        uint256 totalJobs;
        uint256 totalScore;       // sum of all validation scores
        uint256 successfulJobs;   // score >= 75
        uint256 disputedJobs;     // score 50-74
        uint256 failedJobs;       // score < 50
    }

    mapping(address => Reputation) public reputations;
    address public escrowContract;
    address public owner;

    event ReputationUpdated(address indexed user, uint256 newAvgScore, uint256 totalJobs);

    modifier onlyEscrow() {
        require(msg.sender == escrowContract || msg.sender == owner, "Unauthorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setEscrowContract(address _escrow) external {
        require(msg.sender == owner, "Only owner");
        escrowContract = _escrow;
    }

    /**
     * @notice Record a completed job's score for a freelancer.
     */
    function recordJobResult(address _freelancer, uint256 _score) external onlyEscrow {
        require(_score <= 100, "Invalid score");

        Reputation storage r = reputations[_freelancer];
        r.totalJobs++;
        r.totalScore += _score;

        if (_score >= 75)      r.successfulJobs++;
        else if (_score >= 50) r.disputedJobs++;
        else                   r.failedJobs++;

        emit ReputationUpdated(_freelancer, r.totalScore / r.totalJobs, r.totalJobs);
    }

    /**
     * @notice Get average score for an address.
     */
    function getAverageScore(address _user) external view returns (uint256) {
        Reputation memory r = reputations[_user];
        if (r.totalJobs == 0) return 0;
        return r.totalScore / r.totalJobs;
    }

    function getReputation(address _user) external view returns (Reputation memory) {
        return reputations[_user];
    }
}
