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
import { ro } from '@faker-js/faker';
import addresses from "../assets/deployment.json";
import { size } from 'viem';
import config from '../config'; 

const { formatEther, parseEther, isAddress, MaxUint256 } = ethers.utils;
const { JsonRpcProvider } = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  "https://testnet-rpc.monad.xyz"
);

const IWETHArtifact = await import(`../assets/IWETH.json`);
const IWETHAbi = IWETHArtifact.abi;

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

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

    let loanData ;

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

    const ltv = (formatEther(`${loanData?.collateralAmount || 0}`) * formatEther(`${IMV || 1}`)) / formatEther(`${loanData?.borrowAmount|| 0}` );   
    
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
            isAdding ?  parseEther(`${extraCollateral + 1}`)  : parseEther(`${collateral + 1}`)
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

            const msg = Number(error.message.toString().indexOf("0x76166401")) > -1 ? "Invalid duration" :
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
            NomaFactoryAbi,
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
        const value = e.target.value;
        if (isNaN(value) || value == '') return // Ignore if the value is not a number

        setBorrowAmount(value);
    }


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

        console.log(`Adding extra: ${extraCollateral} collateral ${collateral}}`);
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

    const displayedCollateral = Number(formatEther(`${loanData?.collateralAmount || 0}`)) > 1000000 ?
        formatNumberPrecise(formatEther(`${loanData?.collateralAmount || 0}`), 5) :
        formatNumberPrecise(formatEther(`${loanData?.collateralAmount || 0}`), 5) ;
    
    return (
        <Container maxW="container.xl=" py={12} pl={"0%"} ml={"3%"}>
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
                    mt={"50px"}
                    marginBottom={"15%"}
                    // border="1px solid red"
                >
                {isAddress(vaultAddress) ? (
                    isMobile ? (
                        <Flex direction="column">
                        <Box mt={30} w="98%" ml={-5} >
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
                        <Box p={2} mt={5} w="380px" ml={-5} border="1px solid gray" borderRadius={10} backgroundColor={"#222831"} >
                            <Text fontSize={"12px"} fontWeight={"bold"} color="#a67c00" ml={2}>Active Loan</Text>        
                           <SimpleGrid columns={4} mt={-5} backgroundColor={"#222831"} w={"352px"} ml={2} mr={2}>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}> Collateral </Box>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}> Borrowed </Box>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}> 
                                <HStack>
                                 <Box><Text fontSize="sm">LTV</Text></Box>
                                 <Box><Image src={placeholderLogo} w={15} /></Box>
                                </HStack>
                                </Box>
                                <Box fontSize="xs" px={2} color="white" backgroundColor={"#a67c00"}>
                                Expires
                                </Box>
                                {loanData?.borrowAmount > 0 ? ( 
                                    <>
                                    <Box px={2} mt={2}> 
                                        <HStack>
                                            <Box  fontSize="xs">
                                            {displayedCollateral}
                                            </Box>
                                            <Box  fontSize="xx-small" ml={-1}>
                                            {isTokenInfoLoading ? <Spinner size="xs" /> : token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2}> 
                                        <HStack>
                                            <Box  fontSize="xs">
                                            {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                                            </Box>
                                            <Box  fontSize="xx-small" ml={-1}>
                                            {isTokenInfoLoading ? <Spinner size="xs" /> : token1Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} fontSize="xs" mt={2}> {commifyDecimals(ltv, 2)}</Box>
                                    <Box px={2} fontSize="xs" mt={2}> {getDaysLeft(`${loanData?.expires}`)} days</Box>
                                    <HStack mt={2} ml={2} alignItems="center" justifyContent="space-between" w="90%" pb={2}>
                                    <Box>
                                        <LoanAddCollateral
                                            size="sm"
                                            token0Symbol={token0Info.tokenSymbol}
                                            handleSetCollateral={setExtraCollateral}
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
                                            disabled={isRolling || isLoading || isTokenInfoLoading || ltv <= 1}
                                            w={"80px"}
                                            border="1px solid #f3f7c6"
                                        >
                                        {isLoading ? <Spinner size="sm" /> : <Text fontSize={"11px"} color={"#f3f7c6"}>Roll</Text>}
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
                                    </>) : <Box mt={2} mb={2} w="120px"><Text fontSize="xs" ml={2}>No active loan</Text></Box>
                                    }                                
                            </SimpleGrid>
                        </Box>
                            <Box p={2} ml={-5}  mt={5} w="380px"   border="1px solid gray" borderRadius={10} backgroundColor={"#222831"} >
                                <Text fontSize={"12px"} fontWeight={"bold"} color="#a67c00" ml={2}>New Loan</Text>    
                                <SimpleGrid columns={2} w="350px" mt={-5} fontSize="xs" p={1} backgroundColor={"#222831"} ml={2} mr={2}>
                                    <Box w="320px"backgroundColor={"#a67c00"} mb={2}>
                                        <Text fontSize="xs">&nbsp;<b>Amount</b></Text>
                                    </Box>
                                    <Box  >
                                        <Text fontSize="xs" ml="40px">&nbsp;&nbsp;&nbsp;<b>Duration</b></Text>
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
                                                value={borrowAmount}
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
                                            <Box>
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
                                                <Text  fontWeight={"bold"} color="#a67c00" fontSize={isMobile?"xs":"15px"}>Collateral required</Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize={isMobile?"xs":"15px"}>{formatNumberPrecise(collateral || 4)} {token0Info.tokenSymbol}</Text>
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
                                                    <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}/{token1Info?.tokenSymbol}</Box>
                                                </HStack>
                                            </Box> 
                                    </Box>
                                    <Box>
                                    <SelectRoot
                                        mt={1}
                                        ml={12}
                                        collection={durationChoices}
                                        size="xs"
                                        width={"100px"}
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
                                    </SelectRoot>
                                     <Button 
                                        mt={4} 
                                        w={"90px"}
                                        h={"25px"}  
                                        borderColor={"#a67c00"} 
                                        variant="outline" 
                                        ml={14} 
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
                    <Box>
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
                        gap={10}
                        mb={20}
                        mt={10}
                        p={4}
                        // border="1px solid yellow"
                    >
                        <GridItem border={"1px solid white"} p={4} px={6} ml={40} borderRadius={10} backgroundColor={"#222831"}>
                            <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"} color="#a67c00">Active Loan</Text>
                            <SimpleGrid columns={5} mt={-5}>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> Collateral </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> Borrowed </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> 
                                <HStack>
                                 <Box><Text>LTV</Text></Box>
                                 <Box><Image src={placeholderLogo} w={15} /></Box>
                                </HStack>
                                </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}>
                                Expires
                                </Box>
                                <Box px={2} color="white" backgroundColor={"#a67c00"}> Actions </Box>
                                
                                {loanData?.borrowAmount > 0 ? ( 
                                    <>
                                    <Box px={2} mt={2}> 
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {displayedCollateral}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2}> 
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token1Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2}  mt={2}> {commifyDecimals(ltv, 2)}</Box>
                                    <Box px={2}  mt={2}> {getDaysLeft(`${loanData?.expires}`)} days</Box>
                                    <Box px={2}  mt={2} ml={-10}> 
                                    <VStack>
                                    <LoanAddCollateral
                                        size="lg"
                                        token0Symbol={token0Info.tokenSymbol}
                                        handleSetCollateral={setExtraCollateral}
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
                                        disabled={isRolling || isLoading || isTokenInfoLoading || ltv <= 1}
                                        w={"120px"}
                                        border="1px solid #f3f7c6"
                                    >
                                    {isLoading ? <Spinner size="sm" /> : <Text color={"#f3f7c6"}>Roll</Text>}
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
                        <GridItem>
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
                        <GridItem border={"1px solid white"} p={4} px={6} pb={8} ml={40} borderRadius={10} backgroundColor={"#222831"}>
                        <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"} color="#a67c00">New Loan</Text>
                        <SimpleGrid columns={3} w="700px" mt={-5}>
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
                                        value={borrowAmount}
                                        setTokenSupply={(() => {})}
                                        setPrice={setBorrowAmount}
                                        setFloorPrice={(() => {})}
                                        height={"38px"}
                                        mt={1}
                                    >
                                        <NumberInputLabel h={"38px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"38px"} w={{ base: "", lg: "200px" }} />
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
                                        <Text>{commify(collateral || 0)} {token0Info.tokenSymbol}</Text>
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
                                            <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}/{token1Info?.tokenSymbol}</Box>
                                        </HStack>
                                    </Box> 
                            </Box>
                            <Box>
                            <SelectRoot
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
                            </SelectRoot>
                            </Box>
                            <Box>
                            <Button mt={2} h={"30px"}  borderColor={"#a67c00"} variant="outline" ml={5} onClick={() => handleBorrow()}  
                            disabled={
                                isTokenInfoLoading || 
                                loanData?.borrowAmount > 0 || 
                                borrowAmount == 0 || 
                                parseFloat(formatEther(`${token0Info.balance}`)) < parseFloat(`${collateral}`)
                            } w={"120px"}>
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