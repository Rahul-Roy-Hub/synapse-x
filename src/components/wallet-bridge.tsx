'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export function WalletBridge() {
  const { connector, isConnected } = useAccount();
  const [nexusReady, setNexusReady] = useState(false);

  useEffect(() => {
    const initializeNexus = async () => {
      console.log('WalletBridge effect triggered:', { isConnected, hasConnector: !!connector });
      
      if (isConnected && connector?.getProvider && !nexusReady) {
        try {
          console.log('Sending wallet info to server...');
          
          const walletInfo = {
            isConnected: isConnected,
          };
          
          console.log('Initializing Nexus SDK via API...');
          const response = await fetch('/api/nexus/initialize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletInfo }),
          });

          if (response.ok) {
            setNexusReady(true);
            console.log('Nexus SDK initialized successfully via API');
            
            // Notify parent component
            window.postMessage({ type: 'NEXUS_INITIALIZED' }, '*');
          } else {
            const error = await response.json();
            console.error('Failed to initialize Nexus SDK:', error);
          }
        } catch (error) {
          console.error('Failed to initialize Nexus SDK:', error);
        }
      } else {
        console.log('Skipping initialization:', { 
          isConnected, 
          hasConnector: !!connector, 
          hasGetProvider: !!connector?.getProvider,
          alreadyInitialized: nexusReady 
        });
      }
    };

    initializeNexus();
  }, [isConnected, connector, nexusReady]);

  return null;
}
