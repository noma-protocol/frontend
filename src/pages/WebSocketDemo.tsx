import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import TradeHistory from '../components/TradeHistory';
import { useBlockchainWebSocketWagmi } from '../hooks/useBlockchainWebSocketWagmi';
import { referralApiV2 } from '../services/referralApiV2';
import { features } from '../config/features';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import styles from './WebSocketDemo.module.css';

const WebSocketDemo: React.FC = () => {
  const { address: account } = useAccount();
  const { open } = useWeb3Modal();
  const [referralStats, setReferralStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedPool, setSelectedPool] = useState<'all' | 'BUN/WMON' | 'AVO/WMON'>('all');

  const {
    isConnected,
    isAuthenticated,
    error,
    connect,
    disconnect,
    authenticate,
  } = useBlockchainWebSocketWagmi({
    autoConnect: true,
    autoAuthenticate: false, // Disable auto-auth to prevent errors
  });

  const fetchReferralStats = async () => {
    if (!account) return;

    setIsLoadingStats(true);
    try {
      const stats = await referralApiV2.getReferralStats(account);
      console.log('[WebSocketDemo] Referral stats response:', stats);
      setReferralStats(stats);
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>WebSocket Infrastructure Demo</h1>

        {/* Connection Status */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Connection Status</h2>
          
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>WebSocket:</span>
              {isConnected ? (
                <FaCheckCircle className={`${styles.statusIcon} ${styles.success}`} />
              ) : (
                <FaTimesCircle className={`${styles.statusIcon} ${styles.error}`} />
              )}
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Authentication:</span>
              {isAuthenticated ? (
                <FaCheckCircle className={`${styles.statusIcon} ${styles.success}`} />
              ) : (
                <FaTimesCircle className={`${styles.statusIcon} ${styles.error}`} />
              )}
              <span>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
            </div>

            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Wallet:</span>
              {account ? (
                <span style={{ color: '#60a5fa' }}>{account.slice(0, 6)}...{account.slice(-4)}</span>
              ) : (
                <>
                  <span style={{ color: '#666' }}>Not Connected</span>
                  <button 
                    onClick={() => open()} 
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    style={{ marginLeft: '8px', padding: '4px 12px', fontSize: '14px' }}
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.errorBox}>
              Error: {error}
            </div>
          )}

          <div className={styles.buttonGroup}>
            {!isConnected ? (
              <button onClick={connect} className={`${styles.button} ${styles.buttonPrimary}`}>
                Connect WebSocket
              </button>
            ) : (
              <button onClick={disconnect} className={`${styles.button} ${styles.buttonDanger}`}>
                Disconnect
              </button>
            )}

            {isConnected && !isAuthenticated && (
              <button onClick={authenticate} className={`${styles.button} ${styles.buttonSuccess}`}>
                Authenticate
              </button>
            )}
          </div>
        </div>

        {/* Configuration Info */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Configuration</h2>
          
          <div className={styles.configList}>
            <div>
              <span className={styles.configLabel}>WebSocket URL:</span>
              <span className={styles.configValue}>{features.websocket.url}</span>
            </div>
            <div>
              <span className={styles.configLabel}>Referral API URL:</span>
              <span className={styles.configValue}>{features.referralApi.url}</span>
            </div>
            <div>
              <span className={styles.configLabel}>Monitored Pools:</span>
              <ul className={styles.poolList}>
                {Object.entries(features.pools).map(([name, address]) => (
                  <li key={name}>
                    {name}: <span className={styles.poolAddress}>{address}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Pool Filter */}
        <div className={styles.filterSection}>
          <span style={{ color: '#999' }}>Filter by pool:</span>
          <select
            value={selectedPool}
            onChange={(e) => setSelectedPool(e.target.value as any)}
            className={styles.select}
          >
            <option value="all">All Pools</option>
            <option value="BUN/WMON">BUN/WMON</option>
            <option value="AVO/WMON">AVO/WMON</option>
          </select>
        </div>

        {/* Trade History */}
        <div style={{ marginBottom: '24px' }}>
          <TradeHistory
            poolFilter={selectedPool}
            showRealtime={true}
            limit={30}
          />
        </div>

        {/* Referral Stats */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className={styles.cardTitle}>Referral Statistics</h2>
            <button
              onClick={fetchReferralStats}
              disabled={!account || isLoadingStats}
              className={`${styles.button} ${styles.buttonPrimary}`}
              style={{ opacity: (!account || isLoadingStats) ? 0.5 : 1 }}
            >
              {isLoadingStats ? (
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                'Load Stats'
              )}
            </button>
          </div>

          {referralStats ? (
            <div>
              {referralStats.totalStats ? (
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Referred</div>
                    <div className={styles.statValue}>
                      {referralStats.totalStats.totalReferred || 0}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Volume (ETH)</div>
                    <div className={styles.statValue}>
                      {parseFloat(referralStats.totalStats.totalVolumeETH || '0').toFixed(4)}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Volume (USD)</div>
                    <div className={styles.statValue}>
                      ${parseFloat(referralStats.totalStats.totalVolumeUSD || '0').toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.centerText}>
                  No statistics available yet
                </div>
              )}

              {referralStats.stats && referralStats.stats.length > 0 && (
                <>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '24px 0 12px' }}>Stats by Pool</h3>
                  <div>
                    {referralStats.stats.map((poolStat: any) => {
                      const poolName = Object.entries(features.pools).find(
                        ([_, address]) => address.toLowerCase() === poolStat.poolAddress.toLowerCase()
                      )?.[0] || poolStat.poolAddress;

                      return (
                        <div key={poolStat.poolAddress} className={styles.poolStatCard}>
                          <div className={styles.poolStatHeader}>
                            <div>
                              <div className={styles.poolStatName}>{poolName}</div>
                              <div className={styles.poolStatInfo}>
                                {poolStat.referredCount || 0} users referred
                              </div>
                            </div>
                            <div className={styles.poolStatVolume}>
                              <div className={styles.volumeLabel}>Volume</div>
                              <div>{parseFloat(poolStat.totalVolumeETH || '0').toFixed(4)} ETH</div>
                              <div className={styles.poolStatInfo}>
                                ${parseFloat(poolStat.totalVolumeUSD || '0').toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className={styles.centerText}>
              {account ? 'Click "Load Stats" to view your referral statistics' : 'Connect wallet to view stats'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketDemo;

<style jsx>{`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>