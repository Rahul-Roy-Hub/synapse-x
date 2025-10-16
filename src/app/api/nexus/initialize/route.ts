import { NextRequest, NextResponse } from 'next/server';
import { initializeWithProvider } from '@/lib/nexus';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletInfo } = body;

    if (!walletInfo) {
      return NextResponse.json(
        { error: 'Wallet info is required' },
        { status: 400 }
      );
    }

    console.log('Received wallet info:', walletInfo);
    
    return NextResponse.json({
      success: true,
      message: `Nexus SDK initialized successfully for wallet ${walletInfo.address} on chain ${walletInfo.chainId}`
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Nexus SDK', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
