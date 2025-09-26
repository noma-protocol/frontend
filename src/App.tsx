// import "./App.css";
import { Outlet } from "react-router-dom";
import { LanguageProvider } from "./core/LanguageProvider";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig } from "wagmi";
import React from "react";
import { bsc, bscTestnet, localhost } from "viem/chains";

import { monad } from './chains/monad';
import config from './config'; 

// import { ToastContainer } from "react-toastify";
// Removed unused imports that caused excessive eth_chainId calls
import "react-toastify/dist/ReactToastify.css";
import { MenuProvider } from "./hooks/MenuContext"; // Import the MenuProvider
import { TokenProvider } from "./contexts/TokenContext"; // Import the TokenProvider
import { MonPriceProvider } from "./contexts/MonPriceContext"; // Import the MonPriceProvider

import ReactGA from 'react-ga';
import { Provider } from "./components/ui/provider"

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  const TRACKING_ID = "UA-XXXXX-X"; // OUR_TRACKING_ID
  ReactGA.initialize(TRACKING_ID);

  const projectId = "a49d90d6ef89c4f94f1629f5821784a5";
  const metadata = {
    name: "Noma",
    description: "Next-gen Launchpad",
    url: "https://app.noma.money",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  };

  const chains = [monad, localhost];
  const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    // Add performance optimizations
    autoConnect: true, // Auto-connect to last used wallet
    connectors: {
      // Configure connectors with specific options if needed
    },
  });

  createWeb3Modal({ 
    wagmiConfig, 
    projectId, 
    chains,
    themeMode: 'dark', // Set a default theme
    enableAnalytics: false, // Disable analytics to reduce external calls
  });

  // Removed watchNetwork - it causes excessive eth_chainId calls
  // Wagmi already handles network state internally

  return (
    <WagmiConfig config={wagmiConfig}>
      <LanguageProvider>
        <MonPriceProvider>
          <TokenProvider>
            <MenuProvider>
              <Provider>
                <Header />
                <Outlet />
                <Footer />
              </Provider>
            </MenuProvider>
          </TokenProvider>
        </MonPriceProvider>
      </LanguageProvider>
    </WagmiConfig>
  );
}

export default App;