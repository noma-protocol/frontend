import React, { useEffect, useState, useMemo } from "react";
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
  Select,
  Spinner,
  Flex,
} from "@chakra-ui/react";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import { ethers } from "ethers";
const { JsonRpcProvider } = ethers.providers;
import { isMobile } from "react-device-detect";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';

import config from '../config'; 
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import { formatEther } from "viem";
import { formatNumberPrecise, getContractAddress, commify } from "../utils";
import { Toaster, toaster } from "../components/ui/toaster";
import metamaskLogo from "../assets/images/metamask.svg";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesMonad;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  "https://process.env.VITE_RPC_URL/"
);

const bscProvider = new JsonRpcProvider(
    "process.env.VITE_RPC_URL"
);

const Whitelist = await import(`../assets/Whitelist.json`);
const whitelistedAddresses = Whitelist.addresses || [];

const Migration = await import(`../assets/Migration.json`);
// Extract the ABI from the Migration artifact
const MigrationAbi = Migration.abi;

// console.log("Whitelisted Addresses:", whitelistedAddresses);    
const tokenAddress = "0x614da16Af43A8Ad0b9F419Ab78d14D163DEa6488" //getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "Proxy");

const ERC20Artifact = await import(`../assets/ERC20.json`);

// Dynamically import the NomaFactory artifact and extract its ABI
const OikosFactoryArtifact = await import(`../assets/OikosFactory.json`);
const OikosFactoryAbi = OikosFactoryArtifact.abi;

const ERC20Abi = ERC20Artifact.abi;
// NomaFactory contract address
// const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "Factory");
const oldOKSTokenAddress = "0x18aCf236eB40c0d4824Fb8f2582EBbEcD325Ef6a";
const migrationContractAddress = "0x5693Af4DbD109D396330d6C173FFB84Ce1ce487C";
// const feeTier = 3000;

