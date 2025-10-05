const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;

describe("FrenchLearner (MVP)", function () {
  let contract;
  let owner;
  let user;
  let other;

  // constants
  const ANTI_SPAM = 20 * 60 * 60;
  const STREAK_RESET = 48 * 60 * 60;
  const STAKE_DURATION = 7 * 24 * 60 * 60;
  const DAILY_REWARD = 10;
  const BONUS_AFTER = 7;
  const FAUCET_AMOUNT = 50;
  const STAKE_MULT_NUM = 150;
  const STAKE_MULT_DEN = 100;

  async function increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  beforeEach(async () => {
    [owner, user, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("FrenchLearner", owner);
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  it("owner can mintForTests and faucet is one-time", async () => {
    await contract.connect(owner).mintForTests(await user.getAddress(), 123n);

    let info = await contract.getUserInfo(await user.getAddress());
    expect(info.userTokens).to.equal(123n);

    await expect(contract.connect(user).faucet())
      .to.emit(contract, "FaucetClaimed")
      .withArgs(await user.getAddress(), FAUCET_AMOUNT);

    info = await contract.getUserInfo(await user.getAddress());
    expect(info.userTokens).to.equal(123n + BigInt(FAUCET_AMOUNT));

    await expect(contract.connect(user).faucet()).to.be.revertedWith(
      "Faucet already claimed"
    );
  });

  it("completeDailyLesson enforces anti-spam and increments streak", async () => {
    await contract.connect(user).completeDailyLesson();

    let info = await contract.getUserInfo(await user.getAddress());
    expect(info.userStreak).to.equal(1n);
    expect(info.userTokens).to.equal(BigInt(DAILY_REWARD));

    await expect(contract.connect(user).completeDailyLesson()).to.be.revertedWith(
      "Too early: wait at least 20 hours since last completion"
    );

    await increaseTime(ANTI_SPAM);
    await contract.connect(user).completeDailyLesson();

    info = await contract.getUserInfo(await user.getAddress());
    expect(info.userStreak).to.equal(2n);
    expect(info.userTokens).to.equal(BigInt(DAILY_REWARD * 2));
  });

  it("streak resets if >48 h passed", async () => {
    await contract.connect(user).completeDailyLesson();
    await increaseTime(STREAK_RESET + 3600);
    await contract.connect(user).completeDailyLesson();

    const info = await contract.getUserInfo(await user.getAddress());
    expect(info.userStreak).to.equal(1n);
  });

  it("applies +5 FREN bonus once streak > 7", async () => {
    await contract.connect(user).completeDailyLesson();
    for (let i = 1; i <= BONUS_AFTER; i++) {
      await increaseTime(ANTI_SPAM);
      await contract.connect(user).completeDailyLesson();
    }

    const info = await contract.getUserInfo(await user.getAddress());
    expect(info.userStreak).to.equal(BigInt(BONUS_AFTER + 1));
    const expected = BigInt(DAILY_REWARD * (BONUS_AFTER + 1) + 5);
    expect(info.userTokens).to.equal(expected);
  });

  it("successful stake (streak ≥ 7) returns 150 %", async () => {
    await contract.connect(owner).mintForTests(await user.getAddress(), 1000n);
    const stakeAmt = 100n;

    await contract.connect(user).stakeForWeek(stakeAmt);

    // build 7-day streak
    for (let i = 0; i < 7; i++) {
      if (i > 0) await increaseTime(ANTI_SPAM);
      await contract.connect(user).completeDailyLesson();
    }

    await increaseTime(STAKE_DURATION + 60);
    const returned = (stakeAmt * BigInt(STAKE_MULT_NUM)) / BigInt(STAKE_MULT_DEN);

    await expect(contract.connect(user).claimStake())
      .to.emit(contract, "StakeClaimed")
      .withArgs(await user.getAddress(), returned, true);

    const info = await contract.getUserInfo(await user.getAddress());
    expect(info.hasActiveStake).to.be.false;
  });

  it("failed stake (streak < 7) is slashed", async () => {
    await contract.connect(owner).mintForTests(await user.getAddress(), 500n);
    const stakeAmt = 50n;
    await contract.connect(user).stakeForWeek(stakeAmt);
    await contract.connect(user).completeDailyLesson();

    await increaseTime(STAKE_DURATION + 60);

    await expect(contract.connect(user).claimStake())
      .to.emit(contract, "StakeSlashed")
      .withArgs(await user.getAddress(), stakeAmt);

    const info = await contract.getUserInfo(await user.getAddress());
    expect(info.hasActiveStake).to.be.false;
  });
});
