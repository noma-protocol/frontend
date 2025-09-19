import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useWalletClient } from 'wagmi';
import { websocketService, BlockchainEvent } from '../services/websocketService';

// Extend window interface for ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export interface UseBlockchainWebSocketOptions {
  autoConnect?: boolean;
  autoAuthenticate?: boolean;
  pools?: string[];
}

export interface UseBlockchainWebSocketReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  events: BlockchainEvent[];
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  authenticate: () => Promise<boolean>;
  subscribe: (pools: string[]) => void;
  unsubscribe: (pools: string[]) => void;
  getHistory: (pools: string[], startTime?: number, endTime?: number, limit?: number) => Promise<BlockchainEvent[]>;
  getLatestEvents: (limit?: number) => Promise<BlockchainEvent[]>;
  clearEvents: () => void;
}

export function useBlockchainWebSocketWagmi(options: UseBlockchainWebSocketOptions = {}): UseBlockchainWebSocketReturn {
  const { autoConnect = true, autoAuthenticate = true, pools = [] } = options;
  const { address, isConnected: isWalletConnected, connector } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();
  
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [isAuthenticated, setIsAuthenticated] = useState(websocketService.isAuthenticated());
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventsRef = useRef<BlockchainEvent[]>([]);
  const maxEventsRef = useRef(1000); // Keep last 1000 events

  // Handle new events
  const handleEvent = useCallback((event: BlockchainEvent) => {
    setEvents(prevEvents => {
      const newEvents = [...prevEvents, event];
      // Keep only the last maxEvents
      if (newEvents.length > maxEventsRef.current) {
        return newEvents.slice(-maxEventsRef.current);
      }
      eventsRef.current = newEvents;
      return newEvents;
    });
  }, []);

  // Handle errors
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error('WebSocket error:', errorMessage);
  }, []);

  // Handle connection changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    if (!connected) {
      setIsAuthenticated(false);
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      setError(null);
      await websocketService.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      throw err;
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setEvents([]);
    eventsRef.current = [];
  }, []);

  // Authenticate with signature - simplified to use window.ethereum when available
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!address || !isWalletConnected) {
      setError('No wallet connected. Please connect your wallet first.');
      return false;
    }

    try {
      setError(null);
      
      // Use window.ethereum directly if available (works with most wallets)
      if (window.ethereum && window.ethereum.request) {
        console.log('[useBlockchainWebSocketWagmi] Using direct window.ethereum authentication');
        const result = await websocketService.authenticateWithWindowEthereum(address);
        if (result) {
          setIsAuthenticated(true);
        }
        return result;
      }
      
      // Fallback to wagmi methods if window.ethereum not available
      console.log('[useBlockchainWebSocketWagmi] window.ethereum not available, trying wagmi methods');
      console.log('[useBlockchainWebSocketWagmi] walletClient:', !!walletClient);
      console.log('[useBlockchainWebSocketWagmi] connector:', !!connector);
      
      const timestamp = Date.now();
      const message = `Sign this message to authenticate with the blockchain monitor at ${timestamp}`;
      let signature: string;
      
      if (walletClient && walletClient.signMessage) {
        console.log('[useBlockchainWebSocketWagmi] Using walletClient.signMessage');
        signature = await walletClient.signMessage({
          account: address as `0x${string}`,
          message
        });
      } else if (signMessageAsync) {
        console.log('[useBlockchainWebSocketWagmi] Using signMessageAsync hook');
        signature = await signMessageAsync({ message });
      } else {
        throw new Error('No signing method available');
      }
      
      // Send auth message
      websocketService.send({
        type: 'auth',
        address,
        signature,
        message
      });
      
      // Wait for auth response
      const authResult = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          setError('Authentication timeout');
          resolve(false);
        }, 5000);
        
        const checkInterval = setInterval(() => {
          if (websocketService.isAuthenticated()) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            setIsAuthenticated(true);
            resolve(true);
          }
        }, 100);
      });
      
      return authResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      console.error('[useBlockchainWebSocketWagmi] Auth error:', err);
      setError(errorMessage);
      setIsAuthenticated(false);
      return false;
    }
  }, [address, isWalletConnected, walletClient, signMessageAsync]);

  // Subscribe to pools
  const subscribe = useCallback((poolAddresses: string[]) => {
    if (!isAuthenticated) {
      setError('Must authenticate before subscribing');
      return;
    }
    websocketService.subscribe(poolAddresses);
  }, [isAuthenticated]);

  // Unsubscribe from pools
  const unsubscribe = useCallback((poolAddresses: string[]) => {
    websocketService.unsubscribe(poolAddresses);
  }, []);

  // Get historical events
  const getHistory = useCallback(async (
    poolAddresses: string[],
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<BlockchainEvent[]> => {
    if (!isAuthenticated) {
      throw new Error('Must authenticate before fetching history');
    }
    try {
      setError(null);
      const history = await websocketService.getHistory(poolAddresses, startTime, endTime, limit);
      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(errorMessage);
      throw err;
    }
  }, [isAuthenticated]);

  // Get latest events
  const getLatestEvents = useCallback(async (limit?: number): Promise<BlockchainEvent[]> => {
    if (!isAuthenticated) {
      throw new Error('Must authenticate before fetching latest events');
    }
    try {
      setError(null);
      const latest = await websocketService.getLatestEvents(limit);
      return latest;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch latest events';
      setError(errorMessage);
      throw err;
    }
  }, [isAuthenticated]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    eventsRef.current = [];
  }, []);

  // Setup effect
  useEffect(() => {
    // Subscribe to WebSocket events
    const unsubscribeEvent = websocketService.onEvent(handleEvent);
    const unsubscribeError = websocketService.onError(handleError);
    const unsubscribeConnection = websocketService.onConnectionChange(handleConnectionChange);

    // Auto-connect if enabled
    if (autoConnect && !isConnected) {
      connect().catch(err => {
        console.error('Auto-connect failed:', err);
      });
    }

    // Sync authentication state periodically
    const authSyncInterval = setInterval(() => {
      const serviceAuth = websocketService.isAuthenticated();
      if (serviceAuth !== isAuthenticated) {
        console.log('[useBlockchainWebSocketWagmi] Syncing auth state:', serviceAuth);
        setIsAuthenticated(serviceAuth);
      }
    }, 1000);

    // Cleanup
    return () => {
      unsubscribeEvent();
      unsubscribeError();
      unsubscribeConnection();
      clearInterval(authSyncInterval);
    };
  }, [autoConnect, isConnected, isAuthenticated, connect, handleEvent, handleError, handleConnectionChange]);

  // Auto-authenticate when wallet connects
  useEffect(() => {
    // Prevent double-trigger
    if (!autoAuthenticate) return;
    
    // Add a small delay to ensure wallet connector is ready
    const timer = setTimeout(() => {
      if (isConnected && !isAuthenticated && address && isWalletConnected) {
        console.log('[useBlockchainWebSocketWagmi] Auto-authentication triggered');
        // Double-check that we have a proper connection before attempting auth
        authenticate().catch(err => {
          console.error('Auto-authenticate failed:', err);
          // Don't spam errors for connector issues during startup
          if (!err.message?.includes('Connector not found')) {
            setError(err.message || 'Authentication failed');
          }
        });
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [autoAuthenticate, isConnected, isAuthenticated, address, isWalletConnected]); // Remove authenticate from deps to prevent loops

  // Auto-subscribe to initial pools after authentication
  useEffect(() => {
    if (isAuthenticated && pools.length > 0) {
      subscribe(pools);
    }
  }, [isAuthenticated, pools, subscribe]);

  return {
    isConnected,
    isAuthenticated,
    events,
    error,
    connect,
    disconnect,
    authenticate,
    subscribe,
    unsubscribe,
    getHistory,
    getLatestEvents,
    clearEvents
  };
}