// Learning to write tests from scratch I know we start with the imports
// Imports

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

// Fixtures
async function deployContractNFT() {
    const [owner, user1] = await ethers.getSigners();

    const name = "AbideNFT";
    const symbol = "AFT";
    const arg1 = "null";
    const arg2 = "null";


    // Deploy the token contract for rewards
    const Token = await ethers.getContractFactory("WTC");
    const NFT = await ethers.getContractFactory("NFT");


    const NFTtoStake = await NFT.deploy(name, symbol, arg1, arg2);
    const rewardToken = await Token.deploy("REWARD-TOKEN", "RWD", 1000000);


    // Constructor args
    const NFTAddress = await NFTtoStake.getAddress();
    const rewardTokenAddress = await rewardToken.getAddress();
    const rewardRate = ethers.parseUnits("0.00027777777", 18); // 0.1 tokens per minue (1 token every 60 secs)


    // DEPLOY THE STAKING CONTRACT
    const StakingContractNFT = await ethers.getContractFactory("StakingContractNFT");
    const StakingContract = await StakingContractNFT.deploy(NFTAddress, rewardTokenAddress, rewardRate);
    await StakingContract.waitForDeployment();
    console.log(`Contract deployed to: ${await StakingContract.getAddress()}`);

    return { StakingContract, rewardToken, owner, user1, NFTtoStake };
}

// Tests
describe("Running tests for the staking/unstaking of the NFT in the contract", function() {
    it("Should not be able to stake an NFT that doesnt exist", async function () {
        const { NFTtoStake, user1, StakingContract } = await loadFixture(deployContractNFT);

        // Mint and pay the cost
        const mintCost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: mintCost });


        // APPROVE
        const stakingAddress = await StakingContract.getAddress();
        await NFTtoStake.connect(user1).approve(stakingAddress, 1);

        // Should revert
        expect(StakingContract.connect(user1).stake(2)).to.be.revertedWith("ERC721: owner query for nonexistent token");
    });

    it("Should be able to stake an NFT that exists", async function () {
        const { NFTtoStake, user1, StakingContract } = await loadFixture(deployContractNFT);

        // Mint and pay the cost
        const mintCost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: mintCost });

        // APPROVE
        const stakingAddress = await StakingContract.getAddress();
        await NFTtoStake.connect(user1).approve(stakingAddress, 1);

        // Stake the NFT
        await StakingContract.connect(user1).stake(1);

        // Check if Staking Contract now holds the NFT
        expect(await NFTtoStake.ownerOf(1)).to.equal(stakingAddress);
    });

    it("Should not allow a user to unstake/withdraw if still in cooldown period", async function () {
        const { NFTtoStake, user1, StakingContract } = await loadFixture(deployContractNFT);
        
        // Mint and pay the cost
        const mintCost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: mintCost });

        // APPROVE
        const stakingAddress = await StakingContract.getAddress();
        await NFTtoStake.connect(user1).approve(stakingAddress, 1);

        // Stake the NFT
        await StakingContract.connect(user1).stake(1);

        // After staking, I want to try and withdraw before the cool down period
        await expect(StakingContract.connect(user1).withdraw(1)).to.be.revertedWith("Still locked");
    });

    it("Should allow a user to unstake/withdraw if cooldown period is over", async function () {
        const { NFTtoStake, user1, StakingContract } = await loadFixture(deployContractNFT);
        
        // Mint and pay the cost
        const mintCost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: mintCost });

        // APPROVE
        const stakingAddress = await StakingContract.getAddress();
        await NFTtoStake.connect(user1).approve(stakingAddress, 1);

        // Stake the NFT
        await StakingContract.connect(user1).stake(1);

        // After staking, I want to try and withdraw before the cool down period
        await expect(StakingContract.connect(user1).withdraw(1)).to.be.revertedWith("Still locked");
        await time.increase(35);

        // Now the withdrawal should succeed
        await expect(StakingContract.connect(user1).withdraw(1)).not.to.be.reverted;

        // Check balance of StakedContract
        const balanceAfterWithdrawal = await NFTtoStake.balanceOf(stakingAddress);
        expect(balanceAfterWithdrawal).to.equal(0);
    
    });

    it("Emergency withdraw should NOT work if user doesnt own NFT", async function () {         
        const { NFTtoStake, user1, StakingContract, owner } = await loadFixture(deployContractNFT);
        
        // Mint and pay the cost
        const mintCost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: mintCost });

        // APPROVE
        const stakingAddress = await StakingContract.getAddress();
        await NFTtoStake.connect(user1).approve(stakingAddress, 1);

        // Stake the NFT
        await StakingContract.connect(user1).stake(1);
        await time.increase(35);

        // Now the withdrawal should succeed
        await expect(StakingContract.connect(user1).withdraw(1)).not.to.be.reverted;
    });       

    it("Emergency withdraw should give user back all their staked tokens and no reward tokens", async function () {         
        const { NFTtoStake, user1, StakingContract, rewardToken, owner} = await loadFixture(deployContractNFT);

        const stakingAddress = await StakingContract.getAddress();

        // Deposit reward tokens to the Contract
        const amountToFund = ethers.parseUnits("10", 18);
        await rewardToken.connect(owner).approve(stakingAddress, amountToFund);

        await rewardToken.connect(owner).transfer(stakingAddress, amountToFund);
        
        // Mint and pay the cost
        const mintCost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: mintCost });

        // APPROVE
        await NFTtoStake.connect(user1).approve(stakingAddress, 1);

        // Stake the NFT
        await StakingContract.connect(user1).stake(1);
        expect(StakingContract.connect(user1).emergencyWithdraw(1));

        // The reward tokens in the contract should not change
        const contractBalance = await rewardToken.balanceOf(stakingAddress);
        expect(contractBalance).to.equal(amountToFund);
    
    });      


});

