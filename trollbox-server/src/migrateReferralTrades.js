import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Token to pool mapping based on pools.json
const tokenToPool = {
  // BUN token
  '0x0221668890fdad280767B5c7f2d2C78eC62eF94D': '0x90666407c841fe58358F3ed04a245c5F5bd6fD0A',
  // AVO token  
  '0x6b44B01922BCeF8A6db75B3147FB604c37a78b7F': '0x8Eb5C457F7a29554536Dc964B3FaDA2961Dd8212',
  // NOMA token (old trades might have NOMA address)
  '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701': null // NOMA trades don't have a specific pool
};

// Migrate trades to add poolAddress
function migrateTrades() {
  const tradesFile = join(__dirname, '../data/referral_trades.json');
  
  try {
    // Read existing trades
    const tradesData = readFileSync(tradesFile, 'utf8');
    const trades = JSON.parse(tradesData);
    
    console.log(`Found ${trades.length} trades to migrate`);
    
    // Add poolAddress to each trade based on tokenAddress
    let migrated = 0;
    const updatedTrades = trades.map(trade => {
      if (!trade.poolAddress) {
        const poolAddress = tokenToPool[trade.tokenAddress];
        if (poolAddress) {
          trade.poolAddress = poolAddress;
          migrated++;
        }
      }
      return trade;
    });
    
    // Write back the updated trades
    writeFileSync(tradesFile, JSON.stringify(updatedTrades, null, 2));
    
    console.log(`Migration complete. Updated ${migrated} trades with pool addresses.`);
  } catch (error) {
    console.error('Error migrating trades:', error);
  }
}

// Run migration
migrateTrades();