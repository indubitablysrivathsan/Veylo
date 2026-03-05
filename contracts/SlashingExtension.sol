// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SlashingExtension
 * @notice Penalizes freelancers who repeatedly fail validations.
 *         If a freelancer accumulates too many failures, they are "slashed"
 *         (blacklisted from accepting new jobs for a cooldown period).
 * @dev Future: could integrate staking where slashing burns staked tokens.
 */
contract SlashingExtension {
    struct SlashRecord {
        uint256 consecutiveFailures;
        uint256 totalSlashes;
        uint256 cooldownUntil;      // unix timestamp — cannot accept jobs until this time
        bool    isBlacklisted;
    }

    mapping(address => SlashRecord) public records;
    address public owner;

    uint256 public constant MAX_CONSECUTIVE_FAILURES = 3;
    uint256 public constant COOLDOWN_PERIOD = 30 days;

    event Slashed(address indexed freelancer, uint256 totalSlashes, uint256 cooldownUntil);
    event CooldownLifted(address indexed freelancer);
    event FailureRecorded(address indexed freelancer, uint256 consecutiveFailures);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Record a job failure (score < 50). Called by backend or escrow.
     */
    function recordFailure(address _freelancer) external {
        require(msg.sender == owner, "Unauthorized");
        SlashRecord storage r = records[_freelancer];
        r.consecutiveFailures++;

        emit FailureRecorded(_freelancer, r.consecutiveFailures);

        if (r.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            r.totalSlashes++;
            r.cooldownUntil = block.timestamp + COOLDOWN_PERIOD;
            r.isBlacklisted = true;
            r.consecutiveFailures = 0;
            emit Slashed(_freelancer, r.totalSlashes, r.cooldownUntil);
        }
    }

    /**
     * @notice Record a success — resets consecutive failure counter.
     */
    function recordSuccess(address _freelancer) external {
        require(msg.sender == owner, "Unauthorized");
        records[_freelancer].consecutiveFailures = 0;
    }

    /**
     * @notice Check if freelancer can accept jobs.
     */
    function canAcceptJobs(address _freelancer) external view returns (bool) {
        SlashRecord memory r = records[_freelancer];
        if (!r.isBlacklisted) return true;
        return block.timestamp >= r.cooldownUntil;
    }

    /**
     * @notice Lift cooldown if period has passed.
     */
    function liftCooldown(address _freelancer) external {
        SlashRecord storage r = records[_freelancer];
        require(r.isBlacklisted, "Not blacklisted");
        require(block.timestamp >= r.cooldownUntil, "Cooldown active");
        r.isBlacklisted = false;
        emit CooldownLifted(_freelancer);
    }
}
