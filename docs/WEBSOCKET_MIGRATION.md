# WebSocket Infrastructure Migration Guide

## Overview

This guide explains how to migrate from the existing trade monitoring system to the new WebSocket infrastructure that provides real-time blockchain event streaming with improved performance and reliability.

## Key Features of New Infrastructure

1. **Authenticated WebSocket connections** with wallet signature verification
2. **Real-time event streaming** for Swap, Mint, Burn, Collect, and Flash events
3. **Pool-specific subscriptions** to monitor only relevant pools
4. **Historical data access** with time-range queries
5. **Improved referral system** with pool-specific tracking
6. **Rate limiting and reconnection logic** for reliability

## Migration Steps

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# New WebSocket Infrastructure
REACT_APP_WSS_URL=ws://localhost:8080
REACT_APP_REFERRAL_API_URL=http://localhost:3004
```

### 2. Using the WebSocket Service

#### Basic Connection

```typescript
import { useBlockchainWebSocket } from '../hooks/useBlockchainWebSocket';

function MyComponent() {
  const {
    isConnected,
    isAuthenticated,
    events,
    error,
    connect,
    disconnect,
    authenticate,
    subscribe,
    getHistory
  } = useBlockchainWebSocket({
    autoConnect: true,
    autoAuthenticate: true,
    pools: ['0x90666407c841fe58358F3ed04a245c5F5bd6fD0A'] // BUN/WMON pool
  });

  // Events will be automatically streamed to the 'events' array
}
```

#### Manual Authentication

```typescript
const handleAuth = async () => {
  try {
    const success = await authenticate();
    if (success) {
      console.log('Authentication successful');
    }
  } catch (error) {
    console.error('Authentication failed:', error);
  }
};
```

#### Fetching Historical Data

```typescript
const fetchHistory = async () => {
  const now = Date.now() / 1000;
  const oneDayAgo = now - 86400;
  
  const history = await getHistory(
    ['0x90666407c841fe58358F3ed04a245c5F5bd6fD0A'], // pools
    oneDayAgo, // start time
    now,       // end time
    1000       // limit
  );
};
```

### 3. Using the Trade History Component

```typescript
import TradeHistory from '../components/TradeHistory';

// Show all pools with real-time updates
<TradeHistory 
  poolFilter="all"
  showRealtime={true}
  limit={50}
/>

// Show only BUN/WMON trades
<TradeHistory 
  poolFilter="BUN/WMON"
  showRealtime={true}
  limit={30}
/>
```

### 4. Migrating Referral API Calls

Replace old referral API calls with the new V2 API:

```typescript
// Old way
import { referralApi } from '../services/referralApi';

// New way
import { referralApiV2 } from '../services/referralApiV2';

// Get referral statistics
const stats = await referralApiV2.getReferralStats(address, poolAddress);

// Register a referral
await referralApiV2.registerReferral({
  referralCode: 'ABC123',
  referredAddress: userAddress,
  poolAddress: poolAddress
});

// Track a trade
await referralApiV2.trackTrade({
  userAddress,
  poolAddress,
  type: 'buy',
  tokenAddress,
  tokenName,
  tokenSymbol,
  volumeETH,
  volumeUSD,
  txHash
});
```

### 5. Feature Flags

Use feature flags for gradual migration:

```typescript
import { features } from '../config/features';

if (features.useNewWebSocket) {
  // Use new WebSocket infrastructure
} else {
  // Use legacy system
}
```

## Pool Addresses

The system currently monitors these pools:

- **BUN/WMON**: `0x90666407c841fe58358F3ed04a245c5F5bd6fD0A` (Uniswap V3, 0.3% fee)
- **AVO/WMON**: `0x8Eb5C457F7a29554536Dc964B3FaDA2961Dd8212` (PancakeSwap V3, 0.25% fee)

## Testing

1. Start the WebSocket server: `cd ../../wss && npm start`
2. Access the demo page at `/websocket-demo`
3. Connect your wallet and authenticate
4. View real-time trades and referral statistics

## Common Issues

### Authentication Failed
- Ensure MetaMask is connected
- Check that the signature message hasn't expired (5-minute window)
- Verify the WebSocket server is running

### No Events Received
- Confirm authentication was successful
- Check you're subscribed to the correct pools
- Verify the blockchain monitor is running

### Connection Drops
- The service automatically reconnects with exponential backoff
- Maximum 5 reconnection attempts
- Check network stability

## Benefits of Migration

1. **Real-time Updates**: No more polling, events stream instantly
2. **Lower Latency**: Direct WebSocket connection vs HTTP polling
3. **Better Performance**: Reduced server load and bandwidth usage
4. **Pool-Specific Data**: Subscribe only to pools you care about
5. **Historical Access**: Query past events without full blockchain scans
6. **Improved Reliability**: Automatic reconnection and error handling

## Rollback Plan

If issues arise, you can rollback by:

1. Setting feature flags to false in `src/config/features.ts`
2. Reverting to the original referral API imports
3. Removing WebSocket-related components

The old and new systems can run in parallel during migration.