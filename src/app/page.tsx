'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { WalletBridge } from '@/components/wallet-bridge';
import { useState, useEffect } from 'react';

export default function Home() {
  const { isConnected, address, connector } = useAccount();
  const chainId = useChainId();
  const [nexusInitialized, setNexusInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleManualInit = async () => {
    if (!isConnected || !connector) {
      alert('Please connect a wallet first');
      return;
    }

    setIsInitializing(true);
    try {
      // Just send wallet connection info, not the provider object
      const walletInfo = {
        address: address,
        chainId: chainId,
        isConnected: isConnected,
      };
      
      const response = await fetch('/api/nexus/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletInfo }),
      });

      if (response.ok) {
        setNexusInitialized(true);
        alert('Nexus SDK initialized successfully!');
      } else {
        const error = await response.json();
        alert(`Initialization failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Manual initialization failed:', error);
      alert(`Initialization failed: ${error}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // Listen for successful initialization from WalletBridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'NEXUS_INITIALIZED') {
        setNexusInitialized(true);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen p-8">
      <WalletBridge />
      
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Synapse X</h1>
          <ConnectButton />
        </header>

        <main className="space-y-8">
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Wallet Status</h2>
            {isConnected ? (
              <div className="space-y-2">
                <p><strong>Address:</strong> {address}</p>
                <p><strong>Chain ID:</strong> {chainId}</p>
                <p><strong>Status:</strong> <span className="text-green-600">Connected</span></p>
              </div>
            ) : (
              <p>Wallet not connected</p>
            )}
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Nexus SDK Status</h2>
            <p><strong>Initialization:</strong> 
              <span className={nexusInitialized ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                {nexusInitialized ? "Initialized" : "Not Initialized"}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              The Nexus SDK will automatically initialize when you connect a wallet.
            </p>
            {isConnected && !nexusInitialized && (
              <button
                onClick={handleManualInit}
                disabled={isInitializing}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isInitializing ? "Initializing..." : "Initialize Nexus SDK Manually"}
              </button>
            )}
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Supported Networks</h2>
            <ul className="space-y-2">
              <li>• Optimism Sepolia (Chain ID: 11155420)</li>
              <li>• Polygon Amoy (Chain ID: 80002)</li>
              <li>• Arbitrum Sepolia (Chain ID: 421614)</li>
              <li>• Base Sepolia (Chain ID: 84532)</li>
              <li>• Sepolia (Chain ID: 11155111)</li>
              <li>• Monad Testnet (Chain ID: 10143)</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
