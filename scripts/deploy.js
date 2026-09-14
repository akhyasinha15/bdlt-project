const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);

  const DocumentVerification = await hre.ethers.getContractFactory("DocumentVerification");
  const contract = await DocumentVerification.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("DocumentVerification deployed to:", address);

  // Save address + ABI where the backend can find them
  const artifact = await hre.artifacts.readArtifact("DocumentVerification");
  const outDir = path.join(__dirname, "..", "backend");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "contract-config.json"),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );

  console.log("Saved contract address + ABI to backend/contract-config.json");
}

main().catch((error) => {
  console.error(error);
  process.exitProcess ? process.exitProcess(1) : process.exit(1);
});
