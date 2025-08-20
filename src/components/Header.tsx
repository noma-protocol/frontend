import React, { useContext, useEffect } from "react";
import { Box, Text, Button } from '@chakra-ui/react';
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
    
    <Box 
      as="header" 
      id="header" 
      position="fixed" 
      top={0} 
      left={0} 
      right={0} 
      bg="#0a0a0a" 
      borderBottom="1px solid #1a1a1a"
      zIndex={1000}
      px={4}
      py={3}
    >
      <Box 
        maxW="100%" 
        mx="auto" 
        display="flex" 
        alignItems="center" 
        justifyContent="space-between"
      >
        {/* Logo */}
        <Link href="https://noma.money">
          <Image
            src={Logo}
            alt="Noma Protocol"
            w="40px"
            h="40px"
          />
        </Link>
        
        {/* Navigation Links - Desktop */}
        {/* {!isMobile && (
          <Box display="flex" gap={6} flex={1} justifyContent="center">
            <Link href="/" _hover={{ color: "#4ade80" }} color="white" fontWeight="500">
              Exchange
            </Link>
            <Link href="/markets" _hover={{ color: "#4ade80" }} color="white" fontWeight="500">
              Markets
            </Link>
            <Link href="/liquidity" _hover={{ color: "#4ade80" }} color="white" fontWeight="500">
              Liquidity
            </Link>
            <Link href="/launchpad" _hover={{ color: "#4ade80" }} color="white" fontWeight="500">
              Launchpad
            </Link>
          </Box>
        )} */}
        
        {/* Wallet Connect Button */}
        <Box display="flex" alignItems="center" gap={3}>
          <Button 
            onClick={() => open()} 
            bg="#4ade80" 
            color="black" 
            h="40px" 
            px={6}
            fontWeight="600"
            _hover={{ bg: "#22c55e" }}
          >
            <i className="fa-solid fa-wallet" style={{ marginRight: "8px" }}></i>
            {isConnected
              ? `${address?.slice(0, 6)}...${address?.slice(-6)}`
              : !ctx.isSpanishCountry
              ? "Connect wallet"
              : "Conectar billetera"}
          </Button>
          
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <Box
              as="button"
              color="white"
              fontSize="24px"
              data-bs-toggle="modal"
              data-bs-target="#menu"
              cursor="pointer"
            >
              <i className="fa-solid fa-bars"></i>
            </Box>
          )}
        </Box>
      </Box>
      {/* Mobile Modal */}
      <div id="menu" className="modal fade p-0">
        <div className="modal-dialog dialog-animated">
          <div className="modal-content h-100" style={{ backgroundColor: "#1a1a1a", color: "white" }}>
            <div
              className="modal-header"
              data-bs-dismiss="modal"
              style={{ color: "#fff", borderBottom: "1px solid #2a2a2a" }}
            >
              Menu <i className="far fa-times-circle icon-close"></i>
            </div>
            <div className="menu modal-body">
              <div className="row w-100">
                <div className="items p-0 col-12 text-center">
                  {/* <ul className="navbar-nav items mx-auto">
                    <li
                      className="nav-item"
                      data-bs-dismiss="modal"
                      style={{ fontSize: "20px", marginTop:"20px"}}
                    >
                      <a 
                        className="btn" 
                        href="/" 
                        style={{ 
                          backgroundColor: "transparent", 
                          color: "white", 
                          border: "1px solid #4ade80",
                          width: "200px"
                        }}
                      >
                        Exchange
                      </a>
                    </li>
                    <li className="nav-item" style={{ fontSize: "20px", marginTop:"20px"}}>
                      <a 
                        className="btn" 
                        href="/markets"
                        style={{ 
                          backgroundColor: "transparent", 
                          color: "white", 
                          border: "1px solid #4ade80",
                          width: "200px"
                        }}
                      >
                        Markets
                      </a>
                    </li>
                    <li className="nav-item" style={{ fontSize: "20px", marginTop:"20px"}}>
                      <a 
                        className="btn" 
                        href="/liquidity"
                        style={{ 
                          backgroundColor: "transparent", 
                          color: "white", 
                          border: "1px solid #4ade80",
                          width: "200px"
                        }}
                      >
                        Liquidity
                      </a>
                    </li>
                    <li className="nav-item" style={{ fontSize: "20px", marginTop:"20px"}}>
                      <a 
                        className="btn" 
                        href="/launchpad"
                        style={{ 
                          backgroundColor: "transparent", 
                          color: "white", 
                          border: "1px solid #4ade80",
                          width: "200px"
                        }}
                      >
                        Launchpad
                      </a>
                    </li>
                  </ul> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Box>
  );
};

export default Header;
