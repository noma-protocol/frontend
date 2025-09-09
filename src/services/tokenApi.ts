import config from '../config';

const API_BASE_URL = import.meta.env.VITE_API_URL || config.API_URL;

interface TokenData {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenDecimals: string;
  tokenSupply: string;
  logoPreview?: string;
  price: string;
  floorPrice: string;
  presalePrice: string;
  token1: string;
  selectedProtocol: string;
  presale: string;
  softCap: string;
  duration: string;
  deployerAddress?: string;
}

interface TokenResponse extends TokenData {
  id: string;
  timestamp: string;
  status: 'pending' | 'success' | 'failed' | 'deployed';
  transactionHash?: string;
  contractAddress?: string;
  updatedAt?: string;
  logoUrl?: string; // New field for URL-based logos
}

export const tokenApi = {
  // Save new token
  async saveToken(tokenData: TokenData): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  // Get all tokens
  async getTokens(options?: { includeAll?: boolean }): Promise<{ tokens: TokenResponse[] }> {
    try {
      const queryParams = options?.includeAll ? '?includeAll=true' : '';
      const response = await fetch(`${API_BASE_URL}/tokens${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }
  },

  // Get tokens by deployer address
  async getTokensByDeployer(address: string): Promise<{ tokens: TokenResponse[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/deployer/${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tokens by deployer:', error);
      throw error;
    }
  },

  // Update token status
  async updateTokenStatus(
    tokenId: string, 
    status: 'success' | 'failed', 
    transactionHash?: string,
    contractAddress?: string
  ): Promise<TokenResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/${tokenId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, transactionHash, contractAddress }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error updating token status:', error);
      throw error;
    }
  },

  // Get tokens by symbol
  async getTokensBySymbol(symbol: string): Promise<{ tokens: TokenResponse[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/by-symbol/${symbol}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return { tokens: [] };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tokens by symbol:', error);
      throw error;
    }
  },

  // Get token statistics
  async getStats(): Promise<{
    total: number;
    pending: number;
    success: number;
    failed: number;
    lastDeployment: string | null;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  // Export tokens
  async exportTokens(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/export`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tokens_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting tokens:', error);
      throw error;
    }
  },
};