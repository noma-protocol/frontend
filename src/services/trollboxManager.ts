// Global WebSocket manager - outside of React lifecycle
let globalWs: WebSocket | null = null;
let connectionPromise: Promise<void> | null = null;
let isConnecting = false;
const listeners = new Set<(data: any) => void>();

const connect = (wsUrl: string = 'ws://localhost:9090'): Promise<void> => {
  console.trace('Connect called from:');
  
  // If already connecting, return existing promise
  if (connectionPromise) {
    console.log('Connection already in progress, returning existing promise');
    return connectionPromise;
  }

  // If already connected, return resolved promise
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    console.log('Already connected');
    return Promise.resolve();
  }

  console.log('Creating new WebSocket connection');
  
  connectionPromise = new Promise((resolve, reject) => {
    try {
      // Close any existing connection
      if (globalWs) {
        globalWs.onclose = null;
        globalWs.close();
      }

      globalWs = new WebSocket(wsUrl);
      
      globalWs.onopen = () => {
        console.log('WebSocket connected');
        isConnecting = false;
        connectionPromise = null;
        notifyListeners({ type: 'connected' });
        resolve();
      };

      globalWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          notifyListeners(data);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      globalWs.onclose = (event) => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
        globalWs = null;
        isConnecting = false;
        connectionPromise = null;
        notifyListeners({ type: 'disconnected' });
        
        // Only reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          console.log('Scheduling reconnect in 3 seconds...');
          setTimeout(() => connect(wsUrl), 3000);
        }
      };

      globalWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting = false;
        connectionPromise = null;
        notifyListeners({ type: 'error', message: 'Connection error' });
        reject(error);
      };
    } catch (err) {
      isConnecting = false;
      connectionPromise = null;
      reject(err);
    }
  });

  return connectionPromise;
};

const sendMessage = (message: any): boolean => {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify(message));
    return true;
  }
  return false;
};

const addListener = (listener: (data: any) => void) => {
  listeners.add(listener);
};

const removeListener = (listener: (data: any) => void) => {
  listeners.delete(listener);
};

const notifyListeners = (data: any) => {
  listeners.forEach(listener => {
    try {
      listener(data);
    } catch (err) {
      console.error('Error in listener:', err);
    }
  });
};

// Start ping interval immediately
setInterval(() => {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    sendMessage({ type: 'ping' });
  }
}, 30000);

export const trollboxManager = {
  connect,
  sendMessage,
  addListener,
  removeListener
};