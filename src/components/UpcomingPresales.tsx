import React, { useEffect, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Link,
  Spinner,
  Image
} from "@chakra-ui/react";
import { ProgressRoot, ProgressBar } from "./ui/progress";
import { ethers } from "ethers";
import { getContractAddress } from "../utils";
import config from "../config";
import addresses from "../assets/deployment.json";
import placeholderLogo from "../assets/images/question_white.svg";
import nomaLogo from "../assets/images/noma.png";
import { tokenApi } from "../services/tokenApi";

const zeroAddress = "0x0000000000000000000000000000000000000000";

const { formatEther } = ethers.utils;
const { JsonRpcProvider } = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" : config.RPC_URL
);

// Dynamically import the NomaFactory artifact and extract its ABI
const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

// NomaFactory contract address
const oikosFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
// console.log("Factory address:", oikosFactoryAddress, "Chain:", config.chain);

const UpcomingPresales: React.FC = () => {
  const [presales, setPresales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenLogos, setTokenLogos] = useState<{[key: string]: string}>({});

  const fetchPresaleDetails = async ({ presaleContract }) => {
    // console.log(`fetchPresaleDetails called for contract: ${presaleContract}`);
    
    if (presaleContract === zeroAddress) {
      return [false, false, null];
    }

    // Import Presale ABI
    const PresaleArtifact = await import(`../assets/Presale.json`);
    const PresaleAbi = PresaleArtifact.abi;
    // console.log(`Presale ABI loaded, creating contract instance...`);

    const presaleContractInstance = new ethers.Contract(
      presaleContract,
      PresaleAbi,
      localProvider
    );

    try {
      // console.log(`Calling contract methods...`);
      
      let isFinalized, hasExpired, totalRaised, hardCap;
      
      try {
        isFinalized = await presaleContractInstance.finalized();
        // console.log(`  - finalized() returned: ${isFinalized}`);
      } catch (e) {
        console.error(`  - Error calling finalized():`, e.message);
        isFinalized = true; // Default to true on error
      }
      
      try {
        hasExpired = await presaleContractInstance.hasExpired();
        // console.log(`  - hasExpired() returned: ${hasExpired}`);
      } catch (e) {
        console.error(`  - Error calling hasExpired():`, e.message);
        hasExpired = true; // Default to true on error
      }
      
      try {
        totalRaised = await presaleContractInstance.totalRaised();
        // console.log(`  - totalRaised() returned: ${totalRaised}`);
      } catch (e) {
        console.error(`  - Error calling totalRaised():`, e.message);
        // Try alternative method names
        try {
          totalRaised = await presaleContractInstance.totalDeposited();
          // console.log(`  - totalDeposited() returned: ${totalRaised}`);
        } catch (e2) {
          console.error(`  - Error calling totalDeposited():`, e2.message);
          totalRaised = ethers.BigNumber.from(0);
        }
      }
      
      try {
        hardCap = await presaleContractInstance.hardCap();
        // console.log(`  - hardCap() returned: ${hardCap}`);
      } catch (e) {
        console.error(`  - Error calling hardCap():`, e.message);
        hardCap = ethers.BigNumber.from(0);
      }
      
      // Try to get end time - try different method names
      let endTime, timeLeft;
      try {
        endTime = await presaleContractInstance.endTime();
        const currentTime = Math.floor(Date.now() / 1000);
        timeLeft = Number(endTime) - currentTime;
        
        // console.log(`Presale contract ${presaleContract}:`);
        // console.log(`  - endTime: ${endTime} (${new Date(Number(endTime) * 1000).toLocaleString()})`);
        // console.log(`  - currentTime: ${currentTime}`);
        // console.log(`  - timeLeft: ${timeLeft} seconds (${Math.floor(timeLeft / 86400)} days)`);
      } catch (timeError) {
        // Try alternative method names
        try {
          endTime = await presaleContractInstance.deadline();
          const currentTime = Math.floor(Date.now() / 1000);
          timeLeft = Number(endTime) - currentTime;
          // console.log(`  - deadline: ${endTime} (${new Date(Number(endTime) * 1000).toLocaleString()})`);
          // console.log(`  - timeLeft: ${timeLeft} seconds (${Math.floor(timeLeft / 86400)} days)`);
        } catch (e2) {
          console.log(`Could not fetch endTime/deadline for ${presaleContract}`);
        }
      }
      
      // console.log(`  - finalized: ${isFinalized}`);
      // console.log(`  - hasExpired: ${hasExpired}`);
      // console.log(`  - totalRaised: ${formatEther(totalRaised)} / hardCap: ${formatEther(hardCap)}`);

      return [isFinalized, hasExpired, { totalRaised, hardCap }];
    } catch (error) {
      console.error("Error fetching presale details for", presaleContract, error);
      return [true, true, { totalRaised: 0, hardCap: 0 }]; // Mark as finalized/expired on error
    }
  };

  useEffect(() => {
    // Fetch token logos
    const fetchTokenLogos = async () => {
      try {
        // console.log("Fetching token logos...");
        const response = await tokenApi.getTokens({ includeAll: true });
        // console.log("Token API response:", response);
        const logos: {[key: string]: string} = {};
        
        response.tokens.forEach(token => {
          if (token.tokenSymbol) {
            // Use logoUrl if available, otherwise fall back to logoPreview
            const logoSource = token.logoUrl || token.logoPreview;
            // console.log(`Token ${token.tokenSymbol}: logoUrl=${token.logoUrl}, logoPreview=${token.logoPreview?.substring(0, 50)}...`);
            if (logoSource) {
              logos[token.tokenSymbol] = logoSource;
            }
          }
        });
        
        // console.log("Final logos map:", logos);
        setTokenLogos(logos);
      } catch (error) {
        console.error("Error fetching token logos:", error);
      }
    };
    
    const fetchUpcomingPresales = async () => {
      // console.log("Starting fetchUpcomingPresales...");
      try {
        setIsLoading(true);
        // console.log("Creating factory contract with address:", oikosFactoryAddress);
        
        const nomaFactoryContract = new ethers.Contract(
          oikosFactoryAddress,
          NomaFactoryAbi,
          localProvider
        );

        // console.log("Fetching deployers...");
        let allVaults = [];
        try {
          const deployersData = await nomaFactoryContract.getDeployers();
          // console.log("Deployers:", deployersData);
          
          // Get vaults for each deployer
          for (const deployer of deployersData) {
            const vaultsData = await nomaFactoryContract.getVaults(deployer);
            // console.log(`Vaults for deployer ${deployer}:`, vaultsData);
            allVaults = [...allVaults, ...vaultsData];
          }
        } catch (contractError) {
          // console.error("Error calling contract methods:", contractError.message || contractError);
          // console.error("Full error:", contractError);
          // console.log("Contract address:", oikosFactoryAddress);
          // console.log("Provider:", localProvider);
          setPresales([]);
          setIsLoading(false);
          return;
        }

        const upcomingPresales = [];
        
        // console.log("Total vaults to check:", allVaults.length);

        // Process each vault to find active presales
        for (const vault of allVaults) {
          try {
            const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
            
            const hasPresale = vaultDescriptionData[7] !== zeroAddress;
            // console.log(`Vault ${vaultDescriptionData[1]}, hasPresale: ${hasPresale}, presaleContract: ${vaultDescriptionData[7]}`);
            
            if (hasPresale) {
              // console.log(`Calling fetchPresaleDetails for ${vaultDescriptionData[1]}...`);
              const [isFinalized, hasExpired, presaleData] = 
              await fetchPresaleDetails({
                presaleContract: vaultDescriptionData[7],
              });
              
              // console.log(`Presale ${vaultDescriptionData[1]}: finalized=${isFinalized}, expired=${hasExpired}`);

              // Only show presales that are in progress
              if (!isFinalized && !hasExpired && presaleData) {
                upcomingPresales
                .push({
                  tokenSymbol: vaultDescriptionData[1],
                  tokenName: vaultDescriptionData[2],
                  presaleContract: vaultDescriptionData[7],
                  totalRaised: presaleData.totalRaised,
                  hardCap: presaleData.hardCap,
                  progress: presaleData.hardCap && Number(presaleData.hardCap) > 0 
                    ? Math.min(100, (Number(formatEther(presaleData.totalRaised)) / Number(formatEther(presaleData.hardCap))) * 100)
                    : 0,
                  isFinalized,
                  hasExpired,
                  status: isFinalized ? "Finalized" : hasExpired ? "Expired" : "In Progress"
                });
              }
            }
          } catch (error) {
            console.error("Error processing vault:", error);
          }
        }
        
        // console.log("Found upcoming presales:", upcomingPresales.length, upcomingPresales);
        setPresales(upcomingPresales);
      } catch (error) {
        console.error("Error fetching upcoming presales:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch logos first, then presales
    fetchTokenLogos().then(() => {
      fetchUpcomingPresales();
    });
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUpcomingPresales, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Box 
        bg="#1a1a1a" 
        borderRadius="lg" 
        p={4}
        w="100%"
        minW="100%"
      >
        <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
          Upcoming
        </Text>
        <Box display="flex" justifyContent="center" py={4}>
          <Spinner color="#4ade80" />
        </Box>
      </Box>
    );
  }

  return (
    <Box 
      bg="#1a1a1a" 
      borderRadius="lg" 
      p={4}
      w="100%"
      minW="100%"
    >
      <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
        Upcoming
      </Text>
      
      {presales.length === 0 ? (
        <Text color="#888" fontSize="sm">
          No active presales at the moment
        </Text>
      ) : (
        <VStack align="stretch" gap={3} w="100%">
          {presales.map((presale, index) => {
            return (
              <Link
                key={index}
                href={`/presale?a=${presale.presaleContract}`}
                target="_blank"
                _hover={{ textDecoration: "none" }}
                display="block"
                w="100%"
              >
                <Box
                  bg="#2a2a2a"
                  p={3}
                  borderRadius="md"
                  _hover={{ bg: "#333" }}
                  transition="all 0.2s"
                  cursor="pointer"
                >
                  <Box>
                    <HStack justifyContent="space-between" mb={1}>
                      <Box>
                      <HStack spacing={2}>
                        <Box>
                        <Image 
                          src={tokenLogos[presale.tokenSymbol] || (presale.tokenSymbol === "NOMA" ? nomaLogo : placeholderLogo)} 
                          alt={presale.tokenSymbol} 
                          w="20px" 
                          h="20px" 
                          borderRadius="full"
                        />                        
                        </Box>
                        <Box>
                        <Text color="white" fontWeight="600">
                          {presale.tokenSymbol}
                        </Text>                        
                        </Box>                    
                      </HStack>                      
                      </Box>
                      <Box>
                        <Text color="#4ade80" fontSize="sm" fontWeight="600">
                          {presale.progress.toFixed(1)}%
                        </Text>                      
                      </Box>
                    </HStack>
                  </Box>
                  <VStack alignItems={"left"} textAlign={"left"}>
                    <Box mt={"10px"}>
                      <Text color="gray" fontSize="xs">
                        In Progress
                      </Text>                  
                    </Box>                
                    <Box w="90%">
                      <ProgressRoot mt={"-5px"} value={Number(`10`)} max={100} size="sm" >
                        <ProgressBar bg="white" />
                      </ProgressRoot>                    
                    </Box>
                    <Box>
                      <Text color="#888" fontSize="xs" mt={"-5px"}>
                        {formatEther(presale.totalRaised)} / {formatEther(presale.hardCap)} MON
                      </Text>                     
                    </Box>               
                  </VStack>
                </Box>
              </Link>
            )
          })}
        </VStack>
      )}
    </Box>
  );
};

export default UpcomingPresales;