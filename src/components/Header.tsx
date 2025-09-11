import React, { useContext, useEffect, useState } from "react";
import { Box, Text, Button, createListCollection, Spinner, HStack, VStack } from '@chakra-ui/react';
import { LanguageContext, LanguageContextType } from "../core/LanguageProvider";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useContractRead } from "wagmi";
import Logo from "../assets/images/logo.svg";
import { isMobile } from 'react-device-detect';
import { Link, Image } from '@chakra-ui/react';
import { useMenu } from "../hooks/MenuContext";
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
} from "./ui/select";
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../config';
import { useToken } from '../contexts/TokenContext';
import { useMonPrice } from '../contexts/MonPriceContext';
import { ethers } from "ethers";
import { getContractAddress } from "../utils";
import addressesLocal from "../assets/deployment.json";
import addressesBsc from "../assets/deployment.json";

// Get contract addresses
const addresses = config.chain == "local" ? addressesLocal : addressesBsc;
import NomaFactoryArtifact from "../assets/NomaFactory.json";
const NomaFactoryAbi = NomaFactoryArtifact.abi;
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
const { JsonRpcProvider } = ethers.providers;
const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" : config.RPC_URL
);

const Header: React.FC = () => {
  const ctx = useContext<LanguageContextType>(LanguageContext);
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { setIsMenuOpen } = useMenu(); // Access setIsMenuOpen from context
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedToken } = useToken();
  const { monPrice, monPriceChange } = useMonPrice();

  // Vault selection state
  const [vaultDescriptions, setVaultDescriptions] = useState([]);
  const [selectedVault, setSelectedVault] = useState("");
  const [vaultsSelectData, setVaultsSelectData] = useState(createListCollection({ items: [] }));
  const [isVaultsLoading, setIsVaultsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get vault address from URL params if on borrow page
  const searchParams = new URLSearchParams(location.search);
  const currentVaultAddress = searchParams.get('v') || '';
  
  // Use the selected token's vault, then URL param, then default NOMA vault
  const nomaVault = "0x0b3507D715DCd7ee876626013b8BC7Fa1B069232";
  const vaultAddress = selectedToken?.vault || currentVaultAddress || nomaVault;
  
  const navigationItems = createListCollection({
    items: [
      { label: "Exchange", value: "/" },
      { label: "Liquidity", value: `/liquidity` },
      { label: "Borrow", value: `/borrow?v=${vaultAddress}` },
      { label: "Stake", value: `/stake?v=${vaultAddress}` },
      { label: "Markets", value: "/markets" },
      { label: "Launchpad", value: "/launchpad" },
    ],
  });

  const handleNavigationChange = (e: any) => {
    const value = e.value[0];
    if (value) {
      navigate(value);
    }
  };

  // Fetch deployers for vault selection
  const {
    data: deployersData,
    isError: isDeployersError,
  } = useContractRead({
    address: nomaFactoryAddress,
    abi: NomaFactoryAbi,
    functionName: "getDeployers",
    enabled: location.pathname === '/liquidity',
  });


  // Fetch vaults when on liquidity page
  useEffect(() => {
    if (location.pathname === '/liquidity' && deployersData && typeof deployersData !== "undefined") {
      const nomaFactoryContract = new ethers.Contract(
        nomaFactoryAddress,
        NomaFactoryAbi,
        localProvider
      );

      const fetchVaults = async () => {
        setIsVaultsLoading(true);
        try {
          const allVaultDescriptions = [];

          for (const deployer of deployersData) {
            const vaultsData = await nomaFactoryContract.getVaults(deployer);

            for (const vault of vaultsData) {
              const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);

              const plainVaultDescription = {
                tokenName: vaultDescriptionData[0],
                tokenSymbol: vaultDescriptionData[1],
                vault: vaultDescriptionData[6],
              };
              
              allVaultDescriptions.push(plainVaultDescription);
            }
          }

          setVaultDescriptions(allVaultDescriptions);
          setIsVaultsLoading(false);

          // Set the first vault as default or get from URL
          const urlVault = searchParams.get('vault');
          if (urlVault) {
            setSelectedVault(urlVault);
          } else if (allVaultDescriptions.length > 0) {
            // If no vault in URL, set first vault and navigate to it
            const firstVault = allVaultDescriptions[0].vault;
            setSelectedVault(firstVault);
            navigate(`/liquidity?vault=${firstVault}`, { replace: true });
          }
          
        } catch (error) {
          console.error("Error fetching vaults:", error);
          setIsVaultsLoading(false);
        }
      };

      fetchVaults();
    }
  }, [deployersData, location.pathname]);

  // Update vaults select data when vault descriptions change
  useEffect(() => {
    if (vaultDescriptions.length > 0) {
      const _vaultsSelectData = {
        items: vaultDescriptions
          .filter((vault) => vault?.tokenName && vault?.vault)
          .map((vault) => ({
            label: vault.tokenName,
            value: vault.vault,
          })),
      };
  
      if (_vaultsSelectData.items.length > 0) {
        setVaultsSelectData(createListCollection(_vaultsSelectData));
      }
    }
  }, [vaultDescriptions]);

  // Sync selected vault with URL when on liquidity page
  useEffect(() => {
    if (location.pathname === '/liquidity') {
      const urlVault = searchParams.get('vault');
      if (urlVault && urlVault !== selectedVault) {
        setSelectedVault(urlVault);
      }
    }
  }, [location.search, location.pathname]);

  // Handle vault selection change
  const handleVaultChange = (details) => {
    const value = details.value?.[0] || details.value;
    if (value) {
      setSelectedVault(value);
      // Navigate to liquidity page with selected vault
      navigate(`/liquidity?vault=${value}`);
    }
  };

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
        
        {/* MON Price Display */}
        {monPrice && (
          <Box 
            display={{ base: "none", md: "flex" }} 
            alignItems="center" 
            gap={2}
            px={3}
            py={1}
            bg="#1a1a1a"
            borderRadius="lg"
            border="1px solid #2a2a2a"
            ml={window.location.href.indexOf("/liquidity") > -1 ? "50%" : "60%"}
          >
            <HStack>
              <Box>
                <Text color="#888" fontSize="sm" fontWeight="500">MON</Text>
              </Box>
              <Box>
                <Text color="white" fontSize="sm" fontWeight="600">${monPrice.toFixed(4)}</Text>
              </Box>
              <Box>
                {monPriceChange !== 0 && (
                  <Text 
                    color={monPriceChange > 0 ? "#4ade80" : "#ef4444"} 
                    fontSize="xs" 
                    fontWeight="500"
                  >
                    {monPriceChange > 0 ? "+" : ""}{monPriceChange.toFixed(2)}%
                  </Text>
                )}              
              </Box>
            </HStack>
          </Box>
        )}
        
        {/* Navigation and Wallet */}
        <Box display="flex" alignItems="center" gap={isMobile ? 2 : 3}>
          {/* Dropdowns wrapper for mobile liquidity page */}
          {isMobile && location.pathname === '/liquidity' ? (
            <Box display="flex" flexDirection="column" gap={1} alignItems="stretch">
          {/* Vault Selector - Only on Liquidity page */}
          {location.pathname === '/liquidity' && !isVaultsLoading && vaultsSelectData?.items?.length > 0 && (
            <Box position="relative" overflow="hidden" borderRadius="md">
            <SelectRoot
              key={`vault-select-${vaultsSelectData.items.length}`}
              collection={vaultsSelectData}
              size="sm"
              width={isMobile ? "120px" : "160px"}
              value={selectedVault ? [selectedVault] : []}
              onValueChange={handleVaultChange}
            >
              <SelectTrigger
                bg="#1a1a1a"
                border="1px solid #2a2a2a"
                h="40px"
                color="white"
                _hover={{ 
                  bg: "#2a2a2a",
                  borderColor: "#3a3a3a" 
                }}
                _focus={{
                  borderColor: "#3a3a3a",
                  bg: "#1a1a1a",
                  outline: "none"
                }}
                transition="all 0.2s"
                display="flex"
                alignItems="center"
                px={4}
                css={{
                  '& [data-part="trigger"]': {
                    border: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important'
                  },
                  '& input, & select, & > div': {
                    border: 'none !important',
                    outline: 'none !important',
                    boxShadow: 'none !important'
                  },
                  '&:focus-within': {
                    borderColor: '#3a3a3a'
                  }
                }}
              >
                <SelectValueText placeholder="Select vault" fontSize={isMobile ? "xs" : "sm"} />
              </SelectTrigger>
              <SelectContent
                bg="#1a1a1a"
                border="1px solid #2a2a2a"
                borderRadius="md"
                minW="200px"
              >
                {vaultsSelectData.items.map((vaultData) => (
                  <SelectItem 
                    item={vaultData} 
                    key={vaultData.value}
                    _hover={{ 
                      bg: "#2a2a2a",
                      color: "white" 
                    }}
                    _selected={{
                      bg: "#2a2a2a",
                      color: "#4ade80"
                    }}
                    color="#888"
                  >
                    {vaultData.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
            </Box>
          )}

          {/* Loading spinner for vaults */}
          {location.pathname === '/liquidity' && isVaultsLoading && (
            <HStack>
              <Spinner size="sm" color="#4ade80" />
              <Text color="#888" fontSize="sm">Loading vaults...</Text>
            </HStack>
          )}

          {/* Navigation Dropdown */}
          <SelectRoot
            collection={navigationItems}
            size="sm"
            width={isMobile ? "120px" : "140px"}
            value={[location.pathname === '/borrow' ? `/borrow?v=${vaultAddress}` : 
                    location.pathname === '/stake' ? `/stake?v=${vaultAddress}` : 
                    location.pathname]}
            onValueChange={handleNavigationChange}
          >
            <SelectTrigger
              bg="#1a1a1a"
              border="1px solid #2a2a2a"
              h="40px"
              color="white"
              _hover={{ 
                bg: "#2a2a2a",
                borderColor: "#3a3a3a" 
              }}
              _focus={{
                borderColor: "#3a3a3a",
                bg: "#1a1a1a",
                outline: "none"
              }}
              transition="all 0.2s"
              display="flex"
              alignItems="center"
              px={4}
              css={{
                '& [data-part="trigger"]': {
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important'
                },
                '& input, & select, & > div': {
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:focus-within': {
                  borderColor: '#3a3a3a'
                }
              }}
            >
              <SelectValueText placeholder="Navigate" fontSize={isMobile ? "xs" : "sm"} />
            </SelectTrigger>
            <SelectContent
              bg="#1a1a1a"
              border="1px solid #2a2a2a"
              borderRadius="md"
              boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
              minW="180px"
            >
              {navigationItems.items.map((item) => (
                <SelectItem
                  key={item.value}
                  item={item}
                  py={3}
                  px={4}
                  color="white"
                  bg="transparent"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ 
                    bg: "#2a2a2a",
                    color: "#4ade80"
                  }}
                  _selected={{
                    bg: "#2a2a2a",
                    color: "#4ade80",
                    fontWeight: "600"
                  }}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectRoot>
            </Box>
          ) : (
            <>
              {/* Desktop layout or non-liquidity mobile layout */}
              {/* Vault Selector - Only on Liquidity page */}
              {location.pathname === '/liquidity' && !isVaultsLoading && vaultsSelectData?.items?.length > 0 && (
                <SelectRoot
                  key={`vault-select-${vaultsSelectData.items.length}`}
                  collection={vaultsSelectData}
                  size="sm"
                  width={isMobile ? "120px" : "160px"}
                  value={selectedVault ? [selectedVault] : []}
                  onValueChange={handleVaultChange}
                >
                  <SelectTrigger
                    bg="#1a1a1a"
                    border="1px solid #2a2a2a"
                    h="40px"
                    color="white"
                    _hover={{ 
                      bg: "#2a2a2a",
                      borderColor: "#3a3a3a" 
                    }}
                    _focus={{
                      borderColor: "#3a3a3a",
                      bg: "#1a1a1a",
                      outline: "none"
                    }}
                    transition="all 0.2s"
                    display="flex"
                    alignItems="center"
                    px={4}
                    css={{
                      '& [data-part="trigger"]': {
                        border: 'none !important',
                        outline: 'none !important',
                        boxShadow: 'none !important'
                      },
                      '& input, & select, & > div': {
                        border: 'none !important',
                        outline: 'none !important',
                        boxShadow: 'none !important'
                      },
                      '&:focus-within': {
                        borderColor: '#3a3a3a'
                      }
                    }}
                  >
                    <SelectValueText placeholder="Select vault" fontSize={isMobile ? "xs" : "sm"} />
                  </SelectTrigger>
                  <SelectContent
                    bg="#1a1a1a"
                    border="1px solid #2a2a2a"
                    borderRadius="md"
                    minW="200px"
                  >
                    {vaultsSelectData.items.map((vaultData) => (
                      <SelectItem 
                        item={vaultData} 
                        key={vaultData.value}
                        _hover={{ 
                          bg: "#2a2a2a",
                          color: "white" 
                        }}
                        _selected={{
                          bg: "#2a2a2a",
                          color: "#4ade80"
                        }}
                        color="#888"
                      >
                        {vaultData.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              )}

              {/* Loading spinner for vaults */}
              {location.pathname === '/liquidity' && isVaultsLoading && (
                <HStack>
                  <Spinner size="sm" color="#4ade80" />
                  <Text color="#888" fontSize="sm">Loading vaults...</Text>
                </HStack>
              )}

              {/* Navigation Dropdown */}
              <SelectRoot
                collection={navigationItems}
                size="sm"
                width={isMobile ? "120px" : "140px"}
                value={[location.pathname === '/borrow' ? `/borrow?v=${vaultAddress}` : 
                        location.pathname === '/stake' ? `/stake?v=${vaultAddress}` : 
                        location.pathname]}
                onValueChange={handleNavigationChange}
              >
                <SelectTrigger
                  bg="#1a1a1a"
                  border="1px solid #2a2a2a"
                  h="40px"
                  color="white"
                  _hover={{ 
                    bg: "#2a2a2a",
                    borderColor: "#3a3a3a" 
                  }}
                  _focus={{
                    borderColor: "#3a3a3a",
                    bg: "#1a1a1a",
                    outline: "none"
                  }}
                  transition="all 0.2s"
                  display="flex"
                  alignItems="center"
                  px={4}
                  css={{
                    '& [data-part="trigger"]': {
                      border: 'none !important',
                      outline: 'none !important',
                      boxShadow: 'none !important'
                    },
                    '& input, & select, & > div': {
                      border: 'none !important',
                      outline: 'none !important',
                      boxShadow: 'none !important'
                    },
                    '&:focus-within': {
                      borderColor: '#3a3a3a'
                    }
                  }}
                >
                  <SelectValueText placeholder="Navigate" fontSize={isMobile ? "xs" : "sm"} />
                </SelectTrigger>
                <SelectContent
                  bg="#1a1a1a"
                  border="1px solid #2a2a2a"
                  borderRadius="md"
                  boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
                  minW="180px"
                >
                  {navigationItems.items.map((item) => (
                    <SelectItem
                      key={item.value}
                      item={item}
                      py={3}
                      px={4}
                      color="white"
                      bg="transparent"
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{ 
                        bg: "#2a2a2a",
                        color: "#4ade80"
                      }}
                      _selected={{
                        bg: "#2a2a2a",
                        color: "#4ade80",
                        fontWeight: "600"
                      }}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </>
          )}

          {/* Wallet Connect Button */}
          <Button 
            onClick={() => open()} 
            bg="#4ade80" 
            color="black" 
            h="40px" 
            px={isMobile ? 3 : 6}
            fontWeight="600"
            _hover={{ bg: "#22c55e" }}
          >
            <i className="fa-solid fa-wallet" style={{ marginRight: isMobile ? "4px" : "8px" }}></i>
            {isConnected
              ? `${address?.slice(0, isMobile ? 4 : 6)}...${address?.slice(isMobile ? -3 : -6)}`
              : !ctx.isSpanishCountry
              ? isMobile ? "Connect" : "Connect wallet"
              : isMobile ? "Conectar" : "Conectar billetera"}
          </Button>
          
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <Box
              as="button"
              color="white"
              fontSize="24px"
              cursor="pointer"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <i className="fa-solid fa-bars"></i>
            </Box>
          )}
        </Box>
      </Box>
      {/* Mobile Modal */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="rgba(0, 0, 0, 0.5)"
            zIndex={1040}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Modal */}
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={1050}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              bg="#1a1a1a"
              w="100%"
              h="100%"
              maxW="400px"
              color="white"
              position="relative"
            >
              <Box
                p={4}
                borderBottom="1px solid #2a2a2a"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                cursor="pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Text fontSize="xl" fontWeight="600">Menu</Text>
                <i className="far fa-times-circle" style={{ fontSize: "24px" }}></i>
              </Box>
              <VStack spacing={4} p={6} align="center">
                <Button
                  w="200px"
                  h="50px"
                  bg="transparent"
                  color="white"
                  border="1px solid #4ade80"
                  _hover={{ bg: "#4ade8020" }}
                  onClick={() => {
                    navigate("/");
                    setIsMobileMenuOpen(false);
                  }}
                  fontSize="lg"
                >
                  Exchange
                </Button>
                
                <Button
                  w="200px"
                  h="50px"
                  bg="transparent"
                  color="white"
                  border="1px solid #4ade80"
                  _hover={{ bg: "#4ade8020" }}
                  onClick={() => {
                    navigate("/markets");
                    setIsMobileMenuOpen(false);
                  }}
                  fontSize="lg"
                >
                  Markets
                </Button>
                
                <Button
                  w="200px"
                  h="50px"
                  bg="transparent"
                  color="white"
                  border="1px solid #4ade80"
                  _hover={{ bg: "#4ade8020" }}
                  onClick={() => {
                    navigate("/liquidity");
                    setIsMobileMenuOpen(false);
                  }}
                  fontSize="lg"
                >
                  Liquidity
                </Button>
                
                <Button
                  w="200px"
                  h="50px"
                  bg="transparent"
                  color="white"
                  border="1px solid #4ade80"
                  _hover={{ bg: "#4ade8020" }}
                  onClick={() => {
                    navigate("/launchpad");
                    setIsMobileMenuOpen(false);
                  }}
                  fontSize="lg"
                >
                  Launchpad
                </Button>
                
                <Button
                  w="200px"
                  h="50px"
                  bg="transparent"
                  color="white"
                  border="1px solid #4ade80"
                  _hover={{ bg: "#4ade8020" }}
                  onClick={() => {
                    navigate(`/borrow?v=${vaultAddress}`);
                    setIsMobileMenuOpen(false);
                  }}
                  fontSize="lg"
                >
                  Borrow
                </Button>
                
                <Button
                  w="200px"
                  h="50px"
                  bg="transparent"
                  color="white"
                  border="1px solid #4ade80"
                  _hover={{ bg: "#4ade8020" }}
                  onClick={() => {
                    navigate(`/stake?v=${vaultAddress}`);
                    setIsMobileMenuOpen(false);
                  }}
                  fontSize="lg"
                >
                  Stake
                </Button>
              </VStack>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Header;
