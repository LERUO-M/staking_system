// Learning to write tests from scratch I know we start with the imports
// Imports

const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// Fixtures
describe("Running deployment and loading of fixtures for testing", function() {
    async function deployContract() {
        const [owner, user1] = await ethers.getSigners();

        // DEPLOY THE CONTRACT
        const TokenStaking = await ethers.getContractFactory("StakingContract");
        const tokenstaked = await TokenStaking.deploy();

        return { tokenstaked, owner, user1 };
    }
});

// Tests
describe("Running tests for the token contract", function() {
    it("", async function ()  {
        
    });
});
