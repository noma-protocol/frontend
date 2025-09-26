import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getProvider } from '../services/providerService';

interface GasPriceData {
  gasPrice: ethers.BigNumber;
  gasPriceGwei: string;
  gasPriceEth: string;
  timestamp: number;
}

interface UseGasPriceReturn {
  gasPrice: ethers.BigNumber | null;
  gasPriceGwei: string;
  gasPriceEth: string;
  estimatedFeeEth: string;
  estimatedFeeUsd: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30000;

// Estimated gas units for different transaction types
const GAS_ESTIMATES = {
  swap: 250000, // Conservative estimate for token swaps
  transfer: 21000, // Standard ETH transfer
  tokenTransfer: 65000, // ERC20 token transfer
  approve: 50000, // Token approval
};

// Minimum gas price in Gwei (fallback for testnet)
const MIN_GAS_PRICE_GWEI = '1'; // 1 Gwei minimum

// Global cache for gas price
let gasPriceCache: GasPriceData | null = null;

export const useGasPrice = (
  transactionType: keyof typeof GAS_ESTIMATES = 'swap',
  monPrice: number = 0
): UseGasPriceReturn => {
  const [gasPrice, setGasPrice] = useState<ethers.BigNumber | null>(null);
  const [gasPriceGwei, setGasPriceGwei] = useState<string>('0');
  const [gasPriceEth, setGasPriceEth] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const provider = getProvider();

  const fetchGasPrice = async () => {
    try {
      // Check cache first
      if (gasPriceCache && (Date.now() - gasPriceCache.timestamp) < CACHE_DURATION) {
        if (isMountedRef.current) {
          setGasPrice(gasPriceCache.gasPrice);
          setGasPriceGwei(gasPriceCache.gasPriceGwei);
          setGasPriceEth(gasPriceCache.gasPriceEth);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      let currentGasPrice = await provider.getGasPrice();
      
      if (!isMountedRef.current) return;

      // Ensure minimum gas price for proper fee display (especially on testnets)
      const minGasPrice = ethers.utils.parseUnits(MIN_GAS_PRICE_GWEI, 'gwei');
      if (currentGasPrice.lt(minGasPrice)) {
        console.log('[useGasPrice] Gas price too low, using minimum:', MIN_GAS_PRICE_GWEI, 'Gwei');
        currentGasPrice = minGasPrice;
      }

      // Convert to Gwei (1 Gwei = 10^9 Wei)
      const gwei = ethers.utils.formatUnits(currentGasPrice, 'gwei');
      // Convert to ETH (1 ETH = 10^18 Wei)
      const eth = ethers.utils.formatEther(currentGasPrice);

      // Log for debugging
      console.log('[useGasPrice] Gas price fetched:', {
        wei: currentGasPrice.toString(),
        gwei: gwei,
        eth: eth,
        monPrice: monPrice
      });

      // Update cache
      gasPriceCache = {
        gasPrice: currentGasPrice,
        gasPriceGwei: gwei,
        gasPriceEth: eth,
        timestamp: Date.now(),
      };

      setGasPrice(currentGasPrice);
      setGasPriceGwei(gwei);
      setGasPriceEth(eth);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching gas price:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch gas price');
        setIsLoading(false);
      }
    }
  };

  // Calculate estimated fees
  const estimatedGas = GAS_ESTIMATES[transactionType];
  const estimatedFeeEth = gasPrice
    ? ethers.utils.formatEther(gasPrice.mul(estimatedGas))
    : '0';
  
  // Calculate USD value with proper precision
  let estimatedFeeUsd = '0.00';
  if (gasPrice && monPrice > 0) {
    const feeInUsd = parseFloat(estimatedFeeEth) * monPrice;
    
    // Log calculation for debugging
    console.log('[useGasPrice] Fee calculation:', {
      estimatedGas,
      estimatedFeeEth,
      monPrice,
      feeInUsd
    });
    
    // Ensure we show at least $0.01 if fee is greater than 0 but rounds to 0.00
    if (feeInUsd > 0 && feeInUsd < 0.01) {
      estimatedFeeUsd = '< 0.01';
    } else if (feeInUsd >= 0.01) {
      estimatedFeeUsd = feeInUsd.toFixed(2);
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchGasPrice();

    // Disable automatic polling - only fetch on demand
    // Gas price doesn't change frequently enough to justify constant polling
    // const interval = setInterval(fetchGasPrice, CACHE_DURATION);

    return () => {
      isMountedRef.current = false;
      // clearInterval(interval);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    gasPrice,
    gasPriceGwei,
    gasPriceEth,
    estimatedFeeEth,
    estimatedFeeUsd,
    isLoading,
    error,
    refetch: fetchGasPrice,
  };
};

// Utility function to format gas price for display
export const formatGasPrice = (gwei: string): string => {
  const gweiNum = parseFloat(gwei);
  if (gweiNum < 0.01) {
    return '<0.01';
  }
  return gweiNum.toFixed(2);
};

// Utility function to estimate gas for a specific transaction
export const estimateTransactionGas = async (
  provider: ethers.providers.Provider,
  transaction: ethers.providers.TransactionRequest
): Promise<ethers.BigNumber> => {
  try {
    const estimatedGas = await provider.estimateGas(transaction);
    // Add 20% buffer for safety
    return estimatedGas.mul(120).div(100);
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Return default based on transaction type
    if (transaction.data && transaction.data !== '0x') {
      return ethers.BigNumber.from(GAS_ESTIMATES.swap);
    }
    return ethers.BigNumber.from(GAS_ESTIMATES.transfer);
  }
};