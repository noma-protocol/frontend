# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Project Architecture

### Overview
Oikos Frontend is a React-based application for the Oikos Protocol, available at https://exchange.oikos.cash. It's a decentralized finance (DeFi) platform built with React, TypeScript, and Vite that interfaces with Monad blockchain.

### Technology Stack
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Libraries**: Chakra UI, Framer Motion
- **Web3 Integration**: wagmi, ethers.js, viem
- **Routing**: react-router-dom
- **Data Visualization**: ApexCharts, Chart.js, visx

### Core Components

#### Blockchain Integration
- The application connects to the Monad blockchain (testnet) via Web3Modal/WagmiConfig
- Smart contract interactions are handled through useContractRead and useContractWrite hooks
- The app uses ethers.js for blockchain communication
- Chain configuration is in `src/chains/monad.ts`

#### Application Structure
- **App.tsx**: Main application component with web3 provider setup
- **main.tsx**: Application entry point with router configuration
- **Pages**: Exchange, Liquidity, Markets, Presale, Launchpad, Borrow, Stake
- **Components**: Organized by functionality (UI, trade controls, price visualization, etc.)

#### Key Features
- Token exchange/trading interface
- Liquidity provision and management
- Price data visualization
- AMM (Automated Market Maker) interface
- Wallet connection with Web3Modal

#### Data Flow
- Blockchain data is fetched using ethers.js providers and contracts
- The application uses React hooks for state management
- Regular polling is used to keep on-chain data updated
- Transactions are executed via contract write functions

### Important Utility Functions
The `utils.tsx` file contains several important functions:
- `commify` and variants: Format numbers with appropriate commas and decimals
- `getContractAddress`: Retrieve contract addresses from deployment configurations
- `tickToPrice`: Convert Uniswap V3 ticks to prices
- `calculateLoanFees`: Calculate fees for borrowing
- `formatNumberPrecise`: Format numbers with appropriate precision and suffixes

### Contract Integration
- The app interacts with various smart contracts including:
  - NomaFactory: For accessing protocol vaults
  - Uniswap V3 pools: For pricing and liquidity data
  - ERC20 tokens: For balances and allowances
  - Custom vault contracts: For protocol-specific functionality