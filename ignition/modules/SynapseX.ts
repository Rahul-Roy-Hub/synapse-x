import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Mock USDC token for testing (in production, use real USDC addresses)
const MockUSDC = buildModule("MockUSDC", (m) => {
  const mockUSDC = m.contract("MockUSDC", [
    "Mock USDC",
    "USDC",
    6, // 6 decimals like real USDC
    m.getAccount(0), // Initial supply to deployer
  ]);

  return { mockUSDC };
});

// DataCoin contract deployment
const DataCoin = buildModule("DataCoin", (m) => {
  const dataCoin = m.contract("DataCoin");

  return { dataCoin };
});

// DataMarketplace contract deployment
const DataMarketplace = buildModule("DataMarketplace", (m) => {
  const { mockUSDC } = m.useModule(MockUSDC);
  const { dataCoin } = m.useModule(DataCoin);

  const marketplace = m.contract("DataMarketplace", [
    mockUSDC,
    dataCoin,
  ]);

  return { marketplace };
});

// CrossChainBridge contract deployment
const CrossChainBridge = buildModule("CrossChainBridge", (m) => {
  const { mockUSDC } = m.useModule(MockUSDC);
  const { marketplace } = m.useModule(DataMarketplace);

  const bridge = m.contract("CrossChainBridge", [
    mockUSDC,
    marketplace,
  ]);

  return { bridge };
});

// Main SynapseX module that deploys all contracts
const SynapseX = buildModule("SynapseX", (m) => {
  const { mockUSDC } = m.useModule(MockUSDC);
  const { dataCoin } = m.useModule(DataCoin);
  const { marketplace } = m.useModule(DataMarketplace);
  const { bridge } = m.useModule(CrossChainBridge);

  return {
    mockUSDC,
    dataCoin,
    marketplace,
    bridge,
  };
});

export default SynapseX;
