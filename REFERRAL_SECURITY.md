# Referral System Security Recommendations

## Additional Anti-Abuse Measures to Consider:

### 1. Minimum Activity Requirements
```javascript
// Before counting referral volume
if (userTotalVolume < MIN_VOLUME_THRESHOLD) return;
if (accountAge < MIN_ACCOUNT_AGE) return;
if (transactionCount < MIN_TXN_COUNT) return;
```

### 2. Rate Limiting
```javascript
// Limit referral registrations per IP/wallet
const DAILY_REFERRAL_LIMIT = 10;
const registrationsToday = getRegistrationCount(ipAddress, today);
if (registrationsToday >= DAILY_REFERRAL_LIMIT) {
  throw new Error('Daily referral limit exceeded');
}
```

### 3. Cooldown Periods
```javascript
// Add delay before referral benefits activate
const ACTIVATION_DELAY = 24 * 60 * 60 * 1000; // 24 hours
const registrationTime = referralData.registeredAt;
if (Date.now() - registrationTime < ACTIVATION_DELAY) {
  return; // Don't count volume yet
}
```

### 4. Volume Validation
```javascript
// Detect suspicious trading patterns
function detectWashTrading(trades) {
  const recentTrades = trades.slice(-100);
  const addresses = new Set(recentTrades.map(t => t.userAddress));
  
  // Flag if same addresses trading repeatedly
  if (addresses.size < 5 && recentTrades.length > 50) {
    return true; // Likely wash trading
  }
  
  // Check for back-and-forth patterns
  const pairs = {};
  for (let i = 1; i < recentTrades.length; i++) {
    const pair = [recentTrades[i-1].userAddress, recentTrades[i].userAddress].sort().join('-');
    pairs[pair] = (pairs[pair] || 0) + 1;
  }
  
  // Flag if same pair trades too frequently
  const maxPairTrades = Math.max(...Object.values(pairs));
  if (maxPairTrades > recentTrades.length * 0.3) {
    return true; // Suspicious pattern
  }
  
  return false;
}
```

### 5. Smart Contract Improvements
```solidity
// Add to Presale.sol
mapping(address => uint256) public lastReferralUsed;
uint256 public constant REFERRAL_COOLDOWN = 1 days;

modifier referralCooldown() {
    require(
        block.timestamp >= lastReferralUsed[msg.sender] + REFERRAL_COOLDOWN,
        "Referral cooldown active"
    );
    _;
}

// In deposit function
if (referralCode != bytes32(0)) {
    lastReferralUsed[msg.sender] = block.timestamp;
    // ... rest of referral logic
}
```

### 6. Monitoring & Alerts
```javascript
// Add to blockchain monitor
function checkSuspiciousActivity(transaction) {
  // Alert on large volumes from new accounts
  const accountAge = Date.now() - getFirstSeenTime(transaction.sender);
  if (accountAge < 24 * 60 * 60 * 1000 && parseFloat(transaction.amount) > 1000) {
    logSuspiciousActivity('Large volume from new account', transaction);
  }
  
  // Alert on rapid repeated trades
  const recentTrades = getRecentTrades(transaction.sender, 60 * 60 * 1000); // Last hour
  if (recentTrades.length > 20) {
    logSuspiciousActivity('Excessive trading frequency', transaction);
  }
}
```

### 7. Commission Caps
```javascript
// Prevent runaway commissions
const DAILY_COMMISSION_CAP = 1000; // NOMA
const MONTHLY_COMMISSION_CAP = 10000; // NOMA

function calculateCommission(referrer, volume) {
  const dailyCommission = getDailyCommission(referrer);
  const monthlyCommission = getMonthlyCommission(referrer);
  
  let commission = volume * COMMISSION_RATE;
  
  // Apply caps
  if (dailyCommission + commission > DAILY_COMMISSION_CAP) {
    commission = DAILY_COMMISSION_CAP - dailyCommission;
  }
  
  if (monthlyCommission + commission > MONTHLY_COMMISSION_CAP) {
    commission = MONTHLY_COMMISSION_CAP - monthlyCommission;
  }
  
  return Math.max(0, commission);
}
```

## Implementation Priority:
1. **High Priority**: Cooldown periods, minimum activity requirements
2. **Medium Priority**: Rate limiting, commission caps
3. **Low Priority**: Advanced wash trading detection

## Monitoring Dashboard
Consider building a dashboard to track:
- New referral registrations per day
- Average volume per referrer
- Suspicious trading patterns
- Commission distribution
- Geographic distribution (if tracking IPs)