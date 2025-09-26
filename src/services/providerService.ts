import { ethers } from 'ethers';
import config from '../config';

const { JsonRpcProvider } = ethers.providers;

/**
 * Singleton provider service to prevent multiple provider instances
 * Each provider instance makes eth_chainId calls, so we need to reuse a single instance
 */
class ProviderService {
  private static instance: ProviderService;
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private chainId: number | null = null;
  private chainIdPromise: Promise<number> | null = null;

  private constructor() {}

  static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  getProvider(): ethers.providers.JsonRpcProvider {
    if (!this.provider) {
      console.log('[ProviderService] Creating singleton provider instance with RPC:', config.RPC_URL);
      this.provider = new JsonRpcProvider(config.RPC_URL);
      
      // Pre-cache the network info to reduce initial eth_chainId calls
      // But allow it to be overridden by actual network detection
      const expectedChainId = config.chain === "local" ? 1337 : 10143;
      this.provider._network = {
        chainId: expectedChainId,
        name: config.chain === "local" ? "localhost" : "monad"
      };
      
      // Verify network connection asynchronously
      this.provider.ready.then(() => {
        console.log('[ProviderService] Provider is ready');
        return this.provider.getNetwork();
      }).then(network => {
        console.log('[ProviderService] Network detected:', network);
        this.chainId = network.chainId;
        if (network.chainId !== expectedChainId) {
          console.warn('[ProviderService] Network mismatch! Expected:', expectedChainId, 'Got:', network.chainId);
        }
      }).catch(error => {
        console.error('[ProviderService] Failed to detect network:', error);
        console.error('[ProviderService] This may cause issues with contract calls');
      });
    }
    return this.provider;
  }

  /**
   * Get cached chain ID without making an RPC call
   */
  async getCachedChainId(): Promise<number> {
    if (this.chainId !== null) {
      return this.chainId;
    }

    // If already fetching, return the existing promise
    if (this.chainIdPromise) {
      return this.chainIdPromise;
    }

    // Create a promise for the chain ID fetch
    this.chainIdPromise = (async () => {
      try {
        const provider = this.getProvider();
        const network = await provider.getNetwork();
        this.chainId = network.chainId;
        console.log('[ProviderService] Chain ID cached:', this.chainId);
        return this.chainId;
      } finally {
        this.chainIdPromise = null;
      }
    })();

    return this.chainIdPromise;
  }

  /**
   * Get provider that's guaranteed to be ready
   */
  async getReadyProvider(): Promise<ethers.providers.JsonRpcProvider> {
    const provider = this.getProvider();
    await provider.ready;
    return provider;
  }

  /**
   * Clear the provider instance (useful for network switches)
   */
  clearProvider(): void {
    if (this.provider) {
      this.provider.removeAllListeners();
      this.provider = null;
      this.chainId = null;
      this.chainIdPromise = null;
    }
  }
}

// Export singleton instance
export const providerService = ProviderService.getInstance();

// Export convenience function
export const getProvider = () => providerService.getProvider();

// Export for backward compatibility
export const localProvider = providerService.getProvider();