import { readFileSync, writeFileSync } from 'fs';

// Example of how to convert from old to new format
const oldData = {
  "295f3a7e:0x11e30fcc16b741a08ccf066074f0547f3ce79f32": [
    "0x54302450bc0c3779bb2669f705afd5dee19d64b5",
    "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7",
    "0x8980dbb1488a46bad02190054a8c2244f5ebbcea"
  ],
  "a7568cb7:0x50440b6eedf99f0c920edbe98a329cfdd2592fd7": [
    "0x12e30fcc16b741a08ccf066074f0547f3ce79f32"
  ]
};

function convertToNewFormat(oldData) {
  const newData = {
    referred_users: {},
    referrers: {}
  };
  
  Object.entries(oldData).forEach(([key, referredList]) => {
    const [code, referrerAddress] = key.split(':');
    const normalizedReferrer = referrerAddress.toLowerCase();
    
    // Initialize referrer entry
    if (!newData.referrers[normalizedReferrer]) {
      newData.referrers[normalizedReferrer] = {
        code: code,
        referred: []
      };
    }
    
    // Process each referred user
    referredList.forEach(referredAddress => {
      const normalizedReferred = referredAddress.toLowerCase();
      
      // Only add if not already referred by someone else
      if (!newData.referred_users[normalizedReferred]) {
        newData.referred_users[normalizedReferred] = {
          referrer: normalizedReferrer,
          referralCode: code,
          timestamp: Date.now()
        };
        
        newData.referrers[normalizedReferrer].referred.push(normalizedReferred);
      } else {
        console.warn(`User ${referredAddress} already referred by ${newData.referred_users[normalizedReferred].referrer}, skipping`);
      }
    });
  });
  
  return newData;
}

console.log('Converted data:');
console.log(JSON.stringify(convertToNewFormat(oldData), null, 2));

// To convert your actual file:
// const data = JSON.parse(readFileSync('data/referrals.json', 'utf8'));
// const converted = convertToNewFormat(data);
// writeFileSync('data/referrals_new.json', JSON.stringify(converted, null, 2));