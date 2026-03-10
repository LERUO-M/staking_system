// Learning to write tests from scratch I know we start with the imports
// Imports

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

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
describe("Running tests for the staking/unstaking of tokens in the contract", function() {
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

    it("Should not allow a user to unstake/withdraw if still in cooldown period", async function () {
        const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContract);
        
        // Owner transfers 100 tokens to User1 so they have something to stake
        const amountToStake = ethers.parseUnits("100", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);


        // User1 must Approve the staking contract to spend their tokens
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

        // User1 stakes the tokens
        await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

        // Check the Staked Balance
        const balance = await tokenstaked.stakedBalance(user1.address);
        expect(balance).to.equal(amountToStake);

        // After staking, I want to try and withdraw before the cool down period
        await expect(tokenstaked.connect(user1).withdraw(amountToStake)).to.be.revertedWith("Still locked");
    });

    it("Should allow a user to unstake/withdraw if cooldown period is over", async function () {
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

        // After staking, I want to try and withdraw before the cool down period
        await expect(tokenstaked.connect(user1).withdraw(amountToStake)).to.be.revertedWith("Still locked");
        await time.increase(35);

        // Now the withdrawal should succeed
        await expect(tokenstaked.connect(user1).withdraw(amountToStake)).not.to.be.reverted;

        // 4. Check the Staked Balance (not balanceOf)
        const balanceAfterWithdrawal = await tokenstaked.stakedBalance(user1.address);
        expect(balanceAfterWithdrawal).to.equal(0);
    });

    it("Emergency withdraw should NOT give user back any tokens if never staked", async function () {         
        const { tokenstaked, user1 } = await loadFixture(deployContract);
        expect(tokenstaked.connect(user1).emergencyWithdraw()).to.be.revertedWith("No tokens staked")
    });       

    it("Emergency withdraw should give user back all their staked tokens and no reward tokens", async function () {         
        const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContract);
        
        // Owner transfers 100 tokens to User1 so they have something to stake
        const amountToStake = ethers.parseUnits("100", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);


        // User1 must Approve the staking contract to spend their tokens
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

        // User1 stakes the tokens
        await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

        // Now that we have staked, let cooldown pass and try emergency withdrawal.
        await time.increase(35);
        await expect(tokenstaked.connect(user1).emergencyWithdraw()).not.to.be.reverted;


    });       


});

describe("Running tests for the rewarding of tokens in the contract", function() {

    it("Only the owner should be able to fund the contract with reward tokens", async function () {         
        const { tokenstaked, owner, rewardToken } = await loadFixture(deployContract);
        
        await rewardToken.approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));


        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await tokenstaked.fundRewards(amountToFund);

        //balanceOf contract
        const contractBalance = await rewardToken.balanceOf(await tokenstaked.getAddress());
        expect(contractBalance).to.equal(amountToFund);


    });
    
    it("User should not be able to fund the contract with reward tokens", async function () {         
        const { tokenstaked, user1, rewardToken, owner } = await loadFixture(deployContract);
        
        await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));


        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        
        
        expect(tokenstaked.connect(user1).fundRewards(amountToFund)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("The contract should give the correct reward per token", async function () {         
        const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContract);
        await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));

        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await tokenstaked.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        const amountToStake = ethers.parseUnits("1000", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
        await tokenstaked.connect(user1).stake(amountToStake);
        await time.increase(35);

        const rewardPerToken = await tokenstaked.rewardPerToken();
        expect(rewardPerToken).to.be.greaterThanOrEqual(ethers.parseUnits("0.0035", 18));
        
        
    });  

    it("It should calculate the rewards earned for an account correctly", async function () {     
        const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContract);
        await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));

        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await tokenstaked.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        const amountToStake = ethers.parseUnits("1000", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
        await tokenstaked.connect(user1).stake(amountToStake);
        await time.increase(40);

        const rewardsEarnedByAcc = await tokenstaked.earned(user1.address);   
        expect(rewardsEarnedByAcc).to.be.greaterThan(ethers.parseUnits("0.0040", 18));
        
    });  
    
    it("Users should be able to withdraw their rewards only", async function () {        
        // Should stake and then attempt to withdraw
        const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContract);
        await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));
        await rewardToken.connect(owner).transfer(user1.address, ethers.parseUnits("10", 18));
        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await tokenstaked.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        const amountToStake = ethers.parseUnits("1000", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
        await tokenstaked.connect(user1).stake(amountToStake);
        await time.increase(40);

        await tokenstaked.connect(user1).getReward();

        //Expect the balance of user to be updated with the new token
        expect(await rewardToken.balanceOf(user1.address)).to.be.greaterThanOrEqual(ethers.parseUnits("10.0040", 18));
    }); 

    it("Users should be able to withdraw and get rewards simualtaneously", async function () { 
        const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContract);
        await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));
        await rewardToken.connect(owner).transfer(user1.address, ethers.parseUnits("10", 18));
        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await tokenstaked.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        const amountToStake = ethers.parseUnits("1000", 18);
        await stakingToken.connect(owner).transfer(user1.address, amountToStake);
        await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
        await tokenstaked.connect(user1).stake(amountToStake);
        await time.increase(400);

        await tokenstaked.connect(user1).withdrawAndGetReward();

        expect(await stakingToken.balanceOf(user1.address)).to.equal(amountToStake);
        expect(await rewardToken.balanceOf(user1.address)).to.be.greaterThanOrEqual(ethers.parseUnits("10.04", 18));

        

    });


}); 

