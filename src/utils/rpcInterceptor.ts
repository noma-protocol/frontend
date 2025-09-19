// RPC Request Interceptor to analyze and reduce requests

const requestCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

// Track request counts
const requestCounts: Record<string, number> = {};

export function createInterceptedFetch() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Only intercept RPC calls - check for any RPC endpoint pattern
    const isRPC = typeof url === 'string' && (
      url.includes('monad.xyz') || 
      url.includes('rpc.troll.box') ||
      url.includes('localhost:8545') ||
      url.includes('127.0.0.1:8545') ||
      (options?.body && typeof options.body === 'string' && options.body.includes('jsonrpc'))
    );
    
    if (isRPC) {
      const body = options?.body ? JSON.parse(options.body as string) : null;
      
      if (body) {
        // Track request counts
        requestCounts[body.method] = (requestCounts[body.method] || 0) + 1;
        
        // Log request with simplified stack trace
        const stack = new Error().stack || '';
        const privyCall = stack.includes('privy');
        const wagmiCall = stack.includes('wagmi');
        
        // Silently track requests without logging
        // Uncomment for debugging: console.log(`[RPC] ${body.method} #${requestCounts[body.method]}`);
        
        // Block excessive calls for certain methods
        const blockThresholds: Record<string, number> = {
          'eth_accounts': 3,
          'eth_chainId': 3,
          'net_version': 3,
          'eth_blockNumber': 5,
          'eth_getBlockByNumber': 5
        };
        
        const threshold = blockThresholds[body.method];
        if (threshold && requestCounts[body.method] > threshold) {
          // Silently block excessive calls
          
          // Return cached or default responses
          const defaultResponses: Record<string, any> = {
            'eth_accounts': [],
            'eth_chainId': '0x279f',  // 10143 in hex (monad chain id)
            'net_version': '10143',
            'eth_blockNumber': '0x1',
            'eth_getBlockByNumber': null
          };
          
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: defaultResponses[body.method] ?? null
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Cache certain read-only calls
        const cacheKey = `${body.method}-${JSON.stringify(body.params)}`;
        const cached = requestCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          // Return cached result silently
          return new Response(JSON.stringify(cached.response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // Make the actual request
    const response = await originalFetch.apply(this, args);
    
    // Cache the response if it's a read-only RPC call
    if (isRPC) {
      const clonedResponse = response.clone();
      const responseData = await clonedResponse.json();
      const body = options?.body ? JSON.parse(options.body as string) : null;
      
      if (body && ['eth_chainId', 'eth_blockNumber', 'eth_call', 'eth_accounts', 'net_version', 'eth_getLogs', 'eth_getCode'].includes(body.method)) {
        const cacheKey = `${body.method}-${JSON.stringify(body.params)}`;
        requestCache.set(cacheKey, {
          response: responseData,
          timestamp: Date.now()
        });
      }
    }
    
    return response;
  };
}

export function analyzeRequests() {
  console.log('\n=== RPC REQUEST SUMMARY ===');
  console.log('Total requests by method:');
  Object.entries(requestCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([method, count]) => {
      console.log(`  ${method}: ${count}`);
    });
  console.log('===========================\n');
  return requestCounts;
}

// Reset request counts
export function resetRequestCounts() {
  Object.keys(requestCounts).forEach(key => {
    requestCounts[key] = 0;
  });
  requestCache.clear();
  // Request counts reset
}

// Add to window for easy access
(window as any).rpcAnalysis = analyzeRequests;
(window as any).rpcReset = resetRequestCounts;