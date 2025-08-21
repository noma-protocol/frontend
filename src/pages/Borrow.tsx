import React, { useState, useEffect } from 'react';
import { Input, Image, Flex, Container, Heading, HStack, Box, Grid, GridItem, Button, Spinner, Text, createListCollection, SimpleGrid, NumberInput, VStack } from "@chakra-ui/react";
import { ethers } from 'ethers';
import { isMobile } from "react-device-detect";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';
import { Toaster, toaster } from "../components/ui/toaster";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams
import ethLogo from '../assets/images/weth.svg';
import bnbLogo from '../assets/images/bnb.png';
import monadLogo from '../assets/images/monad.png';
import LoanAddCollateral from '../components/LoanAddCollateral';
import LoanRepay from '../components/LoanRepay';
import placeholderLogo from '../assets/images/question.svg';
import placeholderLogoDark from '../assets/images/question_white.svg';

import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import { formatNumberPrecise, calculateLoanFees, commify, commifyDecimals, getDaysLeft, calculateExpiryDate, getContractAddress } from '../utils';
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

// import { ro } from '@faker-js/faker';
// import { size } from 'viem';
import config from '../config';

import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import addressesBsc   from "../assets/deployment.json";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

 

const { formatEther, parseEther, isAddress, MaxUint256 } = ethers.utils;
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

const LendingVaultArtifact = await import(`../assets/LendingVault.json`);
const LendingVaultAbi = LendingVaultArtifact.abi;

const ExtVaultArtifact = await import(`../assets/ExtVault.json`);
const ExtVaultAbi = ExtVaultArtifact.abi;

const ModelHelperArtifact = await import(`../assets/ModelHelper.json`);
const ModelHelperAbi = ModelHelperArtifact.abi;

// NomaFactory contract address
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
const modelHelperAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "ModelHelper");

