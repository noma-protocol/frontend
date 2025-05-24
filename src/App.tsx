// import "./App.css";
import { Outlet } from "react-router-dom";
import { LanguageProvider } from "./core/LanguageProvider";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig } from "wagmi";
import { bsc, localhost } from "viem/chains";
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

  const projectId = "1607c5f300e1191999e3033443961435";
  const metadata = {
    name: "Noma Protocol",
    description: "Decentralized Money",
    url: "https://web3modal.com",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  };

  const chains = [bsc, localhost];
  const wagmiConfig = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
  });

  createWeb3Modal({ wagmiConfig, projectId, chains });

  watchNetwork(async (network) => {
    // if (network.chain?.name != "bsc") {
    //   await switchNetwork({
    //     chainId: 56,
    //   });
    // }
    if (network.chain?.name != "local") {
      await switchNetwork({
        chainId: 1337,
      });
    }
    console.log(`Network is ${network.chain?.name}`)
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <Provider>
      <LanguageProvider>
      <MenuProvider>
        <Header />
        <Outlet />
        <Footer />
        </MenuProvider>
      </LanguageProvider>
      </Provider>
    </WagmiConfig>
  );
}

export default App;
