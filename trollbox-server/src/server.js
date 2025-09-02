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
const TRANSACTIONS_FILE = join(DATA_DIR, 'transactions.json');
const TOKENS_FILE = join(DATA_DIR, 'tokens.json');
const REFERRALS_FILE = join(DATA_DIR, 'referrals.json');
const REFERRAL_TRADES_FILE = join(DATA_DIR, 'referral_trades.json');
const REFERRAL_CODES_FILE = join(DATA_DIR, 'referral_codes.json');
const PORT = process.env.PORT || 9090;

// Authentication message that users will sign
const AUTH_MESSAGE = 'Sign this message to authenticate with the Noma Trollbox\n\nTimestamp: ';

// Admin addresses (stored in lowercase for comparison)
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

// Transaction store for tracking swap history
class TransactionStore {
  constructor() {
    this.transactions = this.loadTransactions();
    this.MAX_TRANSACTIONS = 10000; // Keep last 10000 transactions
  }

  loadTransactions() {
    try {
      if (existsSync(TRANSACTIONS_FILE)) {
        const data = readFileSync(TRANSACTIONS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
    return [];
  }

  saveTransactions() {
    try {
      writeFileSync(TRANSACTIONS_FILE, JSON.stringify(this.transactions, null, 2));
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  }

  addTransaction(transaction) {
    // Check if transaction already exists (by hash)
    const exists = this.transactions.some(tx => tx.hash === transaction.hash);
    if (exists) return null;

    // Add timestamp if not present
    if (!transaction.timestamp) {
      transaction.timestamp = new Date().toISOString();
    }

    // Add unique ID if not present
    if (!transaction.id) {
      transaction.id = uuidv4();
    }

    this.transactions.push(transaction);
    
    // Keep only the last MAX_TRANSACTIONS
    if (this.transactions.length > this.MAX_TRANSACTIONS) {
      this.transactions = this.transactions.slice(-this.MAX_TRANSACTIONS);
    }
    
    this.saveTransactions();
    return transaction;
  }

  getTransactions(options = {}) {
    const { 
      address = null, 
      tokenAddress = null, 
      limit = 100, 
      offset = 0,
      startTime = null,
      endTime = null
    } = options;

    let filtered = [...this.transactions];

    // Filter by address (sender or recipient)
    if (address) {
      const lowerAddress = address.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.sender?.toLowerCase() === lowerAddress || 
        tx.recipient?.toLowerCase() === lowerAddress
      );
    }

    // Filter by token address
    if (tokenAddress) {
      filtered = filtered.filter(tx => 
        tx.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase()
      );
    }

    // Filter by time range
    if (startTime) {
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= new Date(startTime));
    }
    if (endTime) {
      filtered = filtered.filter(tx => new Date(tx.timestamp) <= new Date(endTime));
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  getTransactionByHash(hash) {
    return this.transactions.find(tx => tx.hash === hash) || null;
  }

  getStats(address = null) {
    let filtered = [...this.transactions];

    if (address) {
      const lowerAddress = address.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.sender?.toLowerCase() === lowerAddress || 
        tx.recipient?.toLowerCase() === lowerAddress
      );
    }

    const stats = {
      totalTransactions: filtered.length,
      totalVolume: 0,
      totalVolumeUSD: 0,
      uniqueAddresses: new Set(),
      buyCount: 0,
      sellCount: 0
    };

    filtered.forEach(tx => {
      if (tx.sender) stats.uniqueAddresses.add(tx.sender.toLowerCase());
      if (tx.recipient) stats.uniqueAddresses.add(tx.recipient.toLowerCase());
      
      if (tx.amount) stats.totalVolume += parseFloat(tx.amount);
      if (tx.amountUSD) stats.totalVolumeUSD += parseFloat(tx.amountUSD);
      
      if (tx.type === 'buy') stats.buyCount++;
      if (tx.type === 'sell') stats.sellCount++;
    });

    stats.uniqueAddresses = stats.uniqueAddresses.size;
    return stats;
  }
}

// Token store for launchpad tokens
class TokenStore {
  constructor() {
    this.tokens = this.loadTokens();
  }

  loadTokens() {
    try {
      if (existsSync(TOKENS_FILE)) {
        const data = readFileSync(TOKENS_FILE, 'utf8');
        return JSON.parse(data).tokens || [];
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
    return [];
  }

  saveTokens() {
    try {
      writeFileSync(TOKENS_FILE, JSON.stringify({ tokens: this.tokens }, null, 2));
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  addToken(tokenData) {
    // Add metadata
    const newToken = {
      ...tokenData,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    this.tokens.push(newToken);
    this.saveTokens();
    return newToken;
  }

  getTokens() {
    return this.tokens;
  }

  getTokensByDeployer(deployerAddress) {
    return this.tokens.filter(
      token => token.deployerAddress?.toLowerCase() === deployerAddress.toLowerCase()
    );
  }

  getTokenById(id) {
    return this.tokens.find(token => token.id === id);
  }

  updateTokenStatus(id, status, transactionHash = null, contractAddress = null) {
    const tokenIndex = this.tokens.findIndex(token => token.id === id);
    
    if (tokenIndex === -1) {
      return null;
    }
    
    this.tokens[tokenIndex] = {
      ...this.tokens[tokenIndex],
      status,
      ...(transactionHash && { transactionHash }),
      ...(contractAddress && { contractAddress }),
      updatedAt: new Date().toISOString()
    };
    
    this.saveTokens();
    return this.tokens[tokenIndex];
  }

  getStats() {
    return {
      total: this.tokens.length,
      pending: this.tokens.filter(t => t.status === 'pending').length,
      success: this.tokens.filter(t => t.status === 'success').length,
      failed: this.tokens.filter(t => t.status === 'failed').length,
      lastDeployment: this.tokens.length > 0 
        ? this.tokens[this.tokens.length - 1].timestamp 
        : null
    };
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

// Referral store for managing referral relationships and trades
class ReferralStore {
  constructor() {
    this.referrals = this.loadReferrals();
    this.trades = this.loadTrades();
    this.codes = this.loadCodes();
  }

  loadReferrals() {
    try {
      if (existsSync(REFERRALS_FILE)) {
        const data = readFileSync(REFERRALS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
    }
    return {};
  }

  loadTrades() {
    try {
      if (existsSync(REFERRAL_TRADES_FILE)) {
        const data = readFileSync(REFERRAL_TRADES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading referral trades:', error);
    }
    return [];
  }

  loadCodes() {
    try {
      if (existsSync(REFERRAL_CODES_FILE)) {
        const data = readFileSync(REFERRAL_CODES_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading referral codes:', error);
    }
    return {};
  }

  saveReferrals() {
    try {
      writeFileSync(REFERRALS_FILE, JSON.stringify(this.referrals, null, 2));
    } catch (error) {
      console.error('Error saving referrals:', error);
    }
  }

  saveTrades() {
    try {
      writeFileSync(REFERRAL_TRADES_FILE, JSON.stringify(this.trades, null, 2));
    } catch (error) {
      console.error('Error saving referral trades:', error);
    }
  }

  saveCodes() {
    try {
      writeFileSync(REFERRAL_CODES_FILE, JSON.stringify(this.codes, null, 2));
    } catch (error) {
      console.error('Error saving referral codes:', error);
    }
  }

  // Register a referral code for an address
  registerCode(code, address) {
    const normalizedAddress = address.toLowerCase();
    
    // Handle both short (8 char) and legacy (66 char) formats
    const normalizedCode = code.startsWith('0x') ? code : `0x${code}`;
    
    // Check if code already exists and matches the address
    if (this.codes[normalizedCode] && this.codes[normalizedCode] !== normalizedAddress) {
      console.error(`Code ${normalizedCode} already registered to different address`);
      return false;
    }
    
    // Also check without 0x prefix for short codes
    if (this.codes[code] && this.codes[code] !== normalizedAddress) {
      console.error(`Code ${code} already registered to different address`);
      return false;
    }
    
    // Register both formats for flexibility
    this.codes[normalizedCode] = normalizedAddress;
    if (!code.startsWith('0x')) {
      this.codes[code] = normalizedAddress;
    }
    
    this.saveCodes();
    return true;
  }

  // Get address from referral code
  getAddressByCode(code) {
    // Try the code as-is first
    if (this.codes[code]) {
      return this.codes[code];
    }
    
    // Try with 0x prefix
    const withPrefix = code.startsWith('0x') ? code : `0x${code}`;
    if (this.codes[withPrefix]) {
      return this.codes[withPrefix];
    }
    
    // Try without 0x prefix
    const withoutPrefix = code.startsWith('0x') ? code.slice(2) : code;
    if (this.codes[withoutPrefix]) {
      return this.codes[withoutPrefix];
    }
    
    return null;
  }

  // Add a referred user to a referral code
  addReferral(referralCode, referrerAddress, referredAddress) {
    const key = `${referralCode}:${referrerAddress.toLowerCase()}`;
    
    if (!this.referrals[key]) {
      this.referrals[key] = [];
    }
    
    // Check if already referred
    const normalizedReferredAddress = referredAddress.toLowerCase();
    if (!this.referrals[key].includes(normalizedReferredAddress)) {
      this.referrals[key].push(normalizedReferredAddress);
      this.saveReferrals();
      return true;
    }
    
    return false; // Already referred
  }

  // Get referral stats for an address
  getReferralStats(address) {
    const normalizedAddress = address.toLowerCase();
    const stats = {
      totalReferred: 0,
      referredUsers: [],
      totalVolumeETH: 0,
      totalVolumeUSD: 0,
      trades: []
    };

    // Find all referral keys for this address
    Object.keys(this.referrals).forEach(key => {
      if (key.toLowerCase().endsWith(`:${normalizedAddress}`)) {
        const referredUsers = this.referrals[key] || [];
        stats.totalReferred += referredUsers.length;
        stats.referredUsers = stats.referredUsers.concat(referredUsers);
      }
    });

    // Calculate volume from trades
    this.trades.forEach(trade => {
      if (trade.referrerAddress && trade.referrerAddress.toLowerCase() === normalizedAddress) {
        stats.totalVolumeETH += parseFloat(trade.volumeETH || 0);
        stats.totalVolumeUSD += parseFloat(trade.volumeUSD || 0);
        stats.trades.push(trade);
      }
    });

    return stats;
  }

  // Track a trade made by a referred user
  trackTrade(tradeData) {
    const trade = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...tradeData
    };
    
    this.trades.push(trade);
    
    // Keep only last 10000 trades
    if (this.trades.length > 10000) {
      this.trades = this.trades.slice(-10000);
    }
    
    this.saveTrades();
    return trade;
  }

  // Check if a user was referred by a specific code
  wasReferredBy(referralCode, referrerAddress, userAddress) {
    const key = `${referralCode}:${referrerAddress.toLowerCase()}`;
    const referredUsers = this.referrals[key] || [];
    return referredUsers.includes(userAddress.toLowerCase());
  }

  // Get all referral data (for export/debugging)
  getAllReferrals() {
    return this.referrals;
  }
}

// Initialize components
const messageStore = new MessageStore();
const usernameStore = new UsernameStore();
const profileStore = new ProfileStore();
const authStore = new AuthStore();
const transactionStore = new TransactionStore();
const tokenStore = new TokenStore();
const referralStore = new ReferralStore();
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

// Handle trade alert from blockchain monitor (broadcasting disabled)
function broadcastTradeAlert(tradeData) {
  // Store the trade alert as a message (for history)
  const tradeMessage = {
    ...tradeData,
    clientId: 'system',
    address: 'system'
  };
  messageStore.addMessage(tradeMessage);
  
  // Broadcasting disabled - trades are only stored, not sent to clients
  // broadcast(tradeData);
}

// Broadcast user count update to all clients
function broadcastUserCount() {
  broadcast({
    type: 'userCount',
    count: getUserCount()
  });
}

// Broadcast auth clear command to specific address or all clients
function broadcastClearAuth(targetAddress = null) {
  if (targetAddress) {
    // Clear auth for specific address
    const clientId = addressToClientId.get(targetAddress.toLowerCase());
    if (clientId) {
      const client = clients.get(clientId);
      if (client && client.readyState === client.OPEN) {
        client.send(JSON.stringify({
          type: 'clearAuth',
          message: 'Your authentication has been revoked. Please sign in again.'
        }));
        
        // Also disconnect the client
        client.close();
      }
    }
    
    // Remove from auth store
    delete authStore.credentials[targetAddress.toLowerCase()];
    authStore.saveCredentials();
  } else {
    // Clear auth for all clients
    broadcast({
      type: 'clearAuth',
      message: 'Authentication has been reset. Please sign in again.'
    });
    
    // Clear all stored credentials
    authStore.credentials = {};
    authStore.saveCredentials();
    
    // Disconnect all authenticated clients
    for (const [clientId, client] of clients.entries()) {
      if (client.authenticated) {
        client.close();
      }
    }
  }
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
              helpContent += '\n/clearauth [username] - Clear authentication (Admin only)';
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
          
          // Handle /clearauth command (Admin only)
          if (processedContent.startsWith('/clearauth')) {
            console.log(`/clearauth command attempted by address: ${ws.address}`);
            console.log(`Admin addresses: ${ADMIN_ADDRESSES.join(', ')}`);
            console.log(`Is admin: ${ADMIN_ADDRESSES.includes(ws.address)}`);
            
            // Check if user is admin
            if (!ADMIN_ADDRESSES.includes(ws.address)) {
              ws.send(JSON.stringify({ type: 'error', message: 'Only admins can use this command' }));
              return;
            }
            
            const parts = processedContent.split(' ');
            const targetUsername = parts[1]?.trim();
            
            if (targetUsername) {
              // Clear auth for specific user
              const targetAddress = usernameStore.getAddressForUsername(targetUsername);
              
              if (!targetAddress) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: `User '${targetUsername}' not found` 
                }));
                return;
              }
              
              // Clear auth for specific address
              broadcastClearAuth(targetAddress);
              
              // Send success message
              const successMessage = {
                id: uuidv4(),
                type: 'message',
                content: `*** Admin ${username} cleared authentication for ${targetUsername} ***`,
                username: 'System',
                timestamp: new Date().toISOString(),
                clientId: 'system',
                address: 'system',
                isCommand: true,
                commandType: 'clearauth'
              };
              
              messageStore.addMessage(successMessage);
              broadcast(successMessage);
              
              console.log(`Admin ${username} cleared auth for ${targetUsername} (${targetAddress})`);
              return;
            } else {
              // Clear auth for all users
              broadcastClearAuth();
              
              // Send success message
              const successMessage = {
                id: uuidv4(),
                type: 'message',
                content: `*** Admin ${username} cleared authentication for all users ***`,
                username: 'System',
                timestamp: new Date().toISOString(),
                clientId: 'system',
                address: 'system',
                isCommand: true,
                commandType: 'clearauth'
              };
              
              messageStore.addMessage(successMessage);
              broadcast(successMessage);
              
              console.log(`Admin ${username} cleared auth for all users`);
              return;
            }
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
        
        // Remove from address mapping
        if (ws.address) {
          addressToClientId.delete(ws.address);
        }
        
        ws.authenticated = false;
        ws.address = null;
        ws.sessionToken = null;
      }
    }
  }
}, 60000); // Check every minute

// Clean up expired kicks
setInterval(() => {
  const now = Date.now();
  for (const [address, kickTimestamp] of kickedUsers.entries()) {
    if (now - kickTimestamp >= KICK_DURATION) {
      kickedUsers.delete(address);
      console.log(`Kick expired for address: ${address}`);
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

// API endpoint to get transaction history
app.get('/api/transactions', (req, res) => {
  try {
    const { 
      address, 
      tokenAddress, 
      limit = '100', 
      offset = '0',
      startTime,
      endTime
    } = req.query;

    const options = {
      address,
      tokenAddress,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startTime,
      endTime
    };

    const result = transactionStore.getTransactions(options);
    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// API endpoint to get transaction by hash
app.get('/api/transactions/:hash', (req, res) => {
  try {
    const { hash } = req.params;
    const transaction = transactionStore.getTransactionByHash(hash);
    
    if (transaction) {
      res.json(transaction);
    } else {
      res.status(404).json({ error: 'Transaction not found' });
    }
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// API endpoint to get trading statistics
app.get('/api/stats', (req, res) => {
  try {
    const { address } = req.query;
    const stats = transactionStore.getStats(address);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ===== LAUNCHPAD API ENDPOINTS =====

// Get all tokens
app.get('/api/tokens', (req, res) => {
  try {
    const allTokens = tokenStore.getTokens();
    // Filter only deployed tokens by default unless explicitly requested
    const includeAll = req.query.includeAll === 'true';
    const tokens = includeAll ? allTokens : allTokens.filter(token => token.status === 'deployed');
    res.json({ tokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

// Get tokens by deployer address
app.get('/api/tokens/deployer/:address', (req, res) => {
  try {
    const { address } = req.params;
    const tokens = tokenStore.getTokensByDeployer(address);
    res.json({ tokens });
  } catch (error) {
    console.error('Error fetching tokens by deployer:', error);
    res.status(500).json({ error: 'Failed to retrieve tokens' });
  }
});

// Save new token
app.post('/api/tokens', (req, res) => {
  try {
    const tokenData = req.body;
    
    // Validate required fields
    const requiredFields = ['tokenName', 'tokenSymbol', 'tokenSupply', 'price', 'floorPrice'];
    const missingFields = requiredFields.filter(field => !tokenData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missingFields 
      });
    }
    
    const newToken = tokenStore.addToken(tokenData);
    
    res.status(201).json({ 
      message: 'Token saved successfully', 
      token: newToken 
    });
  } catch (error) {
    console.error('Error saving token:', error);
    res.status(500).json({ error: 'Failed to save token' });
  }
});

// Update token status
app.patch('/api/tokens/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionHash, contractAddress } = req.body;
    
    if (!status || !['success', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "success" or "failed"' });
    }
    
    const updatedToken = tokenStore.updateTokenStatus(id, status, transactionHash, contractAddress);
    
    if (!updatedToken) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json({ 
      message: 'Token status updated successfully',
      token: updatedToken
    });
  } catch (error) {
    console.error('Error updating token status:', error);
    res.status(500).json({ error: 'Failed to update token status' });
  }
});

// Export tokens as JSON
app.get('/api/tokens/export', (req, res) => {
  try {
    const data = { tokens: tokenStore.getTokens() };
    const filename = `tokens_export_${new Date().toISOString().split('T')[0]}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  } catch (error) {
    console.error('Error exporting tokens:', error);
    res.status(500).json({ error: 'Failed to export tokens' });
  }
});

// Get token statistics
app.get('/api/tokens/stats', (req, res) => {
  try {
    const stats = tokenStore.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching token stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// ===== REFERRAL API ENDPOINTS =====

// Register a referral (when user connects with referral code)
app.post('/api/referrals/register', (req, res) => {
  try {
    const { referralCode, referredAddress } = req.body;
    
    if (!referralCode || !referredAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get referrer address from code
    const referrerAddress = referralStore.getAddressByCode(referralCode);
    
    if (!referrerAddress) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }
    
    // Check if already referred
    const key = `${referralCode}:${referrerAddress}`;
    const existingReferrals = referralStore.referrals[key] || [];
    
    if (existingReferrals.includes(referredAddress.toLowerCase())) {
      return res.status(400).json({ error: 'User already referred' });
    }
    
    // Add the referral
    const added = referralStore.addReferral(referralCode, referrerAddress, referredAddress);
    
    if (added) {
      res.json({ 
        success: true, 
        message: 'Referral registered successfully',
        referralKey: key,
        referrerAddress
      });
    } else {
      res.status(400).json({ error: 'Failed to register referral' });
    }
  } catch (error) {
    console.error('Error registering referral:', error);
    res.status(500).json({ error: 'Failed to register referral' });
  }
});

// Track a referral trade
app.post('/api/referrals/track-trade', (req, res) => {
  try {
    const tradeData = req.body;
    
    if (!tradeData.userAddress || !tradeData.referralCode || !tradeData.volumeETH) {
      return res.status(400).json({ error: 'Missing required trade data' });
    }
    
    // Find the referrer for this trade
    let referrerAddress = null;
    Object.keys(referralStore.referrals).forEach(key => {
      const [code, address] = key.split(':');
      if (code === tradeData.referralCode) {
        const referredUsers = referralStore.referrals[key] || [];
        if (referredUsers.includes(tradeData.userAddress.toLowerCase())) {
          referrerAddress = address;
        }
      }
    });
    
    if (!referrerAddress) {
      return res.status(400).json({ error: 'No referral relationship found' });
    }
    
    // Add referrer address to trade data
    const trade = referralStore.trackTrade({
      ...tradeData,
      referrerAddress
    });
    
    res.json({ 
      success: true, 
      trade,
      message: 'Trade tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking trade:', error);
    res.status(500).json({ error: 'Failed to track trade' });
  }
});

// Get referral stats for an address
app.get('/api/referrals/stats/:address', (req, res) => {
  try {
    const { address } = req.params;
    const stats = referralStore.getReferralStats(address);
    
    res.json({
      address,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// Check if a user was referred
app.get('/api/referrals/check/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    const normalizedAddress = userAddress.toLowerCase();
    
    let referralInfo = null;
    
    // Search through all referrals to find if user was referred
    Object.keys(referralStore.referrals).forEach(key => {
      const referredUsers = referralStore.referrals[key] || [];
      if (referredUsers.includes(normalizedAddress)) {
        const [code, referrerAddress] = key.split(':');
        referralInfo = {
          referralCode: code,
          referrerAddress,
          referredAddress: userAddress
        };
      }
    });
    
    if (referralInfo) {
      res.json({ referred: true, ...referralInfo });
    } else {
      res.json({ referred: false });
    }
  } catch (error) {
    console.error('Error checking referral:', error);
    res.status(500).json({ error: 'Failed to check referral status' });
  }
});

// Get all referrals for a referral code (admin/debug endpoint)
app.get('/api/referrals/code/:code/:address', (req, res) => {
  try {
    const { code, address } = req.params;
    const key = `${code}:${address.toLowerCase()}`;
    const referredUsers = referralStore.referrals[key] || [];
    
    res.json({
      referralCode: code,
      referrerAddress: address,
      referredUsers,
      count: referredUsers.length
    });
  } catch (error) {
    console.error('Error fetching referrals by code:', error);
    res.status(500).json({ error: 'Failed to get referrals' });
  }
});

// Register a referral code for a user (when they generate their code)
app.post('/api/referrals/register-code', (req, res) => {
  try {
    const { code, address } = req.body;
    
    if (!code || !address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Register the code-to-address mapping
    const registered = referralStore.registerCode(code, address);
    
    if (registered) {
      res.json({ 
        success: true, 
        message: 'Referral code registered successfully',
        code,
        address
      });
    } else {
      res.status(400).json({ error: 'Code already registered to a different address' });
    }
  } catch (error) {
    console.error('Error registering referral code:', error);
    res.status(500).json({ error: 'Failed to register referral code' });
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
  blockchainMonitor = new BlockchainMonitor(broadcastTradeAlert, transactionStore, referralStore);
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