# Referral System Structure Fix

## Current Problem

The current referral system uses this structure:
```json
{
  "code:referrerAddress": ["referredAddress1", "referredAddress2"]
}
```

This prevents circular referrals where:
- User A refers User B
- User B later wants to refer User A

## Root Cause

The system tracks referrals by referrer, not by the referred user. This means:
- We can't check if a user is already referred before adding them
- Users can be in multiple referral lists

## Proper Solution

We need TWO data structures:

### 1. referral_codes.json (existing)
```json
{
  "295f3a7e": "0x12e30fcc16b741a08ccf066074f0547f3ce79f32",
  "a7568cb7": "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7"
}
```

### 2. referrals.json (needs restructuring)
```json
{
  "referred_users": {
    "0x54302450bc0c3779bb2669f705afd5dee19d64b5": {
      "referrer": "0x12e30fcc16b741a08ccf066074f0547f3ce79f32",
      "referralCode": "295f3a7e",
      "timestamp": 1234567890
    },
    "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7": {
      "referrer": "0x12e30fcc16b741a08ccf066074f0547f3ce79f32",
      "referralCode": "295f3a7e",
      "timestamp": 1234567891
    }
  },
  "referrers": {
    "0x12e30fcc16b741a08ccf066074f0547f3ce79f32": {
      "code": "295f3a7e",
      "referred": [
        "0x54302450bc0c3779bb2669f705afd5dee19d64b5",
        "0x50440b6eedf99f0c920edbe98a329cfdd2592fd7"
      ]
    }
  }
}
```

## Benefits

1. **One referrer per user**: Check `referred_users[address]` to see if already referred
2. **Prevent circular referrals**: Can't refer someone who already referred others
3. **Easy lookups**: Both directions (who referred whom, who did X refer)
4. **No manual modifications needed**: System handles all cases properly

## Implementation

Update the ReferralStore class to use this new structure and prevent the issues you encountered.