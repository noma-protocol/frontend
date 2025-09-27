import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNetwork, useAccount } from 'wagmi';

interface NetworkContextType {
  chainId: number | undefined;
  isConnected: boolean;
  address: string | undefined;
  isConnecting: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  chainId: undefined,
  isConnected: false,
  address: undefined,
  isConnecting: false,
});

export const useNetworkContext = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkContext must be used within NetworkProvider');
  }
  return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { chain } = useNetwork();
  const { address, isConnected, isConnecting } = useAccount();
  const [cachedChainId, setCachedChainId] = useState<number | undefined>(chain?.id);

  // Only update chainId when it actually changes
  useEffect(() => {
    if (chain?.id !== cachedChainId) {
      setCachedChainId(chain?.id);
    }
  }, [chain?.id]);

  const value: NetworkContextType = {
    chainId: cachedChainId,
    isConnected,
    address,
    isConnecting,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};