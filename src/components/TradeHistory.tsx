import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { FaArrowUp, FaArrowDown, FaClock, FaExchangeAlt } from 'react-icons/fa';
import { useBlockchainWebSocketWagmi } from '../hooks/useBlockchainWebSocketWagmi';
import { BlockchainEvent } from '../services/websocketService';
import { ethers } from 'ethers';

// Pool addresses from the WSS configuration
const POOLS = {
  'BUN/WMON': '0x90666407c841fe58358F3ed04a245c5F5bd6fD0A',
  'AVO/WMON': '0x8Eb5C457F7a29554536Dc964B3FaDA2961Dd8212'
} as const;

interface TradeHistoryProps {
  poolFilter?: keyof typeof POOLS | 'all';
  limit?: number;
  showRealtime?: boolean;
  className?: string;
}

interface ProcessedTrade {
  id: string;
  type: 'buy' | 'sell';
  poolName: keyof typeof POOLS;
  amount0: string;
  amount1: string;
  priceImpact: number;
  timestamp: Date;
  txHash: string;
  sender: string;
  recipient: string;
  blockNumber: number;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({
  poolFilter = 'all',
  limit = 50,
  showRealtime = true,
  className = ''
}) => {
  const [historicalTrades, setHistoricalTrades] = useState<ProcessedTrade[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const poolsToSubscribe = useMemo(() => {
    if (poolFilter === 'all') {
      return Object.values(POOLS);
    }
    return [POOLS[poolFilter]];
  }, [poolFilter]);

  const {
    isConnected,
    isAuthenticated,
    events,
    error,
    authenticate,
    getHistory,
    clearEvents
  } = useBlockchainWebSocketWagmi({
    autoConnect: true,
    autoAuthenticate: false, // Don't auto-authenticate, let Exchange.tsx handle it
    pools: showRealtime ? poolsToSubscribe : []
  });

  // Process blockchain events into trades
  const processEvent = useCallback((event: BlockchainEvent): ProcessedTrade | null => {
    if (event.eventName !== 'Swap') return null;

    const poolName = Object.entries(POOLS).find(([_, address]) => 
      address.toLowerCase() === event.poolAddress.toLowerCase()
    )?.[0] as keyof typeof POOLS | undefined;

    if (!poolName) return null;

    const amount0 = ethers.BigNumber.from(event.args.amount0 || '0');
    const amount1 = ethers.BigNumber.from(event.args.amount1 || '0');
    
    // Determine if it's a buy or sell based on token flow
    // If amount0 is negative and amount1 is positive, it's a buy (selling token0 for token1)
    const isBuy = amount0.isNegative() && !amount1.isNegative();

    return {
      id: `${event.transactionHash}-${event.blockNumber}`,
      type: isBuy ? 'buy' : 'sell',
      poolName,
      amount0: ethers.utils.formatUnits(amount0.abs(), 18), // Assuming 18 decimals
      amount1: ethers.utils.formatUnits(amount1.abs(), 18),
      priceImpact: 0, // TODO: Calculate from sqrtPriceX96 change
      timestamp: new Date(event.timestamp * 1000),
      txHash: event.transactionHash,
      sender: event.args.sender,
      recipient: event.args.recipient,
      blockNumber: event.blockNumber
    };
  }, []);

  // Process real-time events
  const realtimeTrades = useMemo(() => {
    return events
      .map(processEvent)
      .filter((trade): trade is ProcessedTrade => trade !== null)
      .reverse(); // Show newest first
  }, [events, processEvent]);

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping history fetch');
      return;
    }

    setIsLoadingHistory(true);
    try {
      const now = Date.now() / 1000;
      let startTime: number;

      switch (selectedTimeRange) {
        case '1h':
          startTime = now - 3600;
          break;
        case '24h':
          startTime = now - 86400;
          break;
        case '7d':
          startTime = now - 604800;
          break;
        case '30d':
          startTime = now - 2592000;
          break;
      }

      const history = await getHistory(poolsToSubscribe, startTime, now, 1000);
      const processedHistory = history
        .map(processEvent)
        .filter((trade): trade is ProcessedTrade => trade !== null)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setHistoricalTrades(processedHistory);
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAuthenticated, selectedTimeRange, poolsToSubscribe, getHistory, processEvent]);

  // Combine and limit trades
  const displayTrades = useMemo(() => {
    const allTrades = [...realtimeTrades, ...historicalTrades];
    
    // Remove duplicates based on transaction hash
    const uniqueTrades = Array.from(
      new Map(allTrades.map(trade => [trade.id, trade])).values()
    );

    // Sort by timestamp descending and limit
    return uniqueTrades
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [realtimeTrades, historicalTrades, limit]);

  // Fetch history when authenticated or time range changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistoricalData();
    }
  }, [isAuthenticated, fetchHistoricalData]);

  // Manual authentication trigger
  const handleAuthenticate = async () => {
    try {
      await authenticate();
    } catch (err) {
      console.error('Authentication failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className={`bg-neutral-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FaExchangeAlt className="text-blue-500" />
          Trade History
        </h3>
        <div className="text-center text-gray-400 py-8">
          Connecting to trade monitor...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`bg-neutral-800 rounded-lg p-6 ${className}`}>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FaExchangeAlt className="text-blue-500" />
          Trade History
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">
            Authentication required to view trade history
          </p>
          <button
            onClick={handleAuthenticate}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-neutral-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FaExchangeAlt className="text-blue-500" />
          Trade History
          {showRealtime && (
            <span className="text-xs text-green-400 animate-pulse">LIVE</span>
          )}
        </h3>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="bg-neutral-700 text-white px-3 py-1 rounded text-sm"
          >
            <option value="1h">1 Hour</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-neutral-700">
              <th className="text-left pb-2">Type</th>
              <th className="text-left pb-2">Pool</th>
              <th className="text-right pb-2">Amount</th>
              <th className="text-right pb-2">Time</th>
              <th className="text-right pb-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingHistory && displayTrades.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Loading historical trades...
                </td>
              </tr>
            ) : displayTrades.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No trades found
                </td>
              </tr>
            ) : (
              displayTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-neutral-700/50 hover:bg-neutral-700/20 transition"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {trade.type === 'buy' ? (
                        <FaArrowUp className="text-green-400 text-xs" />
                      ) : (
                        <FaArrowDown className="text-red-400 text-xs" />
                      )}
                      <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {trade.type.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-300">{trade.poolName}</td>
                  <td className="py-3 text-right">
                    <div>
                      <div className="text-white">
                        {parseFloat(trade.amount0).toFixed(4)} {trade.poolName.split('/')[0]}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {parseFloat(trade.amount1).toFixed(4)} {trade.poolName.split('/')[1]}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right text-gray-400">
                    <div className="flex items-center justify-end gap-1">
                      <FaClock className="text-xs" />
                      <span>{format(trade.timestamp, 'HH:mm:ss')}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <a
                      href={`https://moonscan.io/tx/${trade.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      {trade.txHash.slice(0, 6)}...{trade.txHash.slice(-4)}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {displayTrades.length >= limit && (
        <div className="text-center mt-4 text-sm text-gray-400">
          Showing last {limit} trades
        </div>
      )}
    </div>
  );
};

export default TradeHistory;