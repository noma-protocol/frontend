import React, { useState, useEffect } from 'react';
import { Input, Image, Flex, Container, Heading, HStack, Box, Button, Spinner, Text, SimpleGrid, GridItem, VStack, Grid, Link, Badge, FormatNumber } from "@chakra-ui/react";
import { ethers } from 'ethers';
import { isMobile } from "react-device-detect";
import { useAccount, useContractRead } from "wagmi";
import { useSafeContractWrite } from "../hooks/useSafeContractWrite";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';
import { Toaster, toaster } from "../components/ui/toaster";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams

import wmonLogo from '../assets/images/monad.png';
import nomaLogo from '../assets/images/noma.png';
import monadLogo from '../assets/images/monad.png';

import walletIcon from '../assets/images/walletIcon.svg';
import placeholderLogo from '../assets/images/question.svg';
import placeholderLogoDark from '../assets/images/question_white.svg';
import WalletSidebar from '../components/WalletSidebar';
// import WalletNotConnected from '../components/WalletNotConnected';

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

const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

const StakingContractArtifact = await import(`../assets/Staking.json`);
const StakingContractAbi = StakingContractArtifact.abi;

const GonsTokenArtifact = await import(`../assets/GonsToken.json`);
const GonsTokenAbi = GonsTokenArtifact.abi;

