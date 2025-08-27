/**
 * Trade Monitor Service
 * 
 * This service demonstrates how trade alerts would be handled in the TrollBox.
 * In a production environment, the WebSocket server should monitor blockchain
 * events and send trade alerts to all connected clients.
 * 
 * The server would:
 * 1. Monitor NOMA token Transfer events
 * 2. Monitor Uniswap/DEX Swap events
 * 3. Calculate trade amounts and determine buy/sell
 * 4. Send trade alerts via WebSocket with type: 'tradeAlert'
 * 
 * Example server message format:
 * {
 *   type: 'tradeAlert',
 *   id: 'unique-message-id',
 *   content: '0xAbC123...7890 just bought 50.00 NOMA 🦐',
 *   username: 'System',
 *   timestamp: '2024-01-20T12:00:00Z',
 *   tradeData: {
 *     action: 'buy',
 *     amount: 50,
 *     address: '0xAbC123...7890',
 *     txHash: '0x...',
 *     emoji: '🦐'
 *   }
 * }
 */

// Helper function to get trade emoji based on amount
export function getTradeEmoji(amount: number): string {
  if (amount < 10) {
    return '🐟'; // Small fish for < 10 NOMA
  } else if (amount < 100) {
    return '🦐'; // Shrimp for 10-100 NOMA
  } else {
    return '🐋'; // Whale for > 100 NOMA
  }
}

// Helper function to format address
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Example of how to format a trade alert message
export function formatTradeAlert(
  address: string, 
  amount: number, 
  action: 'buy' | 'sell'
): string {
  const emoji = getTradeEmoji(amount);
  const formattedAddress = formatAddress(address);
  return `${formattedAddress} just ${action === 'buy' ? 'bought' : 'sold'} ${amount.toFixed(2)} NOMA ${emoji}`;
}

/**
 * Note: The actual blockchain monitoring should be done on the server side.
 * The server would use ethers.js or web3.js to:
 * 
 * 1. Subscribe to NOMA token Transfer events
 * 2. Subscribe to DEX pool Swap events
 * 3. Filter for actual trades (not just transfers)
 * 4. Broadcast trade alerts to all connected WebSocket clients
 * 
 * This approach is more efficient and reliable than having each
 * client monitor the blockchain independently.
 */