describe("Running tests for the rewarding of tokens in the contract", function() {

    it("Only the owner should be able to fund the contract with reward tokens", async function () {         
        const { StakingContract, rewardToken } = await loadFixture(deployContractNFT);
        
        await rewardToken.approve(await StakingContract.getAddress(), ethers.parseUnits("10", 18));


        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("10", 18);
        await StakingContract.fundRewards(amountToFund);

        //balanceOf contract
        const contractBalance = await rewardToken.balanceOf(await StakingContract.getAddress());
        expect(contractBalance).to.equal(amountToFund);


    });
    
    it("User should not be able to fund the contract with reward tokens", async function () {         
        const { StakingContract, user1, rewardToken, owner } = await loadFixture(deployContractNFT);
        
        await rewardToken.connect(owner).approve(await StakingContract.getAddress(), ethers.parseUnits("100", 18));


        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("100", 18);
        
        
        expect(StakingContract.connect(user1).fundRewards(amountToFund)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("It should calculate the rewards earned for an account correctly", async function () {     
        const { StakingContract, rewardToken, owner, user1, NFTtoStake } = await loadFixture(deployContractNFT);
        await rewardToken.connect(owner).approve(await StakingContract.getAddress(), ethers.parseUnits("1000", 18));

        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await StakingContract.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        const cost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: cost });
        await NFTtoStake.connect(user1).approve(await StakingContract.getAddress(), 1);
        await StakingContract.connect(user1).stake(1);
        await time.increase(40);

        const rewardsEarnedByAcc = await StakingContract.earned(user1.address);   
        expect(rewardsEarnedByAcc).to.be.greaterThan(ethers.parseUnits("0.01111", 18));
        
    });  
    
    it("Users should be able to withdraw their rewards only", async function () {        
        // Should stake and then attempt to withdraw
        const { StakingContract, rewardToken, owner, user1, NFTtoStake } = await loadFixture(deployContractNFT);

        await rewardToken.connect(owner).approve(await StakingContract.getAddress(), ethers.parseUnits("1000", 18));
        await rewardToken.connect(owner).transfer(user1.address, ethers.parseUnits("10", 18));

        // Owner should create the tokens and send them to the contract
        const cost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: cost});
        await NFTtoStake.connect(user1).approve(await StakingContract.getAddress(), 1);

        const amountToFund = ethers.parseUnits("1000", 18);
        await StakingContract.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        await StakingContract.connect(user1).stake(1);
        await time.increase(40);

        await StakingContract.connect(user1).getReward();

        //Expect the balance of user to be updated with the new token
        expect(await rewardToken.balanceOf(user1.address)).to.be.greaterThanOrEqual(ethers.parseUnits("10.0111", 18));
    }); 

    it("Users should be able to withdraw and get rewards simualtaneously", async function () { 
        const { StakingContract, rewardToken, owner, user1, NFTtoStake } = await loadFixture(deployContractNFT);
        await rewardToken.connect(owner).approve(await StakingContract.getAddress(), ethers.parseUnits("1000", 18));
        await rewardToken.connect(owner).transfer(user1.address, ethers.parseUnits("10", 18));

        const cost = await NFTtoStake.cost();
        await NFTtoStake.connect(user1).mint(1, { value: cost});
        await NFTtoStake.connect(user1).approve(await StakingContract.getAddress(), 1);

        // Owner should create the tokens and send them to the contract
        const amountToFund = ethers.parseUnits("1000", 18);
        await StakingContract.fundRewards(amountToFund);
        
        // User must stake now and then we can test the functionality
        await StakingContract.connect(user1).stake(1);

        // 400 * rewardpertoken
        await time.increase(400);

        await StakingContract.connect(user1).withdrawAndClaim(1);

        expect(await NFTtoStake.balanceOf(user1.address)).to.equal(1);
        expect(await rewardToken.balanceOf(user1.address)).to.be.greaterThanOrEqual(ethers.parseUnits("10.1111", 18));  
    });


}); 