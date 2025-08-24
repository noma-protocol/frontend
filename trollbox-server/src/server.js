import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import cors from 'cors';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');
const USERNAMES_FILE = join(DATA_DIR, 'usernames.json');
const PROFILES_FILE = join(DATA_DIR, 'profiles.json');
const PORT = process.env.PORT || 9090;

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Message store
class MessageStore {
  constructor() {
    this.messages = this.loadMessages();
    this.MAX_MESSAGES = 1000; // Keep last 1000 messages
  }

  loadMessages() {
    try {
      if (existsSync(MESSAGES_FILE)) {
        const data = readFileSync(MESSAGES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    return [];
  }

  saveMessages() {
    try {
      writeFileSync(MESSAGES_FILE, JSON.stringify(this.messages, null, 2));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  addMessage(message) {
    this.messages.push(message);
    
    // Keep only the last MAX_MESSAGES
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-this.MAX_MESSAGES);
    }
    
    this.saveMessages();
    return message;
  }

  getRecentMessages(limit = 50) {
    return this.messages.slice(-limit);
  }
}

// Username-Address binding store
class UsernameStore {
  constructor() {
    this.bindings = this.loadBindings();
    this.BASE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  loadBindings() {
    try {
      if (existsSync(USERNAMES_FILE)) {
        const data = readFileSync(USERNAMES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading usernames:', error);
    }
    return {};
  }

  saveBindings() {
    try {
      writeFileSync(USERNAMES_FILE, JSON.stringify(this.bindings, null, 2));
    } catch (error) {
      console.error('Error saving usernames:', error);
    }
  }

  canChangeUsername(address) {
    const binding = this.bindings[address];
    if (!binding) return true; // No binding exists, can set username
    
    const now = Date.now();
    const cooldownEnd = binding.lastChange + binding.cooldown;
    
    return now >= cooldownEnd;
  }

  getRemainingCooldown(address) {
    const binding = this.bindings[address];
    if (!binding) return 0;
    
    const now = Date.now();
    const cooldownEnd = binding.lastChange + binding.cooldown;
    const remaining = cooldownEnd - now;
    
    return remaining > 0 ? remaining : 0;
  }

  setUsername(address, username) {
    const now = Date.now();
    const existingBinding = this.bindings[address];
    
    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      return { success: false, error: 'Username must be 3-20 characters long' };
    }
    
    // Only allow alphanumeric, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { success: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
    
    // Check if username is already taken by another address
    for (const [addr, binding] of Object.entries(this.bindings)) {
      if (addr !== address && binding.username.toLowerCase() === username.toLowerCase()) {
        return { success: false, error: 'Username already taken' };
      }
    }
    
    // Check cooldown
    if (!this.canChangeUsername(address)) {
      const remaining = this.getRemainingCooldown(address);
      const hours = Math.ceil(remaining / (60 * 60 * 1000));
      return { 
        success: false, 
        error: `Cannot change username yet. ${hours} hours remaining.` 
      };
    }
    
    // Calculate new cooldown (double previous or base if first time)
    const newCooldown = existingBinding 
      ? existingBinding.cooldown * 2 
      : this.BASE_COOLDOWN;
    
    // Update binding
    this.bindings[address] = {
      username,
      lastChange: now,
      cooldown: newCooldown,
      changeCount: (existingBinding?.changeCount || 0) + 1
    };
    
    this.saveBindings();
    return { success: true };
  }

  getUsername(address) {
    return this.bindings[address]?.username || null;
  }

  getAddressForUsername(username) {
    for (const [address, binding] of Object.entries(this.bindings)) {
      if (binding.username.toLowerCase() === username.toLowerCase()) {
        return address;
      }
    }
    return null;
  }
}

// Profile store for tracking user data
class ProfileStore {
  constructor() {
    this.profiles = this.loadProfiles();
  }

  loadProfiles() {
    try {
      if (existsSync(PROFILES_FILE)) {
        const data = readFileSync(PROFILES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
    return {};
  }

  saveProfiles() {
    try {
      writeFileSync(PROFILES_FILE, JSON.stringify(this.profiles, null, 2));
    } catch (error) {
      console.error('Error saving profiles:', error);
    }
  }

  getProfile(address) {
    return this.profiles[address] || null;
  }

  createOrUpdateProfile(address) {
    if (!this.profiles[address]) {
      // First time connection
      this.profiles[address] = {
        firstConnected: new Date().toISOString(),
        lastConnected: new Date().toISOString(),
        reputation: 100, // Starting reputation
      };
    } else {
      // Update last connected
      this.profiles[address].lastConnected = new Date().toISOString();
    }
    
    this.saveProfiles();
    return this.profiles[address];
  }
}

// Rate limiting
class RateLimiter {
  constructor() {
    this.clients = new Map();
    this.WINDOW_MS = 60000; // 1 minute
    this.MAX_MESSAGES = 10; // 10 messages per minute
  }

  isAllowed(clientId) {
    const now = Date.now();
    const clientData = this.clients.get(clientId) || { messages: [], lastCleanup: now };
    
    // Cleanup old messages
    clientData.messages = clientData.messages.filter(time => now - time < this.WINDOW_MS);
    
    if (clientData.messages.length >= this.MAX_MESSAGES) {
      return false;
    }
    
    clientData.messages.push(now);
    this.clients.set(clientId, clientData);
    
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [clientId, data] of this.clients.entries()) {
      if (now - data.lastCleanup > this.WINDOW_MS * 2) {
        this.clients.delete(clientId);
      }
    }
  }
}

// Initialize components
const messageStore = new MessageStore();
const usernameStore = new UsernameStore();
const profileStore = new ProfileStore();
const rateLimiter = new RateLimiter();

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

// Connected clients
const clients = new Map();

// Get count of connected users
function getUserCount() {
  let count = 0;
  for (const [clientId, client] of clients.entries()) {
    if (client.readyState === client.OPEN) {
      count++;
    }
  }
  return count;
}

// Broadcast message to all connected clients
function broadcast(message, excludeClient = null) {
  const messageStr = JSON.stringify(message);
  
  for (const [clientId, client] of clients.entries()) {
    if (client.readyState === client.OPEN && clientId !== excludeClient) {
      client.send(messageStr);
    }
  }
}

// Broadcast user count update to all clients
function broadcastUserCount() {
  broadcast({
    type: 'userCount',
    count: getUserCount()
  });
}

// Handle new connections
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const clientIp = req.socket.remoteAddress;
  
  console.log(`New client connected: ${clientId} from ${clientIp}`);
  
  // Store client with metadata
  ws.clientId = clientId;
  ws.address = null; // Will be set when they authenticate
  clients.set(clientId, ws);
  
  // Send welcome message and recent messages
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    messages: messageStore.getRecentMessages(),
    userCount: getUserCount()
  }));
  
  // Broadcast updated user count to all clients
  broadcastUserCount();
  
  // Handle messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Validate message
      if (!message.type) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        return;
      }
      
      switch (message.type) {
        case 'auth':
          // Authenticate with address and username
          if (!message.address) {
            ws.send(JSON.stringify({ type: 'error', message: 'Address required for authentication' }));
            return;
          }
          
          ws.address = message.address.toLowerCase();
          
          // Create or update user profile
          profileStore.createOrUpdateProfile(ws.address);
          
          // Check if username is provided for setting/changing
          if (message.username && message.username.trim()) {
            const result = usernameStore.setUsername(ws.address, message.username.trim());
            
            if (!result.success) {
              ws.send(JSON.stringify({ type: 'error', message: result.error }));
              return;
            }
          }
          
          // Get current username for this address
          const currentUsername = usernameStore.getUsername(ws.address);
          
          ws.send(JSON.stringify({ 
            type: 'authenticated',
            address: ws.address,
            username: currentUsername || 'Anonymous',
            canChangeUsername: usernameStore.canChangeUsername(ws.address),
            cooldownRemaining: usernameStore.getRemainingCooldown(ws.address)
          }));
          break;
          
        case 'message':
          // Check if authenticated
          if (!ws.address) {
            ws.send(JSON.stringify({ type: 'error', message: 'Must authenticate before sending messages' }));
            return;
          }
          
          // Check rate limit
          if (!rateLimiter.isAllowed(clientId)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Rate limit exceeded. Please slow down.' 
            }));
            return;
          }
          
