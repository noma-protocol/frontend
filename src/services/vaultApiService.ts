import { features } from '../config/features';

export interface VaultInfo {
  // Vault identification
  address: string;
  deployer: string;
  
  // Token information
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: string;
  
  // Token addresses
  token0: string;
  token1: string;
  
  // Associated contracts
  presaleContract: string;
  stakingContract: string;
  
  // Vault metrics (all values as strings due to BigInt conversion)
  liquidityRatio: string;
  circulatingSupply: string;
  spotPriceX96: string;
  anchorCapacity: string;
  floorCapacity: string;
  newFloor: string;
  totalInterest: string;
}

export class VaultApiService {
  private baseUrl: string;
  private vaultCache: Map<string, { data: VaultInfo[]; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || features.vault.apiUrl || 'http://localhost:3004';
  }

  async fetchVaults(address?: string): Promise<VaultInfo[]> {
    const cacheKey = address || 'all';
    const cached = this.vaultCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const url = address 
        ? `${this.baseUrl}/vault?address=${address}`
        : `${this.baseUrl}/vault`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch vaults: ${response.statusText}`);
      }
      
      const vaults = await response.json();
      
      // Cache the results
      this.vaultCache.set(cacheKey, {
        data: vaults,
        timestamp: Date.now()
      });
      
      return vaults;
    } catch (error) {
      console.error('[VaultApiService] Error fetching vaults:', error);
      throw error;
    }
  }

  async getVaultByAddress(vaultAddress: string): Promise<VaultInfo | null> {
    const vaults = await this.fetchVaults(vaultAddress);
    return vaults.find(v => v.address.toLowerCase() === vaultAddress.toLowerCase()) || null;
  }

  async getVaultsByTokenPair(token0: string, token1: string): Promise<VaultInfo[]> {
    const vaults = await this.fetchVaults();
    return vaults.filter(v => {
      const addresses = [v.token0.toLowerCase(), v.token1.toLowerCase()];
      const targets = [token0.toLowerCase(), token1.toLowerCase()];
      return targets.every(target => addresses.includes(target));
    });
  }

  async getVaultsByDeployer(deployerAddress: string): Promise<VaultInfo[]> {
    return this.fetchVaults(deployerAddress);
  }

  async getAllVaults(): Promise<VaultInfo[]> {
    return this.fetchVaults();
  }

  clearCache(): void {
    this.vaultCache.clear();
  }

  invalidateCache(address?: string): void {
    if (address) {
      this.vaultCache.delete(address);
    } else {
      this.vaultCache.clear();
    }
  }
}

// Export singleton instance
export const vaultApiService = new VaultApiService();

// Export the class for testing or multiple instances
export default VaultApiService;