// NomaFactory contract address
const oikosFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
const modelHelperAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "ModelHelper");

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
    const [stakeHistory, setStakeHistory] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [ethBalance, setEthBalance] = useState("0");
    const [wrapAmount, setWrapAmount] = useState("0");

    const [token0, setToken0] = useState("");
    const [token1, setToken1] = useState("");

    const [vaultDescription, setVaultDescription] = useState({});

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

    // Convert BigNumber to string if necessary
    const lastOpTimestamp = lastOperationTimestamp ? lastOperationTimestamp.toString() : "0";

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

    // if (token1Info?.tokenSymbol == "WMON") {
    //     setToken1Info({
    //         tokenName: "Wrapped MON",
    //         tokenSymbol: "WMON",
    //         tokenDecimals: 18,
    //         balance: token1Info?.balance || "0",
    //     });
    // } 

    useEffect(() => {
        const fetchVaultDescription = async () => {
            try {
                const nomaFactoryContract = new ethers.Contract(
                    oikosFactoryAddress,
                    NomaFactoryAbi,
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
                console.error("Error fetching MON balance:", error);
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

    // Load history from localStorage and set up event listeners
    useEffect(() => {
        if (!vaultAddress || !vaultDescription?.stakingContract) return;

        // Load history from localStorage
        const savedHistory = localStorage.getItem(`stakeHistory_${vaultAddress}`);
        if (savedHistory) {
            try {
                setStakeHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse stake history:", e);
            }
        }

        // Set up event listeners for Stake and Unstake events
        const stakingContract = new ethers.Contract(
            vaultDescription.stakingContract,
            StakingContractAbi,
            localProvider
        );

        const handleStakeEvent = (user, amount, event) => {
            if (user.toLowerCase() === address?.toLowerCase()) {
                const txHash = event.transactionHash;
                
                setStakeHistory(prev => {
                    // Check if this transaction already exists
                    if (prev.some(item => item.txHash === txHash)) {
                        return prev;
                    }
                    
                    const newHistoryItem = {
                        id: Date.now(),
                        type: 'stake',
                        amount: formatEther(amount),
                        token: token0Info?.tokenSymbol || 'OKS',
                        timestamp: new Date().toISOString(),
                        txHash: txHash
                    };
                    
                    const updated = [newHistoryItem, ...prev];
                    localStorage.setItem(`stakeHistory_${vaultAddress}`, JSON.stringify(updated));
                    return updated;
                });
            }
        };

        const handleUnstakeEvent = (user, amount, event) => {
            if (user.toLowerCase() === address?.toLowerCase()) {
                const txHash = event.transactionHash;
                
                setStakeHistory(prev => {
                    // Check if this transaction already exists
                    if (prev.some(item => item.txHash === txHash)) {
                        return prev;
                    }
                    
                    // For unstake, amount includes principal + rewards
                    // Try to find the original stake amount to calculate rewards
                    const totalAmount = parseFloat(formatEther(amount));
                    let originalStake = 0;
                    let rewards = 0;
                    
                    // Look for stake transactions to estimate the original amount
                    const stakeTransactions = prev.filter(item => item.type === 'stake');
                    if (stakeTransactions.length > 0) {
                        // Sum all stake amounts (simple approach)
                        originalStake = stakeTransactions.reduce((sum, item) => sum + parseFloat(item.amount), 0);
                        rewards = totalAmount - originalStake;
                    }
                    
                    const newHistoryItem = {
                        id: Date.now(),
                        type: 'unstake',
                        amount: formatEther(amount),
                        originalAmount: originalStake.toFixed(4),
                        rewards: rewards > 0 ? rewards.toFixed(4) : "0",
                        token: token0Info?.tokenSymbol || 'OKS',
                        timestamp: new Date().toISOString(),
                        txHash: txHash
                    };
                    
                    const updated = [newHistoryItem, ...prev];
                    localStorage.setItem(`stakeHistory_${vaultAddress}`, JSON.stringify(updated));
                    return updated;
                });
            }
        };

        // Listen to Staked and Unstaked events
        stakingContract.on("Staked", handleStakeEvent);
        stakingContract.on("Unstaked", handleUnstakeEvent);

        return () => {
            stakingContract.off("Staked", handleStakeEvent);
            stakingContract.off("Unstaked", handleUnstakeEvent);
        };
    }, [vaultAddress, vaultDescription?.stakingContract, address, token0Info?.tokenSymbol]);

    const {
        write: approve
    } = useSafeContractWrite({
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
    } = useSafeContractWrite({
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
    } = useSafeContractWrite({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "unstake",
        args: [],
        onSuccess(data) {
            setIsUnstaking(false);
            setTimeout(() => {
                window.location.reload();
            }, 4000);
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
    } = useSafeContractWrite({
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

        console.log(`Staking stake amount ${stakeAmount}`)
    }

    const handleUnstake = async () => {
        setIsUnstaking(true);
        approveSnoma();
    }


    // console.log(`sNoma Balance: ${sNomaBalance} stakedBalance: ${stakedBalance}`);
    const rewards = formatEther(`${sNomaBalance || 0}`) - formatEther(`${stakedBalance || 0}`);

    const handleUseMax = () => {
        if (token0Info?.balance) {
            setStakeAmount(formatEther(token0Info.balance));
        }
    };

    return (
        <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh">
            <Toaster />
            {!isConnected ? (
                <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
                    <Text color="white" fontSize="xl">Please connect your wallet</Text>
                </Box>
            ) : isMobile && isLandscape ? (
                <RotateDeviceMessage />
            ) : isAddress(vaultAddress) ? (
                <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4} minH="calc(100vh - 80px)">
                    {/* Left side - Staking Information */}
                    <Box 
                        flex={isMobile ? "1" : "0 0 350px"} 
                        maxW={isMobile ? "100%" : "350px"} 
                        w={isMobile ? "100%" : "350px"}
                    >
                        <Box bg="#1a1a1a" borderRadius="lg" p={4}>
                            <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>Staking Information</Text>
                            <VStack align="stretch" gap={2}>
                                <HStack justify="space-between">
                                    <Box>
                                        <Text color="#888" fontSize="sm">Token</Text>
                                    </Box>
                                    <Box>
                                        <Text color="white" fontSize="sm" fontWeight="500">
                                            <Box as="span">{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}</Box>
                                        </Text>
                                    </Box>
                                </HStack>
                                <HStack justify="space-between">
                                    <Box>
                                        <Text color="#888" fontSize="sm">Total Staked</Text>
                                    </Box>
                                    <Box>
                                        <Text color="white" fontSize="sm" fontWeight="500">
                                            {commifyDecimals(formatEther(`${totalStaked || 0}`), 2)}
                                        </Text>
                                    </Box>
                                </HStack>
                                <HStack justify="space-between">
                                    <Box>
                                        <Text color="#888" fontSize="sm">APR (30 days)</Text>
                                    </Box>
                                    <Box>
                                        <Text color="white" fontSize="sm" fontWeight="500">{APR_30_DAYS.toFixed(2)}%</Text>
                                    </Box>
                                </HStack>
                            </VStack>
                        </Box>
                        
                        {/* Cooldown Information Box */}
                        {lastOpTimestamp !== "0" && (
                            <Box bg="#1a1a1a" borderRadius="lg" p={4} mt={4}>
                                <HStack justify="space-between">
                                    <Box>
                                        <Text fontSize="lg" fontWeight="bold" color="white">Cooldown Status</Text>                                        
                                    </Box>
                                    <Box>
                                        {getTimeLeft(lastOpTimestamp, 3) > 0 ? (
                                            <CountdownTimer
                                                startTsMs={Number(lastOpTimestamp) * 1000}
                                                intervalDays={3}
                                            />
                                        ) : (
                                            <Text fontSize="sm" color="#4ade80" fontWeight="500">Ready</Text>
                                        )}
                                    </Box>
                                </HStack>
                            </Box>
                        )}
                        
                        {/* Active Position Box */}
                        {stakedBalance > 0 && (
                            <Box bg="#1a1a1a" borderRadius="lg" p={4} mt={4}>
                                <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>Active Position</Text>
                                <VStack align="stretch" gap={2}>
                                    <HStack justify="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Staked</Text>
                                        </Box>
                                        <Box>
                                            <HStack spacing={1}>
                                                <Box>
                                                    <Text color="white" fontSize="sm" fontWeight="500">
                                                        {formatNumberPrecise(formatEther(`${stakedBalance || 0}`), 4)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm">
                                                        {token0Info?.tokenSymbol}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">sToken Balance</Text>
                                        </Box>
                                        <Box>
                                            <HStack spacing={1}>
                                                <Box>
                                                    <Text color="white" fontSize="sm" fontWeight="500">
                                                        {formatNumberPrecise(formatEther(`${sNomaBalance || 0}`), 4)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm">
                                                        s{token0Info?.tokenSymbol || "OKS"}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Rewards</Text>
                                        </Box>
                                        <Box>
                                            <HStack spacing={1}>
                                                <Box>
                                                    <Text color="#4ade80" fontSize="sm" fontWeight="500">
                                                        {commify(rewards, 4)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm">
                                                        {token0Info?.tokenSymbol}
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                    </HStack>
                                    <HStack justify="space-between" pt={2}>
                                        <Box>
                                            <Text color="#888" fontSize="sm">Cooldown</Text>
                                        </Box>
                                        <Box>
                                            {lastOpTimestamp !== "0" && getTimeLeft(lastOpTimestamp, 3) > 0 ? (
                                                <CountdownTimer
                                                    startTsMs={Number(lastOpTimestamp) * 1000}
                                                    intervalDays={3}
                                                />
                                            ) : (
                                                <Text fontSize="sm" color="#4ade80">Ready</Text>
                                            )}
                                        </Box>
                                    </HStack>
                                </VStack>
                            </Box>
                        )}
                    </Box>
                    
                    {/* Middle - Main Content */}
                    <Box flex={isMobile ? "1" : "2"} w={isMobile ? "100%" : "auto"}>
                        {/* New Stake Form */}
                        <Box bg="#1a1a1a" borderRadius="lg" p={6}>
                            <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
                                Stake {token0Info?.tokenSymbol || "Token"}
                            </Text>
                            
                            <VStack gap={4} align="stretch">
                                <Box>
                                    <Text fontSize="sm" color="#888" mb={2}>Amount to Stake</Text>
                                    <HStack>
                                        <Input
                                            placeholder="0.00"
                                            value={stakeAmount === '0' ? '' : stakeAmount}
                                            onChange={handleSetAmountToStake}
                                            bg="#2a2a2a"
                                            border="none"
                                            h="48px"
                                            _placeholder={{ color: "#666" }}
                                            _hover={{ bg: "#3a3a3a" }}
                                            _focus={{ bg: "#3a3a3a", outline: "none" }}
                                        />
                                        <Box w="40px">
                                            <Image src={nomaLogo} w="25px" h="25px" />
                                        </Box>
                                    </HStack>
                                    <Text
                                        fontSize="xs"
                                        color="#4ade80"
                                        cursor="pointer"
                                        mt={2}
                                        onClick={handleUseMax}
                                        _hover={{ textDecoration: "underline" }}
                                    >
                                        Use max ({formatNumberPrecise(formatEther(token0Info?.balance || "0"), 4)} {token0Info?.tokenSymbol})
                                    </Text>
                                </Box>
                                
                                <SimpleGrid columns={2} gap={4} pt={2}>
                                    <Box>
                                        <Text color="#888" fontSize="sm">You'll receive</Text>
                                        <Text color="white" fontSize="lg" fontWeight="500">
                                            {stakeAmount ? formatNumberPrecise(stakeAmount, 4) : "0.00"} s{token0Info?.tokenSymbol || "OKS"}
                                        </Text>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="sm">Current APR</Text>
                                        <Text color="#4ade80" fontSize="lg" fontWeight="500">
                                            {APR_30_DAYS.toFixed(2)}%
                                        </Text>
                                    </Box>
                                </SimpleGrid>
                                
                                <Button
                                    w="100%"
                                    h="48px"
                                    bg="#4ade80"
                                    color="black"
                                    fontWeight="600"
                                    onClick={handleStake}
                                    isLoading={isStaking}
                                    isDisabled={!stakeAmount || Number(stakeAmount) <= 0 || (stakedBalance > 0 && lastOpTimestamp !== "0" && getTimeLeft(lastOpTimestamp, 3) > 0)}
                                    _hover={{ bg: "#22c55e" }}
                                >
                                    {stakedBalance > 0 && lastOpTimestamp !== "0" && getTimeLeft(lastOpTimestamp, 3) > 0 ? 
                                        "Cooldown Active" : "Stake"}
                                </Button>
                                
                                {stakedBalance > 0 && (
                                    <Button
                                        w="100%"
                                        h="48px"
                                        variant="outline"
                                        borderColor="#4ade80"
                                        color="#4ade80"
                                        fontWeight="600"
                                        onClick={handleUnstake}
                                        isLoading={isUnstaking}
                                        isDisabled={stakedBalance <= 0 || (lastOpTimestamp !== "0" && getTimeLeft(lastOpTimestamp, 3) > 0)}
                                        _hover={{ 
                                            bg: "rgba(74, 222, 128, 0.1)",
                                            borderColor: "#22c55e" 
                                        }}
                                    >
                                        Unstake All
                                    </Button>
                                )}
                            </VStack>
                        </Box>

                        {/* Stake History Box */}
                        {stakeHistory.length > 0 && (
                            <Box bg="#1a1a1a" borderRadius="lg" p={4} mt={4}>
                                <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>History</Text>
                                <VStack align="stretch" spacing={0}>
                                    {stakeHistory
                                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                        .map((item, index) => (
                                    <SimpleGrid 
                                        key={`${item.txHash}-${index}`} 
                                        columns={{ base: 3, md: 4 }} 
                                        gap={{ base: "16px", md: "24px" }}
                                        columnGap={{ base: "40px", md: "30px" }}
                                        p="12px 16px"
                                        bg="transparent"
                                        position="relative"
                                        cursor="pointer"
                                        transition="all 0.2s"
                                        _hover={{ 
                                            bg: "rgba(255, 255, 255, 0.02)",
                                            borderRadius: "md",
                                            "&::before": {
                                                content: '""',
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                                borderRadius: "md",
                                                pointerEvents: "none"
                                            }
                                        }}
                                        _before={{
                                            content: '""',
                                            position: "absolute",
                                            bottom: 0,
                                            left: "16px",
                                            right: "16px",
                                            height: "1px",
                                            bg: index === stakeHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).length - 1 ? "transparent" : "rgba(255, 255, 255, 0.04)"
                                        }}
                                    >
                                        <GridItem colSpan={{ base: 1, md: 1 }} maxW="90px">
                                            <Badge
                                                colorPalette={item.type === 'stake' ? 'green' : 'red'}
                                                size="sm"
                                            >
                                                {item.type.toUpperCase()}
                                            </Badge>
                                        </GridItem>
                                        <GridItem colSpan={{ base: 2, md: 2 }} ml={-20}>
                                            <HStack>
                                                <Box w="20%">
                                                    <HStack>
                                                        <Box w="80%">
                                                    <Text color="white" fontWeight="bold">
                                                        {item.type === 'stake' ? 
                                                            `${formatNumberPrecise(commify(item.amount, 4))}` :
                                                            `${formatNumberPrecise(
                                                                commify(item.originalAmount || item.amount, 4)
                                                            )}`
                                                        }   
                                                    </Text>    
                                                        </Box>
                                                        {(item.type === 'stake' || item.type == 'unstake') && (
                                                            <Box>
                                                                {item.token}
                                                            </Box>
                                                        )}
                                                    </HStack>
                                                 
                                                </Box>
                                                <Box >
                                                    <Text color="#666" fontSize="xs">
                                                        {item.type === 'stake' ? 'Staked' : 'Unstaked (total: ' + commify(item.amount, 4) + ')'}
                                                    </Text>                                                        
                                                </Box>
                                                <Box>
                                                    {item.type === 'unstake' && item.rewards && parseFloat(item.rewards) > 0 && (
                                                        <Text color="#4ade80" fontSize="xs">
                                                            +{item.rewards} rewards
                                                        </Text>
                                                    )}
                                                </Box>
                                            </HStack>

                                        </GridItem>
                                        <GridItem colSpan={{ base: 1, md: 1 }}>
                                            <HStack>
                                                <Box>
                                                    <Text 
                                                        color="#4ade80" 
                                                        fontSize="xs"
                                                        cursor="pointer"
                                                        _hover={{ textDecoration: "underline" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const explorerUrl = config.chain === "monad" 
                                                                ? `https://monadexplorer.com/tx/${item.txHash}`
                                                                : `https://etherscan.io/tx/${item.txHash}`;
                                                            window.open(explorerUrl, "_blank");
                                                        }}
                                                    >
                                                        {item.txHash.slice(0, 6)}...
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="xs" textAlign="right" minW="25px" ml={4}>
                                                        {Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000) < 60
                                                            ? `${Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 60000)}m`
                                                            : Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 3600000) < 24
                                                            ? `${Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 3600000)}h`
                                                            : `${Math.floor((Date.now() - new Date(item.timestamp).getTime()) / 86400000)}d`
                                                        }
                                                    </Text>
                                                </Box>
                                            </HStack>

                                        </GridItem>                                            
                                    </SimpleGrid>
                                    ))}
                                </VStack>
                                
                                {/* Pagination controls */}
                                {stakeHistory.length > ITEMS_PER_PAGE && (
                                    <HStack justify="center" mt={4}>
                                        <Button
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            isDisabled={currentPage === 1}
                                            bg="transparent"
                                            color="#888"
                                            _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
                                        >
                                            Previous
                                        </Button>
                                        <Text color="#666" fontSize="sm">
                                            Page {currentPage} of {Math.ceil(stakeHistory.length / ITEMS_PER_PAGE)}
                                        </Text>
                                        <Button
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(stakeHistory.length / ITEMS_PER_PAGE), prev + 1))}
                                            isDisabled={currentPage === Math.ceil(stakeHistory.length / ITEMS_PER_PAGE)}
                                            bg="transparent"
                                            color="#888"
                                            _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
                                        >
                                            Next
                                        </Button>
                                    </HStack>
                                )}
                            </Box>
                        )}
                    </Box>
                    
                    {/* Right side - Wallet Box */}
                    {!isMobile && (
                        <Box flex="0 0 300px" maxW="300px" w="300px">
                            <WalletSidebar 
                                ethBalance={ethBalance}
                                token0Info={token0Info}
                                token1Info={token1Info}
                                address={address}
                            />
                        </Box>
                    )}
                </Flex>
            ) : (
                <Box py={8} textAlign="center">
                    <Text color="#666">Invalid vault address</Text>
                </Box>
            )}

        </Container>
    )
}

export default Stake;