describe("Running tests for owner setting the state variables in the contract", function() {
    it("Only the owner should be able to set the reward rate", async function () {         
        const { tokenstaked, owner } = await loadFixture(deployContract);
        const rewardRate = ethers.parseUnits("0.2", 18); // 0.2 tokens per second

        await tokenstaked.connect(owner).setRewardRate(rewardRate);
        expect(await tokenstaked.rewardRate()).to.equal(rewardRate);
    
    });

    it("User should not be able to set the reward rate", async function () {         
        const { tokenstaked, owner, user1 } = await loadFixture(deployContract);
        const rewardRate = ethers.parseUnits("0.2", 18); // 0.2 tokens per second

        expect(tokenstaked.connect(user1).setRewardRate(rewardRate)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only the owner should be able to set the staking duration", async function () {         
        const { tokenstaked, owner } = await loadFixture(deployContract);

        const stakingTime = 34;
        await tokenstaked.connect(owner).setStakingDuration(stakingTime);
        expect(await tokenstaked.stakingDuration()).to.equal(stakingTime);
    });
    
    it("User should not be able to set the staking duration", async function () {         
        const { tokenstaked, user1 } = await loadFixture(deployContract);
        const stakingTime = 34;

        expect(tokenstaked.connect(user1).setStakingDuration(stakingTime)).to.be.revertedWith("Ownable: caller is not the owner");
   
    });

    it("Only the owner should be able to pause staking", async function () {         
        const { tokenstaked, owner } = await loadFixture(deployContract);

        await tokenstaked.connect(owner).pause();
        expect(await tokenstaked.paused()).to.equal(true);
    });
    
    it("User should not be able to set pause staking", async function () {         
        const { tokenstaked, owner, user1 } = await loadFixture(deployContract);

        expect(tokenstaked.connect(user1).pause()).to.be.revertedWith("Ownable: caller is not the owner") ;        
    });    

    it("Only the owner should be able to unpause staking", async function () {         
        const { tokenstaked, owner } = await loadFixture(deployContract);

        await tokenstaked.pause();
        expect(await tokenstaked.paused()).to.equal(true);

        await tokenstaked.connect(owner).unpause();
        expect(await tokenstaked.paused()).to.equal(false);
    });
    
    it("User should not be able to set unpause staking", async function () {         
        const { tokenstaked, owner, user1 } = await loadFixture(deployContract);

        expect(tokenstaked.connect(user1).unpause()).to.be.revertedWith("Ownable: caller is not the owner") ;        
    
    });              
});
   

    // it("", async function () {         
    // });    

