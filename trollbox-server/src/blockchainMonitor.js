import { ethers } from 'ethers';

// Configuration
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet.monad.network';
const NOMA_TOKEN_ADDRESS = process.env.NOMA_TOKEN_ADDRESS || '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'; // Replace with actual NOMA token address
const DEX_POOL_ADDRESS = process.env.DEX_POOL_ADDRESS || '0x0000000000000000000000000000000000000000'; // Replace with actual DEX pool address

// ERC20 ABI for Transfer events
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Uniswap V2 Pair ABI for Swap events
const UNISWAP_V2_PAIR_ABI = [
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
];

// Uniswap V3 Pool ABI for Swap events
const UNISWAP_V3_POOL_ABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
];

class BlockchainMonitor {
  constructor(broadcastCallback) {
    this.broadcastCallback = broadcastCallback;
    this.provider = null;
    this.nomaContract = null;
    this.dexPool = null;
    this.monitoring = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  async initialize() {
    try {
      console.log('Initializing blockchain monitor...');
      
      // Create provider with automatic reconnection
      this.provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      
      // Wait for provider to be ready
      await this.provider.getNetwork();
      console.log('Connected to Monad network');
      
      // Create contract instances
      this.nomaContract = new ethers.Contract(NOMA_TOKEN_ADDRESS, ERC20_ABI, this.provider);
      
      // Only monitor DEX pool if address is provided
      if (DEX_POOL_ADDRESS && DEX_POOL_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        this.dexPool = new ethers.Contract(DEX_POOL_ADDRESS, UNISWAP_V3_POOL_ABI, this.provider);
      }
      
      // Start monitoring
      this.startMonitoring();
      
      // Set up provider error handling
      this.provider.on('error', (error) => {
        console.error('Provider error:', error);
        this.handleProviderError();
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain monitor:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  startMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    console.log('Starting blockchain monitoring...');
    
    // Monitor NOMA transfers
    if (this.nomaContract) {
      this.nomaContract.on('Transfer', this.handleNomaTransfer.bind(this));
    }
    
    // Monitor DEX swaps
    if (this.dexPool) {
      this.dexPool.on('Swap', this.handleDexSwap.bind(this));
    }
    
    this.reconnectAttempts = 0;
  }

  stopMonitoring() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    console.log('Stopping blockchain monitoring...');
    
    // Remove all listeners
    if (this.nomaContract) {
      this.nomaContract.removeAllListeners();
    }
    if (this.dexPool) {
      this.dexPool.removeAllListeners();
    }
  }

  async handleNomaTransfer(from, to, value, event) {
    try {
      // Skip if not a significant transfer (e.g., less than 1 NOMA)
      const amount = ethers.formatEther(value);
      if (parseFloat(amount) < 1) return;
      
      // Format addresses for display
      const fromAddr = this.formatAddress(from);
      const toAddr = this.formatAddress(to);
      
      // Determine the type of transaction
      let emoji = this.getTradeEmoji(parseFloat(amount));
      
      // Create trade alert message
      const tradeAlert = {
        id: ethers.id(event.transactionHash + event.logIndex),
        type: 'tradeAlert',
        content: `${fromAddr} sent ${parseFloat(amount).toFixed(2)} NOMA to ${toAddr} ${emoji}`,
        username: 'System',
        timestamp: new Date().toISOString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
      
      // Broadcast to all connected clients
      this.broadcastCallback(tradeAlert);
      
    } catch (error) {
      console.error('Error handling NOMA transfer:', error);
    }
  }

  async handleDexSwap(sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) {
    try {
      // Determine which token is NOMA (usually token0 or token1)
      // For now, assume NOMA is token0
      const nomaAmount = ethers.formatEther(amount0 > 0 ? amount0 : -amount0);
      
      // Skip small trades
      if (parseFloat(nomaAmount) < 10) return;
      
      const senderAddr = this.formatAddress(sender);
      const action = amount0 > 0 ? 'sold' : 'bought';
      const emoji = this.getTradeEmoji(parseFloat(nomaAmount));
      
      // Create trade alert message
      const tradeAlert = {
        id: ethers.id(event.transactionHash + event.logIndex),
        type: 'tradeAlert',
        content: `${senderAddr} just ${action} ${parseFloat(nomaAmount).toFixed(2)} NOMA ${emoji}`,
        username: 'System',
        timestamp: new Date().toISOString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      };
      
      // Broadcast to all connected clients
      this.broadcastCallback(tradeAlert);
      
    } catch (error) {
      console.error('Error handling DEX swap:', error);
    }
  }

  formatAddress(address) {
    // Format as 0xAbC123...7890
    return address.slice(0, 8) + '...' + address.slice(-4);
  }

  getTradeEmoji(amount) {
    if (amount < 10) return '🐟'; // Small fish
    if (amount < 100) return '🦐'; // Shrimp
    return '🐋'; // Whale
  }

  handleProviderError() {
    console.log('Provider disconnected, attempting to reconnect...');
    this.stopMonitoring();
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Stopping blockchain monitor.');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms...`);
    
    setTimeout(() => {
      this.initialize();
    }, delay);
  }

  async getLatestBlock() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error getting latest block:', error);
      return null;
    }
  }

  async isConnected() {
    try {
      await this.provider.getNetwork();
      return true;
    } catch {
      return false;
    }
  }
}

export default BlockchainMonitor;