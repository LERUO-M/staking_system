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
        const balanceAfterWithdrawal = await NFTtoStake.balanceOf(await StakingContract.getAddress());
        expect(balanceAfterWithdrawal).to.equal(0);
    
    });

    // it("Emergency withdraw should NOT give user back any tokens if never staked", async function () {         
    //     const { tokenstaked, user1 } = await loadFixture(deployContractNFT);
    //     expect(tokenstaked.connect(user1).emergencyWithdraw()).to.be.revertedWith("No tokens staked")
    // });       

    // it("Emergency withdraw should give user back all their staked tokens and no reward tokens", async function () {         
    //     const { tokenstaked, stakingToken, owner, user1 } = await loadFixture(deployContractNFT);
        
    //     // Owner transfers 100 tokens to User1 so they have something to stake
    //     const amountToStake = ethers.parseUnits("100", 18);
    //     await stakingToken.connect(owner).transfer(user1.address, amountToStake);


    //     // User1 must Approve the staking contract to spend their tokens
    //     await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);

    //     // User1 stakes the tokens
    //     await expect(tokenstaked.connect(user1).stake(amountToStake)).not.to.be.reverted;

    //     // Now that we have staked, let cooldown pass and try emergency withdrawal.
    //     await time.increase(35);
    //     await expect(tokenstaked.connect(user1).emergencyWithdraw()).not.to.be.reverted;


    // });       


});

// describe("Running tests for the rewarding of tokens in the contract", function() {

//     it("Only the owner should be able to fund the contract with reward tokens", async function () {         
//         const { tokenstaked, owner, rewardToken } = await loadFixture(deployContractNFT);
        
//         await rewardToken.approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));


//         // Owner should create the tokens and send them to the contract
//         const amountToFund = ethers.parseUnits("1000", 18);
//         await tokenstaked.fundRewards(amountToFund);

//         //balanceOf contract
//         const contractBalance = await rewardToken.balanceOf(await tokenstaked.getAddress());
//         expect(contractBalance).to.equal(amountToFund);


//     });
    
//     it("User should not be able to fund the contract with reward tokens", async function () {         
//         const { tokenstaked, user1, rewardToken, owner } = await loadFixture(deployContractNFT);
        
//         await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));


//         // Owner should create the tokens and send them to the contract
//         const amountToFund = ethers.parseUnits("1000", 18);
        
        
//         expect(tokenstaked.connect(user1).fundRewards(amountToFund)).to.be.revertedWith("Ownable: caller is not the owner");
//     });

//     it("The contract should give the correct reward per token", async function () {         
//         const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContractNFT);
//         await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));

//         // Owner should create the tokens and send them to the contract
//         const amountToFund = ethers.parseUnits("1000", 18);
//         await tokenstaked.fundRewards(amountToFund);
        
//         // User must stake now and then we can test the functionality
//         const amountToStake = ethers.parseUnits("1000", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
//         await tokenstaked.connect(user1).stake(amountToStake);
//         await time.increase(35);

//         const rewardPerToken = await tokenstaked.rewardPerToken();
//         expect(rewardPerToken).to.be.greaterThanOrEqual(ethers.parseUnits("0.0035", 18));
        
        
//     });  

//     it("It should calculate the rewards earned for an account correctly", async function () {     
//         const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContractNFT);
//         await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));

//         // Owner should create the tokens and send them to the contract
//         const amountToFund = ethers.parseUnits("1000", 18);
//         await tokenstaked.fundRewards(amountToFund);
        
//         // User must stake now and then we can test the functionality
//         const amountToStake = ethers.parseUnits("1000", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
//         await tokenstaked.connect(user1).stake(amountToStake);
//         await time.increase(40);

//         const rewardsEarnedByAcc = await tokenstaked.earned(user1.address);   
//         expect(rewardsEarnedByAcc).to.be.greaterThan(ethers.parseUnits("0.0040", 18));
        
//     });  
    
//     it("Users should be able to withdraw their rewards only", async function () {        
//         // Should stake and then attempt to withdraw
//         const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContractNFT);
//         await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));
//         await rewardToken.connect(owner).transfer(user1.address, ethers.parseUnits("10", 18));
//         // Owner should create the tokens and send them to the contract
//         const amountToFund = ethers.parseUnits("1000", 18);
//         await tokenstaked.fundRewards(amountToFund);
        
//         // User must stake now and then we can test the functionality
//         const amountToStake = ethers.parseUnits("1000", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
//         await tokenstaked.connect(user1).stake(amountToStake);
//         await time.increase(40);

//         await tokenstaked.connect(user1).getReward();

//         //Expect the balance of user to be updated with the new token
//         expect(await rewardToken.balanceOf(user1.address)).to.be.greaterThanOrEqual(ethers.parseUnits("10.0040", 18));
//     }); 

//     it("Users should be able to withdraw and get rewards simualtaneously", async function () { 
//         const { tokenstaked, rewardToken, owner, user1, stakingToken } = await loadFixture(deployContractNFT);
//         await rewardToken.connect(owner).approve(await tokenstaked.getAddress(), ethers.parseUnits("1000", 18));
//         await rewardToken.connect(owner).transfer(user1.address, ethers.parseUnits("10", 18));
//         // Owner should create the tokens and send them to the contract
//         const amountToFund = ethers.parseUnits("1000", 18);
//         await tokenstaked.fundRewards(amountToFund);
        
//         // User must stake now and then we can test the functionality
//         const amountToStake = ethers.parseUnits("1000", 18);
//         await stakingToken.connect(owner).transfer(user1.address, amountToStake);
//         await stakingToken.connect(user1).approve(await tokenstaked.getAddress(), amountToStake);
//         await tokenstaked.connect(user1).stake(amountToStake);
//         await time.increase(400);

//         await tokenstaked.connect(user1).withdrawAndGetReward();

//         expect(await stakingToken.balanceOf(user1.address)).to.equal(amountToStake);
//         expect(await rewardToken.balanceOf(user1.address)).to.be.greaterThanOrEqual(ethers.parseUnits("10.04", 18));

        

//     });


// }); 


        
        // // Owner mints nft for themselves - WILL USE THIS LATER
        // await NFTtoStake.connect(owner).mint(1);
        // expect(await NFTtoStake.ownerOf(1)).to.equal(owner.address);

        // await NFTtoStake.connect(owner).transferFrom(owner.address, user1.address, 1);

        // // Verify the transfer was successful by checking who owns tokenId
        // expect(await NFTtoStake.ownerOf(1)).to.equal(user1.address);