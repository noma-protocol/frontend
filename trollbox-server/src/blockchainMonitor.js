import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || 'https://rpc.ankr.com/monad_testnet';
const NOMA_TOKEN_ADDRESS = process.env.NOMA_TOKEN_ADDRESS || '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'; // Replace with actual NOMA token address
const DEX_POOL_ADDRESS = process.env.DEX_POOL_ADDRESS || '0xBb7EfF3E685c6564F2F09DD90b6C05754E3BDAC0'; // Replace with actual DEX pool address
const EXCHANGE_HELPER_ADDRESS = process.env.EXCHANGE_HELPER_ADDRESS || '0xf1F3b64305E5cC19a949e256f029AfBDbf63e15e';

// Load pools configuration
const poolsConfigPath = path.join(__dirname, '../data/pools.json');
let poolsConfig = { pools: [] };
try {
  const poolsData = fs.readFileSync(poolsConfigPath, 'utf8');
  poolsConfig = JSON.parse(poolsData);
  console.log(`Loaded ${poolsConfig.pools.length} pools from pools.json`);
} catch (error) {
  console.error('Error loading pools.json:', error);
  // Fall back to environment variable pool if pools.json not found
  if (DEX_POOL_ADDRESS && DEX_POOL_ADDRESS !== '0x0000000000000000000000000000000000000000') {
    poolsConfig = {
      pools: [{
        name: 'Default Pool',
        address: DEX_POOL_ADDRESS,
        protocol: 'uniswap',
        version: 'v3',
        enabled: true
      }]
    };
  }
}

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

// ExchangeHelper ABI for trade events
const EXCHANGE_HELPER_ABI = [
  'event BoughtTokensETH(address who, uint256 amount)',
  'event BoughtTokensWETH(address who, uint256 amount)',
  'event SoldTokensETH(address who, uint256 amount)',
  'event SoldTokensWETH(address who, uint256 amount)'
];

