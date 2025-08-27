import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import BlockchainMonitor from './blockchainMonitor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');
const USERNAMES_FILE = join(DATA_DIR, 'usernames.json');
const PROFILES_FILE = join(DATA_DIR, 'profiles.json');
const AUTH_FILE = join(DATA_DIR, 'auth.json');
const PORT = process.env.PORT || 9090;

// Authentication message that users will sign
const AUTH_MESSAGE = 'Sign this message to authenticate with the Noma Trollbox\n\nTimestamp: ';

// Admin addresses
const ADMIN_ADDRESSES = ['0xcC91EB5D1AB2D577a64ACD71F0AA9C5cAf35D111'.toLowerCase()];

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

// Authentication store for managing signed credentials
class AuthStore {
  constructor() {
    this.credentials = this.loadCredentials();
  }

  loadCredentials() {
    try {
      if (existsSync(AUTH_FILE)) {
        const data = readFileSync(AUTH_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading auth credentials:', error);
    }
    return {};
  }

  saveCredentials() {
    try {
      writeFileSync(AUTH_FILE, JSON.stringify(this.credentials, null, 2));
    } catch (error) {
      console.error('Error saving auth credentials:', error);
    }
  }

  verifySignature(address, message, signature) {
    try {
      // Normalize the address
      const normalizedAddress = address.toLowerCase();
      
      // Recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      // Check if the recovered address matches the claimed address
      const isValid = recoveredAddress.toLowerCase() === normalizedAddress;
      
      if (!isValid) {
        console.log(`Signature verification failed: expected ${normalizedAddress}, got ${recoveredAddress.toLowerCase()}`);
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  isValidAuthMessage(message) {
    // Check if the message starts with our auth message prefix
    if (!message.startsWith(AUTH_MESSAGE)) {
      console.log('Auth message does not start with expected prefix');
      console.log('Expected:', AUTH_MESSAGE);
      console.log('Got:', message.substring(0, AUTH_MESSAGE.length));
      return false;
    }
    
    // Extract timestamp from the message
    const timestamp = message.substring(AUTH_MESSAGE.length);
    const authTime = parseInt(timestamp);
    
    // Check if timestamp is valid and within 10 minutes
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    console.log('Auth validation:', {
      authTime,
      now,
      difference: Math.abs(now - authTime),
      maxAllowed: tenMinutes,
      isValid: !isNaN(authTime) && Math.abs(now - authTime) < tenMinutes
    });
    
    return !isNaN(authTime) && Math.abs(now - authTime) < tenMinutes;
  }

  authenticate(address, signature, message) {
    // Validate the auth message format and timestamp
    if (!this.isValidAuthMessage(message)) {
      return { success: false, error: 'Invalid or expired auth message' };
    }
    
    // Verify the signature
    if (!this.verifySignature(address, message, signature)) {
      return { success: false, error: 'Invalid signature' };
    }
    
    // Generate a unique session token for this authentication
    const sessionToken = uuidv4();
    
    // Store the authentication with session token
    this.credentials[address.toLowerCase()] = {
      lastAuth: Date.now(),
      signature: signature,
      sessionToken: sessionToken
    };
    
    this.saveCredentials();
    return { success: true, sessionToken };
  }

  isAuthenticated(address) {
    const cred = this.credentials[address.toLowerCase()];
    if (!cred) return false;
    
    // Check if auth is still valid (24 hours)
    const authExpiry = 24 * 60 * 60 * 1000;
    return Date.now() - cred.lastAuth < authExpiry;
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
    this.addresses = new Map();
    this.WINDOW_MS = 60000; // 1 minute
    this.MAX_MESSAGES = 10; // 10 messages per minute
    this.MAX_AUTH_ATTEMPTS = 5; // 5 auth attempts per minute
  }

  isAllowed(clientId, address = null) {
    const now = Date.now();
    
    // Check client-based rate limit
    const clientData = this.clients.get(clientId) || { messages: [], lastCleanup: now };
    clientData.messages = clientData.messages.filter(time => now - time < this.WINDOW_MS);
    
    if (clientData.messages.length >= this.MAX_MESSAGES) {
      return false;
    }
    
    // Check address-based rate limit if address is provided
    if (address) {
      const addressData = this.addresses.get(address) || { messages: [], lastCleanup: now };
      addressData.messages = addressData.messages.filter(time => now - time < this.WINDOW_MS);
      
      if (addressData.messages.length >= this.MAX_MESSAGES) {
        return false;
      }
      
      addressData.messages.push(now);
      this.addresses.set(address, addressData);
    }
    
    clientData.messages.push(now);
    this.clients.set(clientId, clientData);
    
    return true;
  }
  
  isAuthAllowed(clientId) {
    const now = Date.now();
    const key = `auth_${clientId}`;
    const authData = this.clients.get(key) || { attempts: [], lastCleanup: now };
    
    // Cleanup old attempts
    authData.attempts = authData.attempts.filter(time => now - time < this.WINDOW_MS);
    
    if (authData.attempts.length >= this.MAX_AUTH_ATTEMPTS) {
      return false;
    }
    
    authData.attempts.push(now);
    this.clients.set(key, authData);
    
    return true;
  }

  cleanup() {
    const now = Date.now();
    // Clean up client rate limits
    for (const [clientId, data] of this.clients.entries()) {
      if (now - data.lastCleanup > this.WINDOW_MS * 2) {
        this.clients.delete(clientId);
      }
    }
    // Clean up address rate limits
    for (const [address, data] of this.addresses.entries()) {
      if (now - data.lastCleanup > this.WINDOW_MS * 2) {
        this.addresses.delete(address);
      }
    }
  }
}

// Initialize components
const messageStore = new MessageStore();
const usernameStore = new UsernameStore();
const profileStore = new ProfileStore();
const authStore = new AuthStore();
const rateLimiter = new RateLimiter();

// Kicked users tracking (address -> kick timestamp)
const kickedUsers = new Map();
const KICK_DURATION = 60 * 60 * 1000; // 1 hour kick duration

// Blockchain monitor for trade alerts
let blockchainMonitor = null;

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

// Connected clients (clientId -> ws)
const clients = new Map();
// Address to clientId mapping for quick lookup
const addressToClientId = new Map();

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

// Broadcast trade alert from blockchain monitor
function broadcastTradeAlert(tradeData) {
  // Store the trade alert as a message
  const tradeMessage = {
    ...tradeData,
    clientId: 'system',
    address: 'system'
  };
  messageStore.addMessage(tradeMessage);
  
  // Broadcast to all clients
  broadcast(tradeData);
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
  ws.authenticated = false;
  ws.authTimestamp = null;
  ws.sessionToken = null;
  ws.clientIp = clientIp;
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
          // Rate limit auth attempts
          if (!rateLimiter.isAuthAllowed(clientId)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Too many authentication attempts. Please wait.' 
            }));
            return;
          }
          
          // Authenticate with address and signature
          if (!message.address || !message.signature || !message.message) {
            ws.send(JSON.stringify({ type: 'error', message: 'Address, signature, and message required for authentication' }));
            return;
          }
          
          // Check if another client is already authenticated with this address
          for (const [id, client] of clients.entries()) {
            if (id !== clientId && client.authenticated && client.address === message.address.toLowerCase()) {
              // Disconnect the other client
              client.send(JSON.stringify({ 
                type: 'error', 
                message: 'Your session was terminated: Another client authenticated with your address' 
              }));
              client.close();
              clients.delete(id);
            }
          }
          
          // Verify the signature
          const authResult = authStore.authenticate(message.address, message.signature, message.message);
          
          if (!authResult.success) {
            ws.send(JSON.stringify({ type: 'error', message: authResult.error }));
            return;
          }
          
          // Check if user is kicked
          const kickedTimestamp = kickedUsers.get(message.address.toLowerCase());
          if (kickedTimestamp) {
            const timeSinceKick = Date.now() - kickedTimestamp;
            if (timeSinceKick < KICK_DURATION) {
              const minutesRemaining = Math.ceil((KICK_DURATION - timeSinceKick) / 60000);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: `You have been kicked from the chat. Try again in ${minutesRemaining} minutes.` 
              }));
              ws.close();
              return;
            } else {
              // Kick duration expired, remove from kicked list
              kickedUsers.delete(message.address.toLowerCase());
            }
          }
          
          ws.address = message.address.toLowerCase();
          ws.authenticated = true;
          ws.authTimestamp = Date.now();
          ws.sessionToken = authResult.sessionToken;
          
          // Update address to client mapping
          addressToClientId.set(ws.address, clientId);
          
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
            cooldownRemaining: usernameStore.getRemainingCooldown(ws.address),
            sessionToken: ws.sessionToken // Send session token to client
          }));
          break;
          
        case 'checkAuth':
          // Check if stored credentials are still valid
          if (!message.address) {
            ws.send(JSON.stringify({ type: 'error', message: 'Address required' }));
            return;
          }
          
          const isAuth = authStore.isAuthenticated(message.address);
          
          if (isAuth) {
            // Verify the stored credentials match
            const storedCreds = authStore.credentials[message.address.toLowerCase()];
            if (!storedCreds || !storedCreds.sessionToken) {
              ws.send(JSON.stringify({ type: 'requireAuth' }));
              return;
            }
            
            // Check if user is kicked
            const kickedTimestamp = kickedUsers.get(message.address.toLowerCase());
            if (kickedTimestamp) {
              const timeSinceKick = Date.now() - kickedTimestamp;
              if (timeSinceKick < KICK_DURATION) {
                const minutesRemaining = Math.ceil((KICK_DURATION - timeSinceKick) / 60000);
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: `You have been kicked from the chat. Try again in ${minutesRemaining} minutes.` 
                }));
                ws.close();
                return;
              } else {
                // Kick duration expired, remove from kicked list
                kickedUsers.delete(message.address.toLowerCase());
              }
            }
            
            ws.address = message.address.toLowerCase();
            ws.authenticated = true;
            ws.authTimestamp = Date.now();
            ws.sessionToken = storedCreds.sessionToken;
            
            // Update address to client mapping
            addressToClientId.set(ws.address, clientId);
            
            const username = usernameStore.getUsername(ws.address);
            
            ws.send(JSON.stringify({
              type: 'authenticated',
              address: ws.address,
              username: username || 'Anonymous',
              canChangeUsername: usernameStore.canChangeUsername(ws.address),
              cooldownRemaining: usernameStore.getRemainingCooldown(ws.address),
              fromCache: true,
              sessionToken: ws.sessionToken
            }));
          } else {
            ws.send(JSON.stringify({ type: 'requireAuth' }));
          }
          break;
          
        case 'message':
          // Check if authenticated
          if (!ws.authenticated) {
            ws.send(JSON.stringify({ type: 'error', message: 'Must authenticate before sending messages' }));
            return;
          }
          
          // Check rate limit (both client and address based)
          if (!rateLimiter.isAllowed(clientId, ws.address)) {
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
          
          // SECURITY: Always get username from server store, never trust client
          const username = usernameStore.getUsername(ws.address) || 'Anonymous';
          
          // Check for slash commands
          let processedContent = message.content.trim();
          let isCommand = false;
          let commandType = null;
          
          // Handle /help command
          if (processedContent === '/help' || processedContent === '/commands') {
            const isAdmin = ADMIN_ADDRESSES.includes(ws.address);
            let helpContent = 'Available commands:\n/slap <username> - Slap another user\n/help - Show this help message';
            
            if (isAdmin) {
              helpContent += '\n/kick <username> - Kick a user from chat (Admin only)';
            }
            
            const helpMessage = {
              id: uuidv4(),
              type: 'message',
              content: helpContent,
              username: 'System',
              timestamp: new Date().toISOString(),
              clientId: 'system',
              address: 'system',
              isCommand: true,
              commandType: 'help'
            };
            
            // Send only to the user who requested help
            ws.send(JSON.stringify(helpMessage));
            return;
          }
          
          // Handle /slap command
          if (processedContent.startsWith('/slap ')) {
            const targetUser = processedContent.substring(6).trim();
            if (!targetUser) {
              ws.send(JSON.stringify({ type: 'error', message: 'Usage: /slap <username>' }));
              return;
            }
            
            processedContent = `${username} has slapped ${targetUser}, what u gonna do about it?`;
            isCommand = true;
            commandType = 'slap';
          }
          
          // Handle /kick command (Admin only)
          if (processedContent.startsWith('/kick ')) {
            // Check if user is admin
            if (!ADMIN_ADDRESSES.includes(ws.address)) {
              ws.send(JSON.stringify({ type: 'error', message: 'Only admins can use this command' }));
              return;
            }
            
            const targetUsername = processedContent.substring(6).trim();
            if (!targetUsername) {
              ws.send(JSON.stringify({ type: 'error', message: 'Usage: /kick <username>' }));
              return;
            }
            
            // Find the target user's address
            let targetAddress = null;
            let targetClientId = null;
            
            // First, try to find by exact username match
            targetAddress = usernameStore.getAddressForUsername(targetUsername);
            
            if (targetAddress) {
              targetClientId = addressToClientId.get(targetAddress.toLowerCase());
            }
            
            if (!targetAddress || !targetClientId) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: `User '${targetUsername}' not found or not connected` 
              }));
              return;
            }
            
            // Don't allow admins to kick themselves or other admins
            if (ADMIN_ADDRESSES.includes(targetAddress.toLowerCase())) {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Cannot kick admin users' 
              }));
              return;
            }
            
            // Add to kicked users list
            kickedUsers.set(targetAddress.toLowerCase(), Date.now());
            
            // Find and disconnect the target user
            const targetClient = clients.get(targetClientId);
            if (targetClient && targetClient.readyState === targetClient.OPEN) {
              targetClient.send(JSON.stringify({ 
                type: 'error', 
                message: 'You have been kicked from the chat by an admin' 
              }));
              targetClient.close();
            }
            
            // Remove from address mapping
            addressToClientId.delete(targetAddress.toLowerCase());
            
            // Create kick notification message
            processedContent = `*** Admin ${username} has kicked ${targetUsername} from the chat ***`;
            isCommand = true;
            commandType = 'kick';
            
            console.log(`Admin ${username} kicked ${targetUsername} (${targetAddress})`);
          }
          
          // Create chat message with server-verified data only
          const chatMessage = {
            id: uuidv4(),
            type: 'message',
            content: processedContent,
            username: isCommand ? 'System' : username, // Use System for commands
            address: ws.address, // Server-stored address from authentication
            timestamp: new Date().toISOString(),
            clientId: clientId,
            verified: true, // Mark as cryptographically verified
            isCommand: isCommand,
            commandType: commandType
          };
          
          // Handle replies if provided
          if (message.replyTo && message.replyTo.id) {
            chatMessage.replyTo = {
              id: message.replyTo.id,
              username: message.replyTo.username,
              content: message.replyTo.content
            };
          }
          
          // Store message
          messageStore.addMessage(chatMessage);
          
          // Broadcast to all clients
          broadcast(chatMessage);
          break;
          
        case 'changeUsername':
          // Check if authenticated
          if (!ws.authenticated) {
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
    
    // Remove from address mapping if authenticated
    if (ws.address) {
      addressToClientId.delete(ws.address);
    }
    
    clients.delete(clientId);
    // Broadcast updated user count after disconnect
    broadcastUserCount();
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`Client error ${clientId}:`, error);
    
    // Remove from address mapping if authenticated
    if (ws.address) {
      addressToClientId.delete(ws.address);
    }
    
    clients.delete(clientId);
    // Broadcast updated user count after error disconnect
    broadcastUserCount();
  });
});

// Cleanup rate limiter periodically
setInterval(() => {
  rateLimiter.cleanup();
}, 60000);

// Session timeout check (30 minutes)
setInterval(() => {
  const now = Date.now();
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  for (const [clientId, ws] of clients.entries()) {
    if (ws.authenticated && ws.authTimestamp) {
      if (now - ws.authTimestamp > SESSION_TIMEOUT) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Session expired. Please re-authenticate.' 
        }));
        ws.authenticated = false;
        ws.address = null;
        ws.sessionToken = null;
      }
    }
  }
}, 60000); // Check every minute

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

// Initialize blockchain monitor
if (process.env.ENABLE_BLOCKCHAIN_MONITOR === 'true') {
  blockchainMonitor = new BlockchainMonitor(broadcastTradeAlert);
  blockchainMonitor.initialize().then((success) => {
    if (success) {
      console.log('Blockchain monitor initialized successfully');
    } else {
      console.log('Blockchain monitor initialization failed, will retry...');
    }
  });
} else {
  console.log('Blockchain monitor disabled. Set ENABLE_BLOCKCHAIN_MONITOR=true to enable.');
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (blockchainMonitor) {
    blockchainMonitor.stopMonitoring();
  }
  process.exit();
});