import React, { createContext, useContext, useState, useEffect } from 'react';
import { useContractRead } from 'wagmi';
import { ethers } from 'ethers';

interface MonPriceContextType {
  monPrice: number;
  monPriceChange: number;
  isLoading: boolean;
}

const MonPriceContext = createContext<MonPriceContextType>({
  monPrice: 0,
  monPriceChange: 0,
  isLoading: true,
});

export const useMonPrice = () => {
  const context = useContext(MonPriceContext);
  if (!context) {
    throw new Error('useMonPrice must be used within MonPriceProvider');
  }
  return context;
};

// Uniswap V3 Pool ABI (only what we need)
const poolABI = [
  {
    "inputs": [],
    "name": "slot0",
    "outputs": [
      {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
      {"internalType": "int24", "name": "tick", "type": "int24"},
      {"internalType": "uint16", "name": "observationIndex", "type": "uint16"},
      {"internalType": "uint16", "name": "observationCardinality", "type": "uint16"},
      {"internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16"},
      {"internalType": "uint8", "name": "feeProtocol", "type": "uint8"},
      {"internalType": "bool", "name": "unlocked", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const MonPriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [monPrice, setMonPrice] = useState(0);
  const [monPriceChange, setMonPriceChange] = useState(0);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);

  // Uniswap V3 MON/USDT pool address
  const poolAddress = '0xE4baba78F933D58d52b7D564212b2C4CF910A36a';

  // Read pool slot0 data
  const { data: slot0Data, isLoading } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: poolABI,
    functionName: 'slot0',
    watch: true,
    cacheTime: 30_000, // Cache for 30 seconds
    staleTime: 10_000, // Consider stale after 10 seconds
  });

  useEffect(() => {
    if (slot0Data && Array.isArray(slot0Data) && slot0Data.length > 0) {
      const sqrtPriceX96 = slot0Data[0];
      
      // Convert sqrtPriceX96 to price
      // Price = (sqrtPriceX96 / 2^96)^2
      const sqrtPrice = parseFloat(sqrtPriceX96.toString()) / Math.pow(2, 96);
      const price = sqrtPrice * sqrtPrice;
      
      // MON has 18 decimals, USDT has 6 decimals
      // So we need to adjust by 10^12
      const monPriceInUSD = price * Math.pow(10, 12);
      
      // Update price
      setMonPrice(monPriceInUSD);
      
      // Calculate price change if we have a previous price
      if (previousPrice !== null && previousPrice !== 0) {
        const change = ((monPriceInUSD - previousPrice) / previousPrice) * 100;
        setMonPriceChange(change);
      }
      
      // Store current price as previous for next update
      setPreviousPrice(monPriceInUSD);
    }
  }, [slot0Data, previousPrice]);

  const value: MonPriceContextType = {
    monPrice,
    monPriceChange,
    isLoading,
  };

  return (
    <MonPriceContext.Provider value={value}>
      {children}
    </MonPriceContext.Provider>
  );
};