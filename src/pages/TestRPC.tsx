import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const RPC_URLS = [
  'https://monad-testnet.g.alchemy.com/v2/C-wFnzKJmPYMxeTH1qqCE',
  'https://rpc.ankr.com/monad_testnet', 
  'https://testnet-rpc.monad.xyz',
  'https://monad-testnet.drpc.org',
];

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

interface TestResult {
  test: string;
  success: boolean;
  result?: any;
  error?: string;
}

export default function TestRPC() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [currentRPC, setCurrentRPC] = useState(RPC_URLS[0]);

  const addResult = (test: string, success: boolean, result?: any, error?: string) => {
    setResults(prev => [...prev, { test, success, result, error }]);
  };

  const testBasicRPC = async () => {
    setResults([]);
    setTesting(true);
    
    try {
      // Test 1: Basic provider creation
      addResult('Create JsonRpcProvider', true, currentRPC);
      const provider = new ethers.providers.JsonRpcProvider(currentRPC);
      
      // Test 2: eth_chainId
      try {
        const chainId = await provider.send('eth_chainId', []);
        addResult('eth_chainId', true, `${chainId} (${parseInt(chainId, 16)})`);
      } catch (e: any) {
        addResult('eth_chainId', false, null, e.message);
      }

      // Test 3: getNetwork()
      try {
        const network = await provider.getNetwork();
        addResult('getNetwork()', true, JSON.stringify(network));
      } catch (e: any) {
        addResult('getNetwork()', false, null, e.message);
      }

      // Test 4: eth_blockNumber
      try {
        const blockNumber = await provider.getBlockNumber();
        addResult('getBlockNumber()', true, blockNumber);
      } catch (e: any) {
        addResult('getBlockNumber()', false, null, e.message);
      }

      // Test 5: getCode - Check multicall contract
      try {
        const code = await provider.getCode(MULTICALL3_ADDRESS);
        addResult('getCode(multicall)', true, `${code.slice(0, 10)}... (${code.length} chars)`);
      } catch (e: any) {
        addResult('getCode(multicall)', false, null, e.message);
      }

      // Test 6: Simple eth_call
      try {
        const result = await provider.call({
          to: MULTICALL3_ADDRESS,
          data: '0x4d2301cc', // getEthBalance function
        });
        addResult('eth_call (simple)', true, result);
      } catch (e: any) {
        addResult('eth_call (simple)', false, null, e.message);
      }

      // Test 7: StaticJsonRpcProvider
      try {
        const staticProvider = new ethers.providers.StaticJsonRpcProvider(currentRPC, {
          name: 'monad-testnet',
          chainId: 10143,
        });
        const network = await staticProvider.getNetwork();
        addResult('StaticJsonRpcProvider', true, JSON.stringify(network));
      } catch (e: any) {
        addResult('StaticJsonRpcProvider', false, null, e.message);
      }

      // Test 8: Multicall tryAggregate
      try {
        const multicallABI = [
          'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[])'
        ];
        const multicall = new ethers.Contract(MULTICALL3_ADDRESS, multicallABI, provider);
        
        // Try a simple multicall with just one call
        const testCall = {
          target: '0x0000000000000000000000000000000000000000',
          callData: '0x',
        };
        
        const result = await multicall.callStatic.tryAggregate(false, [testCall]);
        addResult('Multicall tryAggregate', true, 'Success');
      } catch (e: any) {
        addResult('Multicall tryAggregate', false, null, e.message);
      }

    } catch (error: any) {
      addResult('Test Suite', false, null, error.message);
    }

    setTesting(false);
  };

  useEffect(() => {
    if (currentRPC) {
      testBasicRPC();
    }
  }, [currentRPC]);

  const styles = {
    container: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'monospace',
    },
    header: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
    },
    button: {
      padding: '8px 16px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      cursor: 'pointer',
      backgroundColor: '#fff',
    },
    activeButton: {
      backgroundColor: '#007bff',
      color: '#fff',
    },
    rpcInfo: {
      marginBottom: '20px',
      padding: '10px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
    },
    resultContainer: {
      marginTop: '20px',
    },
    result: {
      padding: '10px',
      marginBottom: '10px',
      borderRadius: '4px',
      border: '1px solid #ddd',
    },
    success: {
      backgroundColor: '#f0fdf4',
      borderColor: '#86efac',
    },
    error: {
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
    },
    code: {
      fontFamily: 'monospace',
      fontSize: '12px',
      marginTop: '5px',
      wordBreak: 'break-all',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>RPC Test Page</h1>
      
      <div style={styles.buttonGroup}>
        {RPC_URLS.map((url) => (
          <button
            key={url}
            style={{
              ...styles.button,
              ...(currentRPC === url ? styles.activeButton : {}),
            }}
            onClick={() => setCurrentRPC(url)}
          >
            {url.includes('alchemy') ? 'Alchemy' : 
             url.includes('ankr') ? 'Ankr' : 
             url.includes('drpc') ? 'DRPC' : 
             'Monad'}
          </button>
        ))}
      </div>

      <div style={styles.rpcInfo}>
        <strong>Current RPC:</strong><br />
        <code>{currentRPC}</code>
      </div>

      <button 
        onClick={testBasicRPC} 
        disabled={testing}
        style={styles.button}
      >
        {testing ? 'Running Tests...' : 'Run Tests'}
      </button>

      <div style={styles.resultContainer}>
        {results.map((result, index) => (
          <div 
            key={index} 
            style={{
              ...styles.result,
              ...(result.success ? styles.success : styles.error),
            }}
          >
            <strong>{result.success ? '✓' : '✗'} {result.test}</strong>
            {result.result && (
              <div style={styles.code}>
                Result: {result.result}
              </div>
            )}
            {result.error && (
              <div style={{ ...styles.code, color: '#dc2626' }}>
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}