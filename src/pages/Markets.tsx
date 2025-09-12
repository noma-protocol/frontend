import React, { useEffect, useState } from "react";
import {
  Container,
  VStack,
  Box,
  SimpleGrid,
  Heading,
  Text,
  Button,
  HStack,
  Image,
  Link,
  Spinner
} from "@chakra-ui/react";
import { useAccount, useContractRead } from "wagmi";
import { isMobile } from "react-device-detect";
import { Toaster } from "../components/ui/toaster";
import { ethers } from "ethers";
import {getContractAddress} from "../utils";
import config from "../config";
import { useVault } from "../hooks/useVault";
import wethLogo from "../assets/images/weth.svg";
import bnbLogo from "../assets/images/bnb-logo.png";
import monadLogo from "../assets/images/monad.png";
import VaultModal from "../components/VaultModal";
import { set } from "react-ga";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams
import placeholderLogo from "../assets/images/question_white.svg";
import nomaLogo from "../assets/images/noma.png";
import oksLogo from "../assets/images/logo_dark.png";
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import uniswapLogo from "../assets/images/uniswap.png";
import pancakeLogo from "../assets/images/pancake.png";
import walletIcon from '../assets/images/walletIcon.svg';
import addressesBsc from "../assets/deployment.json";
import { tokenApi } from '../services/tokenApi';
// import WalletNotConnected from '../components/WalletNotConnected';

const zeroAddress = "0x0000000000000000000000000000000000000000";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

const { formatEther } = ethers.utils;
const {JsonRpcProvider} = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
 config.RPC_URL
);

// Dynamically import the NomaFactory artifact and extract its ABI
const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

const uniswapV3FactoryABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

// NomaFactory contract address
const oikosFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");

