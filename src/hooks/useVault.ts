import { useState, useEffect, useCallback, useMemo } from 'react';
import { vaultApiService, VaultInfo } from '../services/vaultApiService';
import { useBlockchainWebSocketWagmi } from './useBlockchainWebSocketWagmi';

export interface UseVaultOptions {
  address?: string;
  token0?: string;
  token1?: string;
  deployerAddress?: string;
  autoFetch?: boolean;
  refetchInterval?: number;
}

export interface UseVaultReturn {
  vaults: VaultInfo[];
  vault: VaultInfo | null; // Single vault when address is provided
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

export function useVault(options: UseVaultOptions = {}): UseVaultReturn {
  const { 
    address, 
    token0, 
    token1, 
    deployerAddress, 
    autoFetch = true,
    refetchInterval 
  } = options;
  
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use WebSocket for real-time updates (future enhancement)
  const { isConnected, isAuthenticated } = useBlockchainWebSocketWagmi();

  // Fetch vaults based on provided options
  const fetchVaults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let result: VaultInfo[];
      
      if (token0 && token1) {
        // Fetch by token pair
        result = await vaultApiService.getVaultsByTokenPair(token0, token1);
      } else if (deployerAddress) {
        // Fetch by deployer
        result = await vaultApiService.getVaultsByDeployer(deployerAddress);
      } else if (address) {
        // Fetch specific vault
        result = await vaultApiService.fetchVaults(address);
      } else {
        // Fetch all vaults
        result = await vaultApiService.getAllVaults();
      }
      
      setVaults(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch vaults';
      setError(errorMessage);
      console.error('[useVault] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [address, token0, token1, deployerAddress]);

  // Extract single vault when address is provided
  const vault = useMemo(() => {
    if (address && vaults.length > 0) {
      return vaults.find(v => v.address.toLowerCase() === address.toLowerCase()) || null;
    }
    return null;
  }, [address, vaults]);

  // Clear cache
  const clearCache = useCallback(() => {
    vaultApiService.clearCache();
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchVaults();
    }
  }, [autoFetch, fetchVaults]);

  // Set up refetch interval if specified
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(fetchVaults, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetchInterval, fetchVaults]);

  // Future: Subscribe to WebSocket updates for real-time vault changes
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      // TODO: Subscribe to vault update events when WebSocket supports it
      // websocketService.subscribe(['vault-updates']);
    }
  }, [isConnected, isAuthenticated]);

  return {
    vaults,
    vault,
    loading,
    error,
    refetch: fetchVaults,
    clearCache
  };
}

// Hook to get vault for current pool
export function usePoolVault(poolAddress?: string): UseVaultReturn & { poolAddress?: string } {
  const [vaultAddress, setVaultAddress] = useState<string | undefined>();
  
  // First, get all vaults
  const allVaultsResult = useVault({ autoFetch: !!poolAddress });
  
  // Find vault for this pool
  useEffect(() => {
    if (poolAddress && allVaultsResult.vaults.length > 0) {
      const vault = allVaultsResult.vaults.find(v => 
        v.address.toLowerCase() === poolAddress.toLowerCase()
      );
      setVaultAddress(vault?.address);
    }
  }, [poolAddress, allVaultsResult.vaults]);

  // Then fetch specific vault details
  const vaultResult = useVault({ 
    address: vaultAddress,
    autoFetch: !!vaultAddress 
  });

  return {
    ...vaultResult,
    poolAddress
  };
}