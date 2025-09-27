import { ethers } from 'ethers';

export interface BlockchainEvent {
  poolAddress: string;
  eventName: 'Swap' | 'Mint' | 'Burn' | 'Collect' | 'Flash';
  blockNumber: number;
  transactionHash: string;
  args: {
    sender: string;
    recipient: string;
    amount0?: string;
    amount1?: string;
    sqrtPriceX96?: string;
    liquidity?: string;
    tick?: string;
    [key: string]: any;
  };
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'getHistory' | 'getLatest' | 'getGlobalTrades' | 'event' | 'error' | 'authenticated' | 'subscribed' | 'history' | 'latest' | 'globalTrades' | 'connection' | 'ping' | 'pong' | 'unauthenticated';
  data?: any;
  events?: any[];
  trades?: any[];
  count?: number;
  pools?: string[];
  address?: string;
  signature?: string;
  message?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  error?: string;
  success?: boolean;
  clientId?: string;
}

export type EventCallback = (event: BlockchainEvent) => void;
export type ErrorCallback = (error: string) => void;
export type ConnectionCallback = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // Start with 5 seconds instead of 1 second
  private authenticated = false;
  private subscribedPools: Set<string> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private authPromiseResolve: ((value: boolean) => void) | null = null;
  private authPromiseReject: ((reason: any) => void) | null = null;
  private historyPromiseResolve: ((value: BlockchainEvent[]) => void) | null = null;
  private historyPromiseReject: ((reason: any) => void) | null = null;
  private authInProgress = false;
  private authPromise: Promise<boolean> | null = null;
  private lastAuthCredentials: { address: string; signer?: ethers.Signer } | null = null;
  private useWindowEthereum = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private authCheckInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly PONG_TIMEOUT = 10000; // 10 seconds
  private readonly AUTH_CHECK_INTERVAL = 120000; // 2 minutes

  constructor(url?: string) {
    const isProduction = import.meta.env.VITE_ENV === 'prod' || import.meta.env.VITE_ENV === 'production';
    this.url = url || (import.meta.env.VITE_WSS_URL as string) || (isProduction ? 'wss://trollbox-ws.noma.money' : 'ws://localhost:8080');
    console.log('[WebSocketService] Initialized with URL:', this.url);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        console.log('[WebSocketService] Attempting to connect to:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocketService] Connected successfully to', this.url);
          this.reconnectAttempts = 0;
          this.notifyConnectionCallbacks(true);
          this.startHeartbeat();
          resolve();
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.authenticated = false;
          // Clear authentication state
          this.authInProgress = false;
          this.authPromise = null;
          this.stopHeartbeat();
          this.notifyConnectionCallbacks(false);
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocketService] Connection error:', error);
          console.error('[WebSocketService] URL was:', this.url);
          this.notifyErrorCallbacks('WebSocket connection error');
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        // Handle authentication response
        if ('success' in message) {
          if (message.success) {
            this.authenticated = true;
            console.log('[WebSocketService] Authentication successful');
            if (this.authPromiseResolve) {
              this.authPromiseResolve(true);
              this.authPromiseResolve = null;
              this.authPromiseReject = null;
            }
            // Clear auth flags
            this.authInProgress = false;
            this.authPromise = null;
            // Re-subscribe to pools after authentication
            if (this.subscribedPools.size > 0) {
              this.subscribe(Array.from(this.subscribedPools));
            }
          } else {
            console.error('[WebSocketService] Authentication failed:', message.message);
            if (this.authPromiseReject) {
              this.authPromiseReject(new Error(message.message || 'Authentication failed'));
              this.authPromiseResolve = null;
              this.authPromiseReject = null;
            }
            // Clear auth flags
            this.authInProgress = false;
            this.authPromise = null;
          }
        }
        break;

      case 'authenticated':
        // Legacy support
        this.authenticated = true;
        if (this.authPromiseResolve) {
          this.authPromiseResolve(true);
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
        }
        // Clear auth flags
        this.authInProgress = false;
        this.authPromise = null;
        // Re-subscribe to pools after authentication
        if (this.subscribedPools.size > 0) {
          this.subscribe(Array.from(this.subscribedPools));
        }
        break;

      case 'event':
        if (message.data) {
          this.notifyEventCallbacks(message.data);
        }
        break;

      case 'error':
        console.error('WebSocket error:', message.error);
        this.notifyErrorCallbacks(message.error || 'Unknown error');
        
        // Check if authentication is lost
        if (message.error?.toLowerCase().includes('not authenticated') || 
            message.error?.toLowerCase().includes('authentication required') ||
            message.error?.toLowerCase().includes('unauthorized')) {
          console.log('[WebSocketService] Authentication lost, clearing auth state');
          this.authenticated = false;
          
          // Auto-reauthenticate if we have stored credentials
          if (this.lastAuthCredentials && !this.authInProgress) {
            console.log('[WebSocketService] Attempting auto-reauthentication...');
            setTimeout(() => {
              if (this.useWindowEthereum) {
                this.authenticateWithWindowEthereum(this.lastAuthCredentials.address);
              } else if (this.lastAuthCredentials.signer) {
                this.authenticate(this.lastAuthCredentials.address, this.lastAuthCredentials.signer);
              }
            }, 1000); // Small delay to prevent rapid retries
          }
        }
        
        if (this.authPromiseReject && message.error?.includes('auth')) {
          this.authPromiseReject(new Error(message.error));
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
          // Clear auth flags on auth error
          this.authInProgress = false;
          this.authPromise = null;
        }
        break;

      case 'history':
        console.log('[WebSocketService] Received history response:', message.count, 'events');
        if (this.historyPromiseResolve) {
          this.historyPromiseResolve(message.events || []);
          this.historyPromiseResolve = null;
          this.historyPromiseReject = null;
        }
        break;

      case 'latest':
        console.log('[WebSocketService] Received latest response:', message.count, 'events');
        if (this.historyPromiseResolve) {
          this.historyPromiseResolve(message.events || []);
          this.historyPromiseResolve = null;
          this.historyPromiseReject = null;
        }
        break;

      case 'globalTrades':
        console.log('[WebSocketService] Received global trades:', message.count, 'trades');
        if (this.historyPromiseResolve) {
          this.historyPromiseResolve(message.trades || []);
          this.historyPromiseResolve = null;
          this.historyPromiseReject = null;
        }
        break;

      case 'subscribed':
        console.log('[WebSocketService] Successfully subscribed to pools');
        break;

      case 'connection':
        console.log('[WebSocketService] Connection established:', message.message);
        if (message.clientId) {
          console.log('[WebSocketService] Client ID:', message.clientId);
        }
        break;

      case 'ping':
        // Respond to ping with pong
        this.send({ type: 'pong' });
        break;

      case 'pong':
        // Server responded to our ping, clear the timeout
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }
        break;

      case 'unauthenticated':
        // Server explicitly told us we're not authenticated
        console.log('[WebSocketService] Received unauthenticated message from server');
        this.authenticated = false;
        
        // Auto-reauthenticate if we have stored credentials
        if (this.lastAuthCredentials && !this.authInProgress) {
          console.log('[WebSocketService] Attempting auto-reauthentication after unauthenticated message...');
          setTimeout(() => {
            if (this.useWindowEthereum) {
              this.authenticateWithWindowEthereum(this.lastAuthCredentials.address);
            } else if (this.lastAuthCredentials.signer) {
              this.authenticate(this.lastAuthCredentials.address, this.lastAuthCredentials.signer);
            }
          }, 1000); // Small delay to prevent rapid retries
        }
        break;

      default:
        console.log('[WebSocketService] Unhandled message type:', message.type);
    }
  }

  async authenticate(address: string, signer: ethers.Signer): Promise<boolean> {
    // Store credentials for auto-reauthentication
    this.lastAuthCredentials = { address, signer };
    this.useWindowEthereum = false;

    // Check if authentication is already in progress
    if (this.authInProgress && this.authPromise) {
      console.log('[WebSocketService] Authentication already in progress, returning existing promise');
      return this.authPromise;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // Mark authentication as in progress and create the promise
    this.authInProgress = true;
    this.authPromise = new Promise((resolve, reject) => {
      this.authPromiseResolve = resolve;
      this.authPromiseReject = reject;

      const timestamp = Date.now();
      const message = `Sign this message to authenticate with the blockchain monitor at ${timestamp}`;

      console.log('[WebSocketService] Auth message:', message);
      console.log('[WebSocketService] Auth address:', address);

      signer.signMessage(message).then(signature => {
        console.log('[WebSocketService] Signature received:', signature);
        
        const authMessage: WebSocketMessage = {
          type: 'auth',
          address,
          signature,
          message
        };

        this.send(authMessage);
      }).catch(error => {
        reject(error);
        this.authPromiseResolve = null;
        this.authPromiseReject = null;
        this.authInProgress = false;
        this.authPromise = null;
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.authPromiseReject) {
          this.authPromiseReject(new Error('Authentication timeout'));
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
          this.authInProgress = false;
          this.authPromise = null;
        }
      }, 30000);
    });

    return this.authPromise;
  }

  // Alternative authentication method using window.ethereum directly
  async authenticateWithWindowEthereum(address: string): Promise<boolean> {
    // Store credentials for auto-reauthentication
    this.lastAuthCredentials = { address };
    this.useWindowEthereum = true;

    // Check if authentication is already in progress
    if (this.authInProgress && this.authPromise) {
      console.log('[WebSocketService] Authentication already in progress, returning existing promise');
      return this.authPromise;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    // Mark authentication as in progress and create the promise
    this.authInProgress = true;
    this.authPromise = new Promise((resolve, reject) => {
      this.authPromiseResolve = resolve;
      this.authPromiseReject = reject;

      const timestamp = Date.now();
      const message = `Sign this message to authenticate with the blockchain monitor at ${timestamp}`;

      console.log('[WebSocketService] Auth with window.ethereum - message:', message);
      console.log('[WebSocketService] Auth with window.ethereum - address:', address);

      window.ethereum.request({
        method: 'personal_sign',
        params: [message, address.toLowerCase()]
      }).then(signature => {
        console.log('[WebSocketService] Signature received via window.ethereum:', signature);
        
        const authMessage: WebSocketMessage = {
          type: 'auth',
          address,
          signature,
          message
        };

        this.send(authMessage);
      }).catch(error => {
        reject(error);
        this.authPromiseResolve = null;
        this.authPromiseReject = null;
        this.authInProgress = false;
        this.authPromise = null;
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.authPromiseReject) {
          this.authPromiseReject(new Error('Authentication timeout'));
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
          this.authInProgress = false;
          this.authPromise = null;
        }
      }, 30000);
    });

    return this.authPromise;
  }

  subscribe(pools: string[]): void {
    // Always track subscribed pools
    pools.forEach(pool => this.subscribedPools.add(pool));
    
    if (!this.authenticated) {
      console.log('[WebSocketService] Not authenticated yet, queuing subscription for pools:', pools);
      // The pools will be subscribed after authentication in handleMessage
      
      // If we have credentials, try to authenticate
      if (this.lastAuthCredentials && !this.authInProgress) {
        console.log('[WebSocketService] Triggering authentication before subscription...');
        if (this.useWindowEthereum) {
          this.authenticateWithWindowEthereum(this.lastAuthCredentials.address);
        } else if (this.lastAuthCredentials.signer) {
          this.authenticate(this.lastAuthCredentials.address, this.lastAuthCredentials.signer);
        }
      }
      return;
    }

    console.log('[WebSocketService] Subscribing to pools:', pools);

    const message: WebSocketMessage = {
      type: 'subscribe',
      pools
    };

    this.send(message);
  }

  unsubscribe(pools: string[]): void {
    pools.forEach(pool => this.subscribedPools.delete(pool));

    const message: WebSocketMessage = {
      type: 'unsubscribe',
      pools
    };

    this.send(message);
  }

  async getHistory(
    pools: string[],
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<BlockchainEvent[]> {
    if (!this.authenticated) {
      throw new Error('Must authenticate before fetching history');
    }

    return new Promise((resolve, reject) => {
      this.historyPromiseResolve = resolve;
      this.historyPromiseReject = reject;

      const message: WebSocketMessage = {
        type: 'getHistory',
        pools,
        startTime,
        endTime,
        limit
      };

      this.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.historyPromiseReject) {
          this.historyPromiseReject(new Error('History fetch timeout'));
          this.historyPromiseResolve = null;
          this.historyPromiseReject = null;
        }
      }, 30000);
    });
  }

  async getGlobalTrades(limit?: number): Promise<BlockchainEvent[]> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to WebSocket'));
        return;
      }

      if (!this.authenticated) {
        reject(new Error('Not authenticated'));
        return;
      }

      this.historyPromiseResolve = resolve;
      this.historyPromiseReject = reject;

      const message: WebSocketMessage = {
        type: 'getGlobalTrades',
        limit
      };

      this.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.historyPromiseReject) {
          this.historyPromiseReject(new Error('Request timeout'));
          this.historyPromiseResolve = null;
          this.historyPromiseReject = null;
        }
      }, 30000);
    });
  }

  async getLatestEvents(limit = 100): Promise<BlockchainEvent[]> {
    if (!this.authenticated) {
      throw new Error('Must authenticate before fetching latest events');
    }

    return new Promise((resolve, reject) => {
      this.historyPromiseResolve = resolve;
      this.historyPromiseReject = reject;

      const message: WebSocketMessage = {
        type: 'getLatest',
        limit
      };

      this.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.historyPromiseReject) {
          this.historyPromiseReject(new Error('Latest events fetch timeout'));
          this.historyPromiseResolve = null;
          this.historyPromiseReject = null;
        }
      }, 30000);
    });
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
      this.notifyErrorCallbacks('WebSocket is not connected');
    }
  }

  private attemptReconnect(): void {
    // Don't reconnect if authentication is in progress
    if (this.authInProgress) {
      console.log('Skipping reconnect - authentication in progress');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().then(() => {
        // Auto-reauthenticate if we have stored credentials
        if (this.lastAuthCredentials) {
          console.log('[WebSocketService] Auto-reauthenticating after reconnect...');
          if (this.useWindowEthereum) {
            this.authenticateWithWindowEthereum(this.lastAuthCredentials.address);
          } else if (this.lastAuthCredentials.signer) {
            this.authenticate(this.lastAuthCredentials.address, this.lastAuthCredentials.signer);
          }
        }
      }).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.authenticated = false;
    this.subscribedPools.clear();
    this.notifyConnectionCallbacks(false);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing heartbeat
    
    // Ping/pong interval
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping
        this.send({ type: 'ping' });
        
        // Set timeout for pong response
        this.pongTimeout = setTimeout(() => {
          console.warn('[WebSocketService] No pong received, connection might be dead');
          // Force reconnection
          if (this.ws) {
            this.ws.close();
          }
        }, this.PONG_TIMEOUT);
      }
    }, this.PING_INTERVAL);
    
    // Periodic auth check
    this.authCheckInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.authenticated) {
        // Test if we're still authenticated by trying to get latest events
        console.log('[WebSocketService] Performing periodic auth check...');
        this.send({ type: 'getLatest', limit: 1 });
      }
    }, this.AUTH_CHECK_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }
  }

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  private notifyEventCallbacks(event: BlockchainEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  private notifyErrorCallbacks(error: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getSubscribedPools(): string[] {
    return Array.from(this.subscribedPools);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Export the class for testing or multiple instances
export default WebSocketService;