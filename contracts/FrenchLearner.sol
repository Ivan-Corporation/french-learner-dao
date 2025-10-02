// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title FrenchLearnerDAO MVP (virtual FREN tokens + streak + simple weekly stake)
/// @notice MVP contract: internal FREN balance system (not ERC20),
/// completeDailyLesson() with 20-hour anti-spam, streak reset after >48 hours,
/// daily rewards + bonus, a simple 7-day staking challenge, and a one-time faucet for onboarding.
contract FrenchLearner {
    // ====== STATE ======
    /// @notice Current streak (days) per user
    mapping(address => uint256) public streak;

    /// @notice Internal FREN balance per user (virtual token ledger)
    mapping(address => uint256) public tokens;

    /// @notice Timestamp of the user's last lesson completion
    mapping(address => uint256) public lastCompletionTime;

    /// @notice One-time faucet claim flag per address
    mapping(address => bool) public claimedFaucet;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        bool active;
    }

    /// @notice Only one active stake allowed per user in this MVP
    mapping(address => Stake) public stakes;

    // ====== CONSTANTS (time denominated in seconds) ======
    /// @notice Minimum time between completions to avoid spam (20 hours)
    uint256 public constant ANTI_SPAM = 20 hours;

    /// @notice If more than this time passes since last completion, the streak is reset (48 hours)
    uint256 public constant STREAK_RESET = 48 hours;

    /// @notice Stake duration: 7 days
    uint256 public constant STAKE_DURATION = 7 days;

    /// @notice Base daily reward (in internal FREN units)
    uint256 public constant DAILY_REWARD = 10;

    /// @notice Extra bonus FREN applied when streak > BONUS_AFTER
    uint256 public constant BONUS_AFTER = 7;

    /// @notice On successful stake, return multiplier numerator (150 means 150%)
    uint256 public constant STAKE_SUCCESS_MULTIPLIER_NUM = 150;

    /// @notice On successful stake, return multiplier denominator (100 means percent base)
    uint256 public constant STAKE_SUCCESS_MULTIPLIER_DEN = 100;

    /// @notice One-time faucet amount (starter pack) for onboarding
    uint256 public constant FAUCET_AMOUNT = 50;

    // ====== EVENTS ======
    event LessonCompleted(
        address indexed user,
        uint256 streak,
        uint256 tokensAwarded,
        uint256 timestamp
    );
    event Staked(address indexed user, uint256 amount, uint256 startTime);
    event StakeClaimed(
        address indexed user,
        uint256 returnedAmount,
        bool success
    );
    event StakeSlashed(address indexed user, uint256 slashedAmount);
    event FaucetClaimed(address indexed user, uint256 amount);

    // ====== ADMIN ======
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ====== PUBLIC / USER FUNCTIONS ======

    /// @notice Complete today's lesson. Enforces anti-spam (20h). Maintains streak and awards tokens.
    /// @dev First time callers are allowed immediately. Subsequent calls must wait at least ANTI_SPAM.
    function completeDailyLesson() external {
        address user = msg.sender;
        uint256 last = lastCompletionTime[user];

        // If not the first time, enforce anti-spam minimum interval
        if (last != 0) {
            require(
                block.timestamp - last >= ANTI_SPAM,
                "Too early: wait at least 20 hours since last completion"
            );
        }

        // Update streak
        if (last == 0) {
            // First-time completion
            streak[user] = 1;
        } else {
            uint256 delta = block.timestamp - last;
            if (delta > STREAK_RESET) {
                // Too much time passed -> reset streak
                streak[user] = 1;
            } else {
                // Continue streak
                streak[user] += 1;
            }
        }

        // Calculate reward
        uint256 reward = DAILY_REWARD;

        // Apply bonus if streak is greater than BONUS_AFTER
        if (streak[user] > BONUS_AFTER) {
            reward += 5; // +5 FREN bonus
        }

        // Credit tokens and update last completion time
        tokens[user] += reward;
        lastCompletionTime[user] = block.timestamp;

        emit LessonCompleted(user, streak[user], reward, block.timestamp);
    }

    /// @notice Stake `amount` virtual FREN for a 7-day challenge. Requires sufficient internal balance.
    /// @dev Only one active stake per user is supported in the MVP.
    /// @param amount Amount of internal FREN to stake (locked).
    function stakeForWeek(uint256 amount) external {
        address user = msg.sender;
        require(amount > 0, "Amount must be > 0");
        require(tokens[user] >= amount, "Insufficient FREN balance to stake");

        Stake storage s = stakes[user];
        require(!s.active, "Existing active stake found; claim or wait");

        // Deduct tokens to lock them for the stake period
        tokens[user] -= amount;

        // Create and activate stake
        stakes[user] = Stake({
            amount: amount,
            startTime: block.timestamp,
            active: true
        });

        emit Staked(user, amount, block.timestamp);
    }

    /// @notice Claim (or forfeit) stake after the staking period (7 days). Success requires streak >= 7.
    /// @dev If successful, user receives the staked amount multiplied by STAKE_SUCCESS_MULTIPLIER (e.g., 150%).
    /// If unsuccessful, the stake is slashed (forfeited).
    function claimStake() external {
        address user = msg.sender;
        Stake storage s = stakes[user];
        require(s.active, "No active stake");
        require(
            block.timestamp >= s.startTime + STAKE_DURATION,
            "Stake period not finished"
        );

        uint256 amount = s.amount;

        // Reset stake struct
        s.active = false;
        s.amount = 0;
        s.startTime = 0;

        // Determine success by current streak at claim time
        if (streak[user] >= 7) {
            // Success: return staked amount + reward (e.g., 150% return)
            uint256 returned = (amount * STAKE_SUCCESS_MULTIPLIER_NUM) /
                STAKE_SUCCESS_MULTIPLIER_DEN;
            tokens[user] += returned;
            emit StakeClaimed(user, returned, true);
        } else {
            // Failure: the staked amount is slashed (remains in contract ledger)
            emit StakeSlashed(user, amount);
            emit StakeClaimed(user, 0, false);
        }
    }

    /// @notice One-time faucet to bootstrap new users with a starter FREN amount.
    /// @dev Each address can call this exactly once.
    function faucet() external {
        require(!claimedFaucet[msg.sender], "Faucet already claimed");
        claimedFaucet[msg.sender] = true;
        tokens[msg.sender] += FAUCET_AMOUNT;
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    // ====== VIEW / HELPERS ======

    /// @notice Read consolidated user info in one call to reduce RPC overhead.
    /// @param user Address of the user to query.
    /// @return userStreak Current streak in days.
    /// @return userTokens Internal FREN balance.
    /// @return userLastCompletion Timestamp of last lesson completion.
    /// @return hasActiveStake Whether the user has an active stake.
    /// @return stakeAmount Amount currently staked (0 if none).
    /// @return stakeStart Stake start timestamp (0 if none).
    /// @return faucetClaimed Whether the one-time faucet was already claimed by the user.
    function getUserInfo(
        address user
    )
        external
        view
        returns (
            uint256 userStreak,
            uint256 userTokens,
            uint256 userLastCompletion,
            bool hasActiveStake,
            uint256 stakeAmount,
            uint256 stakeStart,
            bool faucetClaimed
        )
    {
        userStreak = streak[user];
        userTokens = tokens[user];
        userLastCompletion = lastCompletionTime[user];
        hasActiveStake = stakes[user].active;
        stakeAmount = stakes[user].amount;
        stakeStart = stakes[user].startTime;
        faucetClaimed = claimedFaucet[user];
    }

    // ====== ADMIN / TEST HELPERS ======

    /// @notice Mint some virtual FREN to an address (for testing / giveaways). Remove or restrict in production.
    /// @dev Only callable by owner.
    function mintForTests(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero addr");
        tokens[to] += amount;
    }

    /// @notice Emergency withdrawal of forfeited FREN (owner only). For MVP the owner may want to reclaim slashed tokens.
    /// @dev Because tokens are an internal ledger, "contract reserves" are implicit. This function simply credits tokens to `to`.
    function emergencyWithdraw(uint256 amount, address to) external onlyOwner {
        require(to != address(0), "zero addr");
        tokens[to] += amount;
    }
}
