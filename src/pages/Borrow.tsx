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
import bnbLogo from '../assets/images/bnb.png';
import LoanAddCollateral from '../components/LoanAddCollateral';
import LoanRepay from '../components/LoanRepay';

import placeholderLogo from '../assets/images/question.svg';
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
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "Factory");
const modelHelperAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "56", "ModelHelper");

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
    const [isWrapping, setIsWrapping] = useState(false);
    const [isUnwrapping, setIsUnwrapping] = useState(false);

    const [token0Info, setToken0Info] = useState({});
    const [token1Info, setToken1Info] = useState({});
    const [ethBalance, setEthBalance] = useState("0");
    const [wrapAmount, setWrapAmount] = useState("0");
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

    if (token1Info?.tokenSymbol == "WMON") {
        setToken1Info({
            tokenName: "Wrapped BNB",
            tokenSymbol: "WBNB",
            tokenDecimals: 18,
            balance: token1Info?.balance || "0",
        });
    }

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
      window.location.href = "https://oikos.cash"
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
        write : deposit,
      } = useContractWrite({
          address: token1,
          abi: IWETHAbi,
          functionName: "deposit",
          value: parseEther(`${wrapAmount}`),
          onSuccess(data) {
              setIsWrapping(false);
              setIsLoading(false);
            },
            onError(error) {
                setIsWrapping(false);
                setIsLoading(false);
                const msg = Number(error.message.toString().indexOf("exceeds")) > -1 ? "Not enough balance" :
                            error.message.indexOf("PresaleEnded") > -1 ? "The presale has ended" :
                            error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
                toaster.create({
                    title: "Error",
                    description: msg,
                });
                setWrapAmount(0);
            }
    });
    
    const {
        write: withdraw,
    } = useContractWrite({
        address: token1,
        abi: IWETHAbi,
        functionName: "withdraw",
        args: [parseEther(`${wrapAmount}`)],
        onSuccess(data) {
            setIsUnwrapping(false);
            setIsLoading(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsUnwrapping(false);
            setIsLoading(false);
            const msg = Number(error.message.toString().indexOf("burn amount exceeds balance")) > -1 ? "Not enough balance" :
                        error.message.indexOf("PresaleEnded") > -1 ? "The presale has ended" :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
            setWrapAmount(0);
        }
    });

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
        write: approve
    } = useContractWrite({
        address: token0,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultAddress,
            isAdding ?  parseEther(`${extraCollateral + (extraCollateral/100)}`)  : parseEther(`${collateral + (collateral/100)}`)
        ],
        onSuccess(data) {
            if (isAdding) {
                addCollateral();
            } else {
                borrow();
            }
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsBorrowing(false);
            setIsLoading(false);
            setIsAdding(false);
            setIsRolling(false);
            setIsRepaying(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
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
        if (Number(value) > 100000000) {
            toaster.create({
                title: "Error",
                description: "Borrow amount exceeds maximum limit of 100,000,000",
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
        approve();
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

        console.log(`Adding extra: ${extraCollateral} collateral ${collateral}`);
        setIsAdding(true);
        setIsLoading(true);
        approve();
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

    const handleSetExtraCollateral = (e) => {

        setExtraCollateral(e);
        setCollateral(e);
        // setIsAdding(true);
    };

    const displayedCollateral = Number(formatEther(`${loanData?.collateralAmount || 0}`)) > 1000000 ?
        formatNumberPrecise(formatEther(`${loanData?.collateralAmount || 0}`), 5) :
        formatNumberPrecise(formatEther(`${loanData?.collateralAmount || 0}`), 5) ;
    
    return (
        <Container maxW="container.xl=" py={12} pl={"0%"} ml={"10%"}>
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
                  m={4}
                  border="1px solid #a67c00"
                  mt="100px"
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
                    Please connect your wallet to access the Oikos Borrowing features
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
                    mb={"15%"}
                    ml={isMobile ? 0 : "-2vw"}
                    // ml={isMobile ? "20px" : 0}
                    // border="1px solid red"
                >
                {isAddress(vaultAddress) ? (
                    isMobile ? (
                        <Flex direction="column">
                        <Box mt={10} ml={2}>
                        <BalanceCard 
                            ethBalance={ethBalance}
                            token0Balance={token0Info?.balance} 
                            token0Symbol={token0Info?.tokenSymbol} 
                            token1Symbol={token1Info.tokenSymbol} 
                            token1Balance={token1Info?.balance}
                            deposit={deposit}
                            withdraw={withdraw}
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
                            page="borrow"
                            />
                        </Box>
                        <Box p={2} mt={5} w={isMobile ? "90%" : "98%"} ml={-5} ml={-5} border="1px solid ivory" borderRadius={10} backgroundColor={"#222831"} >
                            <Text fontSize={"12px"}  color="#a67c00" ml={2}>Active Loan</Text>        
                           <SimpleGrid columns={4} mt={-5} backgroundColor={"#222831"} w={isMobile ? "94%" : "352px"} ml={2} mr={2}>
                                <Box fontSize="xs" w='95px' px={2} color="white" backgroundColor={"#a67c00"}> Collateral </Box>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}> Borrowed </Box>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}> 
                                <HStack>
                                 <Box><Text fontSize="xs">LTV</Text></Box>
                                 <Box>
                                    <Tooltip content="Loan to Value Ratio" placement="top">
                                        <Image src={placeholderLogo} w={15} />
                                    </Tooltip>
                                 </Box>
                                </HStack>
                                </Box>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}>
                                Expires
                                </Box>
                                {loanData?.borrowAmount > 0 ? ( 
                                    <>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="gray.800"  borderRadius="5px 0 0 5px" h="25px" borderRight="none">
                                        <HStack>
                                            <Box  fontSize="xs" color="white">
                                            {displayedCollateral}
                                            </Box>
                                            <Box  fontSize="xx-small" ml={-1}>
                                            {isTokenInfoLoading ? <Spinner size="xs" /> : token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="gray.800"  borderRadius="0"  h="25px" borderLeft="none" borderRight="none">
                                        <HStack>
                                            <Box  fontSize="xs" color="white">
                                            {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                                            </Box>
                                            <Box  fontSize="xx-small" ml={-1}>
                                            {isTokenInfoLoading ? <Spinner size="xs" /> : token1Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="white"  borderRadius="0"  h="25px" borderLeft="none" borderRight="none" fontSize="xs"> {commifyDecimals(ltv, 2)}</Box>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="white" borderRadius="0 5px 5px 0" h="25px" borderLeft="none" fontSize="xs"> {getDaysLeft(`${loanData?.expires}`)} days</Box>
                                    <VStack w="100%">
                                        <Box ml={-8} mt={4}><Text fontSize="xs" color="#a67c00">Actions</Text></Box>
                                    <Box >                              
                                    <HStack alignItems="center" justifyContent="space-between" w="100%" pb={2} ml={isMobile ? "35%" : 0}>
                                    <Box>
                                        <LoanAddCollateral
                                            size="sm"
                                            token0Symbol={token0Info.tokenSymbol}
                                            handleSetCollateral={handleSetExtraCollateral}
                                            extraCollateral={extraCollateral}
                                            isMobile={isMobile}
                                            ltv={ltv}
                                            handleClickAdd={handleClickAdd}
                                            isAdding={isAdding}
                                            setIsAdding={setIsAdding}
                                            isLoading={isLoading}
                                            setIsLoading={setIsLoading}
                                            isTokenInfoLoading={isTokenInfoLoading}
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
                                        <DrawerRoot >
                                        <DrawerTrigger asChild>
                                        <Button
                                            ml={2}
                                            mt={2} 
                                            variant={"outline"}
                                            h={6}
                                            // onClick={() => setIsLoading(true)}
                                            disabled={isRolling || isTokenInfoLoading || ltv <= 1}
                                            w={"80px"}
                                            border="1px solid #f3f7c6"
                                            borderRadius={5}
                                            _hover={{ bg: "#a67c00aa", borderColor: "#a67c00", color: "white" }}
                                        >
                                        {isRolling ? <Spinner size="sm" /> : <Text fontSize={"xs"} color={"#f3f7c6"}>Roll</Text>}
                                        </Button>
                                        </DrawerTrigger>
                                        <DrawerBackdrop />
                                        <DrawerContent>
                                            <Box mt="80%" ml={5}>
                                            <DrawerHeader>
                                                <DrawerTitle>
                                                    <Text as="h3" color="#a67c00">Roll Loan</Text>
                                                </DrawerTitle>
                                                <DrawerCloseTrigger asChild mt="82%" mr={5} setIsRolling={setIsRolling}>
                                                    <Button variant="ghost" size="sm" onClick={() => setIsRolling(false)} mt={2} ml={-2}>×</Button>
                                                </DrawerCloseTrigger>
                                            </DrawerHeader>
                                            <DrawerBody>
                                                {/* <Input
                                                    placeholder="Amount to roll"
                                                    // onChange={(e) => setWrapAmount(e.target.value)}
                                                    w="80%"
                                                /> */}
                                            <Box border="1px solid #a67c00" borderRadius="md" p={3} w="90%" >                              

                                                <HStack>
                                                    <Box w="120px"><Text fontSize="sm" color="#f3f7c6">New Duration:</Text></Box>
                                                    <Box><Text fontSize="sm" color="white">{duration / 86400} days</Text></Box>
                                                </HStack>
                                                <HStack>
                                                    <Box  w="120px"><Text fontSize="sm" c color="#f3f7c6">Expires On:</Text></Box>
                                                    <Box><Text fontSize="sm" color="white">{calculateExpiryDate(getDaysLeft(`${loanData?.expires}`))}</Text></Box>
                                                </HStack>
                                                <HStack>
                                                    <Box  w="120px"><Text fontSize="sm" color="#f3f7c6">Amount:</Text></Box>
                                                    <Box><Text fontSize="sm" color="white">{commifyDecimals(rollLoanAmount, 4)} {isTokenInfoLoading ? <Spinner size="sm" />: token1Info.tokenSymbol}</Text></Box>
                                                </HStack>
                                                <HStack>
                                                    <Box  w="120px"><Text fontSize="sm" color="#f3f7c6">Loan Fees:</Text></Box>
                                                    <Box>
                                                        <Text color="white" fontSize="sm">
                                                        {commifyDecimals((rollLoanAmount * 0.057 / 100) * (duration / 86400), 4)}&nbsp;
                                                        {isTokenInfoLoading ? <Spinner size="sm" /> : token1Info.tokenSymbol}
                                                        </Text></Box>
                                                </HStack>
                                            </Box>  
                                            <Box mt={10}>
                                            <DrawerActionTrigger asChild>
                                                    <Button variant="outline"  w="120px" onClick={() => setIsRolling(false)}>
                                                        Cancel
                                                    </Button>
                                                
                                                </DrawerActionTrigger>
                                                <Button colorScheme="blue" onClick={handleClickRoll} w="120px" ml={2}>
                                                    {isRolling ? <Spinner size="sm" /> : "Confirm"}
                                                </Button>                                
                                            </Box>                                
                                            </DrawerBody>
                                            </Box>
                                            {/* <DrawerFooter>
                                            </DrawerFooter> */}
                                        </DrawerContent>
                                        </DrawerRoot>
                                    </Box>
                                    </HStack>
                                    </Box>
                                    </VStack>
                                    </>) : <Box mt={2} mb={2} w="120px"><Text fontSize="xs" ml={2}>No active loan</Text></Box>
                                    }                                
                            </SimpleGrid>
                        </Box>
                            <Box 
                                p={2} 
                                ml={-5}  
                                mt={5}  
                                w={"90%"}   
                                border="1px solid ivory" 
                                borderRadius={10} 
                                backgroundColor={"#222831"} 
                            >
                                <Text fontSize={"12px"} fontWeight={"bold"} color="#a67c00" ml={2}>New Loan</Text>    
                                <SimpleGrid columns={2} w={"94%"}  mt={-5} fontSize="xs" p={1} backgroundColor={"#222831"} ml={2} mr={2}>
                                    <Box backgroundColor={"#a67c00"} >
                                        <Text fontSize="xs">&nbsp;<b>Amount</b></Text>
                                    </Box>
                                    <Box  backgroundColor={"#a67c00"}>
                                        <Text fontSize="xs" ml="40px">&nbsp;&nbsp;&nbsp;<b>Duration</b></Text>
                                    </Box>
                                    <Box w="auto" mt={2}>
                                        <HStack>
                                            <Box w="auto">
                                            <NumberInputRoot
                                                isMobile={isMobile}
                                                min={0}
                                                max={999999999}
                                                step={0.1}
                                                onChange={handleSetAmountToBorrow}
                                                marginRight={"5px"}
                                                value={borrowAmount === '0' ? '' : borrowAmount}
                                                setTokenSupply={(() => {})}
                                                setPrice={setBorrowAmount}
                                                setFloorPrice={(() => {})}
                                                height={"25px"}
                                                mt={1}
                                            >
                                                <NumberInputLabel h={"30px"} w={{ base: "", lg: "auto" }} />
                                                <NumberInputField h={"30px"} w={{ base: "", lg: "200px" }} />
                                            </NumberInputRoot>
                                            </Box>
                                            <Box mt={2}>
                                                <Image src={bnbLogo} w="25px"></Image>
                                            </Box>
                                        </HStack>
                                            <br />
                                            <Box>
                                                <Text fontSize="xs" fontWeight={"bold"} color="#a67c00">Borrowing</Text>
                                            </Box>
                                            <Box>
                                                <HStack >
                                                    <Box w="50px" textAlign={"left"}><Text fontSize={isMobile?"xs":"15px"}>{formatNumberPrecise(borrowAmount, 2)} </Text></Box>
                                                    <Box>{token1Info.tokenSymbol}</Box>
                                                    <Box  w="120px" fontSize={"11px"} mt={"2px"}> <Text fontSize={"xx-small"} color="#f3f7c6">({duration / 86400} days)</Text></Box>
                                                </HStack>
                                            </Box>
                                            <Box mt={5}>
                                                <Text  fontWeight={"bold"} color="#a67c00" fontSize={"xs"}>Collateral required</Text>
                                            </Box>
                                            <Box>
                                                {isComputing ? (
                                                    <Spinner size="xs" />
                                                ) : (
                                                    <Text fontSize={"xs"}>{formatNumberPrecise(collateral || 4)} {token0Info.tokenSymbol}</Text>
                                                )}
                                            </Box>
                                            <Box mt={5}>
                                            <HStack>
                                                <Box> <Text fontWeight={"bold"} color="#a67c00" fontSize={isMobile?"xs":"15px"}>Loan Fees</Text>    </Box>
                                                <Box><Image src={placeholderLogo} w={3}></Image></Box>
                                            </HStack>
                                            </Box>
                                            <Box>
                                                <Text fontSize={isMobile?"xs":"15px"}>{commifyDecimals(`${loanFees || 0}`, 4)} {token1Info.tokenSymbol}</Text>
                                            </Box>
                                            <Box mt={5}> 
                                                    <HStack>
                                                        <Box><Text fontWeight={"bold"} color="#a67c00" fontSize={isMobile?"xs":"15px"}>IMV</Text> </Box>
                                                        <Box><Image src={placeholderLogo} w={3}></Image></Box>
                                                    </HStack>
                                                <HStack>
                                                    <Box>{commifyDecimals(formatEther(`${IMV || 0}`) || 0, 6)}</Box>
                                                    <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : `${token0Info?.tokenSymbol}/${token1Info?.tokenSymbol}`}</Box>
                                                </HStack>
                                            </Box> 
                                    </Box>
                                    <Box>
                                    <SelectRoot
                                        mt={3}
                                        ml={12}
                                        collection={durationChoices}
                                        size="xs"
                                        width={"100px"}
                                        onChange={handleSetDuration}
                                        value={duration}
                                        backgroundColor={"#18181b"}
                                        color={"white"}
                                        >
                                        <SelectTrigger
                                            _hover={{ backgroundColor: "#18181d" }}
                                        >
                                            {durationChoices.items.map((data, index) => {
                                                if (index > 0) return;
                                                return (
                                                    <SelectValueText placeholder={data.label}>
                                                    </SelectValueText>
                                                );
                                                })}
                                        </SelectTrigger>
                                        <SelectContent
                                            backgroundColor={"#18181b"}
                                            color={"white"}
                                        >
                                            {durationChoices.items.map((choice) => (
                                                <SelectItem
                                                    item={choice}
                                                    key={choice.value}
                                                    _hover={{ backgroundColor: "#18181d" }}
                                                >
                                                    {choice.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectRoot>
                                     <Button 
                                        mt={6} 
                                        w={"100px"}
                                        h={"25px"}  
                                        borderColor={"#a67c00"} 
                                        variant="outline" 
                                        ml={12} 
                                        onClick={() => handleBorrow()}  
                                        disabled={
                                            isTokenInfoLoading || 
                                            loanData?.borrowAmount > 0 || 
                                            borrowAmount == 0 || 
                                            parseFloat(formatEther(`${token0Info.balance}`)) < parseFloat(`${collateral}`)
                                        } 
                                        >
                                            {isBorrowing ? <Spinner size="xs" color="#a67c00"/> :  <Text fontSize="xs" color="#a67c00">Borrow</Text>}
                                        </Button>
                                    </Box>
                                    <Box>

                                    </Box>
                                </SimpleGrid>
                            </Box>                        
                        </Flex>
                                                 
                    ) : (
                    <Box  w="99%">
                    {/* <Heading as="h2">
                        Borrow
                    <Text fontSize="md">
                        Borrow from liquidity using your collateral
                    </Text>
                    </Heading>                         */}
                    <Grid
                        h="600px"
                        templateRows="repeat(2, 1fr)"
                        templateColumns="repeat(2, 1fr)"
                        gap={3}
                        mb={20}
                        mt={10}
                        px={2}
                        py={4}
                        // border="1px solid yellow"
                    >
                        <GridItem w="90%" border={"1px solid white"} p={4} px={6} ml={5} borderRadius={10} backgroundColor={"#222831"}>
                            <Text fontSize={isMobile?"12px":"15px"} color="#a67c00">Active Loan</Text>
                            <SimpleGrid columns={5} mt={-5} fontSize="xs">
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> Collateral </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> Borrowed </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> 
                                <HStack>
                                 <Box><Text fontSize="xs">LTV</Text></Box>
                                 <Box>
                                    <Tooltip content="Loan to Value Ratio: LTV is the ratio of the loan amount to the value of the collateral" placement="top">
                                        <Image src={placeholderLogo} w={15} />
                                    </Tooltip>                                    
                                 </Box>
                                </HStack>
                                </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}>
                                Expires
                                </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> &nbsp;&nbsp;&nbsp;Actions </Box>
                                
                                {loanData?.borrowAmount > 0 ? ( 
                                    <>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="white" borderRadius="5px 0 0 5px" h="25px" borderRight="none">
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {displayedCollateral}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="white" borderRadius="0" h="25px" borderLeft="none" borderRight="none">
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token1Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="white" borderRadius="0" h="25px" borderLeft="none" borderRight="none" fontSize="sm">{commifyDecimals(ltv, 2)}</Box>
                                    <Box px={2} mt={2} bgColor={"#18181b"} color="white" borderRadius="0 5px 5px 0" h="25px" borderLeft="none" fontSize={"sm"}> {getDaysLeft(`${loanData?.expires}`)} days</Box>
                                    <Box px={2}  mt={2} ml={-10}> 
                                    <VStack ml={10}>
                                    <LoanAddCollateral
                                        size="lg"
                                        token0Symbol={token0Info.tokenSymbol}
                                        handleSetCollateral={handleSetExtraCollateral}
                                        extraCollateral={extraCollateral}
                                        isMobile={isMobile}
                                        ltv={ltv}
                                        handleClickAdd={handleClickAdd}
                                        isAdding={isAdding}
                                        setIsAdding={setIsAdding}
                                        isLoading={isLoading}
                                        setIsLoading={setIsLoading}
                                        isTokenInfoLoading={isTokenInfoLoading}
                                    />
                                    <LoanRepay
                                        size="lg"
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
                                    <DrawerRoot >
                                    <DrawerTrigger asChild>
                                    <Button 
                                        variant={"outline"}
                                        h={8}
                                        // onClick={() => setIsLoading(true)}
                                        disabled={isRolling  || isTokenInfoLoading || ltv <= 1}
                                        w={"90px"}
                                        border="1px solid #f3f7c6"
                                        borderRadius={5}
                                        _hover={{ bg: "#a67c00aa", borderColor: "#a67c00", color: "white" }}
                                    >
                                    {isRolling ? <Spinner size="sm" /> : <Text fontSize="xs" color={"#f3f7c6"}>Roll</Text>}
                                    </Button>
                                    </DrawerTrigger>
                                    <DrawerBackdrop />
                                    <DrawerContent>
                                        <Box mt="80%" ml={5}>
                                        <DrawerHeader>
                                            <DrawerTitle>
                                                <Text as="h3" color="#a67c00">Roll Loan</Text>
                                            </DrawerTitle>
                                            <DrawerCloseTrigger asChild mt="82%" mr={5} setIsRolling={setIsRolling}>
                                                <Button variant="ghost" size="sm" onClick={() => setIsRolling(false)} mt={2} ml={-2}>×</Button>
                                            </DrawerCloseTrigger>
                                        </DrawerHeader>
                                        <DrawerBody>
                                            {/* <Input
                                                placeholder="Amount to roll"
                                                // onChange={(e) => setWrapAmount(e.target.value)}
                                                w="80%"
                                            /> */}
                                        <Box border="1px solid #a67c00" borderRadius="md" p={3} w="90%" >                              

                                            <HStack>
                                                <Box w="120px"><Text fontSize="sm" color="#f3f7c6">New Duration:</Text></Box>
                                                <Box><Text fontSize="sm" color="white">{duration / 86400} days</Text></Box>
                                            </HStack>
                                            <HStack>
                                                <Box  w="120px"><Text fontSize="sm" c color="#f3f7c6">Expires On:</Text></Box>
                                                <Box><Text fontSize="sm" color="white">{calculateExpiryDate(getDaysLeft(`${loanData?.expires}`))}</Text></Box>
                                            </HStack>
                                            <HStack>
                                                <Box  w="120px"><Text fontSize="sm" color="#f3f7c6">Amount:</Text></Box>
                                                <Box><Text fontSize="sm" color="white">{commifyDecimals(rollLoanAmount, 4)} {isTokenInfoLoading ? <Spinner size="sm" />: token1Info.tokenSymbol}</Text></Box>
                                            </HStack>
                                            <HStack>
                                                <Box  w="120px"><Text fontSize="sm" color="#f3f7c6">Loan Fees:</Text></Box>
                                                <Box>
                                                    <Text color="white" fontSize="sm">
                                                    {commifyDecimals((rollLoanAmount * 0.057 / 100) * (duration / 86400), 4)}&nbsp;
                                                    {isTokenInfoLoading ? <Spinner size="sm" /> : token1Info.tokenSymbol}
                                                    </Text></Box>
                                            </HStack>
                                        </Box>  
                                        <Box mt={10}>
                                        <DrawerActionTrigger asChild>
                                                <Button variant="outline"  w="120px" onClick={() => setIsRolling(false)}>
                                                    Cancel
                                                </Button>
                                               
                                            </DrawerActionTrigger>
                                            <Button colorScheme="blue" onClick={handleClickRoll} w="120px" ml={2}>
                                                {isRolling ? <Spinner size="sm" /> : "Confirm"}
                                            </Button>                                
                                        </Box>                                
                                        </DrawerBody>
                                        </Box>
                                        {/* <DrawerFooter>
                                        </DrawerFooter> */}
                                    </DrawerContent>
                                    </DrawerRoot>

                                    </VStack>
                                    </Box>

                                    </>
                                ) : (
                                    <>
                                    <Box p={2}>
                                    No Data
                                    </Box>
                                    <Box>

                                    </Box>
                                    <Box>
                                    </Box>
                                    </>
                                )}
                            </SimpleGrid>
                        </GridItem>
                        <GridItem ml={"-6vh"}>
                            <BalanceCard 
                                ethBalance={ethBalance}
                                token0Balance={token0Info?.balance} 
                                token0Symbol={token0Info?.tokenSymbol} 
                                token1Symbol={token1Info.tokenSymbol} 
                                token1Balance={token1Info?.balance}
                                deposit={deposit}
                                withdraw={withdraw}
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
                                page="borrow" 
                            />
                        </GridItem>
                        <GridItem w="90%" border={"1px solid white"} p={4} px={6} pb={8} ml={5} borderRadius={10} backgroundColor={"#222831"}>
                        <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"} color="#a67c00">New Loan</Text>
                        <SimpleGrid columns={3} w="100%" mt={-5}>
                            <Box w="500px"backgroundColor={"#a67c00"}  mb={2}>
                                <Text>&nbsp;<b>Amount</b></Text>
                            </Box>
                            <Box  >
                                <Text ml="40px">&nbsp;&nbsp;&nbsp;<b>Duration</b></Text>
                            </Box>
                            <Box backgroundColor={"#a67c00"} mb={2}>
                                <Text ml={5}>Actions</Text>
                            </Box>
                            <Box w="auto">
                                <HStack>
                                    <Box w="auto">
                                    <NumberInputRoot
                                        isMobile={isMobile}
                                        min={0}
                                        max={999999999}
                                        step={0.1}
                                        onChange={handleSetAmountToBorrow}
                                        marginRight={"5px"}
                                        value={borrowAmount === '0' ? '' : borrowAmount}
                                        setTokenSupply={(() => {})}
                                        setPrice={setBorrowAmount}
                                        setFloorPrice={(() => {})}
                                        height={"38px"}
                                        mt={1}
                                        borderRadius={5}
                                        // backgroundColor={"#F5F5DC"}
                                        // color="gray.800"
                                    >
                                        <NumberInputLabel  h={"38px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField  h={"38px"} w={{ base: "", lg: "200px" }} />
                                    </NumberInputRoot>
                                    </Box>
                                    <Box>
                                        <Image src={bnbLogo}></Image>
                                    </Box>
                                </HStack>
                                    <br />
                                    <Box>
                                        <Text fontWeight={"bold"} color="#a67c00">Borrowing</Text>
                                    </Box>
                                    <Box>
                                        <HStack >
                                            <Box w="50px" textAlign={"left"}><Text>{formatNumberPrecise(borrowAmount, 2)} </Text></Box>
                                            <Box>{token1Info.tokenSymbol}</Box>
                                            <Box  w="120px" fontSize={"11px"} mt={"2px"}> <Text fontSize={"sm"} color="#f3f7c6">({duration / 86400} days)</Text></Box>
                                        </HStack>
                                    </Box>
                                    <Box mt={5}>
                                        <Text fontWeight={"bold"} color="#a67c00" fontSize={isMobile?"12px":"15px"}>Collateral required</Text>
                                    </Box>
                                    <Box>
                                        {isComputing ? (
                                            <Spinner size="sm" />
                                        ) : (
                                            <Text>{formatNumberPrecise(collateral || 0)} {token0Info.tokenSymbol}</Text>    
                                        )}
                                    </Box>
                                    <Box mt={5}>
                                       <HStack>
                                        <Box> <Text fontWeight={"bold"} color="#a67c00" fontSize={isMobile?"12px":"15px"}>Loan Fees</Text>    </Box>
                                        <Box><Image src={placeholderLogo} w={15}></Image></Box>
                                       </HStack>
                                    </Box>
                                    <Box>
                                        <Text>{commifyDecimals(`${loanFees || 0}`, 8)} {token1Info.tokenSymbol}</Text>
                                    </Box>
                                    <Box mt={5}> 
                                            <HStack>
                                                <Box><Text fontWeight={"bold"} color="#a67c00" fontSize={isMobile?"12px":"15px"}>IMV</Text> </Box>
                                                <Box><Image src={placeholderLogo} w={15}></Image></Box>
                                            </HStack>
                                        <HStack>
                                            <Box>{commifyDecimals(formatEther(`${IMV || 0}`) || 0, 6)}</Box>
                                            <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : `${token0Info?.tokenSymbol}/${token1Info?.tokenSymbol}`}</Box>
                                        </HStack>
                                    </Box> 
                            </Box>
                            <Box>
                            <SelectRoot
                                mt={1}
                                ml={isMobile?25:62}
                                color={"white"}
                                collection={durationChoices}
                                size="sm"
                                width={isMobile?"180px":"120px"}
                                onChange={handleSetDuration}
                                value={duration}
                                backgroundColor="#18181b"
                                
                                >
                                <SelectTrigger
                                    _hover={{ backgroundColor: "#18181bFF" }}
                                >
                                    {durationChoices.items.map((data, index) => {
                                        if (index > 0) return;
                                        return (
                                            <SelectValueText placeholder={data.label}>
                                            </SelectValueText>
                                        );
                                        })}
                                </SelectTrigger>
                                <SelectContent
                                 backgroundColor="#18181b"
                                 color={"white"}
                                 >
                                    {durationChoices.items.map((choice) => (
                                        <SelectItem
                                            item={choice}
                                            key={choice.value}
                                            _hover={{ backgroundColor: "#18181bFF" }}
                                        >
                                            {choice.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectRoot>
                            </Box>
                            <Box>
                            <Button 
                                mt={2} 
                                w="150px"
                                h={"30px"}  
                                borderColor={"#a67c00"} 
                                variant="outline" 
                                ml={5} 
                                onClick={() => handleBorrow()}  
                                disabled={
                                    isTokenInfoLoading || 
                                    loanData?.borrowAmount > 0 || 
                                    borrowAmount == 0 || 
                                    parseFloat(formatEther(`${token0Info.balance}`)) < parseFloat(`${collateral}`)
                                } 
                                borderRadius={5}
                            >
                               {isBorrowing ? <Spinner size="sm" color="#a67c00"/> :  <Text color="#a67c00">Borrow</Text>}
                            </Button>
                            </Box>
                        </SimpleGrid>

                        </GridItem>
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

export default Borrow;