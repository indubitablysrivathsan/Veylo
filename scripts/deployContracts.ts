/**
 * scripts/deployContracts.ts
 * ──────────────────────────
 * Deploys all smart contracts to the configured network.
 * Uses Hardhat's ethers integration.
 *
 * Usage:
 *   npx hardhat run scripts/deployContracts.ts --network sepolia
 *   npx hardhat run scripts/deployContracts.ts --network localhost
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // ─── Deploy ReputationScore ─────────────────────────────
  console.log("\n--- Deploying ReputationScore ---");
  const ReputationScore = await ethers.getContractFactory("ReputationScore");
  const reputation = await ReputationScore.deploy();
  await reputation.waitForDeployment();
  const repAddr = await reputation.getAddress();
  console.log("ReputationScore deployed to:", repAddr);

  // ─── Deploy Escrow ──────────────────────────────────────
  console.log("\n--- Deploying Escrow ---");
  const Escrow = await ethers.getContractFactory("Escrow");
  // Deployer acts as the validator (trusted backend wallet)
  const escrow = await Escrow.deploy(deployer.address);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("Escrow deployed to:", escrowAddr);

  // ─── Deploy SlashingExtension ───────────────────────────
  console.log("\n--- Deploying SlashingExtension ---");
  const Slashing = await ethers.getContractFactory("SlashingExtension");
  const slashing = await Slashing.deploy();
  await slashing.waitForDeployment();
  const slashAddr = await slashing.getAddress();
  console.log("SlashingExtension deployed to:", slashAddr);

  // ─── Deploy ReputationNFT ──────────────────────────────
  console.log("\n--- Deploying ReputationNFT ---");
  const NFT = await ethers.getContractFactory("ReputationNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("ReputationNFT deployed to:", nftAddr);

  // ─── Link ReputationScore to Escrow ─────────────────────
  const repContract = ReputationScore.attach(repAddr);
  await (repContract as any).setEscrowContract(escrowAddr);
  console.log("\nReputationScore linked to Escrow contract");

  // ─── Save deployed addresses ────────────────────────────
  const addresses = {
    Escrow: escrowAddr,
    ReputationScore: repAddr,
    SlashingExtension: slashAddr,
    ReputationNFT: nftAddr,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "..", "config", "deployedAddresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to:", outPath);
  console.log(JSON.stringify(addresses, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