const Markets: React.FC = () => {
  const { address, isConnected } = useAccount();
  // Parse the referral code from the URL
  const [searchParams] = useSearchParams();
  const showVaults = searchParams.get("v") || ""; // Fallback to empty string

  // Local state variables

  const [view, setView] = useState<"all" | "my">("all");
  const [userVaults, setUserVaults] = useState<any[]>([]);
  
  // Use the vault API hook for all vaults
  const { vaults: allVaultsFromAPI, loading: allVaultsLoading, error: allVaultsError, refetch: refetchAllVaults } = useVault({ 
    autoFetch: true,
    refetchInterval: 60000 // Refresh every minute
  });
  
  // Use the vault API hook for user's vaults
  const { vaults: myVaultsFromAPI, loading: myVaultsLoading, error: myVaultsError, refetch: refetchMyVaults } = useVault({ 
    deployerAddress: address,
    autoFetch: !!address && view === "my",
    refetchInterval: 60000
  });
  const [uniswapPool, setUniswapPool] = useState<any | null>(null);

  const [triggerReload, setTriggerReload] = useState<boolean>(true);
  const [vaultDescriptions, setVaultDescriptions] = useState<any[]>([]);
  const [isAllVaultsLoading, setIsAllVaultsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenProtocols, setTokenProtocols] = useState<{ [symbol: string]: string }>({});
  const [tokenLogos, setTokenLogos] = useState<{ [symbol: string]: string }>({});
  const [protocolsLoaded, setProtocolsLoaded] = useState(false);

  const [modalFocus, setModalFocus] = useState<boolean>(false);

  const reserveAssetsMap = {
    [config.protocolAddresses.WMON] : "WMON",
    // [config.protocolAddresses.WMON] : "WMON",
  };

  const fetchPoolAddress = async (token0: string, token1: string, protocol: string = "uniswap") => {
    // Select the appropriate factory based on protocol
    console.log(`[fetchPoolAddress] Protocol: ${protocol}, Token0: ${token0}, Token1: ${token1}`)
    
    // Handle both "pancakeswap" and "pancake" as PancakeSwap
    const isPancakeSwap = protocol === "pancakeswap" || protocol === "pancake";
    const factoryAddress = isPancakeSwap
      ? config.protocolAddresses.pancakeV3Factory 
      : config.protocolAddresses.uniswapV3Factory;
    
    console.log(`[fetchPoolAddress] Using factory: ${factoryAddress} (isPancakeSwap: ${isPancakeSwap})`)
    
    const factoryContract = new ethers.Contract(
      factoryAddress,
      uniswapV3FactoryABI, // Same ABI for both Uniswap and PancakeSwap V3
      localProvider
    );
    const feeTier = isPancakeSwap ? 2500 : 3000;
    console.log(`[fetchPoolAddress] Using fee tier: ${feeTier}`)

    try {
      const poolAddress = await factoryContract.getPool(token0, token1, feeTier);
      console.log(`[fetchPoolAddress] Retrieved pool address: ${poolAddress}`)
      
      // Check if it's a zero address
      if (poolAddress === "0x0000000000000000000000000000000000000000") {
        console.warn(`[fetchPoolAddress] Zero address returned for ${protocol} pool with tokens ${token0} and ${token1}, fee tier ${feeTier}`);
        console.warn(`[fetchPoolAddress] Factory being used: ${factoryAddress}`);
      }
      
      return poolAddress;
    } catch (error) {
      console.error(`[fetchPoolAddress] Error fetching pool address:`, error);
      return "0x0000000000000000000000000000000000000000";
    }
  }


  useEffect(() => {
    if (showVaults == "all") {
      setView("all");
    } else if (showVaults == "my") {
      setView("my");
    }
  }
  , [showVaults]);

  // Fetch tokens and build protocol mapping
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await tokenApi.getTokens({ includeAll: true });
        const protocols: { [symbol: string]: string } = {};
        const logos: { [symbol: string]: string } = {};
        
        // Build maps for token symbols to their protocols and logos
        response.tokens.forEach(token => {
          if (token.tokenSymbol) {
            if (token.selectedProtocol) {
              protocols[token.tokenSymbol] = token.selectedProtocol;
            }
            // Use logoUrl if available, otherwise fall back to logoPreview
            const logoSource = token.logoUrl || token.logoPreview;
            if (logoSource) {
              logos[token.tokenSymbol] = logoSource;
            }
            console.log(`Mapping ${token.tokenSymbol} - Protocol: ${token.selectedProtocol}, Logo: ${logoSource}`);
          }
        });
        
        setTokenProtocols(protocols);
        setTokenLogos(logos);
        setProtocolsLoaded(true);
        console.log("[MARKETS] Token protocols loaded:", protocols);
        console.log("[MARKETS] BUN protocol:", protocols["BUN"]);
        console.log("[MARKETS] AVO protocol:", protocols["AVO"]);
        console.log("[MARKETS] Token logos loaded:", logos);
      } catch (error) {
        console.error("Failed to fetch token protocols:", error);
      }
    };
    
    fetchTokens();
  }, []);

  // fetch label for reserve asset
  const getReserveAssetLabel = (address: string) => {
    console.log("Fetching reserve asset label for address:", address);
    console.log("Reserve Assets Map:", reserveAssetsMap);
    return reserveAssetsMap[address] || "Unknown";
  };

  const labelToLogoMap = {
    WMON: monadLogo,
    MON: bnbLogo,
  };

  // fetch logo for reserve asset
  const getReserveAssetLogo = (label: string) => {
    return labelToLogoMap[label] || "";
  };

  // Process vault data from API
  const processVaultData = async (vaultsFromAPI) => {
    if (!vaultsFromAPI || vaultsFromAPI.length === 0) return [];
    
    const processedVaults = await Promise.all(
      vaultsFromAPI.map(async (vault) => {
        try {
          const tokenSymbol = vault.tokenSymbol;
          const protocol = tokenProtocols[tokenSymbol] || "uniswap";
          
          // Check presale status if needed
          const hasPresale = vault.presaleContract !== zeroAddress;
          let isPresaleFinalized = false;
          let expired = false;
          
          if (hasPresale) {
            try {
              const presaleContractInstance = new ethers.Contract(
                vault.presaleContract,
                [
                  "function finalized() view returns (bool)",
                  "function hasExpired() view returns (bool)",
                ],
                localProvider
              );
              
              isPresaleFinalized = await presaleContractInstance.finalized();
              expired = await presaleContractInstance.hasExpired();
            } catch (error) {
              console.error("Error fetching presale details:", error);
            }
          }
          
          // Fetch pool address
          const poolAddress = await fetchPoolAddress(
            vault.token0, 
            vault.token1,
            protocol
          );
          
          return {
            tokenName: vault.tokenName,
            tokenSymbol: vault.tokenSymbol,
            tokenDecimals: Number(vault.tokenDecimals),
            token0: vault.token0,
            token1: vault.token1,
            deployer: vault.deployer,
            vault: vault.address,
            presaleContract: vault.presaleContract,
            stakingContract: vault.stakingContract,
            finalized: isPresaleFinalized,
            expired: expired,
            poolAddress: poolAddress,
            // Additional fields from API
            liquidityRatio: vault.liquidityRatio,
            circulatingSupply: vault.circulatingSupply,
            spotPriceX96: vault.spotPriceX96,
            anchorCapacity: vault.anchorCapacity,
            floorCapacity: vault.floorCapacity,
            newFloor: vault.newFloor,
            totalInterest: vault.totalInterest
          };
        } catch (error) {
          console.error("Error processing vault:", error);
          return null;
        }
      })
    );
    
    return processedVaults.filter(Boolean);
  };

  // Update vaults when API data or protocols change
  useEffect(() => {
    if (protocolsLoaded && allVaultsFromAPI.length > 0) {
      const updateVaults = async () => {
        setIsAllVaultsLoading(true);
        try {
          const processed = await processVaultData(allVaultsFromAPI);
          setVaultDescriptions(processed);
        } catch (error) {
          console.error("Error processing vaults:", error);
          setError("Failed to process vault data");
        } finally {
          setIsAllVaultsLoading(false);
        }
      };
      
      updateVaults();
    }
  }, [allVaultsFromAPI, protocolsLoaded]);
  
  // Update user vaults when API data changes
  useEffect(() => {
    if (view === "my" && address && myVaultsFromAPI.length > 0) {
      const updateMyVaults = async () => {
        try {
          const processed = await processVaultData(myVaultsFromAPI);
          setUserVaults(processed);
        } catch (error) {
          console.error("Error processing user vaults:", error);
        }
      };
      
      updateMyVaults();
    }
  }, [myVaultsFromAPI, view, address]);

  // Handle vault selection click
  const handleVaultClick = (vault) => {
    // setSelectedVault(vaultAddress);
    if (vault.presaleContract != zeroAddress && isMobile) {
      window.location.href = `/presale?a=${vault.presaleContract}`;
    }
  };

  const handleSetView = (view: "all" | "my") => {

    setTriggerReload(true);
    setView(view);
  }

  const vaultsDataArray = view === "all" ? vaultDescriptions : userVaults;
  
  return (
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh">
      <Toaster />
      {/* Prompt user to connect their wallet if not connected */}
      {!isConnected ? (
        <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
          <Text color="white" fontSize="xl">Please connect your wallet</Text>
        </Box>
      ) : (
        <Box
          color="white"
          pt="20px"
          pb={8}
          px={isMobile ? 4 : 8}
          maxW="1600px"
          mx="auto"
        >
            <Box mb={8}>
              {/* View Toggle Buttons */}
              <HStack spacing={2}>
                <Button
                  onClick={() => handleSetView("all")}
                  variant={view === "all" ? "solid" : "outline"}
                  bg={view === "all" ? "#4ade80" : "transparent"}
                  color={view === "all" ? "black" : "white"}
                  border="1px solid"
                  borderColor={view === "all" ? "#4ade80" : "#2a2a2a"}
                  size="sm"
                  fontWeight="500"
                  _hover={{
                    bg: view === "all" ? "#22c55e" : "#1a1a1a"
                  }}
                >
                  All Markets
                </Button>
                <Button
                  onClick={() => handleSetView("my")}
                  variant={view === "my" ? "solid" : "outline"}
                  bg={view === "my" ? "#4ade80" : "transparent"}
                  color={view === "my" ? "black" : "white"}
                  border="1px solid"
                  borderColor={view === "my" ? "#4ade80" : "#2a2a2a"}
                  size="sm"
                  fontWeight="500"
                  _hover={{
                    bg: view === "my" ? "#22c55e" : "#1a1a1a"
                  }}
                >
                  My Markets
                </Button>
              </HStack>
            </Box>

            {/* Vaults List */}
            <Box
              bg="#1a1a1a"
              border="1px solid #2a2a2a"
              borderRadius="xl"
              overflow="hidden"
            >
              {isAllVaultsLoading ? (
                <Box textAlign="center" py={10}>
                  <Spinner size="lg" color="#4ade80" thickness="3px" />
                  <Text mt={4} color="#666">Loading markets...</Text>
                </Box>
              ) : (allVaultsError || myVaultsError || error) ? (
                <Box textAlign="center" py={10}>
                  <Text color="#ef4444">Error fetching vaults</Text>
                </Box>
              ) : (view === "all" ? vaultDescriptions.length === 0 : userVaults.length === 0) ? (
                <Box textAlign="center" py={10}>
                  <Text color="#666">No vaults found</Text>
                </Box>
              ) : (
                <VStack align="start" spacing={0} width="100%">
                  <Box 
                    width="100%" 
                    display="grid" 
                    gridTemplateColumns={isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)"} 
                    gap={2}
                    bg="#2a2a2a"
                    px={6}
                    py={3}
                    borderBottom="1px solid #3a3a3a"
                    width="100%"
                  >
                    <Box>
                      <Text fontSize="xs" color="#888" fontWeight="600" textTransform="uppercase">Name</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="#888" fontWeight="600" textTransform="uppercase">Symbol</Text>
                    </Box>
                    {!isMobile && (
                      <>
                      <Box>
                        <Text fontSize="xs" color="#888" fontWeight="600" textTransform="uppercase">Reserve Asset</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="#888" fontWeight="600" textTransform="uppercase">Protocol</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="#888" fontWeight="600" textTransform="uppercase">Presale</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="#888" fontWeight="600" textTransform="uppercase">Action</Text>
                      </Box>
                      </>
                    )}
                  </Box>
                  {vaultsDataArray?.map((vault, index) => {
                    const protocol = tokenProtocols[vault.tokenSymbol] || "uniswap";
                    const tokenLogo = tokenLogos[vault.tokenSymbol] || (vault.tokenSymbol === "NOMA" ? nomaLogo : placeholderLogo);
                    console.log("Vault info:", vault.tokenSymbol, vault.vault, "Protocol:", protocol, "Logo:", tokenLogo)
                    console.log({ vault })

                    let hasPresale;

                    if (typeof vault.presaleContract != "undefined") {
                      hasPresale = vault.presaleContract != zeroAddress;
                    } else {
                      hasPresale = false;
                    }

                    return (

                      <Box
                        key={index}
                        display="grid"
                        gridTemplateColumns={isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)"}
                        gap={2}
                        alignItems="center"
                        px={6}
                        py={4}
                        cursor="pointer"
                        onClick={() => handleVaultClick(vault)}
                        bg="transparent"
                        borderBottom="1px solid #2a2a2a"
                        width="100%"
                        _hover={{ 
                          bg: "#1a1a1a",
                          borderColor: "#3a3a3a"
                        }}
                        transition="all 0.2s"
                    >
                          {/* Token Name */}
                          <Box>
                            <Text color="white" fontSize="sm" noOfLines={1}>{vault.tokenName}</Text>
                          </Box>

                          {/* Token Symbol */}
                          <HStack spacing={2}>
                            <Box>
                              <Image
                                w="30px"
                                h="30px"
                                src={tokenLogo}
                                alt="token logo"
                              />
                            </Box>
                            <Box>
                              <Text color="white" fontSize="sm" fontWeight="500">{vault.tokenSymbol}</Text>
                            </Box>
                          </HStack>

                          {/* Reserve */}
                          <Box display={isMobile ? "none" : "block"}>
                            <HStack spacing={2}>
                              <Box>
                                <Image
                                  w="30px"
                                  h="30px"
                                  src={getReserveAssetLogo(getReserveAssetLabel(vault.token1))}
                                  alt="reserve asset logo"
                                />
                              </Box>
                              <Box>
                                <Text color="white" fontSize="sm">{getReserveAssetLabel(vault.token1)}</Text>
                              </Box>
                            </HStack>
                          </Box>

                          {/* Protocol */}
                          <Box display={isMobile ? "none" : "flex"} justifyContent="flex-start" mt={-1}>
                            <Image
                              ml={protocol === "uniswap" ? -3 : 0}
                              w={protocol === "uniswap" ? "80px" : "60px"}
                              h="auto"
                              src={protocol === "uniswap" ? uniswapLogo : pancakeLogo}
                              alt="protocol logo"
                              opacity={0.8}
                            />
                          </Box>

                          {/* Presale Status */}
                          <Box display={isMobile ? "none" : "flex"} justifyContent="flex-start" alignItems="center">
                            {hasPresale ? (
                              <Link href={`/presale?a=${vault.presaleContract}`} target="_blank">
                                <Box
                                  px={3}
                                  py={1}
                                  // borderRadius="full"
                                  bg={vault.finalized ? "rgba(74, 222, 128, 0.1)" : vault.expired ? "rgba(239, 68, 68, 0.1)" : "rgba(251, 191, 36, 0.1)"}
                                  border="1px solid"
                                  borderColor={vault.finalized ? "#4ade80" : vault.expired ? "#ef4444" : "#fbbf24"}
                                  transition="all 0.2s"
                                  cursor="pointer"
                                  _hover={{
                                    bg: vault.finalized ? "rgba(74, 222, 128, 0.2)" : vault.expired ? "rgba(239, 68, 68, 0.2)" : "rgba(251, 191, 36, 0.2)",
                                    borderColor: vault.finalized ? "#5ee88f" : vault.expired ? "#f56565" : "#fccf3f",
                                    transform: "translateY(-1px)",
                                    boxShadow: vault.finalized ? "0 4px 12px rgba(74, 222, 128, 0.3)" : vault.expired ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(251, 191, 36, 0.3)"
                                  }}
                                  w="110px"
                                  alignItems="center"
                                  textAlign={"center"}
                                >
                                  <Text 
                                    color={vault.finalized ? "#4ade80" : vault.expired ? "#ef4444" : "#fbbf24"} 
                                    fontSize="xs" 
                                    fontWeight="600"
                                  >
                                    {vault.finalized ? "Finalized" : vault.expired ? "Expired" : "In Progress"}
                                  </Text>
                                </Box>
                              </Link>
                            ) : (
                              <Text color="#666" fontSize="sm">N/A</Text>
                            )}
                          </Box>

                          {/* Vault Modal */}
                          <Box display={isMobile ? "none" : "flex"} justifyContent="flex-start">
                            <VaultModal vaultInfo={vault} isMobile={isMobile} address={address}/>
                          </Box>
                    </Box>
                    )
                  })}
                  
                </VStack>
              )}
            </Box>
        </Box>
      )}
    </Container>
  );
};

export default Markets;