import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';
import { multicallService } from '../services/multicallService';
import { rpcDedupe } from '../services/rpcDeduplicationService';

interface AllowanceData {
  tokenAllowance: bigint;
  wethAllowance: bigint;
}

interface UseMulticallAllowancesOptions {
  tokenAddress?: string;
  wethAddress?: string;
  spenderAddress?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

// ERC20 allowance ABI
const ERC20_ALLOWANCE_ABI = ['function allowance(address owner, address spender) view returns (uint256)'];
const ERC20_INTERFACE = new ethers.utils.Interface(ERC20_ALLOWANCE_ABI);

export function useMulticallAllowances({
  tokenAddress,
  wethAddress,
  spenderAddress,
  refetchInterval = 60000, // 60 seconds default
  enabled = true,
}: UseMulticallAllowancesOptions) {
  const { address } = useAccount();
  const [allowances, setAllowances] = useState<AllowanceData>({
    tokenAllowance: BigInt(0),
    wethAllowance: BigInt(0),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllowances = useCallback(async () => {
    if (!address || !spenderAddress || !enabled) return;

    const cacheKey = `allowances-${address}-${spenderAddress}-${tokenAddress || 'none'}-${wethAddress || 'none'}`;

    try {
      setIsLoading(true);
      setError(null);

      const allowanceData = await rpcDedupe.deduplicatedCall(
        cacheKey,
        async () => {
          const calls: any[] = [];
          const addresses: string[] = [];

          // Add token allowance check if token address is provided
          if (tokenAddress && ethers.utils.isAddress(tokenAddress)) {
            calls.push({
              target: tokenAddress,
              callData: ERC20_INTERFACE.encodeFunctionData('allowance', [address, spenderAddress]),
              allowFailure: true,
            });
            addresses.push(tokenAddress);
          }

          // Add WETH allowance check if WETH address is provided
          if (wethAddress && ethers.utils.isAddress(wethAddress)) {
            calls.push({
              target: wethAddress,
              callData: ERC20_INTERFACE.encodeFunctionData('allowance', [address, spenderAddress]),
              allowFailure: true,
            });
            addresses.push(wethAddress);
          }

          if (calls.length === 0) {
            return { tokenAllowance: BigInt(0), wethAllowance: BigInt(0) };
          }

          const results = await multicallService.tryAggregate(calls);
          
          let tokenAllowance = BigInt(0);
          let wethAllowance = BigInt(0);

          addresses.forEach((addr, index) => {
            const result = results[index];
            if (result.success && result.returnData !== '0x') {
              try {
                const decoded = ERC20_INTERFACE.decodeFunctionResult('allowance', result.returnData);
                const allowanceValue = decoded[0];
                
                if (addr.toLowerCase() === tokenAddress?.toLowerCase()) {
                  tokenAllowance = allowanceValue.toBigInt();
                } else if (addr.toLowerCase() === wethAddress?.toLowerCase()) {
                  wethAllowance = allowanceValue.toBigInt();
                }
              } catch (e) {
                console.error(`Failed to decode allowance for ${addr}:`, e);
              }
            }
          });

          return { tokenAllowance, wethAllowance };
        },
        30000 // 30 second cache for allowances
      );

      setAllowances(allowanceData);
    } catch (err) {
      console.error('[useMulticallAllowances] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch allowances');
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenAddress, wethAddress, spenderAddress, enabled]);

  // Initial fetch and interval setup
  useEffect(() => {
    if (!enabled) return;

    fetchAllowances();

    if (refetchInterval > 0) {
      const interval = setInterval(fetchAllowances, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAllowances, refetchInterval, enabled]);

  // Helper functions
  const hasEnoughTokenAllowance = (amount: bigint): boolean => {
    return allowances.tokenAllowance >= amount;
  };

  const hasEnoughWethAllowance = (amount: bigint): boolean => {
    return allowances.wethAllowance >= amount;
  };

  const isTokenMaxApproved = (): boolean => {
    return allowances.tokenAllowance === ethers.constants.MaxUint256.toBigInt();
  };

  const isWethMaxApproved = (): boolean => {
    return allowances.wethAllowance === ethers.constants.MaxUint256.toBigInt();
  };

  return {
    allowances,
    tokenAllowance: allowances.tokenAllowance,
    wethAllowance: allowances.wethAllowance,
    hasEnoughTokenAllowance,
    hasEnoughWethAllowance,
    isTokenMaxApproved,
    isWethMaxApproved,
    isLoading,
    error,
    refetch: fetchAllowances,
  };
}