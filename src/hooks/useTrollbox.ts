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
}

interface UseTrollboxReturn {
  messages: Message[];
  connected: boolean;
  authenticated: boolean;
  username: string | null;
  canChangeUsername: boolean;
  cooldownRemaining: number;
  userCount: number;
  sendMessage: (content: string, username?: string, replyTo?: { id: string; username: string; content: string }) => void;
  authenticate: (address: string, username?: string) => void;
  changeUsername: (username: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  clearAuth: (address?: string) => void;
  error: string | null;
}

// Auth storage keys
const AUTH_STORAGE_KEY = 'trollbox_auth';
const AUTH_MESSAGE_PREFIX = 'Sign this message to authenticate with the Noma Trollbox\n\nTimestamp: ';

export const useTrollbox = (wsUrl: string = 'wss://trollbox-ws.noma.money'): UseTrollboxReturn => {
  const { signMessageAsync } = useSignMessage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useTrollbox effect running');
    let mounted = true;
    let connectTimeout: NodeJS.Timeout;

    // Check if already connected on mount
    if (globalTrollbox.isConnected()) {
      console.log('WebSocket already connected, updating state');
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
          setError(null);
          
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
          setMessages(prev => [...prev.slice(-99), data]); // Keep last 100 messages
          break;
          
        case 'error':
          setError(data.message);
          setTimeout(() => {
            if (mounted) setError(null);
          }, 5000);
          break;
      }
    };

    // Add listener
    globalTrollbox.addListener(handleMessage);
    
    // Debounce connection to prevent multiple rapid calls
    connectTimeout = setTimeout(() => {
      if (mounted) {
        globalTrollbox.connect(wsUrl);
      }
    }, 100);

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(connectTimeout);
      globalTrollbox.removeListener(handleMessage);
    };
  }, [wsUrl]);
  
  const sendMessage = useCallback((content: string, username: string = 'Anonymous', replyTo?: { id: string; username: string; content: string }) => {
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
      replyTo
    });
    
    if (!success) {
      setError('Not connected to chat server');
    }
  }, [authenticated]);
  
  const authenticate = useCallback(async (address: string, username?: string) => {
    if (!connected) {
      setError('Not connected to chat server');
      return;
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
            // Try to use cached auth first
            const success = globalTrollbox.sendMessage({
              type: 'checkAuth',
              address
            });
            
            if (success) {
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
      
      // Request signature from wallet
      const signature = await signMessageAsync({ message });
      
      // Send authentication with signature
      const success = globalTrollbox.sendMessage({
        type: 'auth',
        address,
        signature,
        message,
        username
      });
      
      if (!success) {
        setError('Failed to authenticate');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to sign authentication message');
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
  
  const reconnect = useCallback(() => {
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
    disconnect,
    reconnect,
    clearAuth,
    error 
  };
};