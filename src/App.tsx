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
import { switchNetwork, watchNetwork } from "wagmi/actions";
import "react-toastify/dist/ReactToastify.css";
import { MenuProvider } from "./hooks/MenuContext"; // Import the MenuProvider

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
  });

  createWeb3Modal({ wagmiConfig, projectId, chains });

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