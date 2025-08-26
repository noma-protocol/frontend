// Store singleton instance in global window object to persist across HMR reloads
declare global {
  interface Window {
    __trollboxConnection?: TrollboxConnection;
  }
}

// Singleton WebSocket connection manager
class TrollboxConnection {
  private ws: WebSocket | null = null;
  private listeners: Set<(data: any) => void> = new Set();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private wsUrl: string;
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }

  static getInstance(wsUrl: string = 'wss://trollbox-ws.noma.money'): TrollboxConnection {
    // Use global window object to persist singleton across HMR reloads
    if (!window.__trollboxConnection) {
      console.log('Creating NEW TrollboxConnection singleton instance');
      window.__trollboxConnection = new TrollboxConnection(wsUrl);
    } else {
      console.log('Returning EXISTING TrollboxConnection singleton instance');
    }
    return window.__trollboxConnection;
  }

  connect() {
    // Prevent duplicate connections
    if (this.isConnecting) {
      console.log('Already connecting, skipping...');
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected, skipping...');
      return;
    }

    // Close existing connection
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to trollbox (singleton)');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyListeners({ type: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from trollbox (singleton)');
        this.isConnecting = false;
        this.ws = null;
        this.notifyListeners({ type: 'disconnected' });

        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }

        // Exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, delay);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.notifyListeners({ type: 'error', message: 'Connection error' });
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      this.isConnecting = false;
      this.notifyListeners({ type: 'error', message: 'Failed to connect to chat server' });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  addListener(listener: (data: any) => void) {
    this.listeners.add(listener);
    
    // If already connected, notify the new listener
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      listener({ type: 'connected' });
    }
  }

  removeListener(listener: (data: any) => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners(data: any) {
    this.listeners.forEach(listener => listener(data));
  }

  // Keep-alive ping
  startPing() {
    // Prevent multiple ping intervals
    if (this.pingInterval) {
      console.log('Ping interval already running');
      return;
    }
    
    console.log('Starting ping interval');
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, 30000);
  }
}

export default TrollboxConnection;