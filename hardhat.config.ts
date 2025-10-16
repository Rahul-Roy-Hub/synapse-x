import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin, hardhatEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 31337,
    },
    // Multi-chain simulation for SynapseX
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 1,
    },
    hardhatPolygon: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 137,
    },
    hardhatArbitrum: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 42161,
    },
    hardhatOptimism: {
      type: "edr-simulated",
      chainType: "op",
      chainId: 10,
    },
    hardhatBase: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 8453,
    },
    // Test networks
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    polygonMumbai: {
      type: "http",
      chainType: "l1",
      url: configVariable("POLYGON_MUMBAI_RPC_URL"),
      accounts: [configVariable("POLYGON_MUMBAI_PRIVATE_KEY")],
    },
    arbitrumSepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("ARBITRUM_SEPOLIA_RPC_URL"),
      accounts: [configVariable("ARBITRUM_SEPOLIA_PRIVATE_KEY")],
    },
  },
};

export default config;
