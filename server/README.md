# Noma Launchpad Server

Express API server for persisting token deployment data from the Noma Launchpad.

## Installation

```bash
cd server
npm install
```

## Running the server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)

## API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Token Operations
- `GET /api/tokens` - Get all tokens
- `GET /api/tokens/deployer/:address` - Get tokens by deployer address
- `POST /api/tokens` - Save new token data
- `PATCH /api/tokens/:id/status` - Update token deployment status
- `GET /api/tokens/export` - Export all tokens as JSON file
- `GET /api/tokens/stats` - Get deployment statistics

## Data Storage

Token data is stored in `src/tokens.json` file. The file is created automatically on first run.

## CORS

CORS is enabled to allow requests from the frontend application.