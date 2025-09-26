import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import config from '../config';

const { JsonRpcProvider } = ethers.providers;

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

  const provider = new JsonRpcProvider(config.RPC_URL);

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

      const currentGasPrice = await provider.getGasPrice();
      
      if (!isMountedRef.current) return;

      // Convert to Gwei (1 Gwei = 10^9 Wei)
      const gwei = ethers.utils.formatUnits(currentGasPrice, 'gwei');
      // Convert to ETH (1 ETH = 10^18 Wei)
      const eth = ethers.utils.formatEther(currentGasPrice);

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
  
  const estimatedFeeUsd = gasPrice && monPrice > 0
    ? (parseFloat(estimatedFeeEth) * monPrice).toFixed(2)
    : '0.00';

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchGasPrice();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchGasPrice, CACHE_DURATION);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
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