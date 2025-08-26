import React, { useState, useEffect } from 'react';
import { Input, Image, Flex, Container, Heading, HStack, Box, Grid, GridItem, Button, Spinner, Text, createListCollection, SimpleGrid, NumberInput, VStack, Badge } from "@chakra-ui/react";
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
import LoanRoll from '../components/LoanRoll';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
} from '../components/ui/dialog';
import placeholderLogo from '../assets/images/question.svg';
import placeholderLogoDark from '../assets/images/question_white.svg';
// import WalletNotConnected from '../components/WalletNotConnected';
import WalletSidebar from '../components/WalletSidebar';

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
    
    // Transaction history state
    const [loanHistory, setLoanHistory] = useState([]);
    const [processedTxHashes] = useState(() => new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);

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
  
  // Load loan history from local storage on mount
  useEffect(() => {
    const loadLoanHistory = () => {
      try {
        const stored = localStorage.getItem('oikos_loan_history');
        console.log("Loading loan history from localStorage:", stored);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert time strings back to Date objects
          const history = parsed.map(loan => ({
            ...loan,
            time: new Date(loan.time)
          }));
          console.log("Parsed loan history:", history);
          setLoanHistory(history);
          // Add loaded tx hashes to processed set
          history.forEach(loan => {
            if (loan.txHash) {
              processedTxHashes.add(loan.txHash);
            }
          });
        }
      } catch (error) {
        console.error("Error loading loan history:", error);
      }
    };
    loadLoanHistory();
  }, []);
  
  // Save loan history to local storage whenever it changes
  useEffect(() => {
    if (loanHistory.length > 0) {
      try {
        localStorage.setItem('oikos_loan_history', JSON.stringify(loanHistory));
      } catch (error) {
        console.error("Error saving loan history:", error);
      }
    }
  }, [loanHistory]);
  
  // Pagination helper functions
  const getPaginatedData = (data, page, perPage) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return data.slice(startIndex, endIndex);
  };
  
  const getTotalPages = (data, perPage) => {
    return Math.ceil(data.length / perPage);
  };

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
    
    // Listen to loan events from ExtVault contract
    useEffect(() => {
        if (!vaultAddress || vaultAddress === "0x0000000000000000000000000000000000000000") return;
        
        console.log("Setting up event listeners for vault:", vaultAddress);
        
        const extVaultContract = new ethers.Contract(
            vaultAddress,
            ExtVaultAbi,
            localProvider
        );
        
        // Handler for Borrow events
        const handleBorrow = async (who, borrowAmount, duration, event) => {
            console.log("Borrow event received:", { who, borrowAmount: borrowAmount.toString(), duration: duration.toString() });
            try {
                const txHash = event.transactionHash;
                
                // Skip if already processed
                if (processedTxHashes.has(txHash)) {
                    return;
                }
                
                // Mark as processed
                processedTxHashes.add(txHash);
                
                const block = await event.getBlock();
                const timestamp = new Date(block.timestamp * 1000);
                
                const newLoan = {
                    id: Date.now() + Math.random(),
                    type: "borrow",
                    user: who,
                    amount: parseFloat(formatEther(borrowAmount)),
                    duration: parseInt(duration.toString()) / 86400, // Convert to days
                    collateral: collateral ? parseFloat(collateral) : 0,
                    time: timestamp,
                    txHash: txHash,
                    shortTxHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
                };
                
                setLoanHistory(prev => [newLoan, ...prev.slice(0, 199)]); // Keep last 200 loans
            } catch (error) {
                console.error("Error processing borrow event:", error);
            }
        };
        
        // Handler for Payback events
        const handlePayback = async (who, event) => {
            try {
                const txHash = event.transactionHash;
                
                // Skip if already processed
                if (processedTxHashes.has(txHash)) {
                    return;
                }
                
                // Mark as processed
                processedTxHashes.add(txHash);
                
                const block = await event.getBlock();
                const timestamp = new Date(block.timestamp * 1000);
                
                // Get transaction details to extract repay amount
                const tx = await event.getTransaction();
                const receipt = await event.getTransactionReceipt();
                
                const newLoan = {
                    id: Date.now() + Math.random(),
                    type: "repay",
                    user: who,
                    amount: repayAmount ? parseFloat(repayAmount) : 0, // We'll use the state value
                    time: timestamp,
                    txHash: txHash,
                    shortTxHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
                };
                
                setLoanHistory(prev => [newLoan, ...prev.slice(0, 199)]);
            } catch (error) {
                console.error("Error processing payback event:", error);
            }
        };
        
        // Handler for RollLoan events
        const handleRollLoan = async (who, event) => {
            try {
                const txHash = event.transactionHash;
                
                // Skip if already processed
                if (processedTxHashes.has(txHash)) {
                    return;
                }
                
                // Mark as processed
                processedTxHashes.add(txHash);
                
                const block = await event.getBlock();
                const timestamp = new Date(block.timestamp * 1000);
                
                const newLoan = {
                    id: Date.now() + Math.random(),
                    type: "roll",
                    user: who,
                    time: timestamp,
                    txHash: txHash,
                    shortTxHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
                };
                
                setLoanHistory(prev => [newLoan, ...prev.slice(0, 199)]);
            } catch (error) {
                console.error("Error processing roll loan event:", error);
            }
        };
        
        // Attach event listeners
        extVaultContract.on("Borrow", handleBorrow);
        extVaultContract.on("Payback", handlePayback);
        extVaultContract.on("RollLoan", handleRollLoan);
        
        // Cleanup
        return () => {
            extVaultContract.off("Borrow", handleBorrow);
            extVaultContract.off("Payback", handlePayback);
            extVaultContract.off("RollLoan", handleRollLoan);
        };
    }, [vaultAddress, collateral, repayAmount]);

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
            parseEther(`${collateral}`) + parseEther(`0.000001`)
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
            parseEther(`${extraCollateral}`)
        ],
        onSuccess(data) {
            console.log("Approval successful, transaction hash:", data.hash);
            addCollateral();
        },
        onError(error) {
            console.error(`add collateral approval failed: ${error.message}`);
            console.error("Full error object:", error);
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
            
            // Don't add to history here - the event listener will handle it
            
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
            
            // Manually add to history
            const newLoan = {
                id: Date.now() + Math.random(),
                type: "repay",
                user: address,
                amount: repayAmount == 0 ? parseFloat(formatEther(`${loanData?.borrowAmount}`)) : parseFloat(repayAmount),
                time: new Date(),
                txHash: data.hash,
                shortTxHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`
            };
            
            setLoanHistory(prev => {
                const updated = [newLoan, ...prev.slice(0, 199)];
                // Save immediately
                try {
                    localStorage.setItem('oikos_loan_history', JSON.stringify(updated));
                } catch (error) {
                    console.error("Error saving loan history:", error);
                }
                return updated;
            });
            
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
            
            // Manually add to history
            const newLoan = {
                id: Date.now() + Math.random(),
                type: "roll",
                user: address,
                duration: duration / 86400, // Convert to days
                time: new Date(),
                txHash: data.hash,
                shortTxHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`
            };
            
            setLoanHistory(prev => {
                const updated = [newLoan, ...prev.slice(0, 199)];
                // Save immediately
                try {
                    localStorage.setItem('oikos_loan_history', JSON.stringify(updated));
                } catch (error) {
                    console.error("Error saving loan history:", error);
                }
                return updated;
            });
            
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
            console.log("Add collateral success:", data);
            setIsAdding(false);
            setIsLoading(false);
            
            // Manually add to loan history since there's no event for addCollateral
            const newLoan = {
                id: Date.now() + Math.random(),
                type: "add_collateral",
                user: address,
                amount: parseFloat(extraCollateral),
                time: new Date(),
                txHash: data.hash,
                shortTxHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`
            };
            
            console.log("Adding to loan history:", newLoan);
            setLoanHistory(prev => {
                const updated = [newLoan, ...prev.slice(0, 199)];
                console.log("Updated loan history:", updated);
                // Save to localStorage immediately
                try {
                    localStorage.setItem('oikos_loan_history', JSON.stringify(updated));
                } catch (error) {
                    console.error("Error saving loan history:", error);
                }
                return updated;
            });
            
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
                
                // Verify this is an ERC20 contract by checking for totalSupply
                try {
                    const totalSupply = await tokenContract.totalSupply();
                    console.log(`Token ${tokenSymbol} (${tokenAddress}) has totalSupply: ${totalSupply.toString()}`);
                } catch (e) {
                    console.warn(`Token at ${tokenAddress} might not be a standard ERC20 token`);
                }

                return { tokenName, tokenSymbol, tokenDecimals, balance, address: tokenAddress };
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
                        
                        // Debug: Log token0 details
                        console.log("Token0 set to:", plainVaultDescription.token0);
                        console.log("Token0 info:", token0Data);
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
        const newDuration = e.value[0];
        console.log("Duration: ", newDuration);
        setDuration(newDuration);
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

        // Debug logging
        console.log("Add Collateral Debug Info:");
        console.log("token0 address:", token0);
        console.log("vault address:", vaultAddress);
        console.log("extraCollateral amount:", extraCollateral);
        console.log("token0Info:", token0Info);
        
        // Verify token0 is a valid address
        if (!token0 || token0 === "0x0000000000000000000000000000000000000000") {
            toaster.create({
                title: "Error",
                description: "Invalid token0 address. Please refresh and try again.",
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
        <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh" overflow="visible">
            <Toaster />

            {!isConnected ? (
                <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
                    <Text color="white" fontSize="xl">Please connect your wallet</Text>
                </Box>
            ) : isMobile && isLandscape ? (
                <RotateDeviceMessage />
            ) : isAddress(vaultAddress) ? (
                <>
                    <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4}>
                        {/* Left side - Loan Information */}
                        <Box 
                            flex={isMobile ? "1" : "0 0 350px"} 
                            maxW={isMobile ? "100%" : "350px"} 
                            w={isMobile ? "100%" : "350px"}
                        >
                            <Box 
                                bg="rgba(26, 26, 26, 0.8)" 
                                borderRadius="lg" 
                                p={{ base: 4, md: 5 }}
                                backdropFilter="blur(10px)"
                                border="1px solid rgba(74, 222, 128, 0.1)"
                                boxShadow="0 4px 12px rgba(0, 0, 0, 0.2)"
                            >
                                <HStack mb={4} align="center">
                                    <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white">
                                        Vault Information
                                    </Text>
                                </HStack>
                                
                                <VStack align="stretch" gap={3}>
                                    <Box 
                                        p={3} 
                                        bg="rgba(255, 255, 255, 0.02)"
                                        borderRadius="md"
                                        border="1px solid rgba(255, 255, 255, 0.05)"
                                    >
                                        <Text color="#4ade80" fontSize="xs" fontWeight="600" mb={1}>
                                            TOKEN PAIR
                                        </Text>
                                        <HStack gap={2}>
                                            {isTokenInfoLoading ? (
                                                <Box><Spinner size="sm" color="#4ade80" /></Box>
                                            ) : (
                                                <Box>
                                                    <HStack>
                                                    <Box>
                                                    <Text color="white" fontSize="lg" fontWeight="bold">
                                                        {token0Info?.tokenSymbol}
                                                    </Text>
                                                    </Box>
                                                    <Box><Text color="#666" fontSize="sm">/</Text></Box>
                                                    <Box>
                                                    <Text color="white" fontSize="lg" fontWeight="bold">
                                                        {token1Info?.tokenSymbol}
                                                    </Text>                                                        
                                                    </Box>
                                                    </HStack>
                                                </Box>
                                            )}
                                        </HStack>
                                    </Box>
                                    
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                                        <Box 
                                            p={3} 
                                            bg="rgba(255, 255, 255, 0.02)"
                                            borderRadius="md"
                                            border="1px solid rgba(255, 255, 255, 0.05)"
                                        >
                                            <Box>
                                                <HStack>
                                                    <Box>
                                                    <Text color="#888" fontSize="xs" mb={1}>
                                                        IMV 
                                                    </Text>                                                        
                                                    </Box>
                                                    <Box>
                                                        <Image src={placeholderLogoDark} w="15px" />
                                                    </Box>
                                                </HStack>
                                            </Box>
                                            <Text color="#4ade80" fontSize="xl" fontWeight="bold">
                                                {commifyDecimals(formatEther(`${IMV || 0}`) || 0, 4)}
                                            </Text>
                                        </Box>
                                        
                                        <Box 
                                            p={3} 
                                            bg="rgba(255, 255, 255, 0.02)"
                                            borderRadius="md"
                                            border="1px solid rgba(255, 255, 255, 0.05)"
                                        >
                                            <Text color="#888" fontSize="xs" mb={1}>
                                                DAILY FEE
                                            </Text>
                                            <Text color="white" fontSize="xl" fontWeight="bold">
                                                0.027%
                                            </Text>
                                        </Box>
                                    </SimpleGrid>
                                    
                                    <Box 
                                        p={3} 
                                        bg="rgba(74, 222, 128, 0.05)"
                                        borderRadius="md"
                                        border="1px solid rgba(74, 222, 128, 0.2)"
                                    >
                                        <HStack justify="space-between">
                                            <Box>
                                            <Text color="#4ade80" fontSize="xs" fontWeight="600">
                                                PROTOCOL STATUS
                                            </Text>
                                            </Box>
                                            <Box>
                                            <Badge colorPalette="green" size="sm">
                                                ACTIVE
                                            </Badge>
                                            </Box>
                                        </HStack>
                                    </Box>
                                </VStack>
                            </Box>
                            
                            {/* Active Loan Box */}
                        </Box>
                        
                        {/* Middle - Main Content */}
                        <Box flex={isMobile ? "1" : "2"} w={isMobile ? "100%" : "auto"}>
                            {/* New Loan Form */}
                            <Box bg="#1a1a1a" borderRadius="lg" p={{ base: 4, md: 6 }}>
                                <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white" mb={4}>
                                    New Loan
                                </Text>
                                
                                {loanData?.borrowAmount > 0 ? (
                                    <Box py={8} textAlign="center">
                                        <Text color="#666" fontSize="lg" mb={2}>You already have an active loan</Text>
                                        <Text color="#888" fontSize="sm">Manage your existing loan below or repay it to create a new one.</Text>
                                    </Box>
                                ) : (
                                    <VStack gap={{ base: 3, md: 4 }} align="stretch">
                                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
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
                                                        onValueChange={handleSetDuration}
                                                        value={[duration]}
                                                        defaultValue={[`${86400 * 30}`]}
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
                                            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                                <Box>
                                                    <Text fontSize="xs" color="#888" mb={1}>Collateral Required</Text>
                                                    {isComputing ? (
                                                        <Spinner size="sm" color="#4ade80" />
                                                    ) : (
                                                        <HStack>
                                                            <Box>
                                                                <Text fontSize="md" color="white" fontWeight="bold">
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
                                                            <Text fontSize="md" color="white" fontWeight="bold">
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
                                <Box 
                                    bg="rgba(26, 26, 26, 0.6)" 
                                    border="1px solid rgba(74, 222, 128, 0.2)"
                                    borderRadius="xl" 
                                    p={{ base: 4, md: 8 }} 
                                    mt={{ base: 4, md: 6 }}
                                    position="relative"
                                    overflow="hidden"
                                >
                                    {/* Background gradient effect */}
                                    <Box
                                        position="absolute"
                                        top="0"
                                        right="0"
                                        w="200px"
                                        h="200px"
                                        bg="rgba(74, 222, 128, 0.05)"
                                        borderRadius="full"
                                        filter="blur(80px)"
                                        pointerEvents="none"
                                    />
                                    
                                    <HStack justify="space-between" align="center" mb={6}>
                                        <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white" letterSpacing="-0.02em">
                                            Active Loan
                                        </Text>
                                        <Badge 
                                            colorPalette="green" 
                                            size="sm"
                                            px={3}
                                            py={1}
                                        >
                                            ACTIVE
                                        </Badge>
                                    </HStack>
                                    
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 4, md: 6 }} mb={6}>
                                        <Box 
                                            bg="rgba(0, 0, 0, 0.3)" 
                                            p={4} 
                                            borderRadius="lg"
                                            border="1px solid rgba(255, 255, 255, 0.05)"
                                        >
                                            <Text 
                                                color="rgba(255, 255, 255, 0.6)" 
                                                fontSize="xs" 
                                                fontWeight="600"
                                                letterSpacing="0.1em"
                                                textTransform="uppercase"
                                                mb={3}
                                            >
                                                Collateral Amount
                                            </Text>
                                            <HStack align="baseline" spacing={3}>
                                                <Text 
                                                    color="white" 
                                                    fontSize={{ base: "lg", md: "xl" }} 
                                                    fontWeight="700"
                                                    letterSpacing="-0.02em"
                                                    lineHeight="1"
                                                >
                                                    {displayedCollateral}
                                                </Text>
                                                <Text color="rgba(255, 255, 255, 0.5)" fontSize="sm" fontWeight="500">
                                                    {token0Info.tokenSymbol}
                                                </Text>
                                            </HStack>
                                        </Box>
                                        
                                        <Box 
                                            bg="rgba(0, 0, 0, 0.3)" 
                                            p={4} 
                                            borderRadius="lg"
                                            border="1px solid rgba(255, 255, 255, 0.05)"
                                        >
                                            <Text 
                                                color="rgba(255, 255, 255, 0.6)" 
                                                fontSize="xs" 
                                                fontWeight="600"
                                                letterSpacing="0.1em"
                                                textTransform="uppercase"
                                                mb={3}
                                            >
                                                Borrowed Amount
                                            </Text>
                                            <HStack align="baseline" spacing={3}>
                                                <Text 
                                                    color="white" 
                                                    fontSize={{ base: "lg", md: "xl" }} 
                                                    fontWeight="700"
                                                    letterSpacing="-0.02em"
                                                    lineHeight="1"
                                                >
                                                    {commify(formatEther(`${loanData.borrowAmount}`), 4)}
                                                </Text>
                                                <Text color="rgba(255, 255, 255, 0.5)" fontSize="sm" fontWeight="500">
                                                    {token1Info.tokenSymbol}
                                                </Text>
                                            </HStack>
                                        </Box>
                                        
                                        <Box 
                                            bg="rgba(0, 0, 0, 0.3)" 
                                            p={4} 
                                            borderRadius="lg"
                                            border="1px solid rgba(255, 255, 255, 0.05)"
                                        >
                                            <Text 
                                                color="rgba(255, 255, 255, 0.6)" 
                                                fontSize="xs" 
                                                fontWeight="600"
                                                letterSpacing="0.1em"
                                                textTransform="uppercase"
                                                mb={3}
                                            >
                                                Current LTV
                                            </Text>
                                            <HStack align="center" spacing={2}>
                                                <Text 
                                                    color={ltv > 80 ? "#ef4444" : ltv > 60 ? "#fbbf24" : "#4ade80"} 
                                                    fontSize={{ base: "lg", md: "xl" }} 
                                                    fontWeight="700"
                                                    letterSpacing="-0.02em"
                                                    lineHeight="1"
                                                >
                                                    {commifyDecimals(ltv, 2)}
                                                </Text>
                                                {/* <Box 
                                                    w="8px" 
                                                    h="8px" 
                                                    borderRadius="full"
                                                    bg={ltv > 80 ? "#ef4444" : ltv > 60 ? "#fbbf24" : "#4ade80"}
                                                    animation={ltv > 80 ? "pulse 2s infinite" : "none"}
                                                /> */}
                                            </HStack>
                                        </Box>
                                        
                                        <Box 
                                            bg="rgba(0, 0, 0, 0.3)" 
                                            p={4} 
                                            borderRadius="lg"
                                            border="1px solid rgba(255, 255, 255, 0.05)"
                                        >
                                            <Text 
                                                color="rgba(255, 255, 255, 0.6)" 
                                                fontSize="xs" 
                                                fontWeight="600"
                                                letterSpacing="0.1em"
                                                textTransform="uppercase"
                                                mb={3}
                                            >
                                                Expires In
                                            </Text>
                                            <HStack align="baseline" spacing={2}>
                                                <Text 
                                                    color="white" 
                                                    fontSize={{ base: "lg", md: "xl" }} 
                                                    fontWeight="700"
                                                    letterSpacing="-0.02em"
                                                    lineHeight="1"
                                                >
                                                    {getDaysLeft(`${loanData?.expires}`)}
                                                </Text>
                                                <Text color="rgba(255, 255, 255, 0.5)" fontSize="sm" fontWeight="500">
                                                    days
                                                </Text>
                                            </HStack>
                                        </Box>
                                    </SimpleGrid>
                                    
                                    <Box 
                                        borderTop="1px solid rgba(255, 255, 255, 0.08)" 
                                        pt={6}
                                        mt={2}
                                    >
                                        <Text 
                                            color="rgba(255, 255, 255, 0.6)" 
                                            fontSize="xs" 
                                            fontWeight="600"
                                            letterSpacing="0.1em"
                                            textTransform="uppercase"
                                            mb={4}
                                        >
                                            Quick Actions
                                        </Text>
                                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} w="100%">
                                            <Box>
                                                <LoanAddCollateral
                                                size="lg"
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
                                            </Box>
                                            <Box>
                                                <LoanRoll
                                                size="lg"
                                                isRolling={isRolling}
                                                setIsRolling={setIsRolling}
                                                isLoading={isLoading}
                                                isTokenInfoLoading={isTokenInfoLoading}
                                                ltv={ltv}
                                                duration={duration}
                                                loanData={loanData}
                                                rollLoanAmount={rollLoanAmount}
                                                token1Info={token1Info}
                                                handleClickRoll={handleClickRoll}
                                                getDaysLeft={getDaysLeft}
                                                calculateExpiryDate={calculateExpiryDate}
                                                />
                                            </Box>
                                        </SimpleGrid>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                        
                        {/* Right side - Wallet Box */}
                        {!isMobile && (
                            <WalletSidebar 
                                ethBalance={ethBalance}
                                token0Info={token0Info}
                                token1Info={token1Info}
                                address={address}
                            />
                        )}
                    </Flex>
                    
                    {/* Mobile Wallet Sidebar */}
                    {isMobile && isConnected && (
                        <Flex px={2} pb={4}>
                            <WalletSidebar 
                                ethBalance={ethBalance}
                                token0Info={token0Info}
                                token1Info={token1Info}
                                address={address}
                            />
                        </Flex>
                    )}
                    
                    {/* Loan History Section */}
                    <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4}>
                        {!isMobile && <Box w="350px" />}
                        <Box 
                            flex="1"
                            maxW={isMobile ? "100%" : "calc(100% - 350px - 300px - 32px)"}
                        >
                        <Box bg="#1a1a1a" borderRadius="lg" p={{ base: 4, md: 6 }}>
                                <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
                                    <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="white">
                                        Loan History
                                    </Text>
                                    {console.log("Rendering loan history, length:", loanHistory.length)}
                                    {loanHistory.length > 0 && (
                                        <Button
                                            mb={5}
                                            size="sm"
                                            onClick={() => setShowClearHistoryDialog(true)}
                                            bg="#2a2a2a"
                                            _hover={{ bg: "#3a3a3a", border: "1px solid green"  }}
                                        >
                                            <Text size="sm" color="white">Clear History</Text>
                                        </Button>
                                    )}
                                </Flex>
                                
                                {loanHistory.length > 0 ? (
                                    <>
                                        <VStack align="stretch" spacing={0}>
                                            {getPaginatedData(loanHistory, currentPage, itemsPerPage).map((loan, index) => (
                                                <SimpleGrid 
                                                    key={loan.id} 
                                                    p={{ base: "10px 12px", md: "12px 16px" }} 
                                                    columns={{ base: 2, md: 5 }} 
                                                    w="100%" 
                                                    fontSize={{ base: "xs", md: "sm" }} 
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
                                                        bg: index === getPaginatedData(loanHistory, currentPage, itemsPerPage).length - 1 ? "transparent" : "rgba(255, 255, 255, 0.04)"
                                                    }}
                                                >
                                                    {/* Badge */}
                                                    <GridItem>
                                                        <Badge
                                                            colorPalette={
                                                                loan.type === "borrow" ? "blue" : 
                                                                loan.type === "repay" ? "green" : 
                                                                loan.type === "add_collateral" ? "orange" :
                                                                "purple"
                                                            }
                                                            size="sm"
                                                        >
                                                            {loan.type === "add_collateral" ? "ADD COLL" : loan.type.toUpperCase()}
                                                        </Badge>
                                                    </GridItem>
                                                    {/* Amount */}
                                                    <Text color="white" fontWeight="bold">
                                                        {loan.type === "borrow" && `${loan.amount.toFixed(4)} ${token1Info?.tokenSymbol || "WMON"}`}
                                                        {loan.type === "repay" && `${loan.amount.toFixed(4)} ${token1Info?.tokenSymbol || "WMON"}`}
                                                        {loan.type === "roll" && `Extended loan`}
                                                        {loan.type === "add_collateral" && `${loan.amount.toFixed(4)} ${token0Info?.tokenSymbol || "TOKEN"}`}
                                                    </Text>
                                                    
                                                    {/* Details (or spacer) - hide on mobile */}
                                                    <Text color="#666" fontSize="xs" display={{ base: "none", md: "block" }}>
                                                        {loan.type === "borrow" && `${loan.duration || 0}d • ${loan.collateral?.toFixed(2) || "0"} ${token0Info?.tokenSymbol || "TOKEN"}`}
                                                        {loan.type === "repay" && `Fully repaid`}
                                                        {loan.type === "roll" && `Extended to ${loan.duration || 0}d`}
                                                        {loan.type === "add_collateral" && `Added collateral`}
                                                    </Text>
                                                    
                                                    {/* Transaction Hash - hide on mobile */}
                                                    <Text 
                                                        color="#4ade80" 
                                                        fontSize="xs"
                                                        cursor="pointer"
                                                        display={{ base: "none", md: "block" }}
                                                        _hover={{ textDecoration: "underline" }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const explorerUrl = config.chain === "monad" 
                                                                ? `https://monadexplorer.com/tx/${loan.txHash}`
                                                                : `https://bscscan.com/tx/${loan.txHash}`;
                                                            window.open(explorerUrl, "_blank");
                                                        }}
                                                    >
                                                        {loan.shortTxHash}
                                                    </Text>
                                                    
                                                    {/* Time - always visible */}
                                                    <Text color="#888" fontSize="xs" textAlign={{ base: "left", md: "right" }} minW="25px">
                                                        {Math.floor((Date.now() - loan.time.getTime()) / 60000) < 60
                                                            ? `${Math.floor((Date.now() - loan.time.getTime()) / 60000)}m`
                                                            : Math.floor((Date.now() - loan.time.getTime()) / 3600000) < 24
                                                            ? `${Math.floor((Date.now() - loan.time.getTime()) / 3600000)}h`
                                                            : `${Math.floor((Date.now() - loan.time.getTime()) / 86400000)}d`
                                                        }
                                                    </Text>
                                                </SimpleGrid>
                                            ))}
                                        </VStack>
                                        
                                        {/* Pagination Controls */}
                                        {getTotalPages(loanHistory, itemsPerPage) > 1 && (
                                            <HStack justify="center" mt={4} gap={2}>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    isDisabled={currentPage === 1}
                                                    bg="#2a2a2a"
                                                    _hover={{ bg: "#3a3a3a" }}
                                                >
                                                    Previous
                                                </Button>
                                                <HStack gap={1}>
                                                    {Array.from({ length: Math.min(5, getTotalPages(loanHistory, itemsPerPage)) }, (_, i) => {
                                                        const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                                                        if (pageNum > 0 && pageNum <= getTotalPages(loanHistory, itemsPerPage)) {
                                                            return (
                                                                <Button
                                                                    key={pageNum}
                                                                    size="sm"
                                                                    onClick={() => setCurrentPage(pageNum)}
                                                                    bg={currentPage === pageNum ? "#4ade80" : "#2a2a2a"}
                                                                    color={currentPage === pageNum ? "black" : "white"}
                                                                    _hover={{ bg: currentPage === pageNum ? "#4ade80" : "#3a3a3a" }}
                                                                    minW="40px"
                                                                >
                                                                    {pageNum}
                                                                </Button>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </HStack>
                                                <Button
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.min(getTotalPages(loanHistory, itemsPerPage), prev + 1))}
                                                    isDisabled={currentPage === getTotalPages(loanHistory, itemsPerPage)}
                                                    bg="#2a2a2a"
                                                    _hover={{ bg: "#3a3a3a" }}
                                                >
                                                    Next
                                                </Button>
                                            </HStack>
                                        )}
                                    </>
                                ) : (
                                    <Text color="#666" textAlign="center" py={8}>
                                        No loan history yet
                                    </Text>
                                )}
                            </Box>
                        </Box>
                    </Flex>
                </>
            ) : (
                <Box py={8} textAlign="center">
                    <Text color="#666">Invalid vault address</Text>
                </Box>
            )}
            
            {/* Clear History Confirmation Dialog */}
            <DialogRoot 
                open={showClearHistoryDialog} 
                onOpenChange={(e) => setShowClearHistoryDialog(e.open)}
                placement="center"
                motionPreset="scale"
            >
                <DialogContent
                    position="fixed"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    bg="rgba(26, 26, 26, 0.98)"
                    backdropFilter="blur(20px)"
                    border="1px solid rgba(255, 255, 255, 0.1)"
                    borderRadius="2xl"
                    boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.8)"
                    w="90%"
                    maxW="450px"
                    p={0}
                >
                    <DialogHeader 
                        borderBottom="1px solid rgba(255, 255, 255, 0.08)" 
                        p={6}
                        pb={5}
                    >
                        <DialogTitle 
                            fontSize="2xl" 
                            fontWeight="bold" 
                            color="white"
                            letterSpacing="-0.02em"
                        >
                            Clear Loan History
                        </DialogTitle>
                    </DialogHeader>
                    
                    <DialogBody px={6} py={8}>
                        <VStack align="start" spacing={4}>
                            <Text 
                                color="rgba(255, 255, 255, 0.85)" 
                                fontSize="md"
                                lineHeight="1.6"
                            >
                                Are you sure you want to clear all loan history?
                            </Text>
                            <Text 
                                color="rgba(255, 255, 255, 0.5)" 
                                fontSize="sm"
                                fontStyle="italic"
                            >
                                This action cannot be undone. All transaction records will be permanently deleted.
                            </Text>
                        </VStack>
                    </DialogBody>
                    
                    <DialogFooter 
                        gap={3} 
                        borderTop="1px solid rgba(255, 255, 255, 0.08)" 
                        p={6}
                        pt={5}
                    >
                        <DialogActionTrigger asChild>
                            <Button 
                                variant="outline"
                                size="md"
                                px={6}
                                bg="transparent"
                                borderColor="rgba(255, 255, 255, 0.15)"
                                color="rgba(255, 255, 255, 0.8)"
                                fontWeight="500"
                                _hover={{ 
                                    bg: "rgba(255, 255, 255, 0.05)",
                                    borderColor: "rgba(255, 255, 255, 0.25)",
                                    color: "white"
                                }}
                            >
                                Cancel
                            </Button>
                        </DialogActionTrigger>
                        <Button 
                            size="md"
                            px={6}
                            bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                            color="white"
                            fontWeight="600"
                            boxShadow="0 4px 12px rgba(239, 68, 68, 0.3)"
                            _hover={{ 
                                bg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                                boxShadow: "0 6px 16px rgba(239, 68, 68, 0.4)",
                                transform: "translateY(-1px)"
                            }}
                            _active={{
                                transform: "translateY(0)"
                            }}
                            onClick={() => {
                                setLoanHistory([]);
                                processedTxHashes.clear();
                                localStorage.removeItem('oikos_loan_history');
                                setShowClearHistoryDialog(false);
                            }}
                        >
                            Clear History
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </Container>
    );
};

export default Borrow;
