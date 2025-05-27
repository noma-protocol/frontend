// import "./App.css";
import { Outlet } from "react-router-dom";
import { LanguageProvider } from "./core/LanguageProvider";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig } from "wagmi";
import { bsc, bscTestnet, localhost } from "viem/chains";

// import { monad } from './chains/monad';
import config from './config';

// import { ToastContainer } from "react-toastify";
import { switchNetwork, watchNetwork } from "wagmi/actions";
import "react-toastify/dist/ReactToastify.css";
import { MenuProvider } from "./hooks/MenuContext"; // Import the MenuProvider

import React, { useEffect } from "react";
import ReactGA from 'react-ga';
import { Provider } from "./components/ui/provider";
import { useAccount } from "wagmi";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";

// Create a component to handle network switching only when connected
function NetworkHandler() {
  const { isConnected } = useAccount();

  useEffect(() => {
    // Only set up the network watcher if the wallet is connected
    if (isConnected) {
      const unwatchNetwork = watchNetwork(async (network) => {
        // Only switch networks if actually connected and on wrong network
        if (isConnected && network.chain?.name !== "local" && network.chain?.id !== (config.chain === "local" ? 1337 : 56)) {
          try {
            await switchNetwork({
              chainId: config.chain === "local" ? 1337 : 1337,
            });
          } catch (error) {
            console.error("Failed to switch network:", error);
          }
        }
        console.log(`Network is ${network.chain?.name}`);
      });

      // Clean up the watcher when component unmounts
      return () => {
        unwatchNetwork();
      };
    }
  }, [isConnected]); // Re-run when connection status changes

  return null; // This component doesn't render anything
}

// Clear any Web3 connection data from localStorage
function clearWeb3LocalStorage() {
  try {
    // Clear known web3modal localStorage items
    const keysToRemove = [];

    // Scan localStorage for web3/wallet related items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('wagmi') ||
        key.includes('web3modal') ||
        key.includes('wallet') ||
        key.includes('w3m') ||
        key.includes('wc@')
      )) {
        keysToRemove.push(key);
      }
    }

    // Remove the found items
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log('Cleared Web3 localStorage data');
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

function App() {
  const TRACKING_ID = "UA-XXXXX-X"; // OUR_TRACKING_ID
  ReactGA.initialize(TRACKING_ID);

  // We don't want to clear web3 localStorage on initial load
  // as that would disconnect existing sessions
  // useEffect(() => {
  //   clearWeb3LocalStorage();
  // }, []);

  const projectId = "7820402434e60ca8c323d77ae01be61d";
  const metadata = {
    name: "Oikos",
    description: "Next-gen Launchpad",
    url: "https://web3modal.com",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  };

  const chains = [localhost, bsc];
  const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    // Enable auto-connect to persist wallet sessions
    autoConnect: true,
    // Enable client-side rendering for the connected wallet
    ssr: false
    // Use default localStorage behavior instead of disabling storage
  });

  createWeb3Modal({
    wagmiConfig,
    projectId,
    chains,
    themeMode: 'dark',
    includeWalletIds: [],
    enableAnalytics: false,
    enableOnramp: false,
    enableWalletConnect: true,
    enableInjected: true,
    enableEmail: false,
    enableExplorer: false,
    defaultChain: localhost,
    // These options help with connection persistence
    explorerRecommendedWalletIds: 'all',
    mobileWallets: [],
    desktopWallets: [],
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <LanguageProvider>
      <MenuProvider>
      <Provider>
        <NetworkHandler />
        <Header />
        <Outlet />
        <Footer />
      </Provider>
        </MenuProvider>
      </LanguageProvider>
    </WagmiConfig>
  );
}

export default App;
