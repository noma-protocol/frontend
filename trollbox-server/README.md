# Noma Unified Server

A comprehensive WebSocket and REST API server that provides real-time chat (Trollbox), blockchain transaction monitoring, and launchpad token management.

## Features

### Trollbox Chat
- Real-time WebSocket messaging with Ethereum wallet authentication
- Username management with exponential cooldown system
- Admin commands (kick, clear auth)
- User profiles and reputation tracking
- Rate limiting and anti-spam protection
- Message persistence and history

### Transaction History
- Monitors blockchain for DEX swap events
- Stores complete transaction history with price data
- REST API for querying transactions with filters
- Trading statistics and analytics

### Launchpad Token Management
- Track token deployments from the launchpad
- Update deployment status (pending/success/failed)
- Query tokens by deployer address
- Export functionality for data analysis
- Deployment statistics

## Installation

```bash
cd trollbox-server
npm install
```

## Configuration

Environment variables:
- `PORT` - WebSocket server port (default: 9090)
- `HTTP_PORT` - REST API port (default: 9091)
- `ENABLE_BLOCKCHAIN_MONITOR` - Enable blockchain monitoring (default: false)
- `MONAD_RPC_URL` - Monad network RPC URL
- `NOMA_TOKEN_ADDRESS` - NOMA token contract address
- `DEX_POOL_ADDRESS` - DEX pool contract address

## Running the Server

```bash
# Basic start
npm start

# Development mode with watch
npm run dev

# With blockchain monitoring enabled
ENABLE_BLOCKCHAIN_MONITOR=true npm start

# With custom ports
PORT=9090 HTTP_PORT=9091 npm start
```

## REST API Endpoints

### Health Check
- `GET /api/health` - Server health status

### User Profiles
- `GET /api/profile/:address` - Get user profile data

### Transaction History
- `GET /api/transactions` - Query transactions
  - Query params:
    - `address` - Filter by sender or recipient
    - `tokenAddress` - Filter by token contract
    - `limit` - Results per page (default: 100)
    - `offset` - Pagination offset (default: 0)
    - `startTime` - Start time filter (ISO 8601)
    - `endTime` - End time filter (ISO 8601)
- `GET /api/transactions/:hash` - Get single transaction by hash
- `GET /api/stats` - Trading statistics
  - Query params:
    - `address` - Filter stats by address

### Launchpad Tokens
- `GET /api/tokens` - Get all tokens
- `GET /api/tokens/deployer/:address` - Get tokens by deployer address
- `POST /api/tokens` - Save new token deployment
  - Body: `{ tokenName, tokenSymbol, tokenSupply, price, floorPrice, deployerAddress, ... }`
- `PATCH /api/tokens/:id/status` - Update token deployment status
  - Body: `{ status: "success"|"failed", transactionHash?, contractAddress? }`
- `GET /api/tokens/export` - Export all tokens as JSON file
- `GET /api/tokens/stats` - Get deployment statistics

## WebSocket Protocol

### Authentication Flow

1. Client connects to WebSocket
2. Server sends welcome message with recent chat history
3. Client sends auth message with signed data
4. Server verifies signature and authenticates

### Message Types

#### Client to Server
```javascript
// Authenticate
{
  type: "auth",
  address: "0x...",
  signature: "0x...",
  message: "Sign this message...",
  username: "optional_username" // Only on first auth
}

// Send chat message
{
  type: "message",
  content: "Hello world!",
  replyTo: { // Optional
    id: "message-id",
    username: "User",
    content: "Previous message"
  }
}

// Change username
{
  type: "changeUsername",
  username: "NewUsername"
}

// Check authentication status
{
  type: "checkAuth",
  address: "0x..."
}

// Keep alive
{
  type: "ping"
}
```

#### Server to Client
```javascript
// Welcome message
{
  type: "welcome",
  clientId: "uuid",
  messages: [...], // Recent messages
  userCount: 42
}

// Authentication confirmed
{
  type: "authenticated",
  address: "0x...",
  username: "Username",
  canChangeUsername: true,
  cooldownRemaining: 0,
  sessionToken: "uuid"
}

// Chat message
{
  id: "uuid",
  type: "message",
  content: "Message content",
  username: "Username",
  address: "0x...",
  timestamp: "2024-01-01T00:00:00.000Z",
  verified: true,
  replyTo: {...} // If replying
}

// Trade alert (from blockchain monitor)
{
  id: "uuid",
  type: "tradeAlert",
  content: "User bought 100 NOMA 🐋",
  username: "System",
  timestamp: "2024-01-01T00:00:00.000Z",
  txHash: "0x...",
  blockNumber: 12345,
  transaction: {...} // Full transaction data
}

// User count update
{
  type: "userCount",
  count: 42
}

// Error message
{
  type: "error",
  message: "Error description"
}
```

## Chat Commands

- `/help` - Show available commands
- `/slap <username>` - Slap another user
- `/kick <username>` - Kick user from chat for 1 hour (Admin only)
- `/clearauth [username]` - Clear authentication (Admin only)

## Data Storage

All data is persisted in JSON files in the `data/` directory:
- `messages.json` - Chat message history (last 1000)
- `usernames.json` - Username bindings and cooldowns
- `profiles.json` - User profiles and reputation
- `auth.json` - Authentication credentials
- `transactions.json` - Blockchain transactions (last 10000)
- `tokens.json` - Launchpad token deployments

## Security Features

- **Signature Authentication**: All users must sign a message with their wallet
- **Rate Limiting**: 10 messages per minute per user
- **Session Management**: 30-minute session timeout
- **Username Cooldown**: Exponential cooldown for username changes (24h, 48h, 96h...)
- **Admin Controls**: Special commands for designated admin addresses
- **Anti-Spam**: Message length limits and content validation

## Blockchain Monitoring

When enabled, the server monitors the blockchain for:
- DEX swap events on the configured pool
- Transaction details including gas usage
- Price calculations from swap data

The monitor includes:
- Automatic reconnection on RPC failures
- Transaction deduplication
- Configurable polling interval
- Event filtering by transaction size

## Development

### Testing WebSocket
Open `src/test-client.html` or `src/test-auth-client.html` in a browser

### Adding New Features
1. Add data models to appropriate Store class
2. Add WebSocket message handlers in server.js
3. Add REST endpoints if needed
4. Update this README

### Admin Setup
Add admin addresses to the `ADMIN_ADDRESSES` array in server.js

## Production Considerations

- Use environment variables for sensitive configuration
- Set up proper CORS policies for your domain
- Use HTTPS/WSS in production
- Consider using a database instead of JSON files for scale
- Implement proper logging and monitoring
- Set up rate limiting at the reverse proxy level
- Regular backups of the data directory