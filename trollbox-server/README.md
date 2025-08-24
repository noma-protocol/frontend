# Trollbox WebSocket Server

A simple WebSocket-based chat server with JSON persistence for the trollbox feature.

## Features

- Real-time WebSocket communication
- Message persistence using JSON files
- Rate limiting (10 messages per minute per client)
- Message validation (max 500 characters)
- Automatic reconnection support
- Recent message history on connect
- Simple and lightweight

## Installation

```bash
cd trollbox-server
npm install
```

## Usage

### Start the server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on port 9090 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3001 npm start
```

### Test the server

Open `src/test-client.html` in a web browser to test the chat functionality.

## Message Format

### Client to Server

```json
{
  "type": "message",
  "content": "Hello, world!",
  "username": "User123"
}
```

### Server to Client

```json
{
  "id": "uuid",
  "type": "message",
  "content": "Hello, world!",
  "username": "User123",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "clientId": "client-uuid"
}
```

## API

### Message Types

- `message` - Send a chat message
- `ping` - Keep connection alive (responds with `pong`)
- `welcome` - Sent by server on connection with client ID and recent messages
- `error` - Error messages from server

### Rate Limiting

- 10 messages per minute per client
- Exceeding the limit will result in an error message

### Message Validation

- Content is required and must be a string
- Maximum message length: 500 characters
- Username defaults to "Anonymous" if not provided

## Data Storage

Messages are stored in `data/messages.json` with automatic rotation to keep the last 1000 messages.

## Integration with React

To integrate with your React app, you can create a custom hook:

```javascript
import { useState, useEffect, useCallback } from 'react';

export const useTrollbox = (wsUrl = 'ws://localhost:9090') => {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      setConnected(true);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'welcome') {
        setMessages(data.messages);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, data]);
      }
    };
    
    websocket.onclose = () => {
      setConnected(false);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [wsUrl]);
  
  const sendMessage = useCallback((content, username = 'Anonymous') => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        content,
        username
      }));
    }
  }, [ws]);
  
  return { messages, connected, sendMessage };
};
```

## Security Considerations

This is a basic implementation. For production use, consider:

- Adding authentication
- Implementing CORS policies
- Using HTTPS/WSS
- Adding more sophisticated rate limiting
- Implementing message filtering/moderation
- Using a proper database instead of JSON files
- Adding user banning capabilities