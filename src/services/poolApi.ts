import config from '../config';

const API_BASE_URL = import.meta.env.VITE_API_URL || config.API_URL;

interface Token {
  symbol: string;
  address: string;
  decimals: number;
}

interface PoolConfig {
  name: string;
  address: string;
  protocol: string;
  version: string;
  token0: Token;
  token1: Token;
  feeTier: number;
  enabled: boolean;
  createdAt?: string;
}

export const poolApi = {
  // Get all pools
  async getPools(): Promise<{ pools: PoolConfig[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/pools`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching pools:', error);
      throw error;
    }
  },

  // Add a new pool
  async addPool(poolConfig: PoolConfig): Promise<{ message: string; pool: PoolConfig }> {
    try {
      const response = await fetch(`${API_BASE_URL}/pools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(poolConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding pool:', error);
      throw error;
    }
  },

  // Update pool status
  async updatePoolStatus(poolAddress: string, enabled: boolean): Promise<{ message: string; pool: PoolConfig }> {
    try {
      const response = await fetch(`${API_BASE_URL}/pools/${poolAddress}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating pool status:', error);
      throw error;
    }
  },

  // Helper to create pool config from token data
  createPoolConfig({
    tokenName,
    tokenSymbol,
    tokenAddress,
    tokenDecimals,
    poolAddress,
    protocol = 'uniswap',
    feeTier = 3000,
    pairTokenSymbol = 'WMON',
    pairTokenAddress = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701',
    pairTokenDecimals = 18,
    isToken0 = true
  }: {
    tokenName: string;
    tokenSymbol: string;
    tokenAddress: string;
    tokenDecimals: string | number;
    poolAddress: string;
    protocol?: string;
    feeTier?: number;
    pairTokenSymbol?: string;
    pairTokenAddress?: string;
    pairTokenDecimals?: number;
    isToken0?: boolean;
  }): PoolConfig {
    const token0 = isToken0 ? {
      symbol: tokenSymbol,
      address: tokenAddress,
      decimals: parseInt(tokenDecimals.toString())
    } : {
      symbol: pairTokenSymbol,
      address: pairTokenAddress,
      decimals: pairTokenDecimals
    };
    
    const token1 = isToken0 ? {
      symbol: pairTokenSymbol,
      address: pairTokenAddress,
      decimals: pairTokenDecimals
    } : {
      symbol: tokenSymbol,
      address: tokenAddress,
      decimals: parseInt(tokenDecimals.toString())
    };
    
    return {
      name: `${tokenSymbol}/${pairTokenSymbol} ${protocol.charAt(0).toUpperCase() + protocol.slice(1)}`,
      address: poolAddress,
      protocol: protocol,
      version: 'v3',
      token0: token0,
      token1: token1,
      feeTier: feeTier,
      enabled: true
    };
  }
};