          // Validate message content
          if (!message.content || typeof message.content !== 'string') {
            ws.send(JSON.stringify({ type: 'error', message: 'Message content required' }));
            return;
          }
          
          if (message.content.length > 500) {
            ws.send(JSON.stringify({ type: 'error', message: 'Message too long (max 500 chars)' }));
            return;
          }
          
          // Get username from store (ignore client-provided username)
          const username = usernameStore.getUsername(ws.address) || 'Anonymous';
          
          // Create chat message
          const chatMessage = {
            id: uuidv4(),
            type: 'message',
            content: message.content.trim(),
            username: username,
            address: ws.address, // Include address for verification
            timestamp: new Date().toISOString(),
            clientId: clientId
          };
          
          // Store message
          messageStore.addMessage(chatMessage);
          
          // Broadcast to all clients
          broadcast(chatMessage);
          break;
          
        case 'changeUsername':
          // Check if authenticated
          if (!ws.address) {
            ws.send(JSON.stringify({ type: 'error', message: 'Must authenticate before changing username' }));
            return;
          }
          
          if (!message.username || !message.username.trim()) {
            ws.send(JSON.stringify({ type: 'error', message: 'Username required' }));
            return;
          }
          
          const changeResult = usernameStore.setUsername(ws.address, message.username.trim());
          
          if (changeResult.success) {
            ws.send(JSON.stringify({ 
              type: 'usernameChanged',
              username: message.username.trim(),
              canChangeUsername: false,
              cooldownRemaining: usernameStore.getRemainingCooldown(ws.address)
            }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: changeResult.error }));
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
    // Broadcast updated user count after disconnect
    broadcastUserCount();
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`Client error ${clientId}:`, error);
    clients.delete(clientId);
    // Broadcast updated user count after error disconnect
    broadcastUserCount();
  });
});

// Cleanup rate limiter periodically
setInterval(() => {
  rateLimiter.cleanup();
}, 60000);

// Create Express app for REST API
const app = express();
app.use(cors());
app.use(express.json());

// API endpoint to get user profile
app.get('/api/profile/:address', (req, res) => {
  const { address } = req.params;
  const profile = profileStore.getProfile(address.toLowerCase());
  
  if (profile) {
    res.json({
      firstConnected: profile.firstConnected,
      reputation: profile.reputation,
      nfts: [] // Placeholder - would integrate with blockchain
    });
  } else {
    res.status(404).json({ error: 'Profile not found' });
  }
});

// Start Express server
const HTTP_PORT = process.env.HTTP_PORT || 9091;
app.listen(HTTP_PORT, () => {
  console.log(`HTTP API server running on port ${HTTP_PORT}`);
});

console.log(`Trollbox WebSocket server running on port ${PORT}`);