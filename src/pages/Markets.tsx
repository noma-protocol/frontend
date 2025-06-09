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
import placeholderLogo from "../assets/images/question.svg";
import nomaLogo from "../assets/images/noma_logo_transparent.png";
import oksLogo from "../assets/images/logo_dark.png";
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import uniswapLogo from "../assets/images/uniswap.png";
import pancakeLogo from "../assets/images/pancake.png";
import walletIcon from '../assets/images/walletIcon.svg';
import addressesBsc from "../assets/deployment.json";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

const { formatEther, ZeroAddress } = ethers.utils;
const {JsonRpcProvider} = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
 config.RPC_URL
);

// Dynamically import the NomaFactory artifact and extract its ABI
const OikosFactoryArtifact = await import(`../assets/OikosFactory.json`);
const OikosFactoryAbi = OikosFactoryArtifact.abi;

const uniswapV3FactoryABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

// NomaFactory contract address
const oikosFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "Factory");
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

  const [modalFocus, setModalFocus] = useState<boolean>(false);

  const reserveAssetsMap = {
    [config.protocolAddresses.WBNB] : "WBNB",
    [config.protocolAddresses.WMON] : "WMON",
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

  // fetch label for reserve asset
  const getReserveAssetLabel = (address: string) => {
    console.log("Fetching reserve asset label for address:", address);
    console.log("Reserve Assets Map:", reserveAssetsMap);
    return reserveAssetsMap[address] || "Unknown";
  };

  const labelToLogoMap = {
    WMON: monadLogo,
    WBNB: bnbLogo,
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
    abi: OikosFactoryAbi,
    functionName: "getDeployers",
    enabled: view === "all" && isConnected,
  });

  useEffect(() => {
    // Set loading state true whenever deployersData changes (either loads initially or refreshes)
    if (typeof deployersData != "undefined") {
      setIsAllVaultsLoading(true);

      const nomaFactoryContract = new ethers.Contract(
        oikosFactoryAddress,
        OikosFactoryAbi,
        localProvider
      );

      setTimeout(() => {

        const fetchPresaleDetails = async ({ presaleContract }) => {
          if (presaleContract === ZeroAddress) {
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
              OikosFactoryAbi,
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
                        const hasPresale = vaultDescriptionData[7] !== "0x0000000000000000000000000000000000000000";
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
                OikosFactoryAbi,
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
    
                        const hasPresale = vaultDescriptionData[7] !== "0x0000000000000000000000000000000000000000";
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
    if (vault.presaleContract != ZeroAddress && isMobile) {
      window.location.href = `/presale?a=${vault.presaleContract}`;
    }
  };

  const handleSetView = (view: "all" | "my") => {

    setTriggerReload(true);
    setView(view);
  }

  const vaultsDataArray = view === "all" ? vaultDescriptions : userVaults;
  
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  return (
    <Container maxW="container.xl" py={12} ml={isConnected ? "2%" : "10%"}>
      <Toaster />
      {/* Prompt user to connect their wallet if not connected */}
      {!isConnected ? (
        <>
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="70vh"
            color="white"
            bg="#222831"
            p={8}
            borderRadius="xl"
            boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
            m={4}
            border="1px solid #a67c00"
            mt="100px"
            ml={isMobile ? 5 : "7%"}
            w="70%"
            h="30%"
            >
            <Box
                mb={6}
                p={4}
                borderRadius="full"
                bg="rgba(166, 124, 0, 0.2)"
                
            >
                <Image src={walletIcon} alt="Wallet Icon" boxSize="50px" />
            </Box>
            <Heading as="h2" mb={4} fontSize="md" textAlign="center">Wallet Not Connected</Heading>
            <Text fontSize="sm" textAlign="center" mb={6} color="gray.400">
                Please connect your wallet to access the Markets page.
            </Text>

            </Box>
            <Box h="50vh"><br /></Box>            
        </>
      ) : (
        <Box
          color="white"
          textAlign="left"
          mt={isMobile ? "18%" : "100px"}
          ml={isMobile ? 0 : "7%"}
          alignContent={"center"}
          alignItems={"center"}
        >
          <Box width={isMobile ? "95%" : "100%"} maxW="1100px" mx="auto" >
            <Box px={4} mb={4}>
              <HStack spacing={4}>
                <Button
                  onClick={() => handleSetView("all")}
                  colorScheme={view === "all" ? "blue" : "gray"}
                  variant={view === "all" ? "solid" : "outline"}
                >
                  All Markets
                </Button>
                <Button
                  onClick={() => handleSetView("my")}
                  colorScheme={view === "my" ? "blue" : "gray"}
                  variant={view === "my" ? "solid" : "outline"}
                >
                  My Markets
                </Button>
              </HStack>
            </Box>

            {/* Vaults List */}
            <Box
              border="1px solid gray"
              p={8}
              borderRadius={20}
              backgroundColor="#222831"
              overflow="hidden"
              key={`vaults-container-${isAllVaultsLoading ? 'loading' : 'loaded'}`} // Force re-render on loading state change
            >
              {isAllVaultsLoading ? (
                <Box textAlign="center" w="100%" p={10}>
                  <Spinner size="md" color="#bf9b30" thickness="3px" />
                  <Text mt={3} color="#bf9b30">Loading markets...</Text>
                </Box>
              ) : isAllVaultsError || error ? (
                <Text color="red">Error fetching vaults</Text>
              ) : (view === "all" ? vaultDescriptions.length === 0 : userVaults.length === 0) ? (
                <Text>No vaults found.<br /><br /><br /><br /><br /><br /><br /><br /></Text>
              ) : (
                <VStack align="start" spacing={6} width="100%">
                  <Box width="95%" display="grid" gridTemplateColumns={isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)"} gap={4}>
                    <Box>
                      <Text fontWeight="bold" color="#bf9b30">&nbsp;Name</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" color="#bf9b30">Symbol</Text>
                    </Box>
                    {!isMobile && (
                      <>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30">Reserve Asset</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30">Protocol</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30">Presale</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30">Action</Text>
                      </Box>
                      </>
                    )}
                  </Box>
                  {vaultsDataArray?.map((vault, index) => {
                    // console.log(vault)

                    let hasPresale;

                    if (typeof vault.presaleContract != "undefined") {
                      hasPresale = vault.presaleContract != zeroAddress;
                    } else {
                      hasPresale = false;
                    }

                    return (

                      <Box
                        key={index}
                        p={4}
                        border="1px solid"
                        borderColor={isMobile? vault.presaleContract != zeroAddress ? "#a67c00" : "gray" : "gray"}
                        borderRadius="md"
                        w="98%"
                        cursor="pointer"
                        onClick={() => handleVaultClick(vault)}
                        _hover={{ backgroundColor: "#393E46" }}
                    >
                      <VStack width="98%" spacing={4}>
                        <Box width="98%" display="grid" gridTemplateColumns={isMobile ? "repeat(2, 1fr)" : "repeat(6, 1fr)"} gap={4} alignItems="center">
                          {/* Token Name */}
                          <Box ml={isMobile ? 0 : "-10px"}>
                            <Text>{vault.tokenName}</Text>
                          </Box>

                          {/* Token Symbol */}
                          <Box ml={isMobile ? 0 : "-15px"}>
                            <HStack>
                              <Box><Text mr={2} >{vault.tokenSymbol}</Text></Box>
                              <Box>
                               <Image
                                w={vault.tokenSymbol == "OKS" ? "40px" : "20px"}
                                src={vault.tokenSymbol == "OKS" ? oksLogo : placeholderLogo}
                                alt="token logo"
                              />
                              </Box>
                            </HStack>
                          </Box>

                          {/* Desktop columns */}
                          {!isMobile ? (
                            <>
                              <Box>
                                <HStack alignItems="center">
                                <Box>
                                  <Text mt={10} mr={2}>{getReserveAssetLabel(vault.token1)}</Text>
                                </Box>
                                <Box>
                                  <Image
                                    w="25px"
                                    src={getReserveAssetLogo(getReserveAssetLabel(vault.token1))}
                                    alt="reserve asset logo"
                                  />
                                </Box>
                                </HStack>
                              </Box>

                              <Box>
                                <Image
                                  w="65px"
                                  src={config.vault2ProtocolMap[vault.vault] == "uniswap" ? uniswapLogo : pancakeLogo}
                                  alt="protocol logo"
                                />
                              </Box>

                              {/* Presale Status */}
                              <Box textAlign="center" ml={2}>
                                {hasPresale ? (
                                  <Link href={`/presale?a=${vault.presaleContract}`} target="_blank">
                                    {vault.finalized ? (
                                      <Text color="#a67c00" fontSize="sm" ml={"-80px"}><b>Finalized</b></Text>
                                    ) : vault.expired ? (
                                      <Text color="red" fontSize="sm"><b>Expired</b></Text>
                                    ) : (
                                      <VStack>
                                        <Text color="#1ad000" fontSize="sm"><b>In progress</b></Text>
                                        <Text color="white" fontSize="xs"><b>Click to view</b></Text>
                                      </VStack>
                                    )}
                                  </Link>
                                ) : (
                                  <Text color="gray" fontSize="sm"><b>No</b></Text>
                                )}
                              </Box>

                              {/* Vault Modal */}
                              <Box textAlign="center">
                                <VaultModal vaultInfo={vault} isMobile={isMobile} address={address}/>
                              </Box>
                            </>
                          ) : null}
                        </Box>

                        {/* No mobile action buttons */}
                      </VStack>
                    </Box>
                    )
                  })}
                  
                </VStack>
              )}
            </Box>

          </Box>
            <p
              style={{ fontSize: "13px", cursor: "pointer", textDecoration: "underline", marginLeft: isMobile ? "25px" : "12%"}}
              onClick={() => window.history.back()}
            >
              Go Back
            </p>  
        </Box>
      )}
    </Container>
  );
};

export default Markets;