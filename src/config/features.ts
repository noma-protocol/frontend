// Feature flags for gradual migration
export const features = {
  // Enable new WebSocket infrastructure
  useNewWebSocket: import.meta.env.VITE_USE_NEW_WEBSOCKET === 'true' || true, // Default to true
  
  // Enable new referral API
  useNewReferralApi: import.meta.env.VITE_USE_NEW_REFERRAL_API === 'true' || true, // Default to true
  
  // WebSocket endpoints
  websocket: {
    url: (import.meta.env.VITE_WSS_URL as string) || 'ws://localhost:8080',
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  },
  
  // Referral API endpoint
  referralApi: {
    url: (import.meta.env.VITE_REFERRAL_API_URL as string) || 'http://localhost:3004',
  },
  
  // Pool addresses
  pools: {
    'BUN/WMON': '0x90666407c841fe58358F3ed04a245c5F5bd6fD0A',
    'AVO/WMON': '0x8Eb5C457F7a29554536Dc964B3FaDA2961Dd8212',
  },
  
  // Trade history settings
  tradeHistory: {
    maxEventsInMemory: 1000,
    defaultTimeRange: '24h',
    defaultLimit: 50,
  },
};