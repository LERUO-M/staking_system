const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy the NFT Contract (The asset to be staked)
  const name = "AbideNFT";
  const symbol = "AFT";
  const baseURI = "null";
  const notRevealedUri = "null";

  const NFT = await ethers.getContractFactory("NFT");
  const nftContract = await NFT.deploy(name, symbol, baseURI, notRevealedUri);
  await nftContract.waitForDeployment();
  const nftAddress = await nftContract.getAddress();
  console.log(`NFT Contract deployed to: ${nftAddress}`);

  // 2. Deploy the Reward Token Contract (ERC20)
  const initialSupply = 1000000;
  const Token = await ethers.getContractFactory("WTC");
  const rewardToken = await Token.deploy("REWARD-TOKEN", "RWD", initialSupply);
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log(`Reward Token deployed to: ${rewardTokenAddress}`);

  // 3. Deploy the Staking Contract
  // rewardRate: 1 token per hour
  const rewardRate = ethers.parseUnits("0.0002777777777777777777", 18);

  const StakingContractNFT = await ethers.getContractFactory("StakingContractNFT");
  const stakingContract = await StakingContractNFT.deploy(nftAddress, rewardTokenAddress, rewardRate);
  await stakingContract.waitForDeployment();
  const stakingAddress = await stakingContract.getAddress();
  console.log(`Staking Contract deployed to: ${stakingAddress}`);

  // 4. Initial Setup: Fund the staking contract with reward tokens
  const fundAmount = ethers.parseUnits("10000", 18);
  await stakingContract.fundRewards(fundAmount);
  console.log("Staking contract funded with reward tokens. Lets cook!");
}

main().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
  });
