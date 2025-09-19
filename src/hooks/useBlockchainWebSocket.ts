import { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { websocketService, BlockchainEvent } from '../services/websocketService';

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

export function useBlockchainWebSocket(options: UseBlockchainWebSocketOptions = {}): UseBlockchainWebSocketReturn {
  const { autoConnect = true, autoAuthenticate = true, pools = [] } = options;
  const { account, provider } = useWeb3React();
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

  // Authenticate with signature
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!account || !provider) {
      setError('No wallet connected');
      return false;
    }

    try {
      setError(null);
      const signer = provider.getSigner();
      const authenticated = await websocketService.authenticate(account, signer);
      setIsAuthenticated(authenticated);
      return authenticated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setIsAuthenticated(false);
      return false;
    }
  }, [account, provider]);

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

    // Cleanup
    return () => {
      unsubscribeEvent();
      unsubscribeError();
      unsubscribeConnection();
    };
  }, [autoConnect, isConnected, connect, handleEvent, handleError, handleConnectionChange]);

  // Auto-authenticate when account/provider changes
  useEffect(() => {
    if (autoAuthenticate && isConnected && !isAuthenticated && account && provider) {
      authenticate().catch(err => {
        console.error('Auto-authenticate failed:', err);
      });
    }
  }, [autoAuthenticate, isConnected, isAuthenticated, account, provider, authenticate]);

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