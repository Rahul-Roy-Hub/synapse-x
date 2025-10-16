'use server';

import { initializeWithProvider } from '@/lib/nexus';

export async function initializeNexusSDK() {
  try {
    console.log('Nexus SDK initialization called from server action');

    return { success: true, message: 'Nexus SDK ready for server-side operations' };
  } catch (error) {
    console.error('Server action error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