class BlockchainMonitor {
  constructor(broadcastCallback, transactionStore = null, referralStore = null) {
    this.broadcastCallback = broadcastCallback;
    this.transactionStore = transactionStore;
    this.referralStore = referralStore;
    this.provider = null;
    this.nomaContract = null;
    this.dexPools = new Map(); // Map of pool address -> contract instance
    this.poolsConfig = poolsConfig; // Store pools configuration
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
      console.log('=== BLOCKCHAIN MONITOR INITIALIZATION ===');
      console.log('RPC URL:', MONAD_RPC_URL);
      console.log('NOMA Token Address:', NOMA_TOKEN_ADDRESS);
      console.log('ExchangeHelper Address:', EXCHANGE_HELPER_ADDRESS);
      console.log('Has Referral Store:', !!this.referralStore);
      console.log('Has Transaction Store:', !!this.transactionStore);
      console.log('Number of pools to monitor:', this.poolsConfig.pools.length);
      
      // Create provider with automatic reconnection
      this.provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
      
      // Wait for provider to be ready
      const network = await this.provider.getNetwork();
      console.log('Connected to network:', network.name, 'chainId:', network.chainId);
      
      // Create contract instances
      this.nomaContract = new ethers.Contract(NOMA_TOKEN_ADDRESS, ERC20_ABI, this.provider);
      
      // Create ExchangeHelper contract for monitoring trades
      if (EXCHANGE_HELPER_ADDRESS && EXCHANGE_HELPER_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        this.exchangeHelper = new ethers.Contract(EXCHANGE_HELPER_ADDRESS, EXCHANGE_HELPER_ABI, this.provider);
        console.log('ExchangeHelper contract created');
      }
      
      // Create contracts for all enabled pools
      for (const pool of this.poolsConfig.pools) {
        if (pool.enabled && pool.address && pool.address !== '0x0000000000000000000000000000000000000000') {
          // Select appropriate ABI based on pool version
          const poolABI = pool.version === 'v3' ? UNISWAP_V3_POOL_ABI : UNISWAP_V2_PAIR_ABI;
          const poolContract = new ethers.Contract(pool.address, poolABI, this.provider);
          this.dexPools.set(pool.address, {
            contract: poolContract,
            config: pool
          });
          console.log(`Created contract for pool ${pool.name} at ${pool.address} (${pool.protocol} ${pool.version})`);
        }
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
      console.log(`[POLL] Current block: ${currentBlock}, Last processed: ${this.lastProcessedBlock}`);
      
      if (currentBlock > this.lastProcessedBlock) {
        console.log(`[POLL] Processing blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);
        // Process events from lastProcessedBlock + 1 to currentBlock
        await this.processBlockRange(this.lastProcessedBlock + 1, currentBlock);
        this.lastProcessedBlock = currentBlock;
      } else {
        console.log('[POLL] No new blocks to process');
      }
      
      // Schedule next poll
      this.pollingTimer = setTimeout(() => {
        this.pollForEvents();
      }, this.pollingInterval);
      
    } catch (error) {
      console.error('[POLL ERROR] Error in polling cycle:', error);
      
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
    
    // Process DEX swaps for all pools
    if (this.dexPools.size > 0) {
      await this.processDexSwaps(fromBlock, toBlock);
    }
    
    // Process ExchangeHelper trades
    if (this.exchangeHelper) {
      await this.processExchangeHelperTrades(fromBlock, toBlock);
    }
  }

  async processNomaTransfers(fromBlock, toBlock) {
    try {
      console.log('[NOMA TRANSFERS] Disabled - only tracking DEX trades through ExchangeHelper');
      return; // Disable transfer tracking - only track actual trades
      
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
      console.log(`[DEX SWAPS] Processing swaps for ${this.dexPools.size} pools`);
      
      // Process each pool
      for (const [poolAddress, poolData] of this.dexPools) {
        try {
          console.log(`[DEX SWAPS] Searching for swaps in pool: ${poolData.config.name} (${poolAddress})`);
          
          // Select appropriate event signature based on pool version
          let eventSignature;
          if (poolData.config.version === 'v3') {
            eventSignature = 'Swap(address,address,int256,int256,uint160,uint128,int24)';
          } else {
            eventSignature = 'Swap(address,uint256,uint256,uint256,uint256,address)';
          }
          
          // Create filter for Swap events
          const swapFilter = {
            address: poolAddress,
            topics: [ethers.id(eventSignature)],
            fromBlock: '0x' + fromBlock.toString(16),
            toBlock: '0x' + toBlock.toString(16)
          };
          
          console.log(`[DEX SWAPS] Filter for ${poolData.config.name}:`, JSON.stringify(swapFilter, null, 2));
          const logs = await this.provider.getLogs(swapFilter);
          console.log(`[DEX SWAPS] Found ${logs.length} swap events in ${poolData.config.name} for blocks ${fromBlock}-${toBlock}`);
          
          for (const log of logs) {
            // Skip if already processed
            if (this.processedTxHashes.has(log.transactionHash)) continue;
            
            try {
              // Parse the log
              const parsedLog = poolData.contract.interface.parseLog({
                topics: log.topics,
                data: log.data
              });
              
              if (!parsedLog || parsedLog.name !== 'Swap') continue;
              
              // Process the swap based on pool version
              if (poolData.config.version === 'v3') {
                await this.handleDexSwapV3(
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
                    logIndex: log.logIndex,
                    poolAddress: poolAddress,
                    poolConfig: poolData.config
                  }
                );
              } else {
                // Handle V2 swaps
                await this.handleDexSwapV2(
                  parsedLog.args.sender || parsedLog.args[0],
                  parsedLog.args.amount0In || parsedLog.args[1],
                  parsedLog.args.amount1In || parsedLog.args[2],
                  parsedLog.args.amount0Out || parsedLog.args[3],
                  parsedLog.args.amount1Out || parsedLog.args[4],
                  parsedLog.args.to || parsedLog.args[5],
                  {
                    transactionHash: log.transactionHash,
                    blockNumber: log.blockNumber,
                    logIndex: log.logIndex,
                    poolAddress: poolAddress,
                    poolConfig: poolData.config
                  }
                );
              }
              
              // Mark as processed
              this.processedTxHashes.add(log.transactionHash);
            } catch (logError) {
              console.error(`Error parsing swap log for ${poolData.config.name}:`, logError, log);
            }
          }
        } catch (poolError) {
          console.error(`Error processing pool ${poolData.config.name}:`, poolError);
        }
      }
    } catch (error) {
      console.error('Error processing DEX swaps:', error);
    }
  }

  async processExchangeHelperTrades(fromBlock, toBlock) {
    try {
      console.log(`[EXCHANGE HELPER] Searching for trades in ExchangeHelper: ${EXCHANGE_HELPER_ADDRESS}`);
      
      // Create filters for all ExchangeHelper events
      const eventTopics = [
        ethers.id('BoughtTokensETH(address,uint256)'),
        ethers.id('BoughtTokensWETH(address,uint256)'),
        ethers.id('SoldTokensETH(address,uint256)'),
        ethers.id('SoldTokensWETH(address,uint256)')
      ];
      
      let allLogs = [];
      
      // Query each event type separately
      for (const topic of eventTopics) {
        const filter = {
          address: EXCHANGE_HELPER_ADDRESS,
          topics: [topic],
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + toBlock.toString(16)
        };
        
        console.log('[EXCHANGE HELPER] Searching for event:', topic.substring(0, 20) + '...');
        const logs = await this.provider.getLogs(filter);
        console.log(`[EXCHANGE HELPER] Found ${logs.length} events`);
        allLogs = allLogs.concat(logs);
      }
      
      console.log(`[EXCHANGE HELPER] Total found ${allLogs.length} trade events`);
      
      for (const log of allLogs) {
        // Skip if already processed
        if (this.processedTxHashes.has(log.transactionHash)) continue;
        
        try {
          // Parse the log
          const parsedLog = this.exchangeHelper.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (!parsedLog) continue;
          
          // Process the trade
          await this.handleExchangeHelperTrade(
            parsedLog.name,
            parsedLog.args.who || parsedLog.args[0],
            parsedLog.args.amount || parsedLog.args[1],
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex
            }
          );
          
          // Mark as processed
          this.processedTxHashes.add(log.transactionHash);
        } catch (logError) {
          console.error('[EXCHANGE HELPER] Error parsing trade log:', logError, log);
        }
      }
    } catch (error) {
      console.error('[EXCHANGE HELPER] Error processing trades:', error);
    }
  }

  async handleNomaTransfer(from, to, value, event) {
    try {
      // Skip if not a significant transfer (e.g., less than 1 NOMA)
      const amount = ethers.formatEther(value);
      if (parseFloat(amount) < 1) return;
      
      // Check if this is a trade with the DEX pool
      const isDexTrade = (from.toLowerCase() === DEX_POOL_ADDRESS.toLowerCase() || 
                         to.toLowerCase() === DEX_POOL_ADDRESS.toLowerCase());
      
      if (isDexTrade && this.referralStore) {
        // Determine trade type and trader address
        const isSell = to.toLowerCase() === DEX_POOL_ADDRESS.toLowerCase();
        const traderAddress = isSell ? from : to;
        const tradeType = isSell ? 'sell' : 'buy';
        
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
        
        // Create transaction record for referral tracking
        const transaction = {
          hash: event.transactionHash,
          type: tradeType,
          sender: from,
          recipient: to,
          amount: amount,
          amountRaw: value.toString(),
          price: 0, // Price would need to be calculated from pool state
          amountUSD: '0', // Would need price oracle
          tokenAddress: NOMA_TOKEN_ADDRESS,
          tokenSymbol: 'NOMA',
          poolAddress: DEX_POOL_ADDRESS,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex,
          gasUsed: gasUsed,
          effectiveGasPrice: effectiveGasPrice,
          timestamp: new Date().toISOString()
        };
        
        // Store transaction
        if (this.transactionStore) {
          this.transactionStore.addTransaction(transaction);
        }
        
        // Track referral volume
        await this.trackReferralVolume(transaction);
      }
      
      // Format addresses for display
      const fromAddr = this.formatAddress(from);
      const toAddr = this.formatAddress(to);
      
      // Determine the type of transaction
      let emoji = this.getTradeEmoji(parseFloat(amount));
      
      // Disable trade alerts for simple transfers - only track actual DEX trades
      /*
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
      */
      
    } catch (error) {
      console.error('Error handling NOMA transfer:', error);
    }
  }

  async handleDexSwapV3(sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) {
    try {
      const poolConfig = event.poolConfig;
      console.log('[HANDLE SWAP V3] Processing swap event:', {
        pool: poolConfig.name,
        sender,
        recipient,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        txHash: event.transactionHash
      });
      
      // Determine which token is NOMA based on pool configuration
      let nomaAmount, isToken0NOMA;
      if (poolConfig.token0.address.toLowerCase() === NOMA_TOKEN_ADDRESS.toLowerCase()) {
        nomaAmount = ethers.formatEther(amount0 > 0 ? amount0 : -amount0);
        isToken0NOMA = true;
      } else if (poolConfig.token1.address.toLowerCase() === NOMA_TOKEN_ADDRESS.toLowerCase()) {
        nomaAmount = ethers.formatEther(amount1 > 0 ? amount1 : -amount1);
        isToken0NOMA = false;
      } else {
        console.log('[HANDLE SWAP V3] Neither token is NOMA, skipping');
        return;
      }
      console.log(`[HANDLE SWAP V3] NOMA amount: ${nomaAmount} (isToken0: ${isToken0NOMA})`);
      
      // Skip small trades
      if (parseFloat(nomaAmount) < 10) {
        console.log('[HANDLE SWAP] Skipping small trade (< 10 NOMA)');
        return;
      }
      
      // Get the actual transaction to find the real trader address
      const tx = await this.provider.getTransaction(event.transactionHash);
      if (!tx) {
        console.error('[HANDLE SWAP] Could not fetch transaction:', event.transactionHash);
        return;
      }
      
      // The actual trader is tx.from (the account that initiated the transaction)
      const traderAddress = tx.from;
      const action = isToken0NOMA ? (amount0 > 0 ? 'sell' : 'buy') : (amount1 > 0 ? 'sell' : 'buy');
      const emoji = this.getTradeEmoji(parseFloat(nomaAmount));
      
      console.log(`[HANDLE SWAP V3] DEX Swap detected on ${poolConfig.name}: ${traderAddress} ${action} ${nomaAmount} NOMA (tx: ${event.transactionHash})`);
      
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
      
      // Create transaction record with actual trader address
      const transaction = {
        hash: event.transactionHash,
        type: action,
        sender: action === 'sell' ? traderAddress : event.poolAddress,
        recipient: action === 'buy' ? traderAddress : event.poolAddress,
        traderAddress: traderAddress, // Store the actual trader for referral tracking
        routerSender: sender, // Original sender from event (router)
        routerRecipient: recipient, // Original recipient from event (router)
        amount: nomaAmount,
        amountRaw: (isToken0NOMA ? (amount0 > 0 ? amount0 : -amount0) : (amount1 > 0 ? amount1 : -amount1)).toString(),
        price: price,
        amountUSD: usdAmount.toFixed(2),
        tokenAddress: NOMA_TOKEN_ADDRESS,
        tokenSymbol: 'NOMA',
        poolAddress: event.poolAddress,
        poolName: poolConfig.name,
        protocol: poolConfig.protocol,
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
      
      // Create trade alert message with actual trader address
      const traderAddr = this.formatAddress(traderAddress);
      const tradeAlert = {
        id: ethers.id(event.transactionHash + event.logIndex),
        type: 'tradeAlert',
        content: `${traderAddr} just ${action === 'buy' ? 'bought' : 'sold'} ${parseFloat(nomaAmount).toFixed(2)} NOMA ${emoji}`,
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
      console.log('[REFERRAL] Tracking referral volume for transaction:', {
        type: transaction.type,
        traderAddress: transaction.traderAddress,
        sender: transaction.sender,
        recipient: transaction.recipient,
        volumeUSD: transaction.volumeUSD,
        txHash: transaction.hash
      });
      
      // Get the trader address - use the actual trader address we stored
      const traderAddress = transaction.traderAddress || (transaction.type === 'sell' ? transaction.sender : transaction.recipient);
      console.log('[REFERRAL] Trader address:', traderAddress);
      
      // Check if this trader was referred
      const normalizedAddress = traderAddress.toLowerCase();
      console.log('[REFERRAL] Checking referral data for:', normalizedAddress);
      console.log('[REFERRAL] Available referred users:', Object.keys(this.referralStore.referrals.referred_users || {}));
      
      let referralInfo = null;
      
      // Check if user was referred using new structure
      const referredUserData = this.referralStore.referrals.referred_users[normalizedAddress];
      if (referredUserData) {
        referralInfo = {
          referralCode: referredUserData.referralCode,
          referrerAddress: referredUserData.referrer,
          referredAddress: traderAddress
        };
        console.log('[REFERRAL] Found referral info:', referralInfo);
      } else {
        console.log('[REFERRAL] No referral info found for trader');
      }
      
      if (referralInfo) {
        console.log('[REFERRAL] Tracking trade for referral code:', referralInfo.referralCode);
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

  async handleDexSwapV2(sender, amount0In, amount1In, amount0Out, amount1Out, to, event) {
    try {
      const poolConfig = event.poolConfig;
      console.log('[HANDLE SWAP V2] Processing swap event:', {
        pool: poolConfig.name,
        sender,
        to,
        amount0In: amount0In.toString(),
        amount1In: amount1In.toString(),
        amount0Out: amount0Out.toString(),
        amount1Out: amount1Out.toString(),
        txHash: event.transactionHash
      });
      
      // Determine which token is NOMA and the trade direction
      let nomaAmount, action, isToken0NOMA;
      if (poolConfig.token0.address.toLowerCase() === NOMA_TOKEN_ADDRESS.toLowerCase()) {
        isToken0NOMA = true;
        if (amount0In > 0) {
          // Selling NOMA
          nomaAmount = ethers.formatEther(amount0In);
          action = 'sell';
        } else {
          // Buying NOMA
          nomaAmount = ethers.formatEther(amount0Out);
          action = 'buy';
        }
      } else if (poolConfig.token1.address.toLowerCase() === NOMA_TOKEN_ADDRESS.toLowerCase()) {
        isToken0NOMA = false;
        if (amount1In > 0) {
          // Selling NOMA
          nomaAmount = ethers.formatEther(amount1In);
          action = 'sell';
        } else {
          // Buying NOMA
          nomaAmount = ethers.formatEther(amount1Out);
          action = 'buy';
        }
      } else {
        console.log('[HANDLE SWAP V2] Neither token is NOMA, skipping');
        return;
      }
      
      console.log(`[HANDLE SWAP V2] NOMA amount: ${nomaAmount}, action: ${action}`);
      
      // Skip small trades
      if (parseFloat(nomaAmount) < 10) {
        console.log('[HANDLE SWAP V2] Skipping small trade (< 10 NOMA)');
        return;
      }
      
      // Get the actual transaction to find the real trader address
      const tx = await this.provider.getTransaction(event.transactionHash);
      if (!tx) {
        console.error('[HANDLE SWAP V2] Could not fetch transaction:', event.transactionHash);
        return;
      }
      
      const traderAddress = tx.from;
      const emoji = this.getTradeEmoji(parseFloat(nomaAmount));
      
      console.log(`[HANDLE SWAP V2] DEX Swap detected on ${poolConfig.name}: ${traderAddress} ${action} ${nomaAmount} NOMA`);
      
      // Get transaction receipt
      let gasUsed = null;
      let effectiveGasPrice = null;
      try {
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
        if (receipt) {
          gasUsed = receipt.gasUsed.toString();
          effectiveGasPrice = receipt.effectiveGasPrice?.toString();
        }
      } catch (err) {
        console.error('[HANDLE SWAP V2] Error fetching receipt:', err);
      }
      
      // Create transaction record
      const transaction = {
        hash: event.transactionHash,
        type: action,
        sender: action === 'sell' ? traderAddress : event.poolAddress,
        recipient: action === 'buy' ? traderAddress : event.poolAddress,
        traderAddress: traderAddress,
        amount: nomaAmount,
        amountRaw: (isToken0NOMA ? 
          (action === 'sell' ? amount0In : amount0Out) : 
          (action === 'sell' ? amount1In : amount1Out)
        ).toString(),
        tokenAddress: NOMA_TOKEN_ADDRESS,
        tokenSymbol: 'NOMA',
        poolAddress: event.poolAddress,
        poolName: poolConfig.name,
        protocol: poolConfig.protocol,
        poolVersion: 'v2',
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        gasUsed: gasUsed,
        effectiveGasPrice: effectiveGasPrice,
        timestamp: new Date().toISOString()
      };
      
      // Store transaction
      if (this.transactionStore) {
        this.transactionStore.addTransaction(transaction);
      }
      
      // Track referral volume
      if (this.referralStore) {
        await this.trackReferralVolume(transaction);
      }
      
      // Create trade alert
      const traderAddr = this.formatAddress(traderAddress);
      const tradeAlert = {
        id: ethers.id(event.transactionHash + event.logIndex),
        type: 'tradeAlert',
        content: `${traderAddr} just ${action === 'buy' ? 'bought' : 'sold'} ${parseFloat(nomaAmount).toFixed(2)} NOMA on ${poolConfig.name} ${emoji}`,
        username: 'System',
        timestamp: transaction.timestamp,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        transaction: transaction
      };
      
      // Broadcasting disabled - only store transactions
      // this.broadcastCallback(tradeAlert);
      
    } catch (error) {
      console.error('[HANDLE SWAP V2] Error handling swap:', error);
    }
  }

  async handleExchangeHelperTrade(eventName, traderAddress, amount, event) {
    try {
      console.log('[HANDLE EXCHANGE HELPER] Processing trade event:', {
        eventName,
        trader: traderAddress,
        amount: amount.toString(),
        txHash: event.transactionHash
      });
      
      // Format amount (assuming 18 decimals for NOMA)
      const nomaAmount = ethers.formatEther(amount);
      console.log(`[HANDLE EXCHANGE HELPER] NOMA amount: ${nomaAmount}`);
      
      // Skip small trades
      if (parseFloat(nomaAmount) < 10) {
        console.log('[HANDLE EXCHANGE HELPER] Skipping small trade (< 10 NOMA)');
        return;
      }
      
      // Determine trade type from event name
      let action;
      if (eventName.includes('Bought')) {
        action = 'buy';
      } else if (eventName.includes('Sold')) {
        action = 'sell';
      } else {
        console.log('[HANDLE EXCHANGE HELPER] Unknown event type:', eventName);
        return;
      }
      
      const emoji = this.getTradeEmoji(parseFloat(nomaAmount));
      console.log(`[HANDLE EXCHANGE HELPER] Trade detected: ${traderAddress} ${action} ${nomaAmount} NOMA (tx: ${event.transactionHash})`);
      
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
        console.error('[HANDLE EXCHANGE HELPER] Error fetching transaction receipt:', err);
      }
      
      // Get current timestamp
      const block = await this.provider.getBlock(event.blockNumber);
      const timestamp = new Date(block.timestamp * 1000).toISOString();
      
      // Create transaction record with the actual trader address
      const transaction = {
        hash: event.transactionHash,
        type: action,
        sender: action === 'sell' ? traderAddress : EXCHANGE_HELPER_ADDRESS,
        recipient: action === 'buy' ? traderAddress : EXCHANGE_HELPER_ADDRESS,
        traderAddress: traderAddress, // Store the actual trader address
        amount: nomaAmount,
        volumeNOMA: parseFloat(nomaAmount),
        volumeETH: parseFloat(nomaAmount), // Simplified - would need price calculation
        volumeUSD: 0, // Would need price oracle
        tokenName: 'NOMA',
        tokenSymbol: 'NOMA',
        timestamp: timestamp,
        blockNumber: event.blockNumber,
        gasUsed,
        effectiveGasPrice,
        eventName: eventName
      };
      
      // Store transaction if available
      if (this.transactionStore) {
        this.transactionStore.addTransaction(transaction);
      }
      
      // Track referral volume if applicable
      if (this.referralStore) {
        await this.trackReferralVolume(transaction);
      }
      
      // Create trade alert message with actual trader address
      const traderAddr = this.formatAddress(traderAddress);
      const tradeAlert = {
        id: ethers.id(event.transactionHash + event.logIndex),
        type: 'tradeAlert',
        content: `${traderAddr} just ${action === 'buy' ? 'bought' : 'sold'} ${parseFloat(nomaAmount).toFixed(2)} NOMA ${emoji}`,
        username: 'System',
        timestamp: timestamp,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        transaction: transaction
      };
      
      // Broadcasting disabled - only store transactions
      // this.broadcastCallback(tradeAlert);
      
    } catch (error) {
      console.error('[HANDLE EXCHANGE HELPER] Error handling trade:', error);
    }
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

  // Method to reload pools configuration
  async reloadPools() {
    try {
      console.log('Reloading pools configuration...');
      
      // Read the latest pools.json
      const poolsData = fs.readFileSync(poolsConfigPath, 'utf8');
      const newPoolsConfig = JSON.parse(poolsData);
      
      // Update internal config
      this.poolsConfig = newPoolsConfig;
      
      // Clear existing pool contracts
      this.dexPools.clear();
      
      // Create contracts for all enabled pools
      for (const pool of this.poolsConfig.pools) {
        if (pool.enabled && pool.address && pool.address !== '0x0000000000000000000000000000000000000000') {
          // Select appropriate ABI based on pool version
          const poolABI = pool.version === 'v3' ? UNISWAP_V3_POOL_ABI : UNISWAP_V2_PAIR_ABI;
          const poolContract = new ethers.Contract(pool.address, poolABI, this.provider);
          this.dexPools.set(pool.address, {
            contract: poolContract,
            config: pool
          });
          console.log(`Created contract for pool ${pool.name} at ${pool.address} (${pool.protocol} ${pool.version})`);
        }
      }
      
      console.log(`Reloaded ${this.dexPools.size} pools from configuration`);
      return true;
    } catch (error) {
      console.error('Error reloading pools:', error);
      return false;
    }
  }
}

export default BlockchainMonitor;