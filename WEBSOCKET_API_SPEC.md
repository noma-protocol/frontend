# WebSocket Server API Specification

## Connection

**Endpoint**: `ws://localhost:3001` (default)

Upon connection, the server sends:
```json
{
  "type": "connection",
  "clientId": "client-1234567890-abc123",
  "message": "Connected to event stream"
}
```

## Authentication (Required)

Before accessing any data, clients must authenticate using an Ethereum wallet signature.

### Request:
```json
{
  "type": "auth",
  "address": "0x1234...5678",
  "signature": "0xabcd...ef01",
  "message": "Sign this message to authenticate"
}
```

### Response:
```json
{
  "type": "auth",
  "success": true,
  "address": "0x1234...5678"
}
```

## Message Types

### 1. Get Global Trades
Retrieves the latest trades across all pools.

**Request:**
```json
{
  "type": "getGlobalTrades",
  "limit": 50  // Optional, defaults to 50, max 100
}
```

**Response:**
```json
{
  "type": "globalTrades",
  "trades": [
    {
      "eventName": "Swap",
      "poolAddress": "0xabcd...1234",
      "transactionHash": "0x5678...9012",
      "blockNumber": 12345678,
      "timestamp": 1704067200000,
      "args": {
        "sender": "0x1111...2222",
        "recipient": "0x3333...4444",
        "amount0": "-1000000000000000000",
        "amount1": "2000000000",
        "sqrtPriceX96": "1234567890",
        "liquidity": "9876543210",
        "tick": 12345
      },
      "tradeInfo": {
        "type": "buy",  // "buy", "sell", or "unknown"
        "amount0": "-1000000000000000000",
        "amount1": "2000000000",
        "sender": "0x1111...2222",
        "recipient": "0x3333...4444"
      }
    }
  ],
  "count": 50
}
```

### 2. Subscribe to Pools
Subscribe to real-time events from specific pools.

**Request:**
```json
{
  "type": "subscribe",
  "pools": ["0xpool1...addr", "0xpool2...addr"]
}
```

**Response:**
```json
{
  "type": "subscribed",
  "pools": ["0xpool1...addr", "0xpool2...addr"]
}
```

### 3. Get History
Retrieve historical events with filtering options.

**Request:**
```json
{
  "type": "getHistory",
  "pools": ["0xpool1...addr"],  // Optional, uses subscribed pools if not provided
  "startTime": 1704067200000,    // Optional, timestamp in milliseconds
  "endTime": 1704153600000,      // Optional, timestamp in milliseconds
  "limit": 1000                  // Optional, defaults to 1000
}
```

**Response:**
```json
{
  "type": "history",
  "events": [...],  // Array of events
  "count": 250
}
```

### 4. Get Latest Events
Get the most recent events from subscribed pools.

**Request:**
```json
{
  "type": "getLatest",
  "limit": 100  // Optional, defaults to 100
}
```

**Response:**
```json
{
  "type": "latest",
  "events": [...],  // Array of events
  "count": 100
}
```

### 5. Unsubscribe from Pools
**Request:**
```json
{
  "type": "unsubscribe",
  "pools": ["0xpool1...addr"]
}
```

**Response:**
```json
{
  "type": "unsubscribed",
  "pools": ["0xpool2...addr"]  // Remaining subscribed pools
}
```

## Real-time Events

When subscribed to pools, you'll receive real-time events:

```json
{
  "type": "event",
  "data": {
    "eventName": "Swap",
    "poolAddress": "0xabcd...1234",
    "transactionHash": "0x5678...9012",
    "blockNumber": 12345678,
    "timestamp": 1704067200000,
    "args": {
      // Event-specific arguments
    }
  }
}
```

## Error Handling

Error responses follow this format:
```json
{
  "type": "error",
  "message": "Description of the error"
}
```

Common errors:
- `"Not authenticated"` - Attempt to access data without authentication
- `"Invalid signature"` - Authentication failed
- `"Invalid message format"` - Malformed JSON or missing required fields
- `"Unknown message type: xyz"` - Unsupported message type

## Important Notes

1. **Authentication is required** for all data access
2. **BigInt values** are serialized as strings to prevent JSON parsing issues
3. **Default behavior**: If no pools are subscribed, real-time events from ALL pools are received
4. **Trade direction**: In the `tradeInfo` object:
   - `buy`: amount0 > 0 and amount1 < 0
   - `sell`: amount0 < 0 and amount1 > 0
   - `unknown`: other cases

## Example Connection Flow

```javascript
// 1. Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001');

// 2. Wait for connection confirmation
ws.onopen = () => {
  // 3. Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    address: userAddress,
    signature: signedMessage,
    message: messageToSign
  }));
};

// 4. After successful auth, request global trades
ws.send(JSON.stringify({
  type: 'getGlobalTrades',
  limit: 50
}));

// 5. Subscribe to specific pools for real-time updates
ws.send(JSON.stringify({
  type: 'subscribe',
  pools: ['0xpool1...', '0xpool2...']
}));
```