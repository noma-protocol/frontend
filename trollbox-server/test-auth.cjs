const WebSocket = require('ws');

const testAuth = async () => {
  console.log('Testing authentication and username binding...\n');
  
  // Test address
  const testAddress = '0x1234567890123456789012345678901234567890';
  
  // Create connection
  const ws = new WebSocket('ws://localhost:9090');
  
  ws.on('open', () => {
    console.log('Connected to server');
    
    // Authenticate with initial username
    console.log('Authenticating with address:', testAddress);
    ws.send(JSON.stringify({
      type: 'auth',
      address: testAddress,
      username: 'TestUser1'
    }));
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('Received:', msg);
    
    if (msg.type === 'authenticated') {
      console.log('\n✓ Authentication successful!');
      console.log('Username:', msg.username);
      console.log('Can change username:', msg.canChangeUsername);
      console.log('Cooldown remaining:', msg.cooldownRemaining);
      
      // Try to send a message
      setTimeout(() => {
        console.log('\nSending test message...');
        ws.send(JSON.stringify({
          type: 'message',
          content: 'Hello from authenticated user!'
        }));
      }, 1000);
      
      // Try to change username
      setTimeout(() => {
        console.log('\nAttempting to change username...');
        ws.send(JSON.stringify({
          type: 'changeUsername',
          username: 'TestUser2'
        }));
      }, 2000);
      
      // Close after tests
      setTimeout(() => {
        console.log('\nClosing connection...');
        ws.close();
      }, 3000);
    }
    
    if (msg.type === 'usernameChanged') {
      console.log('\n✓ Username changed successfully!');
      console.log('New username:', msg.username);
      console.log('Can change username:', msg.canChangeUsername);
      console.log('Cooldown remaining:', msg.cooldownRemaining, 'ms');
      console.log('Cooldown hours:', Math.ceil(msg.cooldownRemaining / (60 * 60 * 1000)), 'hours');
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('\nConnection closed');
    
    // Test reconnecting with same address
    setTimeout(() => {
      console.log('\n--- Testing reconnection with same address ---');
      const ws2 = new WebSocket('ws://localhost:9090');
      
      ws2.on('open', () => {
        console.log('Reconnected to server');
        
        // Authenticate again - should get existing username
        ws2.send(JSON.stringify({
          type: 'auth',
          address: testAddress
        }));
      });
      
      ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'authenticated') {
          console.log('\n✓ Re-authentication successful!');
          console.log('Username (should be TestUser2):', msg.username);
          console.log('Can change username:', msg.canChangeUsername);
          console.log('Cooldown remaining:', msg.cooldownRemaining, 'ms');
          
          // Try to change username again (should fail due to cooldown)
          setTimeout(() => {
            console.log('\nAttempting to change username again (should fail)...');
            ws2.send(JSON.stringify({
              type: 'changeUsername',
              username: 'TestUser3'
            }));
          }, 1000);
          
          setTimeout(() => {
            ws2.close();
            process.exit(0);
          }, 2000);
        }
        
        if (msg.type === 'error') {
          console.log('\n✗ Error (expected):', msg.message);
        }
      });
    }, 1000);
  });
};

testAuth();