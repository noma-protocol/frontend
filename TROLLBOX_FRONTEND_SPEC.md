# Trollbox Frontend Implementation Spec

## Overview
Implement a real-time chat interface that connects to the blockchain-monitor WebSocket server, supporting both chat functionality and blockchain event monitoring.

## WebSocket Connection

### 1. Connection Setup
```javascript
const ws = new WebSocket('ws://localhost:3001');
let sessionToken = null;
let currentUsername = null;
let userAddress = null;
```

### 2. Authentication Flow
```javascript
// On connection, receive welcome message with recent chat history
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'welcome') {
    // Display recent messages
    displayChatHistory(data.recentMessages);
    updateUserCount(data.userCount);
    
    // Prompt for wallet connection/authentication
    promptAuthentication();
  }
};

// Authenticate with wallet signature
async function authenticate() {
  const message = `Authenticate to Trollbox\nTimestamp: ${Date.now()}`;
  const signature = await wallet.signMessage(message);
  
  ws.send(JSON.stringify({
    type: 'auth',
    address: walletAddress,
    signature: signature,
    message: message
  }));
}
```

## UI Components

### 1. Chat Container
```html
<div class="trollbox-container">
  <div class="trollbox-header">
    <h3>Trollbox</h3>
    <span class="user-count">Users: <span id="userCount">0</span></span>
  </div>
  
  <div class="messages-container" id="messages">
    <!-- Messages will be inserted here -->
  </div>
  
  <div class="input-container">
    <input type="text" id="messageInput" placeholder="Type a message..." maxlength="500" />
    <button id="sendButton">Send</button>
  </div>
  
  <div class="username-section">
    <span>Username: <span id="currentUsername">Not set</span></span>
    <button id="changeUsernameBtn">Change</button>
  </div>
</div>
```

### 2. Message Display
```javascript
function displayMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.innerHTML = `
    <span class="timestamp">${formatTime(message.timestamp)}</span>
    <span class="username" data-address="${message.address}">${message.username}</span>
    <span class="content">${escapeHtml(message.content)}</span>
  `;
  
  // Add reply indicator if applicable
  if (message.replyTo) {
    messageEl.classList.add('reply');
    messageEl.dataset.replyTo = message.replyTo;
  }
  
  // Style system messages differently
  if (message.isAction || message.address === 'system') {
    messageEl.classList.add('system-message');
  }
  
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
```

## Core Features

### 1. Send Messages
```javascript
function sendMessage() {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  
  if (!content) return;
  
  ws.send(JSON.stringify({
    type: 'message',
    content: content,
    replyTo: selectedReplyId // Optional
  }));
  
  input.value = '';
}
```

### 2. Change Username
```javascript
function changeUsername() {
  const newUsername = prompt('Enter new username (3-20 chars, alphanumeric):');
  
  if (!newUsername || !validateUsername(newUsername)) return;
  
  ws.send(JSON.stringify({
    type: 'changeUsername',
    username: newUsername
  }));
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
}
```

### 3. Handle Commands
```javascript
function handleCommand(input) {
  if (input.startsWith('/help')) {
    displaySystemMessage('Available commands: /help, /slap <username>');
    return true;
  }
  
  if (input.startsWith('/slap ')) {
    // Command will be processed server-side
    return false;
  }
  
  // Let server handle unknown commands
  return false;
}
```

## Message Handlers

### 1. Incoming Message Types
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'authenticated':
      sessionToken = data.sessionToken;
      currentUsername = data.username;
      userAddress = data.address;
      updateUsernameDisplay();
      enableChat();
      break;
      
    case 'message':
      displayMessage(data.message);
      break;
      
    case 'userCount':
      updateUserCount(data.count);
      break;
      
    case 'usernameChanged':
      currentUsername = data.username;
      updateUsernameDisplay();
      showNotification(`Username changed. Next change in ${data.cooldownDuration/1000}s`);
      break;
      
    case 'userUpdate':
      updateUserInChat(data.address, data.username);
      break;
      
    case 'error':
      showError(data.message);
      break;
      
    case 'requireAuth':
      promptAuthentication();
      break;
  }
};
```

## UI/UX Considerations

### 1. Visual Design
- **Message styling**: Different colors for usernames, timestamps, system messages
- **Hover effects**: Show full address on username hover
- **Reply indicators**: Visual threading for replies
- **Unread indicator**: Show when new messages arrive while scrolled up
- **Mobile responsive**: Adapt layout for mobile devices

### 2. User Experience
- **Auto-reconnect**: Reconnect on connection loss
- **Typing indicators**: Optional typing status
- **Message persistence**: Store session locally
- **Keyboard shortcuts**: Enter to send, Up arrow for last message
- **Notifications**: Optional browser notifications for mentions

### 3. Rate Limit Handling
```javascript
let messagesSent = [];

function canSendMessage() {
  const now = Date.now();
  messagesSent = messagesSent.filter(t => t > now - 60000);
  
  if (messagesSent.length >= 10) {
    const nextAllowed = messagesSent[0] + 60000 - now;
    showError(`Rate limit: wait ${Math.ceil(nextAllowed/1000)}s`);
    return false;
  }
  
  messagesSent.push(now);
  return true;
}
```

## Error Handling

### 1. Connection Management
```javascript
function setupReconnect() {
  ws.onclose = () => {
    showStatus('Disconnected. Reconnecting...');
    setTimeout(connect, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showError('Connection error');
  };
}
```

### 2. Graceful Degradation
- Show connection status
- Queue messages when offline
- Disable input when not authenticated
- Clear error messages after timeout

## Security Considerations

1. **XSS Prevention**: Always escape HTML in messages
2. **Input Validation**: Validate all user input client-side
3. **Rate Limiting**: Implement client-side rate limit checks
4. **Session Management**: Handle session expiry gracefully
5. **Address Verification**: Show verified badge for authenticated users

## Integration with Blockchain Events

Since the WebSocket also handles blockchain events, you can:
- Show trade notifications in chat
- Highlight messages from active traders
- Display pool statistics alongside chat
- Create rich interactions between chat and trading

## Example Complete Implementation

```javascript
class TrollboxClient {
  constructor(wsUrl) {
    this.ws = null;
    this.wsUrl = wsUrl;
    this.authenticated = false;
    this.messageQueue = [];
  }
  
  connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.ws.onopen = () => this.onConnect();
    this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
    this.ws.onclose = () => this.handleDisconnect();
    this.ws.onerror = (e) => this.handleError(e);
  }
  
  // ... implement all handlers
}

// Initialize
const trollbox = new TrollboxClient('ws://localhost:3001');
trollbox.connect();
```