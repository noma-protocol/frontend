const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9091/api';

interface ReferralRegistration {
  referralCode: string;
  referrerAddress?: string; // Optional, will be resolved by backend
  referredAddress: string;
}

interface ReferralTrade {
  userAddress: string;
  referralCode: string;
  type: 'buy' | 'sell';
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  volumeETH: string;
  volumeUSD: string;
  txHash: string;
}

interface ReferralStats {
  address: string;
  totalReferred: number;
  referredUsers: string[];
  totalVolumeETH: number;
  totalVolumeUSD: number;
  trades: any[];
}

export const referralApi = {
  // Register a referral code for a user
  async registerCode(code: string, address: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/register-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, address }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error registering referral code:', error);
      throw error;
    }
  },

  // Register a new referral relationship
  async registerReferral(data: ReferralRegistration): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error registering referral:', error);
      throw error;
    }
  },

  // Track a referral trade
  async trackTrade(tradeData: ReferralTrade): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/track-trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking referral trade:', error);
      throw error;
    }
  },

  // Get referral stats for an address
  async getReferralStats(address: string): Promise<ReferralStats> {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/stats/${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      throw error;
    }
  },

  // Check if a user was referred
  async checkReferral(userAddress: string): Promise<{
    referred: boolean;
    referralCode?: string;
    referrerAddress?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/check/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking referral:', error);
      throw error;
    }
  },

  // Get all users referred by a specific code
  async getReferralsByCode(code: string, address: string): Promise<{
    referralCode: string;
    referrerAddress: string;
    referredUsers: string[];
    count: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/referrals/code/${code}/${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching referrals by code:', error);
      throw error;
    }
  },
};