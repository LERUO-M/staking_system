# 💎 Diamond Mining Protocol

A robust, engineering-first NFT staking system currently deployed on the **Ethereum Sepolia Testnet**. This protocol allows users to refine their raw digital "ores" (NFTs) into "polished diamonds" ($DIAMOND Reward Tokens) through a secure, decentralized refinery.

---

## 🏗 Engineering Philosophy: TDD
This project was built using **Test-Driven Development (TDD)**. In smart contract development, where code is often immutable and high-stakes, "move fast and break things" is an expensive mantra. 

### The "Refinery" Analogy
Think of this protocol like a physical diamond refinery. Before we laid a single brick of the factory (wrote the Solidity code), we designed the **Safety Sensors and Quality Checks** (Unit Tests). 

* **Step 1 (The Sensor):** We wrote a test defining what a "failed" refinement looks like (e.g., trying to stake an NFT you don't actually own).
* **Step 2 (The Build):** We wrote the minimum Solidity logic required to pass that specific sensor.
* **Step 3 (The Polish):** Once the logic was "Green," we refactored for gas efficiency while ensuring the sensors remained active.

---

## 📋 The Ecosystem
The protocol translates technical staking mechanics into a mining-themed workflow:

| Concept | Technical Component | Description |
| :--- | :--- | :--- |
| **Discovered Ores** | **NFTs (ERC-721)** | The unique assets currently held in your wallet. |
| **The Refinery** | **Staking Contract** | The engine where Ores are locked to generate yield. |
| **Polished Diamonds** | **$DIAMOND (ERC-20)** | The reward tokens generated for participating in the refinery. |

---

## 🛠 Technical Stack
* **Language:** Solidity ^0.8.20
* **Framework:** Hardhat
* **Network:** Sepolia Testnet
* **Standards:** ERC-721 (Ores) & ERC-20 (Rewards)

---

## 🚀 Getting Started

### Installation
To explore the codebase and the test-driven architecture:

```bash
# Clone the repository
git clone https://github.com/LERUO-M/staking_system

# Install dependencies
npm install

# Run the tests using Hardhat
npx hardhat test
```

---

## Roadmap
The "Mine" is operational, but the infrastructure is evolving. Current focus areas:

1. Contract Upgradability: Implementing UUPS (Universal Upgradeable Proxy Standard) via OpenZeppelin Upgrades to allow for logic improvements.

2. Dynamic Metadata: Adding on-chain metadata to the NFTs to visually reflect their "Refining" status.

3. Mining Difficulty: Implementing variable reward rates based on NFT rarity or "ore" type.

