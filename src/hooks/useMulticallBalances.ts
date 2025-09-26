import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { multicallService } from '../services/multicallService';
import { rpcDedupe } from '../services/rpcDeduplicationService';

interface BalanceData {
  eth: string;
  weth: string;
  token: string;
  raw: {
    eth: ethers.BigNumber;
    weth: ethers.BigNumber;
    token: ethers.BigNumber;
  };
}

interface UseMulticallBalancesOptions {
  userAddress?: string;
  wethAddress: string;
  tokenAddress?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export function useMulticallBalances({
  userAddress,
  wethAddress,
  tokenAddress,
  refetchInterval = 30000,
  enabled = true,
}: UseMulticallBalancesOptions) {
  const [balances, setBalances] = useState<BalanceData>({
    eth: '0',
    weth: '0',
    token: '0',
    raw: {
      eth: ethers.BigNumber.from(0),
      weth: ethers.BigNumber.from(0),
      token: ethers.BigNumber.from(0),
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!userAddress || !enabled) return;

    const cacheKey = `balances-${userAddress}-${tokenAddress || 'none'}`;
    
    try {
      setIsLoading(true);
      setError(null);

      // Use deduplication for the entire balance fetch operation
      const balanceData = await rpcDedupe.deduplicatedCall(
        cacheKey,
        async () => {
          const tokenAddresses = [wethAddress];
          if (tokenAddress && tokenAddress !== wethAddress) {
            tokenAddresses.push(tokenAddress);
          }

          const { eth, tokens } = await multicallService.getAllBalances(
            userAddress,
            tokenAddresses
          );

          return {
            eth,
            weth: tokens[wethAddress.toLowerCase()] || ethers.BigNumber.from(0),
            token: tokenAddress
              ? tokens[tokenAddress.toLowerCase()] || ethers.BigNumber.from(0)
              : ethers.BigNumber.from(0),
          };
        },
        5000 // 5 second cache
      );

      setBalances({
        eth: ethers.utils.formatEther(balanceData.eth),
        weth: ethers.utils.formatEther(balanceData.weth),
        token: ethers.utils.formatEther(balanceData.token),
        raw: balanceData,
      });
    } catch (err) {
      console.error('[useMulticallBalances] Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, wethAddress, tokenAddress, enabled]);

  // Initial fetch and interval setup
  useEffect(() => {
    if (!enabled) return;

    fetchBalances();

    if (refetchInterval > 0) {
      const interval = setInterval(fetchBalances, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBalances, refetchInterval, enabled]);

  return {
    balances,
    isLoading,
    error,
    refetch: fetchBalances,
  };
}

// Utility hook for single token balance
export function useTokenBalance(
  userAddress?: string,
  tokenAddress?: string,
  options: { refetchInterval?: number; enabled?: boolean } = {}
) {
  const [balance, setBalance] = useState<string>('0');
  const [rawBalance, setRawBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userAddress || !tokenAddress || !options.enabled) return;

    const cacheKey = `balance-${userAddress}-${tokenAddress}`;

    try {
      setIsLoading(true);
      setError(null);

      const balanceData = await rpcDedupe.deduplicatedCall(
        cacheKey,
        async () => {
          const { tokens } = await multicallService.getAllBalances(
            userAddress,
            [tokenAddress]
          );
          return tokens[tokenAddress.toLowerCase()] || ethers.BigNumber.from(0);
        },
        5000
      );

      setRawBalance(balanceData);
      setBalance(ethers.utils.formatEther(balanceData));
    } catch (err) {
      console.error('[useTokenBalance] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, tokenAddress, options.enabled]);

  useEffect(() => {
    if (!options.enabled) return;

    fetchBalance();

    if (options.refetchInterval && options.refetchInterval > 0) {
      const interval = setInterval(fetchBalance, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchBalance, options.refetchInterval, options.enabled]);

  return {
    balance,
    rawBalance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}