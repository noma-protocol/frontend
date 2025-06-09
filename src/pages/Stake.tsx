import React, { useState, useEffect } from 'react';
import { Input, Image, Flex, Container, Heading, HStack, Box, Grid, GridItem, Button, Spinner, Text, createListCollection, SimpleGrid, NumberInput, VStack } from "@chakra-ui/react";
import { ethers } from 'ethers';
import { isMobile } from "react-device-detect";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';
import { Toaster, toaster } from "../components/ui/toaster";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams
import BalanceCard from '../components/BalanceCard';
import ethLogo from '../assets/images/weth.svg';
import oksLogo from '../assets/images/logo_dark.png';
import placeholderLogo from '../assets/images/question.svg';
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import { formatNumberPrecise, commify, commifyDecimals, getDaysLeft, calculateExpiryDate, getContractAddress, toDate, getTimeLeft } from '../utils';
import {
    NumberInputRoot,
    NumberInputLabel,
    NumberInputField,
  } from "../components/ui/number-input";
  import {
    DrawerRoot,
    DrawerTrigger,
    DrawerBackdrop,
    DrawerContent,
    DrawerCloseTrigger,
    DrawerHeader,
    DrawerTitle,
    DrawerBody,
    DrawerFooter,
    DrawerActionTrigger,
} from '../components/ui/drawer'; // Ark UI Drawer components
import { Tooltip } from "../components/ui/tooltip"

import CountdownTimer from '../components/CooldownCountdown';
import { ro } from '@faker-js/faker';
import addresses from "../assets/deployment.json";
import config from '../config'; 

const { formatEther, parseEther, isAddress } = ethers.utils;
const { JsonRpcProvider } = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  config.RPC_URL
);

const IWETHArtifact = await import(`../assets/IWETH.json`);
const IWETHAbi = IWETHArtifact.abi;

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const OikosFactoryArtifact = await import(`../assets/OikosFactory.json`);
const OikosFactoryAbi = OikosFactoryArtifact.abi;

const StakingContractArtifact = await import(`../assets/Staking.json`);
const StakingContractAbi = StakingContractArtifact.abi;

const GonsTokenArtifact = await import(`../assets/GonsToken.json`);
const GonsTokenAbi = GonsTokenArtifact.abi;

// NomaFactory contract address
const oikosFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "Factory");
const modelHelperAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "ModelHelper");

const Stake = () => {
    const { address, isConnected } = useAccount();
    const [searchParams] = useSearchParams();
    const screenOrientation = useScreenOrientation();
    const isLandscape = screenOrientation.includes("landscape");

    const vaultAddress = searchParams.get("v") || ""; // Fallback to empty string

    const [isLoading, setIsLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isStaking, setIsStaking] = useState(false);
    const [isUnstaking, setIsUnstaking] = useState(false);

    const [stakeAmount, setStakeAmount] = useState("");

    const [isTokenInfoLoading, setIsTokenInfoLoading] = useState(true);
    const [isWrapping, setIsWrapping] = useState(false);
    const [isUnwrapping, setIsUnwrapping] = useState(false);

    const [token0Info, setToken0Info] = useState({});
    const [token1Info, setToken1Info] = useState({});

    const [ethBalance, setEthBalance] = useState("0");
    const [wrapAmount, setWrapAmount] = useState("0");

    const [token0, setToken0] = useState("");
    const [token1, setToken1] = useState("");

    const [vaultDescription, setVaultDescription] = useState({});
    const [selectedDestination, setSelectedDestination] = useState("Exchange");

    const _navigationSelectData = {
        items: [
        {
            label: "Exchange",
            value: "/exchange",
        },            
        {
            label: "Markets",
            value: "/markets",
        },
        {
            label: "Liquidity",
            value: "/liquidity",
        },
        {
            label: "Borrow",
            value: `/borrow?v=${vaultAddress}`,
        },
        ],
    };

    // Reference to track if component is mounted
    const isMounted = React.useRef(true);

    const {
        data: stakedBalance
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "stakedBalance",
        args: [address],
        watch: true,
    });

    const {
        data: sNomaToken
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "sOKS",
        watch: true,
    });

    const {
        data: sNomaBalance
    } = useContractRead({
        address: sNomaToken,
        abi: ERC20Abi,
        functionName: "balanceOf",
        args: [address],
        watch: true,
    });
    
    const {
        data: sNomaTotalSupply
    } = useContractRead({
        address: sNomaToken,
        abi: ERC20Abi,
        functionName: "totalSupply",
        watch: true,
    });

    const {
        data: totalStaked
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "totalStaked",
        watch: true
    });


    const {
        data: totalRewards
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "totalRewards",
        watch: true
    });

    const {
        data: lastOperationTimestamp
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "lastOperationTimestamp",
        args: [address],
        watch: true
    });

    // console.log(`Last Operation Timestamp: ${lastOperationTimestamp}`, typeof lastOperationTimestamp, lastOperationTimestamp && String(lastOperationTimestamp).length);

    let APR_30_DAYS = (((formatEther(`${sNomaTotalSupply || 0}`) ) - formatEther(`${sNomaBalance || 0}`)) / formatEther(`${totalStaked || 0}`) ) * (365 / 30) * 100;
    APR_30_DAYS = isNaN(APR_30_DAYS) ? 0 : APR_30_DAYS;

    // console.log(`${formatEther(`${sNomaTotalSupply || 0}`) }`);
    // console.log(`${formatEther(`${totalRewards || 0}`)}`);
    // console.log({sNomaBalance});
    // console.log(`${formatEther(`${rebaseIndex || 0}` )}`);

    // Initialize isMounted.current to true
    useEffect(() => {
        isMounted.current = true;

        return () => {
            // Set to false when component unmounts
            isMounted.current = false;
        };
    }, []);

    if (token1Info?.tokenSymbol == "WMON") {
        setToken1Info({
            tokenName: "Wrapped BNB",
            tokenSymbol: "WBNB",
            tokenDecimals: 18,
            balance: token1Info?.balance || "0",
        });
    } 

    useEffect(() => {
        const fetchVaultDescription = async () => {
            try {
                const nomaFactoryContract = new ethers.Contract(
                    oikosFactoryAddress,
                    OikosFactoryAbi,
                    localProvider
                );

                const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vaultAddress);

                const plainVaultDescription = {
                    tokenName: vaultDescriptionData[0],
                    tokenSymbol: vaultDescriptionData[1],
                    tokenDecimals: Number(vaultDescriptionData[2]), // Convert BigInt to number
                    token0: vaultDescriptionData[3],
                    token1: vaultDescriptionData[4],
                    deployer: vaultDescriptionData[5],
                    vault: vaultDescriptionData[6],
                    presaleContract: vaultDescriptionData[7],
                    stakingContract: vaultDescriptionData[8],
                };

                if (isMounted.current) {
                    setVaultDescription(plainVaultDescription);
                    setToken0(plainVaultDescription.token0);
                    setToken1(plainVaultDescription.token1);
                }
            } catch (error) {
                console.error("Error fetching vault description:", error);
            }
        }

        fetchVaultDescription();
    }, [vaultAddress]);

    useEffect(() => {
        if (!address) return;

        const fetchEthBalance = async () => {
            try {
                const balance = await localProvider.getBalance(address);
                if (isMounted.current) {
                    setEthBalance(balance);
                }
            } catch (error) {
                console.error("Error fetching ETH balance:", error);
            }
        };

        // Fetch immediately
        fetchEthBalance();

        const interval = setInterval(fetchEthBalance, 3000);

        return () => clearInterval(interval);
    }, [address]);

    useEffect(() => {
        if (!token0 || !token1 || !address) return;

        // Set loading only on initial fetch, not during interval updates
        let initialFetch = true;
        if (initialFetch) {
            setIsTokenInfoLoading(true);
        }

        const fetchTokenInfo = async (tokenAddress) => {
            if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) return null;

            try {
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ERC20Abi,
                    localProvider
                );

                const [tokenName, tokenSymbol, tokenDecimals, balance] = await Promise.all([
                    tokenContract.name(),
                    tokenContract.symbol(),
                    tokenContract.decimals(),
                    tokenContract.balanceOf(address)
                ]);

                return { tokenName, tokenSymbol, tokenDecimals, balance };
            } catch (error) {
                console.error(`Error fetching token info for ${tokenAddress}:`, error);
                return null;
            }
        };

        const updateTokenInfo = async () => {
            try {
                // Execute both calls in parallel
                const [token0Data, token1Data] = await Promise.all([
                    fetchTokenInfo(token0),
                    fetchTokenInfo(token1)
                ]);

                if (!isMounted.current) return;

                if (token0Data) setToken0Info(token0Data);
                if (token1Data) setToken1Info(token1Data);

                // Only set loading to false if this is the initial fetch
                if (initialFetch) {
                    setIsTokenInfoLoading(false);
                    initialFetch = false;
                }
            } catch (error) {
                console.error("Error updating token info:", error);
                if (initialFetch && isMounted.current) {
                    setIsTokenInfoLoading(false);
                    initialFetch = false;
                }
            }
        };

        // Initial fetch
        updateTokenInfo();

        const interval = setInterval(updateTokenInfo, 3000);

        return () => clearInterval(interval);
    }, [token0, token1, address]);

    // Remove this useEffect as it's redundant with the other useEffects
    // and is likely causing the loading state to get stuck in a loop
    useEffect(() => {
        // This effect has been consolidated into the previous ones
        // No need for another interval fetching the same data
        return () => {
            // Empty cleanup function for safety
        };
    }, []);

    const {
        write: approve
    } = useContractWrite({
        address: token0,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultDescription.stakingContract,
            parseEther(`${(stakeAmount || "0") }`).add(parseEther(`${0.000001}`))   
        ],
        onSuccess(data) {

            stake();

        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsStaking(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });

    const {
        write: stake
    } = useContractWrite({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "stake",
        args: [
            // address,
            parseEther(stakeAmount || "0")
        ],
        onSuccess(data) {
            setIsStaking(false);
            setTimeout(() => {
                window.location.reload();
            }, 4000); // 4000ms = 4 seconds
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsStaking(false);

            const msg = Number(error.message.toString().indexOf("0xfb8f41b2")) > -1 ? "Insufficient allowance" :
                        Number(error.message.toString().indexOf("StakingNotEnabled")) > -1 ? "Staking not enabled." :
                        Number(error.message.toString().indexOf("InvalidParameters")) > -1 ? "Can't stake zero." :
                        Number(error.message.toString().indexOf("CooldownNotElapsed")) > -1 ? "Cooldown not elapsed. Try again later." :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
                        
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: unstake
    } = useContractWrite({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "unstake",
        args: [],
        onSuccess(data) {
            setIsUnstaking(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsUnstaking(false);

            const msg = Number(error.message.toString().indexOf("StakingNotEnabled")) > -1 ? "Staking not enabled." :
                        Number(error.message.toString().indexOf("LockInPeriodNotElapsed")) > -1 ? "You can't unstake yet." :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: approveSnoma
    } = useContractWrite({
        address: sNomaToken,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultDescription.stakingContract,
            ethers.constants.MaxUint256
        ],
        onSuccess(data) {

            unstake();
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsUnstaking(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });
    
    const handleSetAmountToStake = (valueOrEvent) => {
        // Handle both direct values and event objects
        const value = valueOrEvent && valueOrEvent.target
            ? valueOrEvent.target.value
            : valueOrEvent;

        // If the input is not a number (excluding empty string which is handled separately), return early
        if (value !== "" && isNaN(Number(value))) return;

        // Set the value as-is, allowing empty strings
        setStakeAmount(value);
    }

    const handleStake = async () => {
        setIsStaking(true);
        approve();
    }

    const handleUnstake = async () => {
        setIsUnstaking(true);
        approveSnoma();
    }

    const handleSelectDestination = (event) => {
        console.log(`Selected destination: ${event.target.value}`);
         
        window.location = event.target.value;
    }

    // console.log(`sNoma Balance: ${sNomaBalance} stakedBalance: ${stakedBalance}`);
    const rewards = formatEther(`${sNomaBalance || 0}`) - formatEther(`${stakedBalance || 0}`);

    console.log(`Get time left ${getTimeLeft(lastOperationTimestamp, 3)}`);
    return (
        <Container maxW="container.xl" py={12} pl={"0%"} ml={isConnected ? "10%" : "2%"}>
            <Toaster />

            {!isConnected ? (
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
                    border="1px solid #a67c00"
                    mt="100px"
                    ml={isMobile ? 5 : "15%"}
                >
                    <Box
                        mb={6}
                        p={4}
                        borderRadius="full"
                        bg="rgba(166, 124, 0, 0.2)"
                    >
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="#a67c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 10H21" stroke="#a67c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 15H7.01" stroke="#a67c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M11 15H13" stroke="#a67c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </Box>
                    <Heading as="h2" mb={4} fontSize="2xl" textAlign="center">Wallet Not Connected</Heading>
                    <Text fontSize="md" textAlign="center" mb={6} color="gray.400">
                        Please connect your wallet to access the Oikos Staking features
                    </Text>
                    <Box
                        p={1}
                        bgGradient="linear(to-r, #a67c00, #e2c058, #a67c00)"
                        borderRadius="md"
                    >
                        <Box
                            bg="#222831"
                            borderRadius="md"
                            px={6}
                            py={2}
                        >
                            <Text fontWeight="bold" color="#a67c00">Connect Wallet</Text>
                        </Box>
                    </Box>
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
                    mt={"50px"}
                    ml={isMobile ? 0 : "-2vw"}
                    mb={"15%"}
                >
                 {isAddress(vaultAddress) ? (
                    isMobile ? (
                        <Flex direction="column">
                        <Box  ml="-5">
                            <HStack mt={10} >
                            <Box w="80px">
                                <Text> Go to:</Text>
                            </Box>
                            <Box>
                            <SelectRoot
                                mt={0}
                                ml={5}
                                mb={2}
                                collection={createListCollection(_navigationSelectData )}
                                size="sm"
                                width={isMobile ? "125px" : "150px"}
                                onChange={handleSelectDestination}
                                value={selectedDestination} // Bind the selected value to the state
                                
                            >
                                <SelectTrigger>
                                {_navigationSelectData.items.map((data, index) => {
                                if (index > 0) return;
                                    return (
                                    <SelectValueText placeholder={data.label}>
                                    </SelectValueText>
                                    );
                                })}                  
                                </SelectTrigger>
                                <SelectContent>
                                {_navigationSelectData.items
                                .slice()          // make a shallow copy
                                .reverse()        // reverse the copy 
                                .map((data) => {
                                    return (
                                    <SelectItem item={data} key={data.value}>
                                        {data.label}
                                    </SelectItem>
                                    );
                                })}
                                </SelectContent>
                            </SelectRoot>
                            </Box>
                        </HStack>  
                        </Box>
                        <Box mt={2} ml={-2}>
                            <BalanceCard 
                                ethBalance={ethBalance}
                                token0Balance={token0Info?.balance} 
                                token0Symbol={token0Info?.tokenSymbol} 
                                token1Symbol={token1Info.tokenSymbol} 
                                token1Balance={token1Info?.balance}
                                setIsLoading={setIsLoading}
                                isLoading={isLoading}
                                isTokenInfoLoading={isTokenInfoLoading}
                                isWrapping={isWrapping}
                                setIsWrapping={setIsWrapping}
                                isUnwrapping={isUnwrapping}
                                setIsUnwrapping={setIsUnwrapping}
                                setWrapAmount={setWrapAmount}
                                wrapAmount={wrapAmount}
                                vaultAddress={vaultAddress} 
                                page="stake"
                            />
                        </Box>
                        <Box px={1} py={2} mt={5} w={"95%"}  border="1px solid ivory" borderRadius={10} backgroundColor={"#222831"} ml={"-30px"} fontSize="xs">
                        <Text fontSize={"xs"} fontWeight={"bold"} color="#a67c00" ml={2}>Active Position</Text>
                            <SimpleGrid 
                                mt={-5} 
                                fontSize={"11px"} 
                                w={isMobile ? "96%" : "352px"} 
                                ml={2} 
                                mr={2}
                                pr={2}
                                gridTemplateColumns="65px 75px 70px 1fr" // wider Actions column
                            >               
                            <Box  h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> Staked </Box>
                            <Box  h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> {isTokenInfoLoading ? <Spinner size="xs" mt={1}/> : `s${token0Info.tokenSymbol}`} </Box>
                            <Box  h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> Rewards </Box>
                            {/* <Box h="20px" px={2} color="white" backgroundColor={"#bf9b30"}></Box> */}
                            <Box  h="20px" px={2} color="white" backgroundColor={"#bf9b30"} > &nbsp;&nbsp;&nbsp;Actions </Box> 
                            {stakedBalance > 0 ? ( 
                                <>
                                <Box px={2} w="65px"> 
                                    <HStack mt={2} >
                                        <Box  fontSize="xs">
                                        <Text fontSize="xs">{formatNumberPrecise(formatEther(`${stakedBalance || 0}`), 2)}</Text>
                                        </Box>
                                        <Box ml={-1} fontSize="xx-small">
                                        {isTokenInfoLoading ? <Spinner size="xs" /> :  <Text fontSize="xx-small">{token0Info.tokenSymbol}</Text>}
                                        </Box>
                                    </HStack>
                                </Box>
                                <HStack w="75px">
                                <Box px={2}  >
                                    <Text fontSize="xs">{formatNumberPrecise(formatEther(`${sNomaBalance || 0}`), 2)}</Text>
                                </Box>
                                <Box  fontSize="xx-small" ml={-3}>
                                    {isTokenInfoLoading ? <Spinner size="xs" mt={1}/> : <Text fontSize="xx-small" >s{token0Info.tokenSymbol}</Text>}
                                </Box> 
                                </HStack>                               
                                <Box px={2}  w="70px">     
                                    <HStack>
                                        <Box mt={2} fontSize="xs">
                                        {commify(rewards, 2)}
                                        </Box>
                                        <Box  fontSize="xx-small" ml={-1} mt={2}>
                                            {isTokenInfoLoading ? <Spinner size="xs" mt={1}/> : <Text fontSize="xx-small" ml={-2}>&nbsp;{token0Info.tokenSymbol}</Text>}
                                        </Box> 
                                    </HStack>
                                </Box>
                                {/* <Box px={2} mt={2}>
                                </Box> */}
                                <Box px={1} mt={2} ml={-10}> 
                                <Button 
                                    h={"25px"}  
                                    borderColor={"#a67c00"} 
                                    variant="outline" 
                                    ml={"60px"} 
                                    onClick={() => handleUnstake()}  
                                    disabled={isUnstaking || stakedBalance <= 0 || lastOperationTimestamp && getTimeLeft(lastOperationTimestamp, 3) > 0} 
                                    w={"50%"}
                                    
                                >
                                    {isUnstaking ? <Spinner size="xs" color="#a67c00" /> : <Text fontSize={"xs"} color="#a67c00">Unstake</Text>}
                                </Button>
                                </Box>

                                </>
                            ) : (
                                <>
                                <Box p={2} w="120px">
                                No Data
                                </Box>
                                <Box>
                                <Box></Box>
                                </Box>
                                <Box>
                                </Box>
                                <Box></Box>
                                </>
                            )}                                

                        </SimpleGrid>                         
                        </Box>
                            <Box 
                                px={3} 
                                py={2}
                                ml={"-30px"}  
                                mt={5}  
                                w={"95%"}   
                                border="1px solid ivory" 
                                borderRadius={10} 
                                backgroundColor={"#222831"} 
                            >
                            <Text fontSize={"xs"} fontWeight={"bold"} color="#a67c00">New Position</Text>
                            <SimpleGrid columns={2}  w={isMobile ? "98%" : "352px"}  mt={-5} fontSize={"xs"}>
                                <Box  w="auto" backgroundColor={"#bf9b30"}  mb={2}>
                                    <Text fontSize="xs">&nbsp;<b>Amount</b></Text>
                                </Box>
                                <Box   w="auto"  backgroundColor={"#bf9b30"} mb={2}>
                                    <Text fontSize="xs" ml={10}>Actions</Text>
                                </Box>
                                <Box w="auto">
                                    <HStack>
                                        <Box w="auto" mt={-2}>
                                        <NumberInputRoot
                                            isMobile={isMobile}
                                            min={0}
                                            mt={1}
                                            max={999999999}
                                            step={0.1}
                                            onChange={handleSetAmountToStake}
                                            ml={isMobile ? 0 : 1.5}
                                            marginRight={"5px"}
                                            value={stakeAmount}
                                            setTokenSupply={(() => {})}
                                            setPrice={setStakeAmount}
                                            setFloorPrice={(() => {})}
                                            h="25px"
                                        >
                                            <NumberInputLabel h={"25px"} w={{ base: "", lg: "auto" }} />
                                            <NumberInputField h={"25px"} w={{ base: "", lg: "200px" }} placeholder="Enter amount" />
                                        </NumberInputRoot>
                                        </Box>
                                        <Box>
                                            <Image ml={-2} src={oksLogo} w="65px"></Image>
                                        </Box>
                                    </HStack>
                                        <HStack mt={5}>
                                        <Box>
                                            <Text fontSize="xs">Staking:</Text>
                                        </Box>
                                        <Box>
                                            <HStack>
                                                <Box w="auto"><Text fontSize="xs">{stakeAmount ? formatNumberPrecise(stakeAmount, 4) : "0.0000"} </Text></Box>
                                                <Box fontSize="xs">{isTokenInfoLoading ? <Spinner size="xs" /> : token0Info.tokenSymbol}</Box>
                                            </HStack>
                                        </Box>                                    
                                        </HStack>
                                        <HStack w="400px">
                                        <Box> <Text fontSize="xs"> To cooldown:</Text> </Box>
                                        <Box w="25%">
                                            {lastOperationTimestamp ? (
                                                <CountdownTimer
                                                    startTsMs={Number(lastOperationTimestamp) * 1000}
                                                    intervalDays={3}
                                                />
                                            ) : (
                                                <Text fontSize="xs" color="gray">N/A</Text>
                                            )}
                                        </Box>
                                        <Box mt={-1}>
                                            <Tooltip content="This is the time users have to wait between operations."><Image src={placeholderLogo} w={15}></Image></Tooltip>
                                        </Box>
                                        </HStack>
                                        <HStack w="400px">
                                        <Box w="120px"> <Text fontSize="xs"> Last operation:</Text> </Box>
                                        <Box>
                                            <Text fontSize="xs" color="gray">
                                                {lastOperationTimestamp ? new Date(Number(lastOperationTimestamp) * 1000).toLocaleString() : "N/A"}
                                            </Text>
                                        </Box>
                                        </HStack>                                        
                                        {/* <Box mt={5}>
                                            <Text fontWeight={"bold"} color="gray">Collateral required</Text>
                                        </Box>
                                        <Box>
                                            <Text>{commify(collateral || 0)} {token0Info.tokenSymbol}</Text>
                                        </Box>
                                        <Box mt={5}>
                                        <HStack>
                                            <Box> <Text fontWeight={"bold"} color="gray">Loan Fees</Text>    </Box>
                                            <Box><Image src={placeholderLogo} w={15}></Image></Box>
                                        </HStack>
                                        </Box>
                                        <Box>
                                            <Text>{commifyDecimals(formatEther(`${1 || 0}`), 6)} {token1Info.tokenSymbol}</Text>
                                        </Box>
                                        <Box mt={5}> 
                                            <HStack>
                                                <Box><Text fontWeight={"bold"} color="gray">IMV</Text> </Box>
                                                <Box>{commifyDecimals(formatEther(`${1 || 0}`) || 0, 4)}</Box>
                                                <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}/{token1Info?.tokenSymbol}</Box>
                                            </HStack>
                                        </Box>  */}
                                </Box>
                                <Box>
                                {/* <SelectRoot
                                    mt={1}
                                    ml={isMobile?25:55}
                                    collection={durationChoices}
                                    size="sm"
                                    width={isMobile?"180px":"110px"}
                                    onChange={handleSetDuration}
                                    value={duration}
                                    >
                                    <SelectTrigger>
                                        {durationChoices.items.map((data, index) => {
                                            if (index > 0) return;
                                            return (
                                                <SelectValueText placeholder={data.label}>
                                                </SelectValueText>
                                            );
                                            })}       
                                    </SelectTrigger>
                                    <SelectContent>
                                        {durationChoices.items.map((choice) => (
                                            <SelectItem item={choice} key={choice.value}>
                                                {choice.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectRoot> */}
                                    <Button
                                        mt={1}
                                        h={"25px"}
                                        borderColor={"#a67c00"}
                                        variant="outline"
                                        ml={10}
                                        onClick={() => handleStake()}
                                        disabled={isLoading || !stakeAmount || stakeAmount === "" || Number(stakeAmount) <= 0}
                                        w={"50%"}
                                    >
                                        {isStaking ? <Spinner size="sm" color="#a67c00" /> : <Text fontSize={"xs"} color="#a67c00">Stake</Text>}
                                    </Button>
                                </Box>
                            </SimpleGrid>                        
                        </Box>  
                        <p
                                style={{ fontSize: "13px", cursor: "pointer", textDecoration: "underline", marginLeft:"-15px" }}
                                onClick={() => window.history.back()}
                            >
                            Go Back
                        </p>                             
                        </Flex>
                    ) : ( 
                    <Box w="99%">
                    <Box mt={10} ml={"5%"}>
                        <HStack>
                            <Box w="80px" >
                                <Text> Go to:</Text>
                            </Box>
                            <Box>
                            <SelectRoot
                                mt={isMobile ? "-60px" : 0}
                                ml={5}
                                mb={2}
                                collection={createListCollection(_navigationSelectData )}
                                size="sm"
                                width={isMobile ? "185px" : "150px"}
                                onChange={handleSelectDestination}
                                value={selectedDestination} // Bind the selected value to the state
                                
                            >
                                <SelectTrigger>
                                {_navigationSelectData.items.map((data, index) => {
                                if (index > 0) return;
                                    return (
                                    <SelectValueText placeholder={data.label}>
                                    </SelectValueText>
                                    );
                                })}                  
                                </SelectTrigger>
                                <SelectContent>
                                {_navigationSelectData.items
                                .slice()          // make a shallow copy
                                .reverse()        // reverse the copy 
                                .map((data) => {
                                    return (
                                    <SelectItem item={data} key={data.value}>
                                        {data.label}
                                    </SelectItem>
                                    );
                                })}
                                </SelectContent>
                            </SelectRoot>
                            </Box>
                        </HStack>
                    
                    </Box>  
                    <Grid
                        h="600px"
                        templateRows="repeat(2, 1fr)"
                        templateColumns="repeat(2, 1fr)"
                        gap={1}
                        mb={20}
                        mt={2}
                        px={2}
                        py={4}
                        // border="1px solid red"

                    >
                        <GridItem w="90%" border={"1px solid white"} p={4} ml={5}  backgroundColor={"#222831"} borderRadius={10}>
                            <Text fontSize={"14px"} fontWeight={"bold"} color="#a67c00">Active Position</Text>
                            <SimpleGrid columns={4} mt={-5} fontSize={"xs"} >
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Staked </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> {isTokenInfoLoading ? <Spinner size="xs" /> : `s${token0Info.tokenSymbol}`} </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Rewards </Box>
                                {/* <Box px={2} color="white" backgroundColor={"#bf9b30"}> APR</Box> */}
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Actions </Box> 
                                {stakedBalance > 0 ? ( 
                                    <>
                                    <Box px={2} mt={1} bgColor={"#18181b"}> 
                                        <HStack>
                                            <Box  fontSize="sm" color="white">
                                            {formatNumberPrecise(formatEther(`${stakedBalance || 0}`), 4)}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={1} bgColor={"#18181b"} color="white">
                                        {formatNumberPrecise(formatEther(`${sNomaBalance || 0}`), 6)}
                                    </Box>
                                    <Box px={2} mt={1} bgColor={"#18181b"}>     
                                        <HStack>
                                            <Box  fontSize="sm" color="white">
                                            {commify(rewards, 4)}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    {/* <Box px={2} mt={1} bgColor={"#18181b"} color="white">
                                        {"N/A"}
                                    </Box> */}
                                    <Box px={2}  mt={1} ml={-10}> 
                                    <Button 
                                        h={"25px"}  
                                        borderColor={"#a67c00"} 
                                        variant="outline" 
                                        ml={10} 
                                        onClick={() => handleUnstake()}  
                                    disabled={isUnstaking || stakedBalance <= 0 || lastOperationTimestamp && getTimeLeft(lastOperationTimestamp, 3) > 0} 
                                        w={"100px"}
                                        
                                    >
                                        {isUnstaking ? <Spinner size="sm" color="#a67c00" /> : <Text fontSize={"13px"} color="#a67c00">Unstake</Text>}
                                    </Button>
                                    </Box>

                                    </>
                                ) : (
                                    <>
                                    <Box p={2}>
                                    No Data
                                    </Box>
                                    <Box>
                                    <Box></Box>
                                    </Box>
                                    <Box>
                                    </Box>
                                    <Box></Box>
                                    </>
                                )}                                

                            </SimpleGrid>
                        </GridItem>
                        <GridItem  ml={"-6vh"}>
                            <BalanceCard 
                                ethBalance={ethBalance}
                                token0Balance={token0Info?.balance} 
                                token0Symbol={token0Info?.tokenSymbol} 
                                token1Symbol={token1Info.tokenSymbol} 
                                token1Balance={token1Info?.balance}
                                // deposit={deposit}
                                // withdraw={withdraw}
                                setIsLoading={setIsLoading}
                                isLoading={isLoading}
                                isTokenInfoLoading={isTokenInfoLoading}
                                isWrapping={isWrapping}
                                setIsWrapping={setIsWrapping}
                                isUnwrapping={isUnwrapping}
                                setIsUnwrapping={setIsUnwrapping}
                                setWrapAmount={setWrapAmount}
                                wrapAmount={wrapAmount}
                                vaultAddress={vaultAddress}
                                page="stake" 
                            />
                        </GridItem>
                        <GridItem mt={2} w="90%" border={"1px solid white"} p={4} ml={5}  backgroundColor={"#222831"} borderRadius={10}>
                        <Text fontSize={"14px"} color="#a67c00"><b>New Position</b></Text>
                        <SimpleGrid columns={2} w="100%" mt={-5} fontSize={"xs"}>
                            <Box w="500px" backgroundColor={"#bf9b30"}  mb={2}>
                                <Text fontSize="sm">&nbsp;Amount</Text>
                            </Box> 
                            <Box backgroundColor={"#bf9b30"} mb={2}>
                                <Text ml={5} fontSize="sm">Actions</Text>
                            </Box>
                            <Box w="auto">
                                <HStack>
                                    <Box w="auto" mt={-2}>
                                    <NumberInputRoot
                                        isMobile={isMobile}
                                        min={0}
                                        max={999999999}
                                        step={0.1}
                                        onChange={handleSetAmountToStake}
                                        ml={isMobile ? 0 : 1.5}
                                        marginRight={"5px"}
                                        value={stakeAmount}
                                        setTokenSupply={(() => {})}
                                        setPrice={setStakeAmount}
                                        setFloorPrice={(() => {})}
                                        h="25px"
                                    >
                                        <NumberInputLabel h={"25px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"25px"} w={{ base: "", lg: "200px" }} placeholder="Enter amount" />
                                    </NumberInputRoot>
                                    </Box>
                                    <Box mt={-1}>
                                        <Image src={oksLogo} w="40px"></Image>
                                    </Box>
                                </HStack>
                                <VStack alignItems={"left"}>
                                     <HStack mt={10} ml={2}>
                                    <Box>
                                        <Text>Staking:</Text>
                                    </Box>
                                    <Box>
                                    <HStack>
                                            <Box w="auto"><Text>{stakeAmount ? formatNumberPrecise(stakeAmount, 4) : "0.0000"} </Text></Box>
                                            <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info.tokenSymbol}</Box>
                                    </HStack>
                                    </Box>
                                    {/* <Box> <Text> Last operation:</Text> </Box>
                                    <Box>
                                        <Text fontSize="xs" color="gray">
                                            {lastOperationTimestamp ? new Date(Number(lastOperationTimestamp) * 1000).toLocaleTimeString() : "N/A"}
                                        </Text>
                                    </Box> */}

                                    </HStack>
                                    <HStack w="400px" ml={2}>
                                        <Box> <Text> To cooldown:</Text> </Box>
                                        <Box>
                                            {lastOperationTimestamp && lastOperationTimestamp > 0 ? (
                                                <CountdownTimer
                                                    startTsMs={Number(lastOperationTimestamp) * 1000}
                                                    intervalDays={3}
                                                />
                                            ) : (
                                                <Text fontSize="xs" color="#a67c00">N/A</Text>
                                            )}
                                        </Box>
                                        <Box>
                                            <Tooltip content="This is the time users have to wait between operations."><Image src={placeholderLogo} w={15}></Image></Tooltip>
                                        </Box>
                                    </HStack>
                                </VStack>

                                    {/* <Box mt={5}>
                                        <Text fontWeight={"bold"} color="gray">Collateral required</Text>
                                    </Box>
                                    <Box>
                                        <Text>{commify(collateral || 0)} {token0Info.tokenSymbol}</Text>
                                    </Box>
                                    <Box mt={5}>
                                       <HStack>
                                        <Box> <Text fontWeight={"bold"} color="gray">Loan Fees</Text>    </Box>
                                        <Box><Image src={placeholderLogo} w={15}></Image></Box>
                                       </HStack>
                                    </Box>
                                    <Box>
                                        <Text>{commifyDecimals(formatEther(`${1 || 0}`), 6)} {token1Info.tokenSymbol}</Text>
                                    </Box>
                                    <Box mt={5}> 
                                        <HStack>
                                            <Box><Text fontWeight={"bold"} color="gray">IMV</Text> </Box>
                                            <Box>{commifyDecimals(formatEther(`${1 || 0}`) || 0, 4)}</Box>
                                            <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}/{token1Info?.tokenSymbol}</Box>
                                        </HStack>
                                    </Box>  */}
                            </Box>
                            <Box>
                            {/* <SelectRoot
                                mt={1}
                                ml={isMobile?25:55}
                                collection={durationChoices}
                                size="sm"
                                width={isMobile?"180px":"110px"}
                                onChange={handleSetDuration}
                                value={duration}
                                >
                                <SelectTrigger>
                                    {durationChoices.items.map((data, index) => {
                                        if (index > 0) return;
                                        return (
                                            <SelectValueText placeholder={data.label}>
                                            </SelectValueText>
                                        );
                                        })}       
                                </SelectTrigger>
                                <SelectContent>
                                    {durationChoices.items.map((choice) => (
                                        <SelectItem item={choice} key={choice.value}>
                                            {choice.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectRoot> */}
                                <Button
                                    mt={1} 
                                    h={"25px"}
                                    borderColor={"#a67c00"}
                                    variant="outline" ml={5}
                                    onClick={() => handleStake()}
                                    disabled={isLoading || !stakeAmount || stakeAmount === "" || Number(stakeAmount) <= 0} w={"120px"}
                                >
                                    {isStaking ? <Spinner size="sm" color="#a67c00" /> : <Text fontSize={"13px"} color="#a67c00">Stake</Text>}
                                </Button>
                            </Box>
                        </SimpleGrid>

                        </GridItem>
                        <p
                        style={{ fontSize: "13px", cursor: "pointer", textDecoration: "underline", marginLeft:"-15px" }}
                        onClick={() => window.history.back()}
                        >
                        Go Back
                        </p>   
                    </Grid> 
                    </Box>
                     )
                ) : (
                    <>Empty</>
                )} 
                </Box>  
            )}

        </Container>
    )
}

export default Stake;