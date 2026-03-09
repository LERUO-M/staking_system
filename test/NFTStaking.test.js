// // Learning to write tests from scratch I know we start with the imports
// // Imports

// const { ethers } = require("hardhat");
// const { expect } = require("chai");
// const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

// // Fixtures
// async function deployContract() {
//     const [owner, user1] = await ethers.getSigners();

//     // Deploy the token contract - used as a blueprint
//     const Token = await ethers.getContractFactory("WTC");

//     const stakingToken = await Token.deploy("LERUO-M", "LMT", 1000000);
//     const rewardToken = await Token.deploy("REWARD-TOKEN", "RWD", 1000000);


//     // Constructor args
//     const stakeTokenAddress = await stakingToken.getAddress();
//     const rewardTokenAddress = await rewardToken.getAddress();
//     const rewardRate = ethers.parseUnits("0.1", 18); // 0.1 tokens per second (1 token every 10 secs)


//     // DEPLOY THE STAKING CONTRACT
//     const TokenStaking = await ethers.getContractFactory("StakingContract");
//     const tokenstaked = await TokenStaking.deploy(stakeTokenAddress, rewardTokenAddress, rewardRate);
//     await tokenstaked.waitForDeployment();
//     console.log(`Contract deployed to: ${await tokenstaked.getAddress()}`);

//     return { tokenstaked, stakingToken, rewardToken, owner, user1 };
// }

// // Tests
// describe("Running tests for the staking/unstaking of tokens in the contract", function() {
//     it("Should have the correct reward rate of 0.1 token/sec", async function ()  {
//         const { tokenstaked } = await loadFixture(deployContract);
//         expect(await tokenstaked.rewardRate()).to.equal(ethers.parseUnits("0.1", 18));
//     });

//     it("Should not be able to stake 0 LMT tokens", async function () {
//         const { tokenstaked, user1 } = await loadFixture(deployContract);
//         await expect(tokenstaked.connect(user1).stake(0)).to.be.revertedWith("Cannot stake 0");
//     });

//     it("Should be able to stake LMT tokens > 0", async function () {
//         const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContract);
        
//         // Owner transfers 100 tokens to User1 so they have something to stake
//         const amountToStake = ethers.parseUnits("100", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);


//         // User1 must Approve the staking contract to spend their tokens
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

//         // User1 stakes the tokens
//         await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

//         // 4. Check the Staked Balance (not balanceOf)
//         const balance = await tokenstaked.stakedBalance(user1.address);
//         expect(balance).to.equal(amountToStake);
//     });

//     it("Should not allow a user to unstake if still in cooldown period", async function () {
//         const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContract);
        
//         // Owner transfers 100 tokens to User1 so they have something to stake
//         const amountToStake = ethers.parseUnits("100", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);


//         // User1 must Approve the staking contract to spend their tokens
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

//         // User1 stakes the tokens
//         await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

//         // Check the Staked Balance
//         const balance = await tokenstaked.stakedBalance(user1.address);
//         expect(balance).to.equal(amountToStake);

//         // After staking, I want to try and withdraw before the cool down period
//         await expect(tokenstaked.connect(user1).withdraw(amountToStake)).to.be.revertedWith("Still locked");
//     });

//     it("Should allow a user to unstake if cooldown period is over", async function () {
//         const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContract);
        
//         // Owner transfers 100 tokens to User1 so they have something to stake
//         const amountToStake = ethers.parseUnits("100", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);


//         // User1 must Approve the staking contract to spend their tokens
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

//         // User1 stakes the tokens
//         await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

//         // 4. Check the Staked Balance (not balanceOf)
//         const balance = await tokenstaked.stakedBalance(user1.address);
//         expect(balance).to.equal(amountToStake);

//         // After staking, I want to try and withdraw before the cool down period
//         await expect(tokenstaked.connect(user1).withdraw(amountToStake)).to.be.revertedWith("Still locked");
//         await time.increase(35);

//         // Now the withdrawal should succeed
//         await expect(tokenstaked.connect(user1).withdraw(amountToStake)).not.to.be.reverted;

//         // 4. Check the Staked Balance (not balanceOf)
//         const balanceAfterWithdrawal = await tokenstaked.stakedBalance(user1.address);
//         expect(balanceAfterWithdrawal).to.equal(0);
//     });

// });

// describe("Running tests for the rewarding of tokens in the contract", function() {

//     it("Only the owner should be able to fund the contract with reward tokens", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });
    
//     it("User should not be able to fund the contract with reward tokens", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });

//     it("", async function () {         
//     });    
// }); 

// describe("Running tests for owner setting the state variables in the contract", function() {
//     it("Only the owner should be able to set the reward rate", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//         const rewardRate = ethers.parseUnits("0.2", 18); // 0.2 tokens per second

//         await tokenstaked.connect(owner).setRewardRate(rewardRate);
//         expect(await tokenstaked.rewardRate()).to.equal(rewardRate);
    
//     });

//     it("User should not be able to set the reward rate", async function () {         
//         const { tokenstaked, owner, user1 } = await loadFixture(deployContract);
//         const rewardRate = ethers.parseUnits("0.2", 18); // 0.2 tokens per second

//         expect(tokenstaked.connect(user1).setRewardRate(rewardRate)).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("Only the owner should be able to set the staking duration", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });
    
//     it("User should not be able to set the staking duration", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });

//     it("Only the owner should be able to pause staking", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });
    
//     it("User should not be able to set pause staking", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });    

//     it("Only the owner should be able to unpause staking", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });
    
//     it("User should not be able to set unpause staking", async function () {         
//         const { tokenstaked, owner } = await loadFixture(deployContract);
//     });              
// });
     

