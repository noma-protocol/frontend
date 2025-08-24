import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App";
import HomePage from "./pages/Home";
// import Bootstrap from "./pages/Bootstrap";
import Presale from "./pages/Presale";
import Launchpad from "./pages/Launchpad";
import Markets from "./pages/Markets";
import Liquidity from "./pages/Liquidity";
import Exchange from "./pages/Exchange";
import Borrow from "./pages/Borrow";
import Stake from "./pages/Stake";
import Migrate from "./pages/Migrate";
import config from "./config";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // {
      //   index: true, // This means path === "/"
      //   element: <Navigate to="/exchange" replace />,
      // },
      {
        path: "/",
        element: <Exchange />,
      },
      {
        path: "/presale",
        element: <Presale />,
      },
      {
        path: "/launchpad",
        element: <Launchpad />,
      },
      {
        path: "/markets",
        element: <Markets />,
      },
      {
        path: "/liquidity",
        element: <Liquidity />,
      },
      {
        path: "/borrow",
        element: <Borrow />,
      },
      {
        path: "/stake",
        element: <Stake />,
      },
      {
        path: "/migrate",
        element: <Migrate />,
      },
    ],
  },
]);


ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
