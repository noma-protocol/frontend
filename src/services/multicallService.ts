import { ethers } from 'ethers';
import config from '../config';

const { JsonRpcProvider } = ethers.providers;

// Multicall3 ABI - only the functions we need
const MULTICALL3_ABI = [
  {
    inputs: [
      { name: 'requireSuccess', type: 'bool' },
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'tryAggregate',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'tryBlockAndAggregate',
    outputs: [
      { name: 'blockNumber', type: 'uint256' },
      { name: 'blockHash', type: 'bytes32' },
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
];

// ERC20 functions we'll be calling
const ERC20_BALANCE_OF_ABI = ['function balanceOf(address owner) view returns (uint256)'];
const ERC20_INTERFACE = new ethers.utils.Interface(ERC20_BALANCE_OF_ABI);

// Multicall3 contract address on Monad
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

export interface Call {
  target: string;
  callData: string;
  allowFailure?: boolean;
}

export interface CallResult {
  success: boolean;
  returnData: string;
}

class MulticallService {
  private provider: ethers.providers.JsonRpcProvider;
  private multicallContract: ethers.Contract;
  private pendingCalls: Map<string, { call: Call; resolve: (value: any) => void; reject: (error: any) => void }> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 10; // ms to wait before executing batch

  constructor() {
    this.provider = new JsonRpcProvider(config.RPC_URL);
    this.multicallContract = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, this.provider);
  }

  /**
   * Get multiple token balances in a single call
   */
  async getTokenBalances(
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<{ [tokenAddress: string]: ethers.BigNumber }> {
    const calls: Call[] = tokenAddresses.map((tokenAddress) => ({
      target: tokenAddress,
      callData: ERC20_INTERFACE.encodeFunctionData('balanceOf', [userAddress]),
      allowFailure: true,
    }));

    const results = await this.tryAggregate(calls);
    const balances: { [tokenAddress: string]: ethers.BigNumber } = {};

    tokenAddresses.forEach((tokenAddress, index) => {
      const result = results[index];
      if (result.success && result.returnData !== '0x') {
        try {
          const decoded = ERC20_INTERFACE.decodeFunctionResult('balanceOf', result.returnData);
          balances[tokenAddress.toLowerCase()] = decoded[0];
        } catch (e) {
          console.error(`Failed to decode balance for ${tokenAddress}:`, e);
          balances[tokenAddress.toLowerCase()] = ethers.BigNumber.from(0);
        }
      } else {
        balances[tokenAddress.toLowerCase()] = ethers.BigNumber.from(0);
      }
    });

    return balances;
  }

  /**
   * Get ETH and multiple token balances in one call
   */
  async getAllBalances(
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<{
    eth: ethers.BigNumber;
    tokens: { [tokenAddress: string]: ethers.BigNumber };
  }> {
    // Get ETH balance separately (can't be multicalled)
    const ethBalancePromise = this.provider.getBalance(userAddress);
    
    // Get all token balances in one multicall
    const tokenBalancesPromise = tokenAddresses.length > 0 
      ? this.getTokenBalances(userAddress, tokenAddresses)
      : Promise.resolve({});

    const [eth, tokens] = await Promise.all([ethBalancePromise, tokenBalancesPromise]);

    return { eth, tokens };
  }

  /**
   * Execute multiple calls with failure handling
   */
  async tryAggregate(calls: Call[]): Promise<CallResult[]> {
    try {
      const formattedCalls = calls.map((call) => ({
        target: call.target,
        callData: call.callData,
      }));

      // Use callStatic to ensure this is a read call, not a transaction
      const results = await this.multicallContract.callStatic.tryAggregate(
        false, // requireSuccess = false to allow individual calls to fail
        formattedCalls
      );
      return results;
    } catch (error) {
      console.error('Multicall failed:', error);
      throw error;
    }
  }

  /**
   * Queue a call for batch execution (request deduplication)
   */
  async queueCall<T>(key: string, call: Call): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check if we already have this exact call pending
      if (this.pendingCalls.has(key)) {
        // Wait for the existing call
        const existing = this.pendingCalls.get(key)!;
        existing.resolve = resolve;
        existing.reject = reject;
        return;
      }

      // Add to pending calls
      this.pendingCalls.set(key, { call, resolve, reject });

      // Reset batch timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      // Schedule batch execution
      this.batchTimeout = setTimeout(() => this.executeBatch(), this.BATCH_DELAY);
    });
  }

  /**
   * Execute all pending calls in a single multicall
   */
  private async executeBatch() {
    if (this.pendingCalls.size === 0) return;

    const entries = Array.from(this.pendingCalls.entries());
    const calls = entries.map(([_, { call }]) => call);
    
    this.pendingCalls.clear();
    this.batchTimeout = null;

    try {
      const results = await this.tryAggregate(calls);
      
      entries.forEach(([key, { resolve, reject }], index) => {
        const result = results[index];
        if (result.success) {
          resolve(result.returnData);
        } else {
          reject(new Error(`Call failed for ${key}`));
        }
      });
    } catch (error) {
      // If multicall fails, reject all pending calls
      entries.forEach(([_, { reject }]) => reject(error));
    }
  }

  /**
   * Create a cache key for deduplication
   */
  static createCacheKey(target: string, callData: string): string {
    return `${target.toLowerCase()}-${callData}`;
  }
}

// Export singleton instance
export const multicallService = new MulticallService();

// Export utility function for easy balance fetching
export async function fetchBalancesMulticall(
  userAddress: string,
  tokenAddresses: string[]
): Promise<{
  eth: string;
  tokens: { [symbol: string]: string };
  raw: {
    eth: ethers.BigNumber;
    tokens: { [address: string]: ethers.BigNumber };
  };
}> {
  const { eth, tokens } = await multicallService.getAllBalances(userAddress, tokenAddresses);
  
  return {
    eth: ethers.utils.formatEther(eth),
    tokens: Object.entries(tokens).reduce((acc, [address, balance]) => {
      acc[address] = ethers.utils.formatEther(balance);
      return acc;
    }, {} as { [address: string]: string }),
    raw: { eth, tokens }
  };
}