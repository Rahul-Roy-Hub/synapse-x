// Server-side only Nexus SDK initialization
let sdk: unknown = null;

export async function initializeWithProvider(provider: unknown) {
  if (typeof window !== 'undefined') {
    console.warn('NexusSDK should only be initialized server-side.');
    return null;
  }

  try {
    const { NexusSDK } = await import('@avail-project/nexus-core');
    sdk = new NexusSDK({ network: 'testnet' });
    
    // Initialize with provider
    await (sdk as { initialize: (provider: unknown) => Promise<void> }).initialize(provider);
    
    console.log('Nexus SDK initialized successfully on server-side');
    return sdk;
  } catch (error) {
    console.error('Failed to initialize Nexus SDK:', error);
    throw error;
  }
}

export function getSDK(): unknown {
  if (typeof window !== 'undefined') {
    console.warn('SDK access should only be done server-side.');
    return null;
  }
  return sdk;
}

export async function deinitialize() {
  if (typeof window !== 'undefined') {
    console.warn('SDK deinitialization should only be done server-side.');
    return;
  }
  
  if (sdk) {
    sdk = null;
    console.log('Nexus SDK deinitialized');
  }
}
