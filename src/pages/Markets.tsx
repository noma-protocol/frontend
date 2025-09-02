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
const feeTier = 3000;

const Markets: React.FC = () => {
  const { address, isConnected } = useAccount();
  // Parse the referral code from the URL
  const [searchParams] = useSearchParams();
  const showVaults = searchParams.get("v") || ""; // Fallback to empty string

  // Local state variables

  const [view, setView] = useState<"all" | "my">("all");
  const [userVaults, setUserVaults] = useState<any[]>([]);
  const [uniswapPool, setUniswapPool] = useState<any | null>(null);

  const [triggerReload, setTriggerReload] = useState<boolean>(true);
  const [vaultDescriptions, setVaultDescriptions] = useState<any[]>([]);
  const [isAllVaultsLoading, setIsAllVaultsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenProtocols, setTokenProtocols] = useState<{ [symbol: string]: string }>({});
  const [tokenLogos, setTokenLogos] = useState<{ [symbol: string]: string }>({});

  const [modalFocus, setModalFocus] = useState<boolean>(false);

  const reserveAssetsMap = {
    [config.protocolAddresses.WMON] : "WMON",
    // [config.protocolAddresses.WMON] : "WMON",
  };

  const fetchPoolAddress = async (token0: string, token1: string) => {
    const uniswapV3FactoryContract = new ethers.Contract(
      config.protocolAddresses.uniswapV3Factory,
      uniswapV3FactoryABI,
      localProvider
    );

    const poolAddress = await uniswapV3FactoryContract.getPool(token0, token1, feeTier);

    return poolAddress;
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
        console.log("Token protocols loaded:", protocols);
        console.log("Token logos loaded:", logos);
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

  /**
   * Fetch all vaults for the "All Markets" view
   */
  const {
    data: deployersData,
    isError: isAllVaultsError,
  } = useContractRead({
    address: oikosFactoryAddress,
    abi: NomaFactoryAbi,
    functionName: "getDeployers",
    enabled: view === "all" && isConnected,
  });

  useEffect(() => {
    // Set loading state true whenever deployersData changes (either loads initially or refreshes)
    if (typeof deployersData != "undefined") {
      setIsAllVaultsLoading(true);

      const nomaFactoryContract = new ethers.Contract(
        oikosFactoryAddress,
        NomaFactoryAbi,
        localProvider
      );

      setTimeout(() => {

        const fetchPresaleDetails = async ({ presaleContract }) => {
          if (presaleContract === zeroAddress) {
            return false;
          }
      
          const presaleContractInstance = new ethers.Contract(
            presaleContract,
            [
              "function finalized() view returns (bool)",
              "function hasExpired() view returns (bool)",
            ],
            localProvider
          );
      
          const isFinalized = await presaleContractInstance.finalized();
          const hasExpired = await presaleContractInstance.hasExpired();

          // console.log("Presale Finalized:", isFinalized);
          // console.log("Presale Expired:", hasExpired);

          return [isFinalized, hasExpired];
        }

        // const fetchVaults = async () => {
        //     setIsAllVaultsLoading(true);
          
        //     try {
        //       const allVaultDescriptions = [];
          
        //       // Iterate over deployers
        //       for (const deployer of deployersData) {
        //         const vaultsData = await nomaFactoryContract.getVaults(deployer);
        //         console.log("Vaults Data for Deployer:", deployer, vaultsData);
          
        //         // Iterate over vaults for each deployer
        //         for (const vault of vaultsData) {
        //           const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
        //           console.log("Vault Description Data:", vaultDescriptionData);
          
        //           // Convert Proxy(_Result) to a plain object
        //           const plainVaultDescription = {
        //             tokenName: vaultDescriptionData[0],
        //             tokenSymbol: vaultDescriptionData[1],
        //             tokenDecimals: Number(vaultDescriptionData[2]), // Convert BigInt to number
        //             token0: vaultDescriptionData[3],
        //             token1: vaultDescriptionData[4],
        //             deployer: vaultDescriptionData[5],
        //             vault: vaultDescriptionData[6],
        //             presaleContract: vaultDescriptionData[7],
        //           };
          
        //           console.log("Plain Vault Description:", plainVaultDescription);
          
        //           const poolAddress = await fetchPoolAddress(plainVaultDescription.token0, plainVaultDescription.token1);
        //           console.log("Pool Address:", poolAddress);
          
        //           // Create a new object with the additional poolAddress property
        //           const augmentedVaultDescription = {
        //             ...plainVaultDescription, // Retains all original keys
        //             poolAddress, // Add poolAddress to the object
        //           };
          
        //           console.log("Augmented Vault Description:", augmentedVaultDescription);
        //           allVaultDescriptions.push(augmentedVaultDescription);
        //         }
        //       }
          
        //       // Update state with all vault descriptions
        //       console.log("All Vault Descriptions:", allVaultDescriptions);
        //       setVaultDescriptions(allVaultDescriptions);
        //       setIsAllVaultsLoading(false);

        //     } catch (error) {
        //       console.error("Error fetching vaults:", error);
        //     } 
        //   };
        const fetchVaults = async () => {
          try {
            const nomaFactoryContract = new ethers.Contract(
              oikosFactoryAddress,
              NomaFactoryAbi,
              localProvider
            );

            // console.log("Deployers Data:", deployersData); // Debug log

            if (!deployersData || deployersData.length === 0) {
              console.warn("No deployers found.");
              setVaultDescriptions([]);
              return;
            }
      
            const allVaultDescriptions = await Promise.all(
              deployersData.map(async (deployer) => {
                try {
                  const vaultsData = await nomaFactoryContract.getVaults(deployer);
                  // console.log("Vaults for deployer", deployer, ":", vaultsData);
        
                  if (!vaultsData || vaultsData.length === 0) {
                    console.warn(`No vaults found for deployer ${deployer}`);
                    return []; // Return an empty array to prevent `flat()` errors
                  }
        
                  return Promise.all(
                    vaultsData.map(async (vault) => {
                      try {
                        const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                        // console.log("Vault Description:", vaultDescriptionData);
                        const tokenSymbol = vaultDescriptionData[1];
                        // Include all vaults regardless of symbol
                        // Comment out filter to display all vaults
                        // if (tokenSymbol != "OKS") {
                        //   return null; // Skip this vault
                        // }
                        const hasPresale = vaultDescriptionData[7] !== zeroAddress;
                        let isPresaleFinalized = false;
                        let expired = false;
                        
                        // console.log(`Presale Contract: ${hasPresale}`);
                        if (hasPresale) {
                          try {
                            [isPresaleFinalized, expired] = await fetchPresaleDetails({
                              presaleContract: vaultDescriptionData[7],
                            });
                            
                          } catch (error) {
                            console.error("Error fetching presale details:", error);
                          }
                        }
      
                        return {
                          tokenName: vaultDescriptionData[0],
                          tokenSymbol: vaultDescriptionData[1],
                          tokenDecimals: Number(vaultDescriptionData[2]),
                          token0: vaultDescriptionData[3],
                          token1: vaultDescriptionData[4],
                          deployer: vaultDescriptionData[5],
                          vault: vaultDescriptionData[6],
                          presaleContract: vaultDescriptionData[7],
                          finalized: isPresaleFinalized,
                          expired: expired,
                          poolAddress: await fetchPoolAddress(
                            vaultDescriptionData[3], 
                            vaultDescriptionData[4]
                          ),
                        };
                      } catch (error) {
                        console.error("Error fetching vault description:", error);
                        return null; // Ensure we return a value to avoid `Promise.all()` issues
                      }
                    })
                  );
                } catch (error) {
                  console.error(`Error fetching vaults for deployer ${deployer}:`, error);
                  return [];
                }
              })
            );
      
            const flattenedVaults = allVaultDescriptions.flat().filter(Boolean); // Remove null entries
            // console.log("Final Vault Descriptions:", flattenedVaults);
      
            if (flattenedVaults.length === 0) {
              console.warn("No vaults available.");
            }
      
            setVaultDescriptions(flattenedVaults);

          } catch (error) {
            console.error("Error fetching vaults:", error);
            setVaultDescriptions([]); // Set empty array on error
          }
      };
      
      const fetchUserVaults = async () => {
        try {
            const nomaFactoryContract = new ethers.Contract(
                oikosFactoryAddress,
                NomaFactoryAbi,
                localProvider
            );

            if (!address) {
                console.warn("No user address found. Skipping user vaults fetch.");
                setUserVaults([]);
                return;
            }
    
            // console.log("Fetching user vaults for address:", address);
    
            const vaultsData = await nomaFactoryContract.getVaults(address);
            // console.log("Vaults Data for User:", vaultsData);
    
            if (!vaultsData || vaultsData.length === 0) {
                console.warn(`No vaults found for user ${address}`);
                setUserVaults([]); // Ensure state updates even if empty
                return;
            }
    
            const userVaultDescriptions = await Promise.all(
                vaultsData.map(async (vault) => {
                    try {
                        const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                        // console.log("Vault Description Data:", vaultDescriptionData);
    
                        const hasPresale = vaultDescriptionData[7] !== zeroAddress;
                        let isPresaleFinalized = false;
                        let expired = false;
    
                        if (hasPresale) {
                            try {
                                [isPresaleFinalized, expired] = await fetchPresaleDetails({
                                    presaleContract: vaultDescriptionData[7],
                                });
                            } catch (error) {
                                console.error("Error fetching presale details:", error);
                            }
                        }
    
                        // Construct immutable object
                        return {
                            tokenName: vaultDescriptionData[0],
                            tokenSymbol: vaultDescriptionData[1],
                            tokenDecimals: Number(vaultDescriptionData[2]),
                            token0: vaultDescriptionData[3],
                            token1: vaultDescriptionData[4],
                            deployer: vaultDescriptionData[5],
                            vault: vaultDescriptionData[6],
                            presaleContract: vaultDescriptionData[7],
                            finalized: isPresaleFinalized,
                            expired: expired,
                            poolAddress: await fetchPoolAddress(
                                vaultDescriptionData[3], 
                                vaultDescriptionData[4]
                            ),
                        };
                    } catch (error) {
                        console.error("Error fetching vault description:", error);
                        return null; // Ensure function does not break
                    }
                })
            );
    
            const filteredVaults = userVaultDescriptions.filter(Boolean); // Remove null entries
            // console.log("Final User Vault Descriptions:", filteredVaults);
    
            setUserVaults(filteredVaults);

        } catch (error) {
            console.error("Error fetching user vaults:", error);
            setUserVaults([]); // Set empty array on error
        }
    };
    
          
          // Run both fetch operations in parallel
          Promise.all([
            fetchVaults(),
            fetchUserVaults()
          ])
          .catch(error => {
            console.error("Error fetching data:", error);
          })
          .finally(() => {
            // Set loading to false only after both operations complete
            setIsAllVaultsLoading(false);
          });

      }, 3000);
      // return () => clearInterval(interval);
    }

    setTriggerReload(false);

  }, [deployersData]);
 

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
              ) : isAllVaultsError || error ? (
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
                    const protocol = tokenProtocols[vault.tokenSymbol] || "pancakeswap";
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
                              ml={-3}
                              w="80px"
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