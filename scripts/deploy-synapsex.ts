import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying SynapseX contracts...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));
  
  // Deploy MockUSDC
  console.log("\n📦 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(
    "Mock USDC",
    "USDC",
    6, // 6 decimals
    deployer.address
  );
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", mockUSDCAddress);
  
  // Deploy DataCoin
  console.log("\n🪙 Deploying DataCoin...");
  const DataCoin = await hre.ethers.getContractFactory("DataCoin");
  const dataCoin = await DataCoin.deploy();
  await dataCoin.waitForDeployment();
  const dataCoinAddress = await dataCoin.getAddress();
  console.log("DataCoin deployed to:", dataCoinAddress);
  
  // Deploy DataMarketplace
  console.log("\n🏪 Deploying DataMarketplace...");
  const DataMarketplace = await hre.ethers.getContractFactory("DataMarketplace");
  const marketplace = await DataMarketplace.deploy(
    mockUSDCAddress,
    dataCoinAddress
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("DataMarketplace deployed to:", marketplaceAddress);
  
  // Deploy CrossChainBridge
  console.log("\n🌉 Deploying CrossChainBridge...");
  const CrossChainBridge = await hre.ethers.getContractFactory("CrossChainBridge");
  const bridge = await CrossChainBridge.deploy(
    mockUSDCAddress,
    marketplaceAddress
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("CrossChainBridge deployed to:", bridgeAddress);
  
  // Display deployment summary
  console.log("\n✅ Deployment Summary:");
  console.log("====================");
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("DataCoin:", dataCoinAddress);
  console.log("DataMarketplace:", marketplaceAddress);
  console.log("CrossChainBridge:", bridgeAddress);
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  // Mint a test dataset
  const cid = "QmTest123456789";
  const name = "Test Dataset";
  const description = "A test dataset for SynapseX demonstration";
  const price = 1000000; // 1 USDC
  const accessPolicy = '{"type": "public", "expiry": 86400}';
  
  console.log("Minting test dataset...");
  const mintTx = await dataCoin.mintDataset(
    deployer.address,
    cid,
    name,
    description,
    price,
    accessPolicy,
    0 // Single dataset
  );
  await mintTx.wait();
  
  const tokenId = await dataCoin.totalSupply();
  console.log("Test dataset minted with token ID:", tokenId.toString());
  
  // Check dataset info
  const datasetInfo = await dataCoin.getDatasetInfo(tokenId);
  console.log("Dataset info:");
  console.log("- Name:", datasetInfo.name);
  console.log("- Price:", hre.ethers.formatUnits(datasetInfo.price, 6), "USDC");
  console.log("- Creator:", datasetInfo.creator);
  console.log("- Active:", datasetInfo.isActive);
  
  console.log("\n🎉 SynapseX deployment completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Install Lighthouse SDK: yarn add @lighthouse-web3/sdk");
  console.log("2. Set up environment variables for API keys");
  console.log("3. Run tests: npx hardhat test");
  console.log("4. Start the frontend: yarn dev");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
