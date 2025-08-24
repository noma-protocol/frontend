// Store everything on window to survive HMR
declare global {
  interface Window {
    __trollboxWs?: WebSocket;
    __trollboxListeners?: Set<(data: any) => void>;
    __trollboxConnecting?: boolean;
    __trollboxConnectionPromise?: Promise<void>;
    __trollboxInitialized?: boolean;
    __trollboxLastConnectionAttempt?: number;
  }
}

// Initialize global state ONLY ONCE
if (!window.__trollboxInitialized) {
  console.log('Initializing global trollbox for the first time');
  window.__trollboxInitialized = true;
  window.__trollboxListeners = new Set();
  
  // Close any stale connection from previous page load
  if (window.__trollboxWs) {
    window.__trollboxWs.close();
    window.__trollboxWs = undefined;
  }
} else {
  console.log('Global trollbox already initialized');
}

const connect = (wsUrl: string = 'ws://localhost:9090'): Promise<void> => {
  // Rate limit connection attempts
  const now = Date.now();
  if (window.__trollboxLastConnectionAttempt && now - window.__trollboxLastConnectionAttempt < 1000) {
    console.log('Connection attempt too soon, skipping');
    return Promise.resolve();
  }
  window.__trollboxLastConnectionAttempt = now;

  // If already connecting, return existing promise
  if (window.__trollboxConnectionPromise) {
    console.log('Using existing connection promise');
    return window.__trollboxConnectionPromise;
  }

  // If already connected, return resolved promise
  if (window.__trollboxWs && window.__trollboxWs.readyState === WebSocket.OPEN) {
    console.log('Already connected, skipping');
    return Promise.resolve();
  }

  console.log('Creating NEW WebSocket connection (for real this time)');
  
  window.__trollboxConnectionPromise = new Promise((resolve, reject) => {
    try {
      // Close any existing connection
      if (window.__trollboxWs) {
        window.__trollboxWs.onclose = null;
        window.__trollboxWs.close();
      }

      window.__trollboxWs = new WebSocket(wsUrl);
      
      window.__trollboxWs.onopen = () => {
        console.log('WebSocket connected successfully');
        window.__trollboxConnectionPromise = undefined;
        window.__trollboxConnecting = false;
        notifyListeners({ type: 'connected' });
        resolve();
      };

      window.__trollboxWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          notifyListeners(data);
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      window.__trollboxWs.onclose = (event) => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
        window.__trollboxWs = undefined;
        window.__trollboxConnectionPromise = undefined;
        window.__trollboxConnecting = false;
        notifyListeners({ type: 'disconnected' });
        
        // Only reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          setTimeout(() => connect(wsUrl), 3000);
        }
      };

      window.__trollboxWs.onerror = (error) => {
        console.error('WebSocket error:', error);
        window.__trollboxConnectionPromise = undefined;
        window.__trollboxConnecting = false;
        notifyListeners({ type: 'error', message: 'Connection error' });
        reject(error);
      };
    } catch (err) {
      window.__trollboxConnectionPromise = undefined;
      window.__trollboxConnecting = false;
      reject(err);
    }
  });

  return window.__trollboxConnectionPromise;
};

const sendMessage = (message: any): boolean => {
  if (window.__trollboxWs && window.__trollboxWs.readyState === WebSocket.OPEN) {
    window.__trollboxWs.send(JSON.stringify(message));
    return true;
  }
  return false;
};

const addListener = (listener: (data: any) => void) => {
  window.__trollboxListeners?.add(listener);
};

const removeListener = (listener: (data: any) => void) => {
  window.__trollboxListeners?.delete(listener);
};

const notifyListeners = (data: any) => {
  window.__trollboxListeners?.forEach(listener => {
    try {
      listener(data);
    } catch (err) {
      console.error('Error in listener:', err);
    }
  });
};

// Only start ONE ping interval globally
if (!window.__trollboxPingInterval) {
  console.log('Starting global ping interval');
  (window as any).__trollboxPingInterval = setInterval(() => {
    if (window.__trollboxWs && window.__trollboxWs.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'ping' });
    }
  }, 30000);
}

const disconnect = () => {
  if (window.__trollboxWs) {
    console.log('Disconnecting from trollbox');
    window.__trollboxWs.close(1000, 'User disconnected');
    window.__trollboxWs = undefined;
    window.__trollboxConnectionPromise = undefined;
    notifyListeners({ type: 'disconnected' });
  }
};

export const globalTrollbox = {
  connect,
  disconnect,
  sendMessage,
  addListener,
  removeListener
};