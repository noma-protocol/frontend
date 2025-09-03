import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the referral codes file
const REFERRAL_CODES_FILE = join(__dirname, '../data/referral_codes.json');

function cleanupReferralCodes() {
  try {
    // Read existing data
    if (!existsSync(REFERRAL_CODES_FILE)) {
      console.log('No referral codes file found');
      return;
    }
    
    const data = readFileSync(REFERRAL_CODES_FILE, 'utf8');
    const codes = JSON.parse(data);
    
    console.log('Current codes:', Object.keys(codes).length);
    
    // Create cleaned version
    const cleanedCodes = {};
    
    Object.entries(codes).forEach(([code, address]) => {
      // Normalize code format
      let normalizedCode;
      if (code.length <= 10) { // Short code (8 chars + optional 0x)
        normalizedCode = code.startsWith('0x') ? code.slice(2) : code;
      } else { // Legacy long code - keep 0x prefix
        normalizedCode = code.startsWith('0x') ? code : `0x${code}`;
      }
      
      // Only keep if not already present (avoid duplicates)
      if (!cleanedCodes[normalizedCode]) {
        cleanedCodes[normalizedCode] = address.toLowerCase();
      } else if (cleanedCodes[normalizedCode] !== address.toLowerCase()) {
        console.warn(`Warning: Code ${normalizedCode} has multiple addresses:`, {
          existing: cleanedCodes[normalizedCode],
          new: address.toLowerCase()
        });
      }
    });
    
    console.log('Cleaned codes:', Object.keys(cleanedCodes).length);
    console.log('\nCleaned data:');
    console.log(JSON.stringify(cleanedCodes, null, 2));
    
    // Backup original file
    const backupFile = REFERRAL_CODES_FILE + '.backup.' + Date.now();
    copyFileSync(REFERRAL_CODES_FILE, backupFile);
    console.log('\nBackup saved to:', backupFile);
    
    // Write cleaned data
    writeFileSync(REFERRAL_CODES_FILE, JSON.stringify(cleanedCodes, null, 2));
    console.log('Cleaned data written to:', REFERRAL_CODES_FILE);
    
  } catch (error) {
    console.error('Error cleaning referral codes:', error);
  }
}

// Run the cleanup
cleanupReferralCodes();