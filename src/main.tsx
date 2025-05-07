import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
// import HomePage from "./pages/Home";
// import Bootstrap from "./pages/Bootstrap";
import Presale from "./pages/Presale";
import Launchpad from "./pages/Launchpad";
import Markets from "./pages/Markets";
import Liquidity from "./pages/Liquidity";
import Exchange from "./pages/Exchange";
import Borrow from "./pages/Borrow";
import Stake from "./pages/Stake";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // {
      //   path: "/",
      //   element: <HomePage  />,
      // },
      // {
      //   path: "/bootstrap",
      //   element: <Bootstrap  />,
      // },      
      {
        path: "/presale",
        element: <Presale  />,
      },
      {
        path: "/launchpad",
        element: <Launchpad  />,
      },
      {
        path: "/markets",
        element: <Markets  />,
      },
      {
        path: "/liquidity",
        element: <Liquidity  />,
      },
      {
        path: "/exchange",
        element: <Exchange  />,
      },
      {
        path: "/borrow",
        element: <Borrow  />,
      },
      {
        path: "/stake",
        element: <Stake  />,
      },
    ],
  },
]);


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
