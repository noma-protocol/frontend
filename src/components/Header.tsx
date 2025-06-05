import React, { useContext, useEffect } from "react";
import {Text, Button } from '@chakra-ui/react';
import { LanguageContext, LanguageContextType } from "../core/LanguageProvider";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from "wagmi";
import Logo from "../assets/images/logo.svg";
import { isMobile } from 'react-device-detect';
import { Link, Image } from '@chakra-ui/react';
import { useMenu } from "../hooks/MenuContext";

const Header: React.FC = () => {
  const ctx = useContext<LanguageContextType>(LanguageContext);
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { setIsMenuOpen } = useMenu(); // Access setIsMenuOpen from context


  useEffect(() => {
    const menuModal = document.getElementById("menu");
    if (menuModal) {
      menuModal.addEventListener("show.bs.modal", () => {
        console.log("Menu opened");
        setIsMenuOpen(true);
      });
      menuModal.addEventListener("hide.bs.modal", () => {
        console.log("Menu closed");
        setIsMenuOpen(false);
      });
    }

    return () => {
      if (menuModal) {
        menuModal.removeEventListener("show.bs.modal", () => setIsMenuOpen(true));
        menuModal.removeEventListener("hide.bs.modal", () => setIsMenuOpen(false));
      }
    };
  }, [setIsMenuOpen]);

  return (
    
    <header id="header">
      <nav className="navbar navbar-expand navbar-fixed-top" >
        <div className="container header">
          
        <Link href="https://oikos.cash" >

          <Image
            src={Logo}
            alt="Noma Protocol"
            style={{ width: "80px", height: "80px" }}
            ml={isMobile ? "0" : "-40px"}
          />
          </Link>
          {/* Remove mx-auto class and add justify-content-start to align items to the left */}
          <ul className="navbar-nav items justify-content-start " >
          <li className="nav-item" style={{border:window.location.href.indexOf("app.oikos.cash/exchange") > -1 ? "1px solid #a67c00" : "none"}}>
              <Link className="nav-link" href="/exchange">
                  <Text color="#f3f7c6">Exchange</Text>
              </Link>
            </li>
            <li className="nav-item" style={{marginLeft: "10px", border:window.location.href.indexOf("app.oikos.cash/markets") > -1 ? "1px solid #a67c00" : "none"}}>
            <Link className="nav-link" href="/markets">
            <Text color="#f3f7c6">Markets</Text>
              </Link>
            </li>
            {/* <li className="nav-item" style={{marginLeft: "10px",border:window.location.href.indexOf("launchpad") > -1 ? "1px solid #a67c00" : "none"}}>
            <Link className="nav-link" href="/launchpad">
                  <Text color="#f3f7c6">Launchpad</Text>
              </Link>
            </li> */}
          {/* <li className="nav-item">
              <Link className="nav-link" href="/bootstrap">
                  Bootstrap
              </Link>
            </li>*/}
            {/* <li className="nav-item" style={{marginLeft: "10px",border:window.location.href.indexOf("presale") > -1 ? "1px solid #a67c00" : "none"}}>
            <Link className="nav-link" href="/presale">
                  <Text color="white">Presale</Text>
              </Link>
            </li>  */}
            <li className="nav-item" style={{marginLeft: "10px",border:window.location.href.indexOf("app.oikos.cash/liquidity") > -1 ? "1px solid #a67c00" : "none"}}>
              <Link className="nav-link" href="/liquidity">
                  <Text color="#f3f7c6">Liquidity</Text>
              </Link>
            </li>
            {/* <li className="nav-item">
              <Link className="nav-link"  target="_blank" href="https://github.com/noma-protocol" isExternal >
                  Github
              </Link>
            </li>

            <li className="nav-item">
              <Link className="nav-link" href="https://nomaprotocol.medium.com/" target="_blank" isExternal>
                  Medium
              </Link>
            </li>        

            <li className="nav-item">
              <Link className="nav-link" href="https://discord.gg/nomaprotocol" target="_blank" isExternal>
                  Discord
              </Link>
            </li>                          */}
          </ul>

          <ul className="navbar-nav action">
            <li className="nav-item ml-2" >
              <Button onClick={() => open()} variant="outline" h="40px" w="220px" >
                <p style={{color:"#a67c00", fontSize:(isMobile ? "12px" : "16px")}}>
                <i className="fa-solid fa-wallet mr-md-2 green-bg" ></i>
                &nbsp;&nbsp;{isConnected
                  ? `${address?.slice(0, 6)}...${address?.slice(-6)}`
                  : !ctx.isSpanishCountry
                  ? "Connect wallet"
                  : "Conectar billetera"}
                </p>
              </Button>
            </li>
          </ul>

          <ul className="navbar-nav toggle">
            <li className="nav-item">
              <a
                className="nav-link"
                data-bs-toggle="modal"
                data-bs-target="#menu"
              >
                <i className="fa-solid fa-bars m-0"></i>
              </a>
            </li>
          </ul>

        </div>
      </nav>
      {/* Mobile Modal */}
      <div id="menu" className="modal fade p-0">
        <div className="modal-dialog dialog-animated">
          <div className="modal-content h-100">
            <div
              className="modal-header"
              data-bs-dismiss="modal"
              style={{ color: "#fff" }}
            >
              Menu <i className="far fa-times-circle icon-close"></i>
            </div>
            <div className="menu modal-body">
              <div className="row w-100">
                <div className="items p-0 col-12 text-center">
                  <ul className="navbar-nav items mx-auto">

                    <li
                      className="nav-item"
                      data-bs-dismiss="modal"
                      style={{ fontSize: "20px" }}
                    >
                      {/* <Link className="nav-link" to="/">
                        NOMA
                      </Link> */}
                    </li>
                    <li
                      className="nav-item"
                      data-bs-dismiss="modal"
                      style={{ fontSize: "20px", marginTop:"20px"}}
                    >
                      <a className="btn ml-lg-auto btn-bordered-white" href="/exchange" >
                        Exchange
                      </a>
                    </li>                     
                    {/* <li
                      className="nav-item"
                      data-bs-dismiss="modal"
                      style={{ fontSize: "20px", marginTop:"20px"}}
                    >
                      <a className="btn ml-lg-auto btn-bordered-white" href="/launchpad" >
                        Launchpad
                      </a>
                    </li>                 */}
                    <li className="nav-item" style={{ fontSize: "20px", marginTop:"20px"}}>
                      <a className="btn ml-lg-auto btn-bordered-white" href="/markets">
                        Markets
                      </a>
                    </li>
                    <li className="nav-item" style={{ fontSize: "20px", marginTop:"20px"}}>
                      <a className="btn ml-lg-auto btn-bordered-white" href="/liquidity">
                        Liquidity
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
