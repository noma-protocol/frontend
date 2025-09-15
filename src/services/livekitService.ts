import config from '../config';

// LiveKit configuration
export const LIVEKIT_CONFIG = {
  // LiveKit Cloud URL (to be configured)
  serverUrl: config.environment === 'dev' 
    ? 'ws://localhost:7880' 
    : 'wss://your-livekit-cloud.livekit.cloud',
  
  // Token endpoint
  tokenEndpoint: `${config.API_URL}/stream/token`,
  
  // RTMP endpoints for streaming
  rtmpEndpoint: `${config.API_URL}/stream/rtmp`,
  
  // Default publish settings
  publishDefaults: {
    videoCodec: 'h264',
    videoBitrate: 1_500_000, // 1.5 Mbps
    audioBitrate: 128_000,   // 128 Kbps
    screenShareBitrate: 2_000_000, // 2 Mbps
  },
};

// Stream configuration interface
export interface StreamConfig {
  title: string;
  description?: string;
  vaultAddress: string;
  enableTikTok?: boolean;
  tiktokStreamKey?: string;
  enableAudio: boolean;
  enableVideo: boolean;
}

// Stream token response
export interface StreamTokenResponse {
  token: string;
  roomName: string;
  participantIdentity: string;
  rtmpUrls?: {
    primary?: string;
    tiktok?: string;
  };
}

// Get LiveKit access token from backend
export async function getStreamToken(
  userAddress: string,
  streamConfig: StreamConfig
): Promise<StreamTokenResponse> {
  try {
    const response = await fetch(LIVEKIT_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: userAddress,
        vault: streamConfig.vaultAddress,
        title: streamConfig.title,
        description: streamConfig.description,
        enableTikTok: streamConfig.enableTikTok,
        tiktokStreamKey: streamConfig.tiktokStreamKey,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get stream token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting stream token:', error);
    throw error;
  }
}

// Get RTMP URLs for external streaming
export async function getRTMPUrls(
  roomName: string,
  enableTikTok: boolean,
  tiktokStreamKey?: string
): Promise<{ primary: string; tiktok?: string }> {
  try {
    const response = await fetch(LIVEKIT_CONFIG.rtmpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        enableTikTok,
        tiktokStreamKey,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get RTMP URLs');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting RTMP URLs:', error);
    throw error;
  }
}

// Format stream title for URL
export function formatStreamSlug(title: string, vaultSymbol: string): string {
  return `${vaultSymbol}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// Mock implementation for development
export async function getMockStreamToken(
  userAddress: string,
  streamConfig: StreamConfig
): Promise<StreamTokenResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const roomName = formatStreamSlug(streamConfig.title, 'MOCK');
  
  return {
    token: 'mock-livekit-token-' + Date.now(),
    roomName,
    participantIdentity: userAddress.substring(0, 8),
    rtmpUrls: streamConfig.enableTikTok ? {
      primary: 'rtmp://mock.livekit.io/live/' + roomName,
      tiktok: 'rtmp://push.tiktok.com/live/' + roomName,
    } : {
      primary: 'rtmp://mock.livekit.io/live/' + roomName,
    },
  };
}