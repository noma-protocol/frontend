// import "./App.css";
import { Outlet } from "react-router-dom";
import { LanguageProvider } from "./core/LanguageProvider";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig } from "wagmi";
import { bsc, bscTestnet, localhost } from "viem/chains";

import { monad } from './chains/monad';
import config from './config'; 

// import { ToastContainer } from "react-toastify";
import { switchNetwork, watchNetwork } from "wagmi/actions";
import "react-toastify/dist/ReactToastify.css";
import { MenuProvider } from "./hooks/MenuContext"; // Import the MenuProvider

import React from "react";
import ReactGA from 'react-ga';
import { Provider } from "./components/ui/provider"

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  const TRACKING_ID = "UA-XXXXX-X"; // OUR_TRACKING_ID
  ReactGA.initialize(TRACKING_ID);

  const projectId = "7820402434e60ca8c323d77ae01be61d";
  const metadata = {
    name: "Oikos",
    description: "Next-gen Launchpad",
    url: "https://web3modal.com",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  };

  const chains = [bsc];
  const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
  });

  createWeb3Modal({ wagmiConfig, projectId, chains });

  watchNetwork(async (network) => {

    if (network.chain?.name != "local") {
      await switchNetwork({
        chainId: config.chain == "local" ? 1337 : 56,
      });
    }
    console.log(`Network is ${network.chain?.name}`)
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <LanguageProvider>
      <MenuProvider>
      <Provider>
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