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
      console.log('[ProviderService] Creating singleton provider instance');
      this.provider = new JsonRpcProvider(config.RPC_URL);
      
      // Cache the network info to prevent repeated eth_chainId calls
      this.provider._network = {
        chainId: config.chain === "local" ? 1337 : 10143,
        name: config.chain === "local" ? "localhost" : "monad"
      };
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