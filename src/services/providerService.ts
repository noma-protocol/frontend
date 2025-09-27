import { ethers } from 'ethers';
import config from '../config';

const { JsonRpcProvider } = ethers.providers;

// Removed unnecessary RPC test on module load to reduce eth_chainId calls

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
          allowGzip: true,
        });
        
        const expectedChainId = config.chain === "local" ? 1337 : 10143;
        
        // Set network immediately to prevent detection calls
        this.provider._network = {
          name: 'monad-testnet',
          chainId: expectedChainId,
        };
        
        // Track ready state with retry logic
        this.providerReadyPromise = this.initializeNetwork(expectedChainId);
      } catch (error) {
        console.error('[ProviderService] Failed to create provider:', error);
        throw error;
      }
    }
    return this.provider;
  }

  private async initializeNetwork(expectedChainId: number): Promise<void> {
    let retries = 3;
    let lastError: any;
    
    while (retries > 0) {
      try {
        // Wait for provider to be ready
        await this.provider!.ready;
        console.log('[ProviderService] Provider is ready');
        
        // Try to get network
        const network = await this.provider!.getNetwork();
        console.log('[ProviderService] Network detected:', network);
        this.chainId = network.chainId;
        
        // Cache the network to avoid future calls
        if (this.provider) {
          this.provider._network = network;
        }
        
        if (network.chainId !== expectedChainId) {
          console.warn('[ProviderService] Network mismatch! Expected:', expectedChainId, 'Got:', network.chainId);
        }
        
        return; // Success!
      } catch (error) {
        lastError = error;
        retries--;
        
        if (retries > 0) {
          console.warn(`[ProviderService] Network detection failed, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }
    
    // All retries failed
    console.error('[ProviderService] Failed to detect network after all retries:', lastError);
    console.error('[ProviderService] RPC URL:', config.RPC_URL);
    console.error('[ProviderService] Continuing with cached network configuration');
    
    // Set a default network to prevent further errors
    this.chainId = expectedChainId;
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