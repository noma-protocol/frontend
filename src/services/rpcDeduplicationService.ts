import { ethers } from 'ethers';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  refCount: number;
}

interface CachedResult {
  data: any;
  timestamp: number;
  ttl: number;
}

export class RPCDeduplicationService {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private cache: Map<string, CachedResult> = new Map();
  private readonly DEFAULT_TTL = 5000; // 5 seconds default cache
  private readonly BALANCE_TTL = 30000; // 30 seconds for balance calls
  private readonly STATIC_TTL = 300000; // 5 minutes for static data (decimals, symbols, etc.)

  /**
   * Execute a deduplicated RPC call
   */
  async deduplicatedCall<T>(
    key: string,
    executeFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.getCached(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      pending.refCount++;
      return pending.promise;
    }

    // Create new request
    const promise = this.executeAndCache(key, executeFn, ttl);
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      refCount: 1,
    });

    return promise;
  }

  /**
   * Execute function and cache result
   */
  private async executeAndCache<T>(
    key: string,
    executeFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      const result = await executeFn();
      
      // Cache successful result
      this.cache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: ttl || this.DEFAULT_TTL,
      });

      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Get cached result if still valid
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Create cache key for contract calls
   */
  static createContractKey(
    address: string,
    method: string,
    ...args: any[]
  ): string {
    return `${address.toLowerCase()}-${method}-${args.join('-')}`;
  }

  /**
   * Clear cache entries matching pattern
   */
  clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedItems: this.cache.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// Global instance
export const rpcDedupe = new RPCDeduplicationService();

// Utility wrapper for ethers Contract
export class DeduplicatedContract extends ethers.Contract {
  private dedupe: RPCDeduplicationService;

  constructor(
    address: string,
    abi: ethers.ContractInterface,
    signerOrProvider: ethers.Signer | ethers.providers.Provider,
    dedupe: RPCDeduplicationService = rpcDedupe
  ) {
    super(address, abi, signerOrProvider);
    this.dedupe = dedupe;
  }

  /**
   * Override contract calls to use deduplication
   */
  async callStatic(method: string, ...args: any[]): Promise<any> {
    const key = RPCDeduplicationService.createContractKey(
      this.address,
      method,
      ...args
    );

    // Determine TTL based on method name
    let ttl = this.dedupe.DEFAULT_TTL;
    if (method.toLowerCase().includes('balance')) {
      ttl = this.dedupe.BALANCE_TTL;
    } else if (
      method.toLowerCase().includes('symbol') ||
      method.toLowerCase().includes('decimal') ||
      method.toLowerCase().includes('name')
    ) {
      ttl = this.dedupe.STATIC_TTL;
    }

    return this.dedupe.deduplicatedCall(
      key,
      () => super.callStatic(method, ...args),
      ttl
    );
  }
}

// Wrapper for provider calls
export class DeduplicatedProvider {
  constructor(
    private provider: ethers.providers.Provider,
    private dedupe: RPCDeduplicationService = rpcDedupe
  ) {}

  async getBalance(address: string): Promise<ethers.BigNumber> {
    const key = `balance-${address.toLowerCase()}`;
    return this.dedupe.deduplicatedCall(
      key,
      () => this.provider.getBalance(address),
      this.dedupe.BALANCE_TTL
    );
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    return this.dedupe.deduplicatedCall(
      'gasPrice',
      () => this.provider.getGasPrice(),
      5000 // 5 second cache for gas price
    );
  }

  async getBlock(blockHashOrBlockTag: ethers.providers.BlockTag): Promise<ethers.providers.Block> {
    const key = `block-${blockHashOrBlockTag}`;
    return this.dedupe.deduplicatedCall(
      key,
      () => this.provider.getBlock(blockHashOrBlockTag),
      blockHashOrBlockTag === 'latest' ? 12000 : this.dedupe.STATIC_TTL // 12s for latest, longer for specific blocks
    );
  }

  // Add more provider methods as needed
}