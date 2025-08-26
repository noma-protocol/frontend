# Mobile Transaction Nonce Fix

## Problem
Mobile devices occasionally encounter "Transaction nonce is too low" errors due to:
- Network connectivity issues
- Rapid transaction submissions
- Browser/wallet sync delays
- Mobile network switching (WiFi to cellular)

## Solution
We've implemented `useSafeContractWrite` hook that:
1. Automatically detects nonce errors
2. Shows user-friendly retry notifications
3. Waits for network sync before retrying
4. Limits retries to prevent infinite loops

## Usage

Replace `useContractWrite` with `useSafeContractWrite`:

```typescript
// Before
import { useContractWrite } from "wagmi";
const { write } = useContractWrite({
  // config
});

// After  
import { useSafeContractWrite } from "../hooks/useSafeContractWrite";
const { write, isRetrying, retryCount } = useSafeContractWrite({
  // same config
});
```

## Configuration

Optional parameters:
- `retryOnNonceError` (default: true) - Enable automatic retry
- `maxRetries` (default: 2) - Maximum retry attempts

## Migration Guide

1. Import `useSafeContractWrite` instead of `useContractWrite`
2. The hook is a drop-in replacement with the same API
3. Additional return values: `isRetrying` and `retryCount` for UI feedback

## Best Practices

1. Show loading state during retries
2. Disable submit buttons when `isRetrying` is true
3. Consider adding a manual retry button for better UX
4. Test on actual mobile devices with poor connectivity