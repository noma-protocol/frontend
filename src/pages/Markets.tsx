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
import addressesBsc from "../assets/deployment.json";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

const { formatEther, ZeroAddress } = ethers.utils;
const {JsonRpcProvider} = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  "https://bsc-dataseed.bnbchain.org/"
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
    <Container maxW="container.xl" py={12}>
      <Toaster />
      {/* Prompt user to connect their wallet if not connected */}
      {!isConnected ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="white"
          mt={"20%"}
        >
          <Heading as="h2">Connect your wallet</Heading>
        </Box>
      ) : (
        <Box
          w="100%"
          color="white"
          display="flex"
          alignItems="center"
          // justifyContent="center"
          textAlign="left"
          position="relative"
          // mb={50}
          h="20%" 
          mt={isMobile ? "18%" : "100px"}
          // mb={"90%"}
        >
          <SimpleGrid columns={1} w={isMobile?"95%":"100%"} ml={isMobile ? "0" : "20vw"} >
            <Box px={4} mb={4} w="100%">
            <HStack spacing={4}  ml={4}>
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
              ml={isMobile ? 5: 0}
              border="1px solid gray"
              p={8}
              borderRadius={20}
              w={isMobile ? "auto" : "80%"}
              h="100%"
              backgroundColor="#222831"
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
                <VStack align="start" spacing={6}>
                  <HStack> 
                    {/* <Box >
                      <Text fontWeight="bold"  color="#bf9b30" ml={2}>Index</Text>
                    </Box> */}
                    <Box w="60%">
                      <Text fontWeight="bold" color="#bf9b30"  ml={2}> Name</Text>
                    </Box>
                    <Box textAlign={isMobile ? "left" : "center"} alignItems={ isMobile ? "left" : "center"}>
                      <Text fontWeight="bold"  color="#bf9b30" ml={isMobile?"32vw":"60px"} > Symbol</Text>
                    </Box>
                    {!isMobile && (
                      <>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30"  ml={10}>Reserve Asset</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30"  ml={10}>Protocol</Text>
                      </Box>                      
                      <Box ml={5}>
                        <Text fontWeight="bold"  color="#bf9b30" ml={7}>Presale</Text>
                      </Box>
                      <Box ml={7}>
                        <Text fontWeight="bold" color="#bf9b30" ml={7}>Action</Text>
                      </Box>
                      </>
                    ) }
                  </HStack>
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
                        w="100%"
                        cursor="pointer"
                        onClick={() => handleVaultClick(vault)}
                        _hover={{ backgroundColor: "#393E46" }}
                    > 
                      <HStack alignItems="center" spacing={4}>
                        {/* Vault Number */}
                        {/* <Box w="100px">
                          <Text fontSize={isMobile? "12px" : "14px"}  fontWeight="bold">Vault {index + 1}</Text>
                        </Box> */}
  
                        {/* Token Name */}
                        <Box w={isMobile ? "200px" : "250px"} >
                          <Text fontSize={isMobile? "12px" : "14px"}  >{vault.tokenName}</Text>
                        </Box>
  
                        {/* Token Symbol */}
                        <Box w={isMobile ? "140px" : "180px"} ml={5}>
                          <HStack>
                            <Box w="50%">
                              <Text fontSize={isMobile? "12px" : "14px"}  >{vault.tokenSymbol}</Text>
                            </Box>
                            <Box>
                              <Image 
                              ml={vault.tokenSymbol == "OKS" ? -2 : 0}
                              w={vault.tokenSymbol == "OKS" ? "40px" : "20px"} 
                              src={vault.tokenSymbol == "OKS" ? oksLogo : placeholderLogo} alt="token logo" 
                              />
                            </Box>                            
                          </HStack>
                        </Box>
  
                        {/* Reserve Asset Label and Logo (Desktop Only) */}
                        {!isMobile && (
                          <>
                            <Box w="270px" ml={10}>
                              <HStack alignItems="center" spacing={2}>
                                <Box p={1} borderRadius="md">
                                  <Text>{getReserveAssetLabel(vault.token1)}</Text>
                                </Box>
                                <Box  p={1} borderRadius="md">
                                  <Image
                                    w="25px"
                                    src={getReserveAssetLogo(getReserveAssetLabel(vault.token1))}
                                    alt="reserve asset logo"
                                  />
                                </Box>
                              </HStack>
                            </Box>
                            <Box w="270px" ml={-10}>
                              <HStack alignItems="center" spacing={2}>
                                <Box p={1} borderRadius="md" ml={10}>
                                  <Image
                                    w="65px"
                                    src={config.vault2ProtocolMap[vault.vault] == "uniswap" ? uniswapLogo : pancakeLogo}
                                    alt="uniswap logo"
                                  />
                                </Box>
                              </HStack>
                            </Box>
                            {/* Presale Status */}
                            <Box w="260px" ml={15} textAlign={"center"}>
                              {hasPresale ? (
                                <Link href={ `/presale?a=${vault.presaleContract}`} target={"_blank"}>
                                  {vault.finalized ? (
                                  <Text color={"#a67c00"} fontSize={isMobile? "12px" : "12px"} >
                                     <b>Finalized</b>
                                  </Text> 
                                  ) : vault.expired ? (
                                    <Text color={"red"} fontSize={isMobile? "12px" : "12px"} >
                                      <b>Expired</b>
                                    </Text>) : 
                                    (
                                      <VStack>
                                        <Box>
                                          <Text color={"#1ad000"} fontSize={"sm"} >
                                              <b>In progress </b>
                                          </Text>
                                        </Box>
                                        <Box>
                                          <Text color={"white"} fontSize={"xs"} >
                                              <b>Click to view</b>
                                          </Text>
                                        </Box>
                                      </VStack>
                                    )}
                                </Link>
                                ) : (
                                  <Text color={"gray"}  fontSize={isMobile? "11px" : "12px"}>
                                    <b>No</b>
                                  </Text>
                                )}
                            </Box>
  
                            {/* Vault Modal */}
                            <Box w="180px">
                              <VaultModal vaultInfo={vault} isMobile={isMobile}/>
                            </Box>
                          </>
                        )}
                      </HStack>
                    </Box>
                    )
                  })}
                  
                </VStack>
              )}
            </Box>

          </SimpleGrid>
          {/* {isMobile ? (<></>) : <><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /><br /></>}  */}
        </Box>
      )}
    </Container>
  );
};

export default Markets;