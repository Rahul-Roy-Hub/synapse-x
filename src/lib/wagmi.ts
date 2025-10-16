import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, arbitrumSepolia, baseSepolia, optimismSepolia, polygon } from 'wagmi/chains';

// Define Monad Testnet chain
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet-explorer.monad.xyz' },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: 'Synapse X',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [sepolia, arbitrumSepolia, baseSepolia, optimismSepolia, polygon, monadTestnet],
  ssr: true,
});
