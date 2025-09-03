// Script to fix the production referral codes data
// Run this on the server where the actual data is located

import { readFileSync, writeFileSync } from 'fs';

const data = {
  "0x295f3a7e": "0x12e30fcc16b741a08ccf066074f0547f3ce79f32",
  "295f3a7e": "0x12e30fcc16b741a08ccf066074f0547f3ce79f32",
  "0x4252fe7d": "0x98f2243e853afe7d8ac5ddbc32ba167e8b5f1bbd",
  "4252fe7d": "0x98f2243e853afe7d8ac5ddbc32ba167e8b5f1bbd",
  "0xada067a3": "0x54302450bc0c3779bb2669f705afd5dee19d64b5",
  "ada067a3": "0x54302450bc0c3779bb2669f705afd5dee19d64b5",
  "0xa7568cb7": "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7",
  "a7568cb7": "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7"
};

// Clean up to have only one format (without 0x prefix for short codes)
const cleaned = {
  "295f3a7e": "0x12e30fcc16b741a08ccf066074f0547f3ce79f32",
  "4252fe7d": "0x98f2243e853afe7d8ac5ddbc32ba167e8b5f1bbd",
  "ada067a3": "0x54302450bc0c3779bb2669f705afd5dee19d64b5",
  "a7568cb7": "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7"
};

console.log('Cleaned data for production:');
console.log(JSON.stringify(cleaned, null, 2));

// If you want to write this to a file, uncomment:
// writeFileSync('referral_codes_cleaned.json', JSON.stringify(cleaned, null, 2));