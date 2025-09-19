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
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'getHistory' | 'getLatest' | 'event' | 'error' | 'authenticated' | 'subscribed' | 'history' | 'latest' | 'connection';
  data?: any;
  events?: any[];
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
  private reconnectDelay = 1000;
  private authenticated = false;
  private subscribedPools: Set<string> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private authPromiseResolve: ((value: boolean) => void) | null = null;
  private authPromiseReject: ((reason: any) => void) | null = null;
  private historyPromiseResolve: ((value: BlockchainEvent[]) => void) | null = null;
  private historyPromiseReject: ((reason: any) => void) | null = null;

  constructor(url?: string) {
    this.url = url || (import.meta.env.VITE_WSS_URL as string) || 'ws://localhost:8080';
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
          resolve();
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.authenticated = false;
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
        if (this.authPromiseReject && message.error?.includes('auth')) {
          this.authPromiseReject(new Error(message.error));
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
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

      case 'subscribed':
        console.log('[WebSocketService] Successfully subscribed to pools');
        break;

      case 'connection':
        console.log('[WebSocketService] Connection established:', message.message);
        if (message.clientId) {
          console.log('[WebSocketService] Client ID:', message.clientId);
        }
        break;

      default:
        console.log('[WebSocketService] Unhandled message type:', message.type);
    }
  }

  async authenticate(address: string, signer: ethers.Signer): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
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
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.authPromiseReject) {
          this.authPromiseReject(new Error('Authentication timeout'));
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
        }
      }, 30000);
    });
  }

  // Alternative authentication method using window.ethereum directly
  async authenticateWithWindowEthereum(address: string): Promise<boolean> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    return new Promise((resolve, reject) => {
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
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.authPromiseReject) {
          this.authPromiseReject(new Error('Authentication timeout'));
          this.authPromiseResolve = null;
          this.authPromiseReject = null;
        }
      }, 30000);
    });
  }

  subscribe(pools: string[]): void {
    if (!this.authenticated) {
      console.error('Must authenticate before subscribing to pools');
      return;
    }

    console.log('[WebSocketService] Subscribing to pools:', pools);
    pools.forEach(pool => this.subscribedPools.add(pool));

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
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.authenticated = false;
    this.subscribedPools.clear();
    this.notifyConnectionCallbacks(false);
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