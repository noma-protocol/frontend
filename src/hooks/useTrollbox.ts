import { useState, useEffect, useCallback } from 'react';
import { globalTrollbox } from '../services/globalTrollbox';

interface Message {
  id: string;
  type: string;
  content: string;
  username: string;
  timestamp: string;
  clientId: string;
}

interface UseTrollboxReturn {
  messages: Message[];
  connected: boolean;
  authenticated: boolean;
  username: string | null;
  canChangeUsername: boolean;
  cooldownRemaining: number;
  userCount: number;
  sendMessage: (content: string, username?: string) => void;
  authenticate: (address: string, username?: string) => void;
  changeUsername: (username: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  error: string | null;
}

export const useTrollbox = (wsUrl: string = 'ws://localhost:9090'): UseTrollboxReturn => {
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
  
  const sendMessage = useCallback((content: string, username: string = 'Anonymous') => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    
    if (!authenticated) {
      setError('Must authenticate before sending messages');
      return;
    }
    
    const success = globalTrollbox.sendMessage({
      type: 'message',
      content: trimmedContent,
      username: username.trim() || 'Anonymous'
    });
    
    if (!success) {
      setError('Not connected to chat server');
    }
  }, [authenticated]);
  
  const authenticate = useCallback((address: string, username?: string) => {
    if (!connected) {
      setError('Not connected to chat server');
      return;
    }
    
    const success = globalTrollbox.sendMessage({
      type: 'auth',
      address,
      username
    });
    
    if (!success) {
      setError('Failed to authenticate');
    }
  }, [connected]);
  
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
    error 
  };
};