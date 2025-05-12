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
import addresses from "../assets/deployment.json";

const { formatEther, ZeroAddress } = ethers.utils;
const {JsonRpcProvider} = ethers.providers;

const localProvider = new JsonRpcProvider(
  "https://testnet-rpc.monad.xyz"
);

// Dynamically import the NomaFactory artifact and extract its ABI
const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

const uniswapV3FactoryABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

// NomaFactory contract address
const nomaFactoryAddress = getContractAddress(addresses, "10143", "Factory");
const uniswapV3FactoryAddress = "0x961235a9020B05C44DF1026D956D1F4D78014276";
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
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c": "WBNB",
    "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" : "WMON",
  };

  const fetchPoolAddress = async (token0: string, token1: string) => {
    const uniswapV3FactoryContract = new ethers.Contract(
      uniswapV3FactoryAddress,
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
    
    return reserveAssetsMap[address] || "Unknown";
  };

  const labelToLogoMap = {
    WMON: monadLogo,
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
    address: nomaFactoryAddress,
    abi: NomaFactoryAbi,
    functionName: "getDeployers",
    enabled: view === "all" && isConnected,
  });

  useEffect(() => {
    if (typeof deployersData != "undefined") {

      const nomaFactoryContract = new ethers.Contract(
        nomaFactoryAddress,
        NomaFactoryAbi,
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

          console.log("Presale Finalized:", isFinalized);
          console.log("Presale Expired:", hasExpired);

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
          setIsAllVaultsLoading(true);
        
          try {
            const nomaFactoryContract = new ethers.Contract(
              nomaFactoryAddress,
              NomaFactoryAbi,
              localProvider
            );
      
            console.log("Deployers Data:", deployersData); // Debug log
      
            if (!deployersData || deployersData.length === 0) {
              console.warn("No deployers found.");
              setIsAllVaultsLoading(false);
              return;
            }
      
            const allVaultDescriptions = await Promise.all(
              deployersData.map(async (deployer) => {
                try {
                  const vaultsData = await nomaFactoryContract.getVaults(deployer);
                  console.log("Vaults for deployer", deployer, ":", vaultsData);
        
                  if (!vaultsData || vaultsData.length === 0) {
                    console.warn(`No vaults found for deployer ${deployer}`);
                    return []; // Return an empty array to prevent `flat()` errors
                  }
        
                  return Promise.all(
                    vaultsData.map(async (vault) => {
                      try {
                        const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                        console.log("Vault Description:", vaultDescriptionData);
                        const tokenSymbol = vaultDescriptionData[1];
                        // Skip OKS vaults
                        if (tokenSymbol === "OKS") {
                          console.log("Skipping OKS vault:", vault.toString());
                          return null;
                        }
                        const hasPresale = vaultDescriptionData[7] !== "0x0000000000000000000000000000000000000000";
                        let isPresaleFinalized = false;
                        let expired = false;
                        
                        console.log(`Presale Contract: ${hasPresale}`);
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
            console.log("Final Vault Descriptions:", flattenedVaults);
      
            if (flattenedVaults.length === 0) {
              console.warn("No vaults available.");
            }
      
            setVaultDescriptions(flattenedVaults);
            setIsAllVaultsLoading(false);
      
          } catch (error) {
            console.error("Error fetching vaults:", error);
            setIsAllVaultsLoading(false);
          }
      };
      
      const fetchUserVaults = async () => {
        setIsAllVaultsLoading(true);
    
        try {
            const nomaFactoryContract = new ethers.Contract(
                nomaFactoryAddress,
                NomaFactoryAbi,
                localProvider
            );
    
            if (!address) {
                console.warn("No user address found. Skipping user vaults fetch.");
                setIsAllVaultsLoading(false);
                return;
            }
    
            console.log("Fetching user vaults for address:", address);
    
            const vaultsData = await nomaFactoryContract.getVaults(address);
            console.log("Vaults Data for User:", vaultsData);
    
            if (!vaultsData || vaultsData.length === 0) {
                console.warn(`No vaults found for user ${address}`);
                setUserVaults([]); // Ensure state updates even if empty
                setIsAllVaultsLoading(false);
                return;
            }
    
            const userVaultDescriptions = await Promise.all(
                vaultsData.map(async (vault) => {
                    try {
                        const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                        console.log("Vault Description Data:", vaultDescriptionData);
    
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
            console.log("Final User Vault Descriptions:", filteredVaults);
    
            setUserVaults(filteredVaults);
            setIsAllVaultsLoading(false);
    
        } catch (error) {
            console.error("Error fetching user vaults:", error);
            setIsAllVaultsLoading(false);
        }
    };
    
          
          fetchVaults();
          fetchUserVaults();  


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
          height="100vh"
          color="white"
        >
          <Heading as="h2">Connect your wallet</Heading>
        </Box>
      ) : (
        <Box
          w="100%"
          h="80vh"
          color="white"
          display="flex"
          alignItems="center"
          // justifyContent="center"
          textAlign="left"
          position="relative"
          mt={isMobile ? 30 : 0}
          // mb={50}
        >
          <SimpleGrid columns={1} w={isMobile?"95%":"100%"} ml={isMobile ? "0" : "20vw"}>
            <Box px={4} mt={isMobile? -60:-400} mb={4} w="100%">
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
              mt={isMobile?-40:-350}
              ml={isMobile ? 5: 0}
              border="1px solid gray"
              p={8}
              borderRadius={20}
              w={isMobile ? "auto" : "80%"}
              h="400px"
              backgroundColor="#222831"
            >
              {view === "all" && isAllVaultsLoading ? (
                <Spinner size="sm" />
              ) : view === "my" && isAllVaultsLoading ? (
                 <Spinner size="sm" />
              ) : isAllVaultsError || error ? (
                <Text color="red">Error fetching vaults</Text>
              ) : (view == "all" ? vaultsDataArray.length === 0 : userVaults.length === 0) && !isAllVaultsLoading ? (
                <Text>No vaults found.</Text>
              ) : (
                <VStack align="start" spacing={4}>
                  <HStack>
                    {/* <Box >
                      <Text fontWeight="bold"  color="#bf9b30" ml={2}>Index</Text>
                    </Box> */}
                    <Box>
                      <Text fontWeight="bold" color="#bf9b30"  ml={10}>{isMobile?"":"Token"} Name</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold"  color="#bf9b30" ml={isMobile?20:10}>{isMobile?"":"Token"} Symbol</Text>
                    </Box>
                    {!isMobile && (
                      <>
                      <Box>
                        <Text fontWeight="bold" color="#bf9b30"  ml={10}>Reserve Asset</Text>
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

                    // console.log(hasPresale)
                    return (

                      <Box
                        key={index}
                        p={4}
                        border="1px solid"
                        borderColor={isMobile? vault.presaleContract != zeroAddress ? "#54ff36" : "gray" : "gray"}
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
                        <Box w={isMobile ? "200px" : "250px"} ml={5}>
                          <Text fontSize={isMobile? "12px" : "14px"}  >{vault.tokenName}</Text>
                        </Box>
  
                        {/* Token Symbol */}
                        <Box w={isMobile ? "140px" : "180px"}>
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
  
                            {/* Presale Status */}
                            <Box w="240px" ml={-10}>
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
                                      <Text color={"#1ad000"} fontSize={isMobile? "11px" : "12px"} >
                                        <b>In progress</b>
                                      </Text>
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
        </Box>
      )}
    </Container>
  );
};

export default Markets;