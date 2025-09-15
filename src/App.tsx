// import "./App.css";
import { Outlet } from "react-router-dom";
import { LanguageProvider } from "./core/LanguageProvider";
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiConfig, createConfig } from "wagmi";
import { createPublicClient, http } from 'viem';
import React from "react";
import { localhost } from "viem/chains";

import { monad } from './chains/monad';
import config from './config';
import { privyConfig } from './config/privyConfig'; 

// import { ToastContainer } from "react-toastify";
import { switchNetwork, watchNetwork } from "wagmi/actions";
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

  const chains = [monad, localhost];
  
  const wagmiConfig = createConfig({
    chains,
    publicClient: createPublicClient({
      chain: monad,
      transport: http(),
    }),
  });

  watchNetwork(async (network) => {
    console.log("Network changed:", network.chain?.name);
    if (network.chain?.name != "local") {
      await switchNetwork({
        chainId: config.chain == "local" ? 1337 : 10143,
      });
    }
    console.log(`Network is ${network.chain?.name}`)
  });

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      config={privyConfig.config}
    >
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
    </PrivyProvider>
  );
}

export default App;