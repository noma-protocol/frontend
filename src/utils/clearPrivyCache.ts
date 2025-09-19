// Clear Privy cache and storage to fix initialization issues

export function clearPrivyCache() {
  console.log('[PRIVY] Clearing Privy cache and storage...');
  
  // Clear all Privy-related items from localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('privy') || key.includes('walletconnect'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`[PRIVY] Removing localStorage key: ${key}`);
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage as well
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('privy') || key.includes('walletconnect'))) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    console.log(`[PRIVY] Removing sessionStorage key: ${key}`);
    sessionStorage.removeItem(key);
  });
  
  console.log('[PRIVY] Cache cleared. Please reload the page.');
}

// Add to window for easy access
(window as any).clearPrivyCache = clearPrivyCache;