const { ethers } = require("hardhat");

async function main() {
  // 1. Setup - Use the addresses from your successful deployment log
  const rewardTokenAddress = "0xC4A1cf64276B64fd9a57B4380d42c94899eCd4d9";
  const stakingContractAddress = "0x44179399Bf57Bb8D471b87EA3bE2d860c522E94e";

  const [deployer] = await ethers.getSigners();
  console.log("Funding contract with the account:", deployer.address);

  // 2. Attach to the deployed Reward Token
  const RewardToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", rewardTokenAddress);

  // 3. The amount to fund (e.g., 1000 tokens with 18 decimals)
  const amount = ethers.parseEther("10000");

  console.log("Approving Staking Contract to spend tokens...");
  // STEP 1: APPROVE
  const approveTx = await RewardToken.approve(stakingContractAddress, amount);
  await approveTx.wait();
  console.log("Approval successful!");

  // STEP 2: TRANSFER (Standard way)
  // If your contract has a 'fundRewards' function, call that. 
  // Otherwise, just do a direct transfer.
  console.log("Transferring tokens to Staking Contract...");
  const transferTx = await RewardToken.transfer(stakingContractAddress, amount);
  await transferTx.wait();

  console.log("Staking Contract successfully funded!");
  
  const balance = await RewardToken.balanceOf(stakingContractAddress);
  console.log("Current Staking Contract Balance:", ethers.formatEther(balance));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});