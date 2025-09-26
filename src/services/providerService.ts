import { ethers } from 'ethers';
import config from '../config';

const { JsonRpcProvider } = ethers.providers;

// Test RPC connection on load
if (config.RPC_URL) {
  console.log('[ProviderService] Testing RPC connection to:', config.RPC_URL);
  fetch(config.RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log('[ProviderService] RPC test successful, chainId:', data.result);
  })
  .catch(error => {
    console.error('[ProviderService] RPC test failed:', error);
  });
}

/**
 * Singleton provider service to prevent multiple provider instances
 * Each provider instance makes eth_chainId calls, so we need to reuse a single instance
 */
class ProviderService {
  private static instance: ProviderService;
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private chainId: number | null = null;
  private chainIdPromise: Promise<number> | null = null;
  private providerReadyPromise: Promise<void> | null = null;

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
      
      try {
        // Create provider with connection info
        this.provider = new JsonRpcProvider({
          url: config.RPC_URL,
          timeout: 30000, // 30 second timeout
        });
        
        const expectedChainId = config.chain === "local" ? 1337 : 10143;
        
        // Track ready state
        this.providerReadyPromise = this.provider.ready.then(() => {
          console.log('[ProviderService] Provider is ready');
          return this.provider!.getNetwork();
        }).then(network => {
          console.log('[ProviderService] Network detected:', network);
          this.chainId = network.chainId;
          
          // Cache the network to avoid future calls
          if (this.provider) {
            this.provider._network = network;
          }
          
          if (network.chainId !== expectedChainId) {
            console.warn('[ProviderService] Network mismatch! Expected:', expectedChainId, 'Got:', network.chainId);
          }
        }).catch(error => {
          console.error('[ProviderService] Failed to detect network:', error);
          console.error('[ProviderService] This may cause issues with contract calls');
          console.error('[ProviderService] RPC URL:', config.RPC_URL);
          throw error; // Re-throw to handle in calling code
        });
      } catch (error) {
        console.error('[ProviderService] Failed to create provider:', error);
        throw error;
      }
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
    if (this.providerReadyPromise) {
      await this.providerReadyPromise;
    } else {
      await provider.ready;
    }
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