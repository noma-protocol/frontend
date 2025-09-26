// Console log filter to suppress noise and keep only important logs

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Patterns to ALLOW (keep these logs)
const allowPatterns = [
  /\[ProviderService\]/,
  /\[RPC\]/,
  /\[fetchOHLCData\]/,
  /\[loadChartData\]/,
  /\[IMPORTANT\]/,
  /Error/i,
  /Failed/i,
];

// Patterns to explicitly BLOCK (suppress these even if they match allow patterns)
const blockPatterns = [
  /\[Exchange\] (Load history|Trade history|WebSocket|Pool|Setting poolInfo)/,
  /\[Chart Render\]/,
  /\[My Trades Debug\]/,  
  /\[Token Selection Effect\]/,
  /\[fetchTokenInfo\]/,
  /\[useMulticallBalances\]/,
  /\[WebSocketService\] (Initialized|Attempting|Connected|Unhandled)/,
  /\[MulticallService\]/,
  /\[useMulticallAllowances\]/,
  /Download the React DevTools/,
  /\[Volume Debug\]/,
  /\[Debug\]/,
];

function shouldLog(args: any[]): boolean {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  // First check if it should be blocked
  for (const pattern of blockPatterns) {
    if (pattern.test(message)) {
      return false;
    }
  }

  // Then check if it should be allowed
  for (const pattern of allowPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }

  // Block by default
  return false;
}

// Override console methods
console.log = (...args: any[]) => {
  if (shouldLog(args)) {
    originalLog.apply(console, args);
  }
};

console.warn = (...args: any[]) => {
  if (shouldLog(args)) {
    originalWarn.apply(console, args);
  }
};

// Always show errors
console.error = originalError;

export function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}