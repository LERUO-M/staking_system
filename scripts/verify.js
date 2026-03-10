const hre = require("hardhat");

async function main() {
  // 1. Addresses from your deployment log
  const nftAddr = "0xa17A648eb34f90E6686298E780786ba779B68a84";
  const rewardAddr = "0xC4A1cf64276B64fd9a57B4380d42c94899eCd4d9";
  const stakingAddr = "0x44179399Bf57Bb8D471b87EA3bE2d860c522E94e";

  // 2. Define the exact arguments you used in the constructor
  // These MUST match what you sent during deployment!
  const rewardRate = ethers.parseUnits("0.00027777", 18);
  const name = "AbideNFT";
  const symbol = "AFT";
  const baseURI = "null";
  const notRevealedUri = "null";
  const initialSupply = 1000000;


  console.log("Starting verification...");

  // Verify NFT Contract
  try {
    await hre.run("verify:verify", {
      address: nftAddr,
      constructorArguments: [name, symbol, baseURI, notRevealedUri], // If your NFT constructor has no args, leave empty
    });
  } catch (e) { console.log("NFT already verified or error:", e.message); }

  // Verify Reward Token
  try {
    await hre.run("verify:verify", {
      address: rewardAddr,
      constructorArguments: ["REWARD-TOKEN", "RWD", initialSupply], 
    });
  } catch (e) { console.log("Token already verified or error:", e.message); }

  // Verify Staking Contract
  try {
    await hre.run("verify:verify", {
      address: stakingAddr,
      constructorArguments: [nftAddr, rewardAddr, rewardRate],
    });
  } catch (e) { console.log("Staking already verified or error:", e.message); }

  console.log("Verification process complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});