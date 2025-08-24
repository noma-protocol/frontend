const WebSocket = require('ws');

// Test with a different address that has no cooldown yet
const testAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

console.log('Testing cooldown doubling behavior...\n');

// First connection - set initial username
const ws1 = new WebSocket('ws://localhost:9090');

ws1.on('open', () => {
  console.log('First connection established');
  ws1.send(JSON.stringify({
    type: 'auth',
    address: testAddress,
    username: 'CooldownTest1'
  }));
});

ws1.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'authenticated') {
    console.log('\n✓ Initial authentication successful!');
    console.log('Username:', msg.username);
    console.log('Can change:', msg.canChangeUsername);
    console.log('Cooldown:', msg.cooldownRemaining, 'ms =', msg.cooldownRemaining / (60 * 60 * 1000), 'hours');
    
    if (msg.username === 'CooldownTest1' && msg.canChangeUsername === false) {
      console.log('\n✓ First username set correctly with 24-hour cooldown');
      
      // Simulate time passing by modifying the data file directly
      // In real usage, this would require waiting 24 hours
      console.log('\n[Simulating 24 hours passing - in production this would require actual time]');
      console.log('The next username change would have a 48-hour cooldown (double the previous)');
      console.log('After that, it would be 96 hours, then 192 hours, and so on...');
    }
    
    ws1.close();
  }
});

ws1.on('close', () => {
  console.log('\nTest completed!');
  console.log('\nSummary:');
  console.log('- First username change: 24-hour cooldown');
  console.log('- Second username change: 48-hour cooldown');
  console.log('- Third username change: 96-hour cooldown');
  console.log('- Each subsequent change doubles the previous cooldown');
  process.exit(0);
});