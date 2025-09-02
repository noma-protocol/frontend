import { ethers } from 'ethers';

// Configuration
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || 'https://rpc.ankr.com/monad_testnet';
const NOMA_TOKEN_ADDRESS = process.env.NOMA_TOKEN_ADDRESS || '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'; // Replace with actual NOMA token address
const DEX_POOL_ADDRESS = process.env.DEX_POOL_ADDRESS || '0xBb7EfF3E685c6564F2F09DD90b6C05754E3BDAC0'; // Replace with actual DEX pool address

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
  constructor(broadcastCallback, transactionStore = null, referralStore = null) {
    this.broadcastCallback = broadcastCallback;
    this.transactionStore = transactionStore;
    this.referralStore = referralStore;
    this.provider = null;
    this.nomaContract = null;
    this.dexPool = null;
    this.monitoring = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
    this.pollingInterval = 10000; // 10 seconds
    this.lastProcessedBlock = null;
    this.pollingTimer = null;
    this.processedTxHashes = new Set(); // Track processed transactions
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

  async startMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    console.log('Starting blockchain monitoring with polling...');
    
    // Get current block number
    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (!this.lastProcessedBlock) {
        // Start monitoring from 10 blocks ago to catch recent events
        this.lastProcessedBlock = Math.max(0, currentBlock - 10);
      }
      console.log(`Starting monitoring from block ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error('Error getting current block:', error);
      this.handleProviderError();
      return;
    }
    
    // Start polling for new events
    this.pollForEvents();
    
    this.reconnectAttempts = 0;
  }

  stopMonitoring() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    console.log('Stopping blockchain monitoring...');
    
    // Clear polling timer
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  async pollForEvents() {
    if (!this.monitoring) return;
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock > this.lastProcessedBlock) {
        // Process events from lastProcessedBlock + 1 to currentBlock
        await this.processBlockRange(this.lastProcessedBlock + 1, currentBlock);
        this.lastProcessedBlock = currentBlock;
      }
      
      // Schedule next poll
      this.pollingTimer = setTimeout(() => {
        this.pollForEvents();
      }, this.pollingInterval);
      
    } catch (error) {
      console.error('Error in polling cycle:', error);
      
      // Retry after a delay
      this.pollingTimer = setTimeout(() => {
        this.pollForEvents();
      }, this.pollingInterval * 2);
    }
  }

  async processBlockRange(fromBlock, toBlock) {
    console.log(`Processing blocks ${fromBlock} to ${toBlock}`);
    
    // Process NOMA transfers
    if (this.nomaContract) {
      await this.processNomaTransfers(fromBlock, toBlock);
    }
    
    // Process DEX swaps
    if (this.dexPool) {
      await this.processDexSwaps(fromBlock, toBlock);
    }
  }

  async processNomaTransfers(fromBlock, toBlock) {
    try {
      // Create filter for Transfer events
      const transferFilter = {
        address: NOMA_TOKEN_ADDRESS,
        topics: [ethers.id('Transfer(address,address,uint256)')],
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16)
      };
      
      const logs = await this.provider.getLogs(transferFilter);
      console.log(`Found ${logs.length} NOMA transfer events in blocks ${fromBlock}-${toBlock}`);
      
      for (const log of logs) {
        // Skip if already processed
        if (this.processedTxHashes.has(log.transactionHash)) continue;
        
        try {
          // Parse the log
          const parsedLog = this.nomaContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (!parsedLog || parsedLog.name !== 'Transfer') continue;
          
          // Process the transfer
          await this.handleNomaTransfer(
            parsedLog.args.from || parsedLog.args[0],
            parsedLog.args.to || parsedLog.args[1],
            parsedLog.args.value || parsedLog.args[2],
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex
            }
          );
          
          // Mark as processed
          this.processedTxHashes.add(log.transactionHash);
          
          // Clean up old tx hashes (keep last 1000)
          if (this.processedTxHashes.size > 1000) {
            const hashes = Array.from(this.processedTxHashes);
            this.processedTxHashes = new Set(hashes.slice(-1000));
          }
        } catch (logError) {
          console.error('Error parsing transfer log:', logError, log);
        }
      }
    } catch (error) {
      console.error('Error processing NOMA transfers:', error);
    }
  }

  async processDexSwaps(fromBlock, toBlock) {
    try {
      // Create filter for Swap events (Uniswap V3)
      const swapFilter = {
        address: DEX_POOL_ADDRESS,
        topics: [ethers.id('Swap(address,address,int256,int256,uint160,uint128,int24)')],
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16)
      };
      
      const logs = await this.provider.getLogs(swapFilter);
      console.log(`Found ${logs.length} DEX swap events in blocks ${fromBlock}-${toBlock}`);
      
      for (const log of logs) {
        // Skip if already processed
        if (this.processedTxHashes.has(log.transactionHash)) continue;
        
        try {
          // Parse the log
          const parsedLog = this.dexPool.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (!parsedLog || parsedLog.name !== 'Swap') continue;
          
          // Process the swap
          await this.handleDexSwap(
            parsedLog.args.sender || parsedLog.args[0],
            parsedLog.args.recipient || parsedLog.args[1],
            parsedLog.args.amount0 || parsedLog.args[2],
            parsedLog.args.amount1 || parsedLog.args[3],
            parsedLog.args.sqrtPriceX96 || parsedLog.args[4],
            parsedLog.args.liquidity || parsedLog.args[5],
            parsedLog.args.tick || parsedLog.args[6],
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex
            }
          );
          
          // Mark as processed
          this.processedTxHashes.add(log.transactionHash);
        } catch (logError) {
          console.error('Error parsing swap log:', logError, log);
        }
      }
    } catch (error) {
      console.error('Error processing DEX swaps:', error);
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
      
      // Broadcasting disabled - only store transactions
      // this.broadcastCallback(tradeAlert);
      
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
      const action = amount0 > 0 ? 'sell' : 'buy';
      const emoji = this.getTradeEmoji(parseFloat(nomaAmount));
      
      // Get transaction receipt for more details
      let gasUsed = null;
      let effectiveGasPrice = null;
      try {
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
        if (receipt) {
          gasUsed = receipt.gasUsed.toString();
          effectiveGasPrice = receipt.effectiveGasPrice?.toString();
        }
      } catch (err) {
        console.error('Error fetching transaction receipt:', err);
      }

      // Calculate price from sqrtPriceX96
      // sqrtPriceX96 = sqrt(price) * 2^96
      const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
      const price = sqrtPrice * sqrtPrice;
      
      // Calculate USD value (assuming token1 is USD-pegged)
      const usdAmount = parseFloat(nomaAmount) * price;
      
      // Create transaction record
      const transaction = {
        hash: event.transactionHash,
        type: action,
        sender: sender,
        recipient: recipient,
        amount: nomaAmount,
        amountRaw: (amount0 > 0 ? amount0 : -amount0).toString(),
        price: price,
        amountUSD: usdAmount.toFixed(2),
        tokenAddress: NOMA_TOKEN_ADDRESS,
        tokenSymbol: 'NOMA',
        poolAddress: DEX_POOL_ADDRESS,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        gasUsed: gasUsed,
        effectiveGasPrice: effectiveGasPrice,
        timestamp: new Date().toISOString()
      };
      
      // Store transaction in database
      if (this.transactionStore) {
        this.transactionStore.addTransaction(transaction);
      }
      
      // Track referral volume if applicable
      if (this.referralStore) {
        await this.trackReferralVolume(transaction);
      }
      
      // Create trade alert message
      const tradeAlert = {
        id: ethers.id(event.transactionHash + event.logIndex),
        type: 'tradeAlert',
        content: `${senderAddr} just ${action === 'buy' ? 'bought' : 'sold'} ${parseFloat(nomaAmount).toFixed(2)} NOMA ${emoji}`,
        username: 'System',
        timestamp: transaction.timestamp,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        transaction: transaction // Include full transaction data
      };
      
      // Broadcasting disabled - only store transactions
      // this.broadcastCallback(tradeAlert);
      
    } catch (error) {
      console.error('Error handling DEX swap:', error);
    }
  }

  async trackReferralVolume(transaction) {
    try {
      // Get the trader address (sender for sells, recipient for buys)
      const traderAddress = transaction.type === 'sell' ? transaction.sender : transaction.recipient;
      
      // Check if this trader was referred
      const normalizedAddress = traderAddress.toLowerCase();
      let referralInfo = null;
      
      // Search through all referrals to find if user was referred
      Object.keys(this.referralStore.referrals).forEach(key => {
        const referredUsers = this.referralStore.referrals[key] || [];
        if (referredUsers.includes(normalizedAddress)) {
          const [code, referrerAddress] = key.split(':');
          referralInfo = {
            referralCode: code,
            referrerAddress,
            referredAddress: traderAddress
          };
        }
      });
      
      if (referralInfo) {
        // Track the trade volume for this referral
        const tradeData = {
          userAddress: traderAddress,
          referralCode: referralInfo.referralCode,
          referrerAddress: referralInfo.referrerAddress,
          type: transaction.type,
          tokenAddress: transaction.tokenAddress,
          tokenName: 'NOMA',
          tokenSymbol: transaction.tokenSymbol,
          volumeETH: transaction.amount,
          volumeUSD: transaction.amountUSD,
          txHash: transaction.hash,
          timestamp: Date.now()
        };
        
        // Add trade to referral store
        this.referralStore.trackTrade(tradeData);
        
        console.log(`Tracked referral trade: ${traderAddress} ${transaction.type} ${transaction.amount} NOMA (referrer: ${referralInfo.referrerAddress})`);
      }
    } catch (error) {
      console.error('Error tracking referral volume:', error);
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