import hre from "hardhat";

export async function deploySynapseXFixture() {
  // Get the network connection with viem
  const { viem } = await hre.network.connect();
  
  // Get wallet clients
  const [owner, buyer, seller] = await viem.getWalletClients();
  
  console.log("Owner address:", owner.account.address);
  console.log("Buyer address:", buyer.account.address);
  console.log("Seller address:", seller.account.address);
  
  // Deploy MockUSDC
  const mockUSDC = await viem.deployContract("MockUSDC", [
    "Mock USDC",
    "USDC",
    6,
    owner.account.address
  ]);
  
  // Deploy DataCoin
  const dataCoin = await viem.deployContract("DataCoin", []);
  
  // Deploy DataMarketplace
  const marketplace = await viem.deployContract("DataMarketplace", [
    mockUSDC.address,
    dataCoin.address
  ]);
  
  // Deploy CrossChainBridge
  const bridge = await viem.deployContract("CrossChainBridge", [
    mockUSDC.address,
    marketplace.address
  ]);
  
  return {
    mockUSDC,
    dataCoin,
    marketplace,
    bridge,
    owner: owner.account,
    buyer: buyer.account,
    seller: seller.account,
  };
}