const Borrow = () => {
    const { address, isConnected } = useAccount();
    const [searchParams] = useSearchParams();
    const screenOrientation = useScreenOrientation();
    const isLandscape = screenOrientation.includes("landscape");
    const vaultAddress = searchParams.get("v") || ""; // Fallback to empty string
    const [isLoading, setIsLoading] = useState(false);

    const [isApproving, setIsApproving] = useState(false);
    const [isBorrowing, setIsBorrowing] = useState(false);
    const [isRepaying, setIsRepaying] = useState(false);
    const [isRolling, setIsRolling] = useState(false);

    const [isTokenInfoLoading, setIsTokenInfoLoading] = useState(true);

    const [token0Info, setToken0Info] = useState({});
    const [token1Info, setToken1Info] = useState({});
    const [ethBalance, setEthBalance] = useState("0");
    const [token0, setToken0] = useState("");
    const [token1, setToken1] = useState("");
    const [duration, setDuration] = useState(`${86400 * 30}`);
    const [borrowAmount, setBorrowAmount] = useState("0");
    const [collateral, setCollateral] = useState("0");
    const [extraCollateral, setExtraCollateral] = useState("0");
    const [isAdding, setIsAdding] = useState(false);
    const [repayAmount, setRepayAmount] = useState("0");
    const [isComputing, setIsComputing] = useState(false);
    const [ltv, setLtv] = useState(0);
    let loanData ;

    // if (token1Info?.tokenSymbol == "WMON") {
    //     setToken1Info({
    //         tokenName: "Wrapped MON",
    //         tokenSymbol: "WMON",
    //         tokenDecimals: 18,
    //         balance: token1Info?.balance || "0",
    //     });
    // }

    const durationChoices = createListCollection({
        items: [
            { label: "30 days", value: Number((86400 * 30)).toString()} ,
            { label: "60 days", value: Number((86400 * 60)).toString()} ,
            { label: "90 days", value: Number((86400 * 90)).toString()},
            { label: "180 days", value: Number((86400 * 180)).toString()},
            { label: "1 year",  value: Number((86400 * 365)).toString()},
            ],
    });


  useEffect(() => {
    if (vaultAddress == "0x0000000000000000000000000000000000000000" || vaultAddress == "") {
      window.location.href = "https://noma.money"
    }

  }, [vaultAddress]);

  useEffect(() => {
    const interval  = setInterval(() => {
        const fetchEthBalance = async () => {
            const ethBalance = await localProvider.getBalance(address);
            setEthBalance(ethBalance);
        };

        fetchEthBalance();
    }, 3000);

    return () => clearInterval(interval);
    }, [address]);


    const {
        data: activeLoan,
        refetch: fetchActiveLoan
    } = useContractRead({
        address: vaultAddress,
        abi: LendingVaultAbi,
        functionName: "getActiveLoan",
        args: [address]
    });
    
    if (typeof activeLoan !== "undefined") {
        // console.log({activeLoan});
        loanData = {
            borrowAmount: activeLoan[0] || 0,
            collateralAmount: activeLoan[1] || 0,
            expires: activeLoan[3] || 0,
        }
    
        // console.log({loanData});
    }

    const {
        data: IMV,
        refetch: fetchIMV
    } = useContractRead({
        address: modelHelperAddress,
        abi: ModelHelperAbi,
        functionName: "getIntrinsicMinimumValue",
        args: [vaultAddress]
    });

    // console.log({IMV});
    
    // Wrap the ltv calculation in a useEffect
    useEffect(() => {
        if (IMV && loanData?.collateralAmount && loanData?.borrowAmount) {
            const calculatedLTV = (formatEther(`${loanData.collateralAmount}`) * formatEther(`${IMV}`)) / formatEther(`${loanData.borrowAmount}`);
            setLtv(calculatedLTV);
        }
    }, [IMV, loanData]);

    // const {
    //     data: loanFees,
    //     refetch: fetchLoanFees
    // } = useContractRead({
    //     address: vaultAddress,
    //     abi: LendingVaultAbi,
    //     functionName: "calculateLoanFees",
    //     args: [parseEther(`${borrowAmount}`), `${duration}`],
    //     watch: true,
    // });

    const loanFees = calculateLoanFees(`${borrowAmount}`, `${duration}`);

    const {
        write: approveBorrow
    } = useContractWrite({
        address: token0,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultAddress,
            parseEther(`${collateral}`).add(parseEther(`${0.000001}`))
        ],
        onSuccess(data) {
            borrow();
        },
        onError(error) {
            console.error(`borrow approval failed: ${error.message}`);
            setIsBorrowing(false);
            setIsLoading(false);

            const msg = Number(error.message.toString().indexOf("0xfb8f41b2")) > -1 ? "Insufficient allowance" : 
            Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: approveAddCollateral
    } = useContractWrite({
        address: token0,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultAddress,
            parseEther(`${extraCollateral}`).add(parseEther(`${0.000001}`))
        ],
        onSuccess(data) {
            addCollateral();
        },
        onError(error) {
            console.error(`add collateral approval failed: ${error.message}`);
            setIsLoading(false);
            setIsAdding(false);

            const msg = Number(error.message.toString().indexOf("0xfb8f41b2")) > -1 ? "Insufficient allowance" : 
            Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: approveToken1
    } = useContractWrite({
        address: token1,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultAddress,
            repayAmount == 0 ? loanData?.borrowAmount : parseEther(`${repayAmount}`) 
        ],
        onSuccess(data) {
            payback();
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsRepaying(false);
            setIsLoading(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: borrow
    } = useContractWrite({
        address: vaultAddress,
        abi: ExtVaultAbi,
        functionName: "borrow",
        args: [
            // address,
            parseEther(`${borrowAmount}`),
            `${duration}`
        ],
        onSuccess(data) {
            console.log(data)
            setIsBorrowing(false);
            setIsLoading(false);
            setTimeout(() => {
                window.location.reload();
              }, 4000); // 4000ms = 4 seconds
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsBorrowing(false);
            setIsLoading(false);

            const msg = Number(error.message.toString().indexOf("0xfb8f41b2")) > -1 ? "Insufficient allowance" :
                        Number(error.message.toString().indexOf("0x76166401")) > -1 ? "Invalid duration" :
                        Number(error.message.toString().indexOf("0x39218f3b")) > -1 ? "Not permitted before first shift" :
                        Number(error.message.toString().indexOf("_deployPosition(2)")) > -1 ? "Trading did not start yet" :
                        Number(error.message.toString().indexOf("NoLiquidity")) > -1 ? "Not enough liquidity" :
                        Number(error.message.toString().indexOf("0x31eed5fe")) > -1 ? "Not enough floor liquidity" :
                        Number(error.message.toString().indexOf("0xf16664fd")) > -1 ? "Only one loan per address" :
                        Number(error.message.toString().indexOf("0x37218288")) > -1 ? "Please try again later" :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });

        }
    });

    const {
        write: payback
    } = useContractWrite({
        address: vaultAddress,
        abi: ExtVaultAbi,
        functionName: "payback",
        args: [
            parseEther(`${repayAmount}`),
        ],
        gas: 1300_000n, 
        onSuccess(data) {
            setIsRepaying(false);
            setIsLoading(false);
            setTimeout(() => {
                window.location.reload();
              }, 4000); // 4000ms = 4 seconds

        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsRepaying(false);
            const msg =  Number(error.message.toString().indexOf("0722f1dc")) > -1 ? "No active loan" :
                        Number(error.message.toString().indexOf("0x3d56fe34")) > -1 ? "Invalid repay amount" :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: roll
    } = useContractWrite({
        address: vaultAddress,
        abi: ExtVaultAbi,
        functionName: "roll",
        args: [
            `${duration}`
        ],
        onSuccess(data) {
            setIsRolling(false);
            setIsLoading(false);
            setTimeout(() => {
                  window.location.reload();
            }, 4000); // 4000ms = 4 seconds
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsRolling(false);
            setIsLoading(false);

            const msg = Number(error.message.toString().indexOf("0x37218288")) > -1 ? "Shift required" :
                        Number(error.message.toString().indexOf("0x76166401")) > -1 ? "Invalid duration" :
                        Number(error.message.toString().indexOf("30a15b09")) > -1 ? "Can't roll loan" :
                        Number(error.message.toString().indexOf("0722f1dc")) > -1 ? "No active loan" :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: addCollateral
    } = useContractWrite({
        address: vaultAddress,
        abi: ExtVaultAbi,
        functionName: "addCollateral",
        args: [
            parseEther(`${extraCollateral}`),
        ],
        onSuccess(data) {
            setIsAdding(false);
            setIsLoading(false);
            setTimeout(() => {
                window.location.reload();
              }, 4000); // 4000ms = 4 seconds
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsAdding(false);
            setIsLoading(false);

            const msg = //Number(error.message.toString().indexOf("0x76166401")) > -1 ? "Invalid duration" :
                        // Number(error.message.toString().indexOf("_deployPosition(2)")) > -1 ? "Trading did not start yet" :
                        // Number(error.message.toString().indexOf("NoLiquidity")) > -1 ? "Not enough liquidity" :
                        // Number(error.message.toString().indexOf("0x31eed5fe")) > -1 ? "Not enough floor liquidity" :
                        // Number(error.message.toString().indexOf("0xf16664fd")) > -1 ? "Only one loan per address" :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });

        }
    });

    useEffect(() => {
        if (!vaultAddress) return;

        const fetchTokenInfo = async (tokenAddress) => {
            if (!tokenAddress) return null;

            try {
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ERC20Abi,
                    localProvider
                );

                const tokenName = await tokenContract.name();
                const tokenSymbol = await tokenContract.symbol();
                const tokenDecimals = await tokenContract.decimals();

                const balance = await tokenContract.balanceOf(address);

                return { tokenName, tokenSymbol, tokenDecimals, balance };
            } catch (error) {
                console.error(`Error fetching token info for ${tokenAddress}:`, error);
                return null;
            }
        };


        const nomaFactoryContract = new ethers.Contract(
            nomaFactoryAddress,
            OikosFactoryAbi,
            localProvider
        );

        const interval = setInterval(() => {

            const fetchVaultInfo = async () => {
                try {
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
                    };

                    const token0Data = await fetchTokenInfo(plainVaultDescription.token0);
                    if (token0Data) {
                        setToken0Info(token0Data);
                        setToken0(plainVaultDescription.token0);
                    }

                    const token1Data = await fetchTokenInfo(plainVaultDescription.token1);
                    if (token1Data) {
                        setToken1Info(token1Data);
                        setToken1(plainVaultDescription.token1);
                    }

                    // Clear loading state once data is fetched
                    setIsTokenInfoLoading(false);
                } catch (error) {
                    console.error("Error fetching vault info:", error);
                    setIsTokenInfoLoading(false);
                }
            }

            fetchVaultInfo();
            }
        , 3000);

        return () => clearInterval(interval);

    }, [vaultAddress]);

    const handleSetAmountToBorrow = (e) => {
         setIsComputing(true);
        let value = e.target.value.trim();
        if (Number(value) > 100000000 || (Number(value) > 0 && Number(value) < 0.000001)) {
            toaster.create({
                title: "Error",
                description: "Invalid borrow amount.",
            });
            setBorrowAmount(0);
            return;
        }
        if (!/^\d*\.?\d*$/.test(value)) {
            setBorrowAmount(0);
            return;
        }
        if (value.startsWith('.')) value = '0' + value;
        value = value.replace(/^0+(\d)/, '$1');
        setBorrowAmount(value || '0');
    };

    const handleBorrow = () => {
        if (Number(borrowAmount) <= 0) {
            toaster.create({
                title: "Error",
                description: "Please enter a valid borrow amount",
            });
            return;
        }
        setIsBorrowing(true);
        setIsLoading(true);
        approveBorrow();
    }

    const handleSetDuration = (e) => {
        console.log("Duration: ", e.target.value);
        setDuration(e.target.value);
    }

    const handleClickRoll = () => {
        setIsRolling(true);
        setIsLoading(true);
        roll();
    }

    // fetchActiveLoan();
    
    const rollLoanAmount = (formatEther(`${loanData?.collateralAmount || 0}`) * formatEther(`${IMV || 0}`)) - formatEther(`${loanData?.borrowAmount || 0}`);
    // console.log({rollLoanAmount});

    useEffect(() => {
        const interval = setInterval(() => {
        const computeCollateral = async () => {
           
            const collateral = borrowAmount / formatEther(`${IMV || 0}`) || 0;
            // console.log({collateral});
            setCollateral(collateral);
            setIsComputing(false);
        }
        computeCollateral();
        }, 1000);
        return () => clearInterval(interval);
    }, [borrowAmount, IMV]);

    const handleClickAdd = () => {
        if (Number(extraCollateral) <= 0) {
            toaster.create({
                title: "Error",
                description: "Please enter a valid collateral amount",
            });
            return;
        }

        setIsAdding(true);
        setIsLoading(true);
        approveAddCollateral();
    }

    const handleClickRepayAmount = () => {
        // if (Number(repayAmount) <= 0) {
        //     toaster.create({
        //         title: "Error",
        //         description: "Please enter a valid repay amount",
        //     });
        //     return;
        // }
        setIsRepaying(true);
        setIsLoading(true);
        approveToken1();
    }

    const handleSetExtraCollateral = (value) => {
        setExtraCollateral(value);
        setCollateral(value);
        // setIsAdding(true);
    };


    const handleUseMax = () => {
        if (token0Info?.balance) {
            const oneEth = ethers.BigNumber.from("1000000000000000000");
            let maxBorrowAmount = (token0Info?.balance).mul(IMV).div(oneEth);
            console.log(`${token0Info?.balance} * ${IMV} = ${maxBorrowAmount}`);
            setBorrowAmount(formatEther(`${maxBorrowAmount}`));
        }
    };

    const displayedCollateral = Number(formatEther(`${loanData?.collateralAmount || 0}`)) > 1000000 ?
        formatNumberPrecise(formatEther(`${loanData?.collateralAmount || 0}`), 5) :
        formatNumberPrecise(formatEther(`${loanData?.collateralAmount || 0}`), 5) ;
    
    return (
        <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh">
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
            ) : isAddress(vaultAddress) ? (
                <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4} minH="calc(100vh - 80px)">
                        {/* Left side - Loan Information */}
                        <Box 
                            flex={isMobile ? "1" : "0 0 350px"} 
                            maxW={isMobile ? "100%" : "350px"} 
                            w={isMobile ? "100%" : "350px"}
                        >
                            <Box bg="#1a1a1a" borderRadius="lg" p={4}>
                                <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>Vault Information</Text>
                                <VStack align="stretch" gap={2}>
                                    <HStack justify="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Token Pair</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm" fontWeight="500">
                                                {isTokenInfoLoading ? <Spinner size="sm" /> : `${token0Info?.tokenSymbol}/${token1Info?.tokenSymbol}`}
                                            </Text>
                                        </Box>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">IMV</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm" fontWeight="500">
                                                {commifyDecimals(formatEther(`${IMV || 0}`) || 0, 6)}
                                            </Text>
                                        </Box>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Loan Fee Rate</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm" fontWeight="500">0.027% per day</Text>
                                        </Box>
                                    </HStack>
                                </VStack>
                            </Box>
                            
                            {/* Active Loan Box */}
                        </Box>
                        
                        {/* Middle - Main Content */}
                        <Box flex={isMobile ? "1" : "2"} w={isMobile ? "100%" : "auto"}>
                            {/* New Loan Form */}
                            <Box bg="#1a1a1a" borderRadius="lg" p={6}>
                                <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
                                    New Loan
                                </Text>
                                
                                {loanData?.borrowAmount > 0 ? (
                                    <Box py={8} textAlign="center">
                                        <Text color="#666" fontSize="lg" mb={2}>You already have an active loan</Text>
                                        <Text color="#888" fontSize="sm">Manage your existing loan below or repay it to create a new one.</Text>
                                    </Box>
                                ) : (
                                    <VStack gap={4} align="stretch">
                                        <SimpleGrid columns={2} gap={4}>
                                            <Box>
                                                <Text fontSize="sm" color="#888" mb={2}>Borrow Amount</Text>
                                                <HStack>
                                                    <Input
                                                        placeholder="0.00"
                                                        value={borrowAmount === '0' ? '' : borrowAmount}
                                                        onChange={handleSetAmountToBorrow}
                                                        bg="#2a2a2a"
                                                        border="none"
                                                        h="40px"
                                                        _placeholder={{ color: "#666" }}
                                                    />
                                                    <Box w="40px">
                                                        <Image src={monadLogo} w="25px" h="25px" />
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
                                                    Use max
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="sm" color="#888" mb={2}>Duration</Text>
                                                <Box 
                                                    border="1px solid #3a3a3a"
                                                    borderRadius="md"
                                                    transition="all 0.2s"
                                                    _hover={{ borderColor: "#4a4a4a" }}
                                                >
                                                    <SelectRoot
                                                        collection={durationChoices}
                                                        size="sm"
                                                        width="100%"
                                                        onChange={handleSetDuration}
                                                        value={duration}
                                                    >
                                                        <SelectTrigger
                                                            bg="#2a2a2a"
                                                            border="none"
                                                            h="36px"
                                                            color="white"
                                                            borderRadius="md"
                                                            _hover={{ bg: "#3a3a3a" }}
                                                            _focus={{ outline: "none" }}
                                                            css={{
                                                                "&:focus": { outline: "none" },
                                                                "&:focus-visible": { outline: "none" }
                                                            }}
                                                        >
                                                            <SelectValueText 
                                                                placeholder="Select duration" 
                                                                color="white"
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent
                                                        bg="#1a1a1a"
                                                        border="1px solid #2a2a2a"
                                                        borderRadius="md"
                                                        boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
                                                        zIndex={1000}
                                                        _open={{
                                                            animation: "fadeIn 0.2s ease-out"
                                                        }}
                                                    >
                                                        {durationChoices.items.map((choice) => (
                                                            <SelectItem
                                                                item={choice}
                                                                key={choice.value}
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
                                                                _focus={{
                                                                    bg: "#2a2a2a",
                                                                    outline: "none"
                                                                }}
                                                            >
                                                                {choice.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </SelectRoot>
                                            </Box>
                                            </Box>
                                        </SimpleGrid>
                                        
                                        <Box bg="#2a2a2a" p={4} borderRadius="md">
                                            <SimpleGrid columns={2} gap={4}>
                                                <Box>
                                                    <Text fontSize="xs" color="#888" mb={1}>Collateral Required</Text>
                                                    {isComputing ? (
                                                        <Spinner size="sm" color="#4ade80" />
                                                    ) : (
                                                        <HStack>
                                                            <Box>
                                                                <Text fontSize="lg" color="white" fontWeight="bold">
                                                                    {formatNumberPrecise(collateral || 0, 4)}
                                                                </Text>
                                                            </Box>
                                                            <Box>
                                                                <Text fontSize="sm" color="#888">{token0Info.tokenSymbol}</Text>
                                                            </Box>
                                                        </HStack>
                                                    )}
                                                </Box>
                                                <Box>
                                                    <Text fontSize="xs" color="#888" mb={1}>Loan Fees</Text>
                                                    <HStack>
                                                        <Box>
                                                            <Text fontSize="lg" color="white" fontWeight="bold">
                                                                {commifyDecimals(`${loanFees || 0}`, 4)}
                                                            </Text>
                                                        </Box>
                                                        <Box>
                                                            <Text fontSize="sm" color="#888">{token1Info.tokenSymbol}</Text>
                                                        </Box>
                                                    </HStack>
                                                </Box>
                                            </SimpleGrid>
                                        </Box>
                                        
                                        <Button
                                            w="100%"
                                            size="lg"
                                            variant="solid"
                                            onClick={() => handleBorrow()}
                                            disabled={
                                                isTokenInfoLoading ||
                                                loanData?.borrowAmount > 0 ||
                                                borrowAmount == 0 ||
                                                parseFloat(formatEther(`${token0Info.balance}`)) < parseFloat(`${collateral}`)
                                            }
                                            bg="#4ade80"
                                            color="black"
                                            _hover={{
                                                bg: "#22c55e",
                                                transform: "translateY(-1px)",
                                                boxShadow: "0 4px 12px rgba(74, 222, 128, 0.25)"
                                            }}
                                            _active={{
                                                transform: "translateY(0px)"
                                            }}
                                            _disabled={{
                                                bg: "#2a2a2a",
                                                color: "#666",
                                                cursor: "not-allowed"
                                            }}
                                        >
                                            {isBorrowing ? <Spinner size="sm" /> : "Borrow"}
                                        </Button>
                                    </VStack>
                                )}
                            </Box>
                            
                            {/* Active Loan Box - Below New Loan */}
                            {loanData?.borrowAmount > 0 && (
                                <Box bg="#1a1a1a" borderRadius="lg" p={6} mt={4}>
                                    <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
                                        Active Loan Details
                                    </Text>
                                    
                                    <SimpleGrid columns={2} gap={4} mb={4}>
                                        <Box>
                                            <Text color="#888" fontSize="sm" mb={2}>Collateral Amount</Text>
                                            <HStack>
                                                <Box>
                                                    <Text color="white" fontSize="2xl" fontWeight="bold">
                                                        {displayedCollateral}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="lg">{token0Info.tokenSymbol}</Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" mb={2}>Borrowed Amount</Text>
                                            <HStack>
                                                <Box>
                                                    <Text color="white" fontSize="2xl" fontWeight="bold">
                                                        {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="lg">{token1Info.tokenSymbol}</Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" mb={2}>Current LTV</Text>
                                            <Text color={ltv > 80 ? "#ef4444" : ltv > 60 ? "#fbbf24" : "#4ade80"} fontSize="2xl" fontWeight="bold">
                                                {commifyDecimals(ltv, 2)}%
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" mb={2}>Expires In</Text>
                                            <Text color="white" fontSize="2xl" fontWeight="bold">
                                                {getDaysLeft(`${loanData?.expires}`)} days
                                            </Text>
                                        </Box>
                                    </SimpleGrid>
                                    
                                    <Box borderTop="1px solid #2a2a2a" pt={4}>
                                        <Text color="#888" fontSize="sm" mb={3}>Quick Actions</Text>
                                        <HStack gap={2}>
                                            <Box>
                                                <LoanAddCollateral
                                                size="sm"
                                                token0Symbol={token0Info.tokenSymbol}
                                                handleSetCollateral={setCollateral}
                                                handleSetExtraCollateral={handleSetExtraCollateral}
                                                extraCollateral={extraCollateral}
                                                isMobile={isMobile}
                                                ltv={ltv}
                                                handleClickAdd={handleClickAdd}
                                                isAdding={isAdding}
                                                setIsAdding={setIsAdding}
                                                isLoading={isLoading}
                                                setIsLoading={setIsLoading}
                                                isTokenInfoLoading={isTokenInfoLoading}
                                                token0Balance={token0Info?.balance}
                                                />
                                            </Box>
                                            <Box>
                                                <LoanRepay
                                                size="sm"
                                                fullCollateral={loanData?.collateralAmount}
                                                loanAmount={loanData?.borrowAmount}
                                                token0Symbol={token0Info.tokenSymbol}
                                                repayAmount={repayAmount}
                                                setRepayAmount={setRepayAmount}
                                                handleClickRepayAmount={handleClickRepayAmount}
                                                isRepaying={isRepaying}
                                                setIsRepaying={setIsRepaying}
                                                isMobile={isMobile}
                                                imv={IMV}
                                                ltv={ltv}
                                                isLoading={isTokenInfoLoading}
                                                />
                                            </Box>
                                            <Box>
                                                <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isRolling || isTokenInfoLoading || ltv <= 1}
                                                border="1px solid #4ade80"
                                                color="#4ade80"
                                                _hover={{ bg: "rgba(74, 222, 128, 0.1)" }}
                                                onClick={() => setIsRolling(true)}
                                            >
                                                {isRolling ? <Spinner size="sm" /> : "Roll"}
                                                </Button>
                                            </Box>
                                        </HStack>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                        
                        {/* Right side - Wallet Box */}
                        {!isMobile && (
                            <Box w="300px">
                                <Box bg="#1a1a1a" borderRadius="lg" p={4} w="100%">
                                    <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
                                        Wallet
                                    </Text>
                                    
                                    <VStack align="stretch" gap={3}>
                                        {/* MON Balance */}
                                        <Box>
                                            <Flex justifyContent="space-between" alignItems="center">
                                                <HStack>
                                                    <Box w="20px" h="20px">
                                                        <Image
                                                            src={monadLogo}
                                                            alt="MON"
                                                            w="20px"
                                                            h="20px"
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Text color="#888" fontSize="sm">MON</Text>
                                                    </Box>
                                                </HStack>
                                                <Box>
                                                    <Text color="white" fontWeight="bold">
                                                        {address ? parseFloat(formatEther(ethBalance)).toFixed(4) : "0.00"}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                            <Text color="#666" fontSize="xs" textAlign="right">
                                                ≈ ${address ? (parseFloat(formatEther(ethBalance)) * 50).toFixed(2) : "0.00"}
                                            </Text>
                                        </Box>
                                        
                                        {/* Token0 Balance */}
                                        {token0Info?.tokenSymbol && (
                                            <Box>
                                                <Flex justifyContent="space-between" alignItems="center">
                                                    <HStack>
                                                        <Box w="20px" h="20px">
                                                            <Image
                                                                src={placeholderLogoDark}
                                                                alt={token0Info.tokenSymbol}
                                                                w="20px"
                                                                h="20px"
                                                            />
                                                        </Box>
                                                        <Box>
                                                            <Text color="#888" fontSize="sm">{token0Info.tokenSymbol}</Text>
                                                        </Box>
                                                    </HStack>
                                                    <Box>
                                                        <Text color="white" fontWeight="bold">
                                                            {token0Info?.balance ? parseFloat(formatEther(token0Info.balance)).toFixed(4) : "0.00"}
                                                        </Text>
                                                    </Box>
                                                </Flex>
                                                <Text color="#666" fontSize="xs" textAlign="right">
                                                    ≈ $0.00
                                                </Text>
                                            </Box>
                                        )}
                                        
                                        {/* Token1 Balance */}
                                        {token1Info?.tokenSymbol && (
                                            <Box>
                                                <Flex justifyContent="space-between" alignItems="center">
                                                    <HStack>
                                                        <Box w="20px" h="20px">
                                                            <Image
                                                                src={token1Info.tokenSymbol === "WMON" ? monadLogo : placeholderLogoDark}
                                                                alt={token1Info.tokenSymbol}
                                                                w="20px"
                                                                h="20px"
                                                            />
                                                        </Box>
                                                        <Box>
                                                            <Text color="#888" fontSize="sm">{token1Info.tokenSymbol}</Text>
                                                        </Box>
                                                    </HStack>
                                                    <Box>
                                                        <Text color="white" fontWeight="bold">
                                                            {token1Info?.balance ? parseFloat(formatEther(token1Info.balance)).toFixed(4) : "0.00"}
                                                        </Text>
                                                    </Box>
                                                </Flex>
                                                <Text color="#666" fontSize="xs" textAlign="right">
                                                    ≈ ${token1Info?.tokenSymbol === "WMON" ? (parseFloat(formatEther(token1Info.balance || "0")) * 50).toFixed(2) : "0.00"}
                                                </Text>
                                            </Box>
                                        )}
                                        
                                        {/* Total Portfolio Value */}
                                        <Box borderTop="1px solid #2a2a2a" pt={3} mt={2}>
                                            <Flex justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Text color="#888" fontSize="sm">Total Value</Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#4ade80" fontWeight="bold" fontSize="lg">
                                                        ${address ? (
                                                            parseFloat(formatEther(ethBalance)) * 50 + 
                                                            (token1Info?.tokenSymbol === "WMON" ? parseFloat(formatEther(token1Info.balance || "0")) * 50 : 0)
                                                        ).toFixed(2) : "0.00"}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Box>
                                    </VStack>
                                </Box>
                            </Box>
                        )}
                    </Flex>
            ) : (
                <Box py={8} textAlign="center">
                    <Text color="#666">Invalid vault address</Text>
                </Box>
            )}
        </Container>
    );
};

export default Borrow;
