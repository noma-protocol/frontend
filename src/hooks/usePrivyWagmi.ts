import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect } from 'react';

export const usePrivyWagmi = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Sync Privy wallet with wagmi
  useEffect(() => {
    const syncWallet = async () => {
      if (authenticated && wallets.length > 0 && !isConnected) {
        const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
        const externalWallet = wallets.find(wallet => wallet.walletClientType !== 'privy');
        
        const activeWallet = externalWallet || embeddedWallet;
        
        if (activeWallet) {
          try {
            // For external wallets, wagmi should auto-connect
            // For embedded wallets, we might need additional handling
            if (embeddedWallet && !externalWallet) {
              // Privy embedded wallets are automatically connected
              console.log('Using Privy embedded wallet');
            }
          } catch (error) {
            console.error('Failed to sync wallet:', error);
          }
        }
      }
    };

    syncWallet();
  }, [authenticated, wallets, isConnected]);

  // Enhanced logout that disconnects wagmi too
  const handleLogout = async () => {
    await logout();
    if (isConnected) {
      disconnect();
    }
  };

  return {
    ready,
    authenticated,
    user,
    login,
    logout: handleLogout,
    address: address || wallets[0]?.address,
    isConnected: authenticated && (isConnected || wallets.length > 0),
    wallets,
  };
};