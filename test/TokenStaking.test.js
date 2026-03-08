// Learning to write tests from scratch I know we start with the imports
// Imports

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// Fixtures
async function deployContract() {
    const [owner, user1] = await ethers.getSigners();

    // Deploy the token contract - used as a blueprint
    const Token = await ethers.getContractFactory("WTC");

    const stakingToken = await Token.deploy("LERUO-M", "LMT", 1000000);
    const rewardToken = await Token.deploy("REWARD-TOKEN", "RWD", 1000000);


    // Constructor args
    const stakeTokenAddress = await stakingToken.getAddress();
    const rewardTokenAddress = await rewardToken.getAddress();
    const rewardRate = ethers.parseUnits("0.1", 18); // 0.1 tokens per second (1 token every 10 secs)


    // DEPLOY THE STAKING CONTRACT
    const TokenStaking = await ethers.getContractFactory("StakingContract");
    const tokenstaked = await TokenStaking.deploy(stakeTokenAddress, rewardTokenAddress, rewardRate);
    await tokenstaked.waitForDeployment();
    console.log(`Contract deployed to: ${await tokenstaked.getAddress()}`);

    return { tokenstaked, stakingToken, rewardToken, owner, user1 };
}

// Tests
describe("Running tests for the staking token contract", function() {
    it("Should have the correct reward rate of 0.1 token/sec", async function ()  {
        const { tokenstaked } = await loadFixture(deployContract);
        expect(await tokenstaked.rewardRate()).to.equal(ethers.parseUnits("0.1", 18));
    });

    it("Should not be able to stake 0 LMT tokens", async function () {
        const { tokenstaked, user1 } = await loadFixture(deployContract);
        await expect(tokenstaked.connect(user1).stake(0)).to.be.revertedWith("Cannot stake 0");
    });

    it("Should be able to stake LMT tokens > 0", async function () {
        const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContract);
        
        // Owner transfers 100 tokens to User1 so they have something to stake
        const amountToStake = ethers.parseUnits("100", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);


        // User1 must Approve the staking contract to spend their tokens
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

        // User1 stakes the tokens
        await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

        // 4. Check the Staked Balance (not balanceOf)
        const balance = await tokenstaked.stakedBalance(user1.address);
        expect(balance).to.equal(amountToStake);
    });


});