const Migrate: React.FC = () => {
    const { address, isConnected } = useAccount();
    const screenOrientation = useScreenOrientation();
    const isLandscape = screenOrientation.includes("landscape");
    const [isMigrating, setIsMigrating] = useState(false);
    const [isWhitelisted, setIsWhitelisted] = useState(false);
    const [oldOKSBalance, setOldOKSBalance] = useState(0);

    const oksContract = useMemo(() => {
        return new ethers.Contract(
            oldOKSTokenAddress,
            ERC20Abi,
            bscProvider
        );
    }, [oldOKSTokenAddress]);

    useEffect(() => {
        const fetchOldOKSBalance = async () => {
            if (!address) return;
            try {
                // const balance = await oksContract.balanceOf(address);
                setOldOKSBalance(0);
            } catch (error) {
                console.error("Error fetching old OKS balance:", error);
                setOldOKSBalance(0);
            }
        };

        fetchOldOKSBalance();
    }, [address, oksContract]);

    const {
        data: contractBalance
    } = useContractRead({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "balanceOf",
        args: [migrationContractAddress]
    });

    console.log("Contract Balance:", contractBalance);

    const {
        data: withdrawnOf,
        refetch: fetchWithdrawnOf,
    } = useContractRead({
        address: migrationContractAddress,
        abi: MigrationAbi,
        functionName: "withdrawnOf",
        args: [address]
    });

    console.log("Withdrawn Of:", withdrawnOf);

    const {
        data: initialIMV,
        refetch: fetchInitialIMV,
    } = useContractRead({
        address: migrationContractAddress,
        abi: MigrationAbi,
        functionName: "initialIMV",
        args: []
    });

    console.log("initialIMV :", initialIMV);

    const {
        data: initialBalanceOf,
        refetch: fetchInitialBalanceOf,
    } = useContractRead({
        address: migrationContractAddress,
        abi: MigrationAbi,
        functionName: "initialBalanceOf",
        args: [address]
    });

    const available = formatEther(initialBalanceOf || 0) - formatEther(withdrawnOf || 0);

    const {
      write: withdraw
  } = useContractWrite({
      address: migrationContractAddress,
      abi: MigrationAbi,
      functionName: "withdraw",
      args: [],
      onSuccess(data) {
        setIsMigrating(false);
        setTimeout(() => {
            window.location.reload();        
        }, 3000); // 3000ms = 3 seconds  
      },
      onError(error) {
        setIsMigrating(false);

        const msg = Number(error.message.toString().indexOf("TRANSFER_FAILED")) > -1 ? "Error with operation" :
        Number(error.message.toString().indexOf("NothingToWithdraw")) > -1 ? "Nothing to withdraw" :
        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;

        toaster.create({
            title: "Error",
            description: msg,
        });         
      }
  });

    const handleClickMigrate = async () => {
        setIsMigrating(true);
        withdraw()
    }

    useEffect(() => {
    // Make sure both `address` and `whitelistedAddresses` are ready
    if (!address || !Array.isArray(whitelistedAddresses)) {
        // If address is falsy or the whitelist isn’t an array yet,
        // explicitly set isWhitelisted to false (so it doesn’t stay true from a previous render).
        setIsWhitelisted(false);
        return;
    }

    // Lowercase every whitelist entry (so you can compare apples to apples)
    const normalizedList = whitelistedAddresses.map((addr) => addr.toLowerCase());
    const normalizedAddress = address.toLowerCase();

    const isWhitelisted = normalizedList.includes(normalizedAddress);
    console.log("[whitelist check] address:", normalizedAddress);
    console.log("[whitelist check] list:", normalizedList);
    console.log("[whitelist check] result:", isWhitelisted);

    // Always call setIsWhitelisted, true or false
    setIsWhitelisted(isWhitelisted);
    }, [address, whitelistedAddresses]);

    const balanceAfterMigration = formatEther(`${oldOKSBalance}`) / 75 || 0;
    console.log("Old OKS Balance:", oldOKSBalance);
    console.log("Balance after migration:", balanceAfterMigration);

    const addTokenToMetaMask = async () => {
      try {
        // Create a provider using MetaMask's injected web3 provider
        if (typeof window.ethereum !== 'undefined') {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
  
          // Get the contract interface and ABI (replace with your token's ABI)
          const tokenABI = [
            "function name() public view returns (string memory)",
            "function symbol() public view returns (string memory)",
            "function decimals() public view returns (uint8)",
            "function totalSupply() public view returns (uint256)",
            "function balanceOf(address account) public view returns (uint256)",
            "function transfer(address recipient, uint256 amount) public returns (bool)",
          ];
          
          // Create a contract instance
          const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);
  
          // Get the token details
          const name = await tokenContract.name();
          const symbol = await tokenContract.symbol();
          const decimals = await tokenContract.decimals();
  
          // Prepare the token information for MetaMask
          const formattedSymbol = symbol || "OKS";
          const formattedDecimals = decimals || 18; // Default to 18 if not specified
  
          const hexValue = ethers.utils.parseUnits('1', formattedDecimals);
  
          // Add the token to MetaMask
          await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: tokenAddress,
                symbol: formattedSymbol,
                decimals: formattedDecimals,
                image: `http://app.oikos.cash/src/assets/images/logo.svg`, 
              },
            },
          });
        } else {
          console.error("MetaMask is not installed.");
        }
      } catch (error) {
        console.error(error);
      }
    };

  return (
    <Container maxW="container.xl" h="50vw">
      <Toaster />

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
      ) : isMobile && isLandscape ? (
        <RotateDeviceMessage />
      ) : (
        <Box
          w="100%"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          textAlign="left"
          position="relative"
          mt={isMobile ? "25vh" : "15vh"}
          h="30%"
        //   border={isMobile ? "none" : "1px solid #2D3748"}
          ml={"20%"}
        >
            {isMobile ? (
                <>
                <VStack spacing={4} align="stretch" w="100%">
                <Text as="h4"  ml={"-20px"}>Migrate OKS</Text>
                <SimpleGrid columns={2} w="60%"  gap={4}  >

                <Box w="50%">
                <HStack>
                    <Box ml={"-20px"}>
                        <Text fontSize="lg" color="white" >
                            Welcome
                        </Text>
                        </Box>
                        <Box>
                        <Text fontSize={isMobile ? "sm": "lg"} fontWeight="bold" color="#f3b500">
                        {address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not connected"}
                        </Text>
                    </Box>
                </HStack>                    
                </Box>
                <Flex direction="column" borderRadius={"10px"} backgroundColor="#2D3748" p={4} w="300px" mt={10} ml={"-40vw"}>
                    <HStack>
                        <Box  w="45%"><Text fontSize="xs" color="#f3b500">Whitelisted:</Text></Box>
                        <Box><Text fontSize="xs" color={isWhitelisted ? "green" : "red"}>  {isWhitelisted.toString() || "false"} </Text></Box>
                    </HStack>
                    <HStack mt={2}>
                        <Box w="45%"><Text fontSize="xs" color="#f3b500"> OKS Balance: </Text></Box>
                        <Box><Text fontSize="xs" fontWeight={"bold"}> {formatNumberPrecise(formatEther(oldOKSBalance || 0), 4)} OKS</Text></Box>
                        <Box><Text fontSize="xs" color="ivory">(OLD)</Text></Box>
                    </HStack>
                    <HStack mt={2}>
                        <Box  w="45%"><Text fontSize="xs" color="#f3b500"> After migration: </Text></Box>
                        <Box><Text fontSize="xs" fontWeight={"bold"}> {formatNumberPrecise(balanceAfterMigration || 0, 4)} OKS</Text></Box>
                        <Box><Text fontSize="xs" color="ivory">(NEW)</Text></Box>

                    </HStack> 
                    <HStack>
                        <Box  ml="45%"
>
                            <Button 
                                colorScheme="yellow"
                                onClick={addTokenToMetaMask}
                                borderColor="ivory"
                                w="140px"
                                mt={2}
                                ml={1}
                                fontSize={"xx-small"}
                                variant={"outline"}
                                borderRadius={5}
                                h="25px"
                                >  
                                <Box mt={1}> 
                                    <HStack>
                                            <Image src={metamaskLogo} w={15} mt={-1} />
                                        <Box>
                                            Add to Metamask
                                        </Box>
                                    </HStack>
                                </Box>
                                </Button>
                        </Box>
                    </HStack>
                </Flex>
                <Flex direction="column" borderRadius={"10px"} backgroundColor="#2D3748" p={4} w="300px" ml={"-8vw"} >
                    <SimpleGrid columns={2}>
                        <Box w="300px">
                        <HStack mt={2}>
                            <Box w="35%"><Text fontSize="sm" color="#f3b500"> Available: </Text></Box>
                            <Box><Text fontSize="sm" fontWeight={"bold"}> {formatNumberPrecise(formatEther(initialBalanceOf || 0), 4)} OKS</Text></Box>
                        </HStack>
                        <HStack mt={2}>
                            <Box  w="35%"><Text fontSize="sm" color="#f3b500"> Withdrew: </Text></Box>
                            <Box><Text fontSize="sm" fontWeight={"bold"}> {commify(formatEther(`${withdrawnOf || 0}`) || 0, 4)} OKS</Text></Box>
                        </HStack>
                        </Box>
                    <Box >
                    </Box>
                    </SimpleGrid>
                    </Flex>
                </SimpleGrid>   
               <Button 
                    colorScheme="yellow"
                    onClick={handleClickMigrate}
                    borderColor="ivory"
                    w="300px"
                    mt={2}
                    p={2}
                    ml={-8}
                    variant={"outline"}
                    borderRadius={"10px"}
                    disabled={!isWhitelisted || isMigrating || !oldOKSBalance || oldOKSBalance <= 0}
                    >{isMigrating ? <Spinner size="sm" /> : <Text fontSize={"xs"} color="ivory">Withdraw</Text>}
                    </Button>
                </VStack>             
                </>
            ) : (
            <VStack spacing={4} align="stretch" w="100%">
            <Text as="h4">Migrate OKS</Text>
            <SimpleGrid columns={2} w="60%"  gap={4}  >

                <Box w="50%">
                <HStack>
                    <Box >
                        <Text fontSize="lg" color="white" >
                            Welcome
                        </Text>
                        </Box>
                        <Box>
                        <Text fontSize={isMobile ? "sm": "lg"} fontWeight="bold" color="#f3b500">
                        {address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not connected"}
                        </Text>
                    </Box>
                </HStack>                    
                </Box>
                <Box borderRadius={"10px"} backgroundColor="#2D3748" p={4}>
                    <HStack>
                        <Box  w="35%"><Text fontSize="sm" color="#f3b500">Whitelisted:</Text></Box>
                        <Box><Text fontSize="sm" color={isWhitelisted ? "green" : "red"}>  {isWhitelisted.toString() || "false"} </Text></Box>
                    </HStack>
                    <HStack mt={2}>
                        <Box w="35%"><Text fontSize="sm" color="#f3b500"> OKS Balance: </Text></Box>
                        <Box><Text fontSize="sm" fontWeight={"bold"}> {formatNumberPrecise(formatEther(oldOKSBalance || 0), 4)} OKS</Text></Box>
                        <Box><Text fontSize="xs" color="ivory">(OLD)</Text></Box>
                    </HStack>
                    <HStack mt={2}>
                        <Box  w="35%"><Text fontSize="sm" color="#f3b500"> After migration: </Text></Box>
                        <Box><Text fontSize="sm" fontWeight={"bold"}> {formatNumberPrecise(balanceAfterMigration || 0, 4)} OKS</Text></Box>
                        <Box><Text fontSize="xs" color="ivory">(NEW)</Text></Box>
                    </HStack>
                </Box>
                <Box w="50%">
                
                </Box>
                 <Box borderRadius={"10px"} backgroundColor="#2D3748" p={4}>
                    <SimpleGrid columns={2}>
                        <Box w="300px">
                        <HStack mt={2}>
                            <Box w="35%"><Text fontSize="sm" color="#f3b500"> Available: </Text></Box>
                            <Box><Text fontSize="sm" fontWeight={"bold"}> {formatNumberPrecise(available, 4)} OKS</Text></Box>
                        </HStack>
                        <HStack mt={2}>
                            <Box  w="35%"><Text fontSize="sm" color="#f3b500"> Withdrew: </Text></Box>
                            <Box><Text fontSize="sm" fontWeight={"bold"}> {formatNumberPrecise(formatEther(`${withdrawnOf || 0}`) || 0, 4)} OKS</Text></Box>
                        </HStack>
                        </Box>
                    <Box >
                        <Button 
                            colorScheme="yellow"
                            onClick={handleClickMigrate}
                            borderColor="ivory"
                            w="110px"
                            mt={2}
                            ml={"60px"}
                            variant={"outline"}
                            // disabled={!isWhitelisted || isMigrating || !oldOKSBalance || oldOKSBalance <= 0 || available <= 0}
                    >{isMigrating ? <Spinner size="sm" /> : <Text fontSize="sm" color="ivory">Withdraw</Text>}
                    </Button>
                    </Box>
                    </SimpleGrid>

                </Box>

            </SimpleGrid>

            
            </VStack> 
        )}
            

        </Box>
      )}
    </Container>
  );
};

export default Migrate;