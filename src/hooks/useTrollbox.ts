import { useState, useEffect, useCallback } from 'react';
import { globalTrollbox } from '../services/globalTrollbox';
import { useSignMessage } from 'wagmi';

interface Message {
  id: string;
  type: string;
  content: string;
  username: string;
  timestamp: string;
  clientId: string;
  replyTo?: {
    id: string;
    username: string;
    content: string;
  };
  isTradeAlert?: boolean;
  isCommand?: boolean;
  commandType?: string;
}

interface UseTrollboxReturn {
  messages: Message[];
  connected: boolean;
  authenticated: boolean;
  username: string | null;
  canChangeUsername: boolean;
  cooldownRemaining: number;
  userCount: number;
  sendMessage: (content: string, username?: string, replyTo?: { id: string; username: string; content: string }, commandData?: any) => void;
  authenticate: (address: string, username?: string) => void;
  changeUsername: (username: string) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  clearAuth: (address?: string) => void;
  error: string | null;
}

// Auth storage keys
const AUTH_STORAGE_KEY = 'trollbox_auth';
const AUTH_MESSAGE_PREFIX = 'Sign this message to authenticate with the Noma Trollbox\n\nTimestamp: ';

export const useTrollbox = (wsUrl: string = 'wss://trollbox-ws.noma.money', autoConnect: boolean = false): UseTrollboxReturn => {
  const { signMessageAsync } = useSignMessage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shouldConnect, setShouldConnect] = useState(autoConnect);

  useEffect(() => {
    // console.log('useTrollbox effect running');
    let mounted = true;
    let connectTimeout: NodeJS.Timeout;

    // Check if already connected on mount
    if (globalTrollbox.isConnected()) {
      // console.log('WebSocket already connected, updating state');
      setConnected(true);
      // Request current state from server
      globalTrollbox.sendMessage({ type: 'requestState' });
    }

    const handleMessage = (data: any) => {
      if (!mounted) return;

      switch (data.type) {
        case 'connected':
          setConnected(true);
          setError(null);
          break;
          
        case 'disconnected':
          setConnected(false);
          setAuthenticated(false);
          break;
          
        case 'welcome':
          setMessages(data.messages || []);
          if (data.userCount !== undefined) {
            setUserCount(data.userCount);
          }
          break;
          
        case 'userCount':
          setUserCount(data.count);
          break;
          
        case 'authenticated':
          setAuthenticated(true);
          setUsername(data.username);
          setCanChangeUsername(data.canChangeUsername);
          setCooldownRemaining(data.cooldownRemaining);
          setError('Authentication successful!');
          setTimeout(() => setError(null), 3000);
          
          // Store auth in localStorage if not from cache
          if (!data.fromCache && data.address) {
            const authData = localStorage.getItem(AUTH_STORAGE_KEY);
            let authMap = {};
            if (authData) {
              try {
                authMap = JSON.parse(authData);
              } catch (e) {}
            }
            authMap[data.address.toLowerCase()] = {
              timestamp: Date.now(),
              username: data.username
            };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authMap));
          }
          break;
          
        case 'requireAuth':
          // Server requires new authentication
          setAuthenticated(false);
          break;
          
        case 'state':
          // Handle state response when reconnecting
          if (data.authenticated) {
            setAuthenticated(true);
            setUsername(data.username);
            setCanChangeUsername(data.canChangeUsername);
            setCooldownRemaining(data.cooldownRemaining);
          }
          if (data.messages) {
            setMessages(data.messages);
          }
          if (data.userCount !== undefined) {
            setUserCount(data.userCount);
          }
          break;
          
        case 'usernameChanged':
          setUsername(data.username);
          setCanChangeUsername(data.canChangeUsername);
          setCooldownRemaining(data.cooldownRemaining);
          break;
          
        case 'message':
          // Add isCommand and commandType flags from server
          const messageData = {
            ...data,
            isCommand: data.isCommand || false,
            commandType: data.commandType || null
          };
          setMessages(prev => [...prev.slice(-99), messageData]); // Keep last 100 messages
          break;
          
        case 'command':
          // Handle command messages from server (like slap results)
          const commandMessage = {
            ...data,
            type: 'message',
            username: 'System',
            isCommand: true,
            commandType: data.commandType || 'command'
          };
          setMessages(prev => [...prev.slice(-99), commandMessage]);
          break;
          
        case 'tradeAlert':
          // Handle trade alert messages (server notices)
          const tradeMessage = {
            ...data,
            type: 'message',
            username: 'System',
            isTradeAlert: true
          };
          setMessages(prev => [...prev.slice(-99), tradeMessage]);
          break;
          
        case 'error':
          setError(data.message);
          setTimeout(() => {
            if (mounted) setError(null);
          }, 5000);
          break;
          
        case 'authFailed':
          setAuthenticated(false);
          setError(data.message || 'Authentication failed');
          // Clear cached auth if it failed
          if (data.address) {
            const authData = localStorage.getItem(AUTH_STORAGE_KEY);
            if (authData) {
              try {
                const authMap = JSON.parse(authData);
                delete authMap[data.address.toLowerCase()];
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authMap));
              } catch (e) {
                console.error('Error clearing failed auth:', e);
              }
            }
          }
          break;
          
        case 'clearAuth':
          // Server has requested to clear authentication
          console.log('Server requested auth clear:', data.message);
          
          // Clear local storage auth
          const authData = localStorage.getItem(AUTH_STORAGE_KEY);
          if (authData) {
            try {
              const authMap = JSON.parse(authData);
              // Clear all auth entries or specific ones based on context
              localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch (e) {
              console.error('Error clearing auth:', e);
            }
          }
          
          // Reset authentication state
          setAuthenticated(false);
          setUsername(null);
          setCanChangeUsername(true);
          setCooldownRemaining(0);
          
          // Show error message if provided
          if (data.message) {
            setError(data.message);
          }
          break;
      }
    };

    // Add listener
    globalTrollbox.addListener(handleMessage);
    
    // Only connect if shouldConnect is true
    if (shouldConnect) {
      // Debounce connection to prevent multiple rapid calls
      connectTimeout = setTimeout(() => {
        if (mounted) {
          globalTrollbox.connect(wsUrl);
        }
      }, 100);
    }

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(connectTimeout);
      globalTrollbox.removeListener(handleMessage);
    };
  }, [wsUrl, shouldConnect]);
  
  const sendMessage = useCallback((content: string, username: string = 'Anonymous', replyTo?: { id: string; username: string; content: string }, commandData?: any) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    
    if (!authenticated) {
      setError('Must authenticate before sending messages');
      return;
    }
    
    const success = globalTrollbox.sendMessage({
      type: 'message',
      content: trimmedContent,
      username: username.trim() || 'Anonymous',
      replyTo,
      ...commandData // Spread any additional command data
    });
    
    if (!success) {
      setError('Not connected to chat server');
    }
  }, [authenticated]);
  
  const authenticate = useCallback(async (address: string, username?: string) => {
    if (!connected) {
      const error = 'Not connected to chat server';
      setError(error);
      throw new Error(error);
    }
    
    try {
      // Check if we have valid cached auth
      const authData = localStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        try {
          const authMap = JSON.parse(authData);
          const cachedAuth = authMap[address.toLowerCase()];
          
          // Check if cached auth is still valid (24 hours)
          if (cachedAuth && Date.now() - cachedAuth.timestamp < 24 * 60 * 60 * 1000) {
            setError('Checking cached authentication...');
            // Try to use cached auth first
            const success = globalTrollbox.sendMessage({
              type: 'checkAuth',
              address
            });
            
            if (success) {
              // Clear error after short delay to show the message
              setTimeout(() => setError(null), 1000);
              return; // Wait for server response
            }
          }
        } catch (e) {
          console.error('Error parsing auth cache:', e);
        }
      }
      
      // Generate auth message with timestamp
      const timestamp = Date.now();
      const message = AUTH_MESSAGE_PREFIX + timestamp;
      setError('Please sign the message in your wallet...');
      
      // Request signature from wallet with retry for mobile
      let signature;
      try {
        signature = await signMessageAsync({ message });
        setError('Signature received, authenticating...');
      } catch (signError: any) {
        console.error('Sign message error:', signError);
        
        // Mobile wallet specific error handling
        if (signError?.message?.includes('User rejected') || 
            signError?.message?.includes('User denied') ||
            signError?.code === 4001) {
          setError('Signature request was rejected');
          return;
        }
        
        // Some mobile wallets might need a second attempt
        if (signError?.message?.includes('timeout') || 
            signError?.message?.includes('pending')) {
          setError('Wallet request timed out. Please try again.');
          return;
        }
        
        // Generic error
        setError(`Failed to sign message: ${signError?.message || 'Unknown error'}`);
        return;
      }
      
      // Validate signature
      if (!signature) {
        setError('No signature received from wallet');
        return;
      }
      
      // Send authentication with signature
      const success = globalTrollbox.sendMessage({
        type: 'auth',
        address,
        signature,
        message,
        username
      });
      
      if (!success) {
        setError('Failed to authenticate with server');
        throw new Error('Failed to authenticate with server');
      }
      
      // Don't show success here - wait for server response
      setError('Waiting for server confirmation...');
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to sign authentication message');
      throw error;
    }
  }, [connected, signMessageAsync]);
  
  const changeUsername = useCallback((username: string) => {
    if (!authenticated) {
      setError('Must authenticate before changing username');
      return;
    }
    
    if (!canChangeUsername) {
      const hours = Math.ceil(cooldownRemaining / (60 * 60 * 1000));
      setError(`Cannot change username yet. ${hours} hours remaining.`);
      return;
    }
    
    const success = globalTrollbox.sendMessage({
      type: 'changeUsername',
      username
    });
    
    if (!success) {
      setError('Failed to change username');
    }
  }, [authenticated, canChangeUsername, cooldownRemaining]);
  
  const disconnect = useCallback(() => {
    globalTrollbox.disconnect();
    setAuthenticated(false);
    setUsername(null);
    setMessages([]);
  }, []);
  
  const connect = useCallback(() => {
    setShouldConnect(true);
    if (!connected) {
      globalTrollbox.connect(wsUrl);
    }
  }, [wsUrl, connected]);

  const reconnect = useCallback(() => {
    setShouldConnect(true);
    globalTrollbox.connect(wsUrl);
  }, [wsUrl]);
  
  const clearAuth = useCallback((address?: string) => {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authData) {
      try {
        const authMap = JSON.parse(authData);
        if (address) {
          delete authMap[address.toLowerCase()];
        } else {
          // Clear all auth if no address specified
          Object.keys(authMap).forEach(key => delete authMap[key]);
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authMap));
      } catch (e) {
        console.error('Error clearing auth:', e);
      }
    }
  }, []);
  
  return { 
    messages, 
    connected, 
    authenticated,
    username,
    canChangeUsername,
    cooldownRemaining,
    userCount,
    sendMessage, 
    authenticate,
    changeUsername,
    connect,
    disconnect,
    reconnect,
    clearAuth,
    error 
  };
};