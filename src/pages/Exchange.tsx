import React, { useEffect, useState } from "react";
import {
  Container,
  VStack,
  Box,
  SimpleGrid,
  HStack,
  Heading,
  Image,
  Text,
  Button,
  Flex,
  Textarea,
  Input,
  Spinner,
  createListCollection,
  Table,
  IconButton,
  Badge,
  Tabs,
  Center
} from "@chakra-ui/react";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
    DialogBackdrop,
} from '../components/ui/dialog';
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox"
import { Tooltip } from "../components/ui/tooltip"
  
import { useAccount, useBalance, useContractRead } from "wagmi";
import { useSafeContractWrite } from "../hooks/useSafeContractWrite";
import { useAllowance } from "../hooks/useAllowance";
import { isMobile } from "react-device-detect";
import { tokenApi } from '../services/tokenApi';
import { Slider } from "../components/ui/slider"
import {
  StatRoot,
  StatLabel,
  StatValueText,
} from "../components/ui/stat";
import {
  NumberInputField,
  NumberInputLabel,
  NumberInputRoot,
} from "../components/ui/number-input"
import { Toaster, toaster } from "../components/ui/toaster"

import { useSearchParams } from "react-router-dom"; // Import useSearchParams

import { unCommify, commify, commifyDecimals, generateBytes32String, getContractAddress, generateReferralCode } from "../utils";
import WalletSidebar from "../components/WalletSidebar";
import StandaloneWrapModal from "../components/StandaloneWrapModal";
import StandaloneUnwrapModal from "../components/StandaloneUnwrapModal";
import StandaloneSlippageModal from "../components/StandaloneSlippageModal";
import UpcomingPresales from "../components/UpcomingPresales";
// import WalletNotConnected from '../components/WalletNotConnected';
import { useToken } from "../contexts/TokenContext";

import Logo from "../assets/images/noma_logo_transparent.png";

import { ethers } from "ethers"; // Import ethers.js
const { formatEther, parseEther } = ethers.utils;
const { utils, providers } = ethers;

// Helper function to safely parse ether values
const safeParseEther = (value) => {
    try {
        if (!value || value === "") return parseEther("0");
        
        const valueStr = value.toString();
        const valueNum = parseFloat(valueStr);
        
        if (!isNaN(valueNum) && isFinite(valueNum) && valueNum >= 0) {
            // Remove scientific notation and limit to 18 decimals
            const fixedValue = valueNum.toFixed(18).replace(/\.?0+$/, '');
            return parseEther(fixedValue);
        }
        
        return parseEther("0");
    } catch (error) {
        console.error("Error in safeParseEther:", error, "for value:", value);
        return parseEther("0");
    }
};

// Import AuxVault ABI
const AuxVaultArtifact = await import(`../assets/AuxVault.json`);
const AuxVaultAbi = AuxVaultArtifact.abi;

// Import Exchange Helper ABI
const ExchangeHelperArtifact = await import(`../assets/ExchangeHelper.json`);
const ExchangeHelperAbi = ExchangeHelperArtifact.abi;

// Import QuoterV2 ABI
const QuoterArtifact = await import(`../assets/QuoterV2.json`);
const QuoterAbi = QuoterArtifact.abi;

// Import ERC20 ABI
const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

// Import ModelHelper ABI
const ModelHelperArtifact = await import(`../assets/ModelHelper.json`);
const ModelHelperAbi = ModelHelperArtifact.abi;

// Import IWETH ABI
const IWETHArtifact = await import(`../assets/IWETH.json`);
const IWETHAbi = IWETHArtifact.abi;

import { ProgressLabel, ProgressBar, ProgressRoot, ProgressValueText } from "../components/ui/progress"
import PresaleDetails from "../components/PresaleDetails";
import usePresaleContract from '../hooks/usePresaleContract';
import { set } from "react-ga";
import placeholderLogo from "../assets/images/question_white.svg";
import wethLogo from "../assets/images/weth.svg";
import monadLogo from "../assets/images/monad.png";
import TrollBox from "../components/TrollBox";
import { ReferralStats } from "../components/ReferralStats";
import { referralApi } from "../services/referralApi";
import config from '../config';
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment.json";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";
import { LuSearch } from "react-icons/lu";
import { useMonPrice } from '../contexts/MonPriceContext';

const addresses = config.chain == "local"
  ? addressesLocal
  : addressesMonad;

const { environment, presaleContractAddress } = config;

const FactoryArtifact = await import(`../assets/NomaFactory.json`);
const FactoryAbi = FactoryArtifact.abi;
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");

const zeroAddress = "0x0000000000000000000000000000000000000000";

// Uniswap V3 Factory ABI for fetching pool addresses
const uniswapV3FactoryABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

// Uniswap V3 Pool ABI for events and slot0
const uniswapV3PoolABI = [
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
];

const feeTier = 3000;

import ReactApexChart from 'react-apexcharts'; 

// Get ExchangeHelper address
const exchangeHelperAddress = getContractAddress(
    config.chain === "local" ? addressesLocal : addresses, 
    config.chain === "local" ? "1337" : "10143", 
    "Exchange"
);

// Get ModelHelper address
const modelHelperAddress = getContractAddress(
    config.chain === "local" ? addressesLocal : addresses, 
    config.chain === "local" ? "1337" : "10143", 
    "ModelHelper"
);

// Provider setup
const localProvider = new providers.JsonRpcProvider(
    config.chain == "local" ? "http://localhost:8545" : config.RPC_URL
);

const Exchange: React.FC = () => {
    const { address, isConnected } = useAccount();
    const { selectedToken, setSelectedToken } = useToken();
    const { monPrice } = useMonPrice();
    const [searchTerm, setSearchTerm] = useState("");
    const [tradeAmount, setTradeAmount] = useState("");
    const [isBuying, setIsBuying] = useState(true);
    const [tradeHistoryTab, setTradeHistoryTab] = useState("all");
    const [totalVolume, setTotalVolume] = useState(0);
    // Parse referral code from URL
    const [searchParams] = useSearchParams();
    const urlReferralCode = searchParams.get("r") || "";
    
    // Referral state
    const [referralCode, setReferralCode] = useState("");
    const [referredBy, setReferredBy] = useState<string | null>(null);
    
    // Check token allowance for selling
    const { allowance, hasEnoughAllowance, isMaxApproved } = useAllowance(
        selectedToken?.token0,
        exchangeHelperAddress
    );
    
    // Check WETH allowance for buying with WETH
    const { 
        allowance: wethAllowance, 
        hasEnoughAllowance: hasEnoughWethAllowance,
        isMaxApproved: isMaxApprovedWeth
    } = useAllowance(
        selectedToken?.token1 || config.protocolAddresses.WMON,
        exchangeHelperAddress
    );
    
    // Input validation function
    const validateAndSetTradeAmount = (value) => {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = value.replace(/[^0-9.]/g, '');
        
        // Limit total input length to prevent UI issues (20 chars before decimal + . + 18 chars after)
        if (cleanedValue.length > 39) {
            toaster.create({
                title: "Invalid Input",
                description: "Number too large",
                status: "error",
                duration: 2000
            });
            return;
        }
        
        // Ensure only one decimal point
        const parts = cleanedValue.split('.');
        if (parts.length > 2) {
            toaster.create({
                title: "Invalid Input",
                description: "Only one decimal point allowed",
                status: "error",
                duration: 2000
            });
            return; // Invalid input, don't update
        }
        
        // Limit integer part to 20 digits to prevent UI overflow
        if (parts[0].length > 20) {
            toaster.create({
                title: "Invalid Input",
                description: "Number too large (max 20 digits)",
                status: "error",
                duration: 2000
            });
            return;
        }
        
        // Limit decimal places to 18 (ETH precision)
        if (parts.length === 2 && parts[1].length > 18) {
            toaster.create({
                title: "Invalid Input",
                description: "Maximum 18 decimal places allowed",
                status: "error",
                duration: 2000
            });
            return; // Too many decimal places
        }
        
        // Prevent leading zeros (except 0. or 0)
        if (cleanedValue.length > 1 && cleanedValue[0] === '0' && cleanedValue[1] !== '.') {
            toaster.create({
                title: "Invalid Input",
                description: "Remove leading zeros",
                status: "error",
                duration: 2000
            });
            return;
        }
        
        // Validate it's a valid number
        if (cleanedValue !== '' && cleanedValue !== '.' && isNaN(parseFloat(cleanedValue))) {
            toaster.create({
                title: "Invalid Input",
                description: "Enter a valid number",
                status: "error",
                duration: 2000
            });
            return;
        }
        
        // Check if the number is within JavaScript's safe number range
        if (cleanedValue !== '' && cleanedValue !== '.') {
            const numValue = parseFloat(cleanedValue);
            if (numValue > Number.MAX_SAFE_INTEGER) {
                toaster.create({
                    title: "Invalid Input",
                    description: "Number exceeds maximum safe value",
                    status: "error",
                    duration: 2000
                });
                return;
            }
        }
        
        setTradeAmount(cleanedValue);
        
        // Check balance after setting amount
        if (cleanedValue && parseFloat(cleanedValue) > 0) {
            const amount = parseFloat(cleanedValue);
            if (isBuying) {
                const availableBalance = useWeth 
                    ? parseFloat(wethBalance || "0")
                    : parseFloat(ethBalance || "0");
                
                if (amount > availableBalance) {
                    toaster.create({
                        title: "Insufficient Balance",
                        description: `You only have ${availableBalance.toFixed(4)} ${useWeth ? 'WMON' : 'MON'}`,
                        status: "error",
                        duration: 3000
                    });
                }
            } else if (selectedToken) {
                const tokenBalanceNum = parseFloat(tokenBalance || "0");
                if (amount > tokenBalanceNum) {
                    toaster.create({
                        title: "Insufficient Balance",
                        description: `You only have ${tokenBalanceNum.toFixed(4)} ${selectedToken.symbol}`,
                        status: "error",
                        duration: 3000
                    });
                }
            }
        }
    };
    
    // Helper to get validation state
    const getTradeValidationState = () => {
        if (!tradeAmount) return { isValid: true, message: "" };
        
        const amount = parseFloat(tradeAmount);
        if (isNaN(amount) || amount <= 0) {
            return { isValid: false, message: "Enter a valid amount" };
        }
        
        if (isBuying) {
            const availableBalance = useWeth 
                ? parseFloat(wethBalance || "0")
                : parseFloat(ethBalance || "0");
            
            if (amount > availableBalance) {
                return { 
                    isValid: false, 
                    message: `Insufficient ${useWeth ? 'WMON' : 'MON'} balance` 
                };
            }
        } else {
            const tokenBalanceNum = parseFloat(tokenBalance || "0");
            if (amount > tokenBalanceNum) {
                return { 
                    isValid: false, 
                    message: `Insufficient ${selectedToken?.symbol || 'token'} balance` 
                };
            }
        }
        
        return { isValid: true, message: "" };
    };
    const [isTokenListCollapsed, setIsTokenListCollapsed] = useState(false);
    
    // Exchange-related states
    const [isLoading, setIsLoading] = useState(false);
    const [ethBalance, setEthBalance] = useState("0");
    const [tokenBalance, setTokenBalance] = useState("0");
    const [wethBalance, setWethBalance] = useState("0");
    const [useWeth, setUseWeth] = useState(false);
    const [useMax, setUseMax] = useState(false);
    const [approveMax, setApproveMax] = useState(() => {
        // Load approveMax preference from localStorage
        const stored = localStorage.getItem('noma_approve_max');
        return stored === 'true';
    });
    const [spotPrice, setSpotPrice] = useState(0);
    const [floorPrice, setFloorPrice] = useState(0);
    const [slippage, setSlippage] = useState("1");
    const [quote, setQuote] = useState("");
    const [priceImpact, setPriceImpact] = useState("0");
    const [showQuoteLoading, setShowQuoteLoading] = useState(false);
    const [totalSupply, setTotalSupply] = useState("0");
    const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false);

    // Handler to update approveMax and persist to localStorage
    const handleApproveMaxChange = (value: boolean) => {
        setApproveMax(value);
        localStorage.setItem('noma_approve_max', value.toString());
    };
    
    // Token data from blockchain
    const [tokens, setTokens] = useState([]);
    const [isTokensLoading, setIsTokensLoading] = useState(true);
    const [vaultDescriptions, setVaultDescriptions] = useState([]);
    const [token1Symbol, setToken1Symbol] = useState("ETH"); // Default to ETH
    const [priceUSD, setPriceUSD] = useState(0); // Price of token1 in USD
    const [tokenProtocols, setTokenProtocols] = useState<{ [symbol: string]: string }>({});
    
    // Fetch IMV (Intrinsic Minimum Value) from ModelHelper contract
    const { data: imvData } = useContractRead({
        address: modelHelperAddress,
        abi: ModelHelperAbi,
        functionName: "getIntrinsicMinimumValue",
        args: selectedToken?.vault ? [selectedToken.vault] : undefined,
        watch: true,
        enabled: !!selectedToken?.vault
    });
    
    // Trade history data with local storage persistence
    const [tradeHistory, setTradeHistory] = useState([]);
    const [processedTxHashes] = useState(() => new Set());
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [myTxCurrentPage, setMyTxCurrentPage] = useState(1);
    const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
    
    useEffect(() => {
        const loadReferralStats = async () => {
            if (address) {
                try {
                    const vaultContract = new ethers.Contract(
                        selectedToken?.vault || zeroAddress,
                        AuxVaultAbi,
                        localProvider
                    );
                    console.log({ selectedToken });
                    if (typeof selectedToken?.vault == "undefined") return;

                    console.log(`Selected vault address is ${selectedToken?.vault}`);
                    const referralEntity = await vaultContract.getReferralEntity(address);

                    setTotalVolume(parseFloat(referralEntity.totalReferred || "0"));
                    console.log({ referralEntity}) 
                    console.log(`Total referred for ${address} is ${formatEther(referralEntity.totalReferred)}`);
                } catch (error) {
                    console.error("Error fetching referral stats:", error);
                }
            }
        };
        loadReferralStats();
    }, [address, selectedToken]);

    // Load trade history from local storage on mount
    useEffect(() => {
        const loadTradeHistory = () => {
            try {
                const stored = localStorage.getItem('noma_trade_history');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Convert time strings back to Date objects
                    const history = parsed.map(trade => ({
                        ...trade,
                        time: new Date(trade.time)
                    }));
                    setTradeHistory(history);
                    // Add loaded tx hashes to processed set
                    history.forEach(trade => {
                        if (trade.fullTxHash) {
                            processedTxHashes.add(trade.fullTxHash);
                        }
                    });
                }
            } catch (error) {
                console.error("Error loading trade history:", error);
            }
        };
        loadTradeHistory();
    }, []);
    
    // Handle referral code from URL
    useEffect(() => {
        const handleReferral = async () => {
            if (urlReferralCode && address) {
                try {
                    // Check if user is already referred via API
                    const referralStatus = await referralApi.checkReferral(address);
                    
                    if (referralStatus.referred) {
                        // User is already referred
                        setReferredBy(referralStatus.referralCode || '');
                        console.log(`User already referred by: ${referralStatus.referralCode}`);
                    } else {
                        // Check if user is trying to use their own referral code
                        const ownCode = generateReferralCode(address);
                        if (urlReferralCode === ownCode || urlReferralCode === `0x${ownCode}`) {
                            console.warn('Cannot use your own referral code');
                            toaster.create({
                                title: "Invalid Referral",
                                description: "You cannot use your own referral code",
                                status: "warning",
                                duration: 3000,
                            });
                            return;
                        }
                        
                        // Register new referral using only the code
                        await referralApi.registerReferral({
                            referralCode: urlReferralCode,
                            referrerAddress: '', // Will be resolved by backend
                            referredAddress: address
                        });
                        
                        setReferredBy(urlReferralCode);
                        console.log(`User ${address} referred by code: ${urlReferralCode}`);
                        
                        // Also keep localStorage as backup
                        localStorage.setItem(`noma_referred_by_${address}`, urlReferralCode);
                    }
                } catch (error) {
                    console.error('Error handling referral:', error);
                    // Fallback to localStorage
                    const existingReferral = localStorage.getItem(`noma_referred_by_${address}`);
                    if (existingReferral) {
                        setReferredBy(existingReferral);
                    }
                }
            } else if (address) {
                // Check for existing referral
                try {
                    const referralStatus = await referralApi.checkReferral(address);
                    if (referralStatus.referred) {
                        setReferredBy(referralStatus.referralCode || '');
                    } else {
                        // Fallback to localStorage
                        const existingReferral = localStorage.getItem(`noma_referred_by_${address}`);
                        if (existingReferral) {
                            setReferredBy(existingReferral);
                        }
                    }
                } catch (error) {
                    console.error('Error checking referral:', error);
                }
            }
            
            // Generate referral code for current user
            if (address) {
                const code = generateReferralCode(address);
                setReferralCode(code || ""); // Already returns 8 chars
            }
        };
        
        handleReferral();
    }, [urlReferralCode, address]);
    
    // Save trade history to local storage whenever it changes
    useEffect(() => {
        if (tradeHistory.length > 0) {
            try {
                localStorage.setItem('noma_trade_history', JSON.stringify(tradeHistory));
            } catch (error) {
                console.error("Error saving trade history:", error);
            }
        }
    }, [tradeHistory]);
    
    // Function to clear trade history
    const clearTradeHistory = () => {
        setTradeHistory([]);
        processedTxHashes.clear();
        localStorage.removeItem('noma_trade_history');
    };
    
    // Function to track referral trade
    const trackReferralTrade = async (tradeData: {
        type: 'buy' | 'sell';
        tokenAddress: string;
        tokenName: string;
        tokenSymbol: string;
        volumeETH: string;
        volumeUSD: number;
        txHash: string;
    }) => {
        if (!referredBy || !address) return;
        
        try {
            // Track trade via API
            await referralApi.trackTrade({
                userAddress: address,
                referralCode: referredBy,
                type: tradeData.type,
                tokenAddress: tradeData.tokenAddress,
                tokenName: tradeData.tokenName,
                tokenSymbol: tradeData.tokenSymbol,
                volumeETH: tradeData.volumeETH,
                volumeUSD: tradeData.volumeUSD.toString(),
                txHash: tradeData.txHash
            });
            
            console.log('Referral trade tracked via API');
            
            // Also store locally as backup
            const referralTrades = JSON.parse(localStorage.getItem('noma_referral_trades') || '[]');
            const newTrade = {
                id: Date.now() + Math.random(),
                userAddress: address,
                referralCode: referredBy,
                type: tradeData.type,
                tokenAddress: tradeData.tokenAddress,
                tokenName: tradeData.tokenName,
                tokenSymbol: tradeData.tokenSymbol,
                volumeETH: tradeData.volumeETH,
                volumeUSD: tradeData.volumeUSD.toString(),
                txHash: tradeData.txHash,
                timestamp: Date.now()
            };
            
            referralTrades.push(newTrade);
            localStorage.setItem('noma_referral_trades', JSON.stringify(referralTrades));
        } catch (error) {
            console.error('Error tracking referral trade:', error);
            // If API fails, still try to save locally
            try {
                const referralTrades = JSON.parse(localStorage.getItem('noma_referral_trades') || '[]');
                const newTrade = {
                    id: Date.now() + Math.random(),
                    userAddress: address,
                    referralCode: referredBy,
                    type: tradeData.type,
                    tokenAddress: tradeData.tokenAddress,
                    tokenName: tradeData.tokenName,
                    tokenSymbol: tradeData.tokenSymbol,
                    volumeETH: tradeData.volumeETH,
                    volumeUSD: tradeData.volumeUSD.toString(),
                    txHash: tradeData.txHash,
                    timestamp: Date.now()
                };
                
                referralTrades.push(newTrade);
                localStorage.setItem('noma_referral_trades', JSON.stringify(referralTrades));
            } catch (localError) {
                console.error('Error saving referral trade locally:', localError);
            }
        }
    };
    
    // Pagination helper functions
    const getPaginatedData = (data, page, perPage) => {
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        return data.slice(startIndex, endIndex);
    };
    
    const getTotalPages = (data, perPage) => {
        return Math.ceil(data.length / perPage);
    };
    
    // Mock data for price chart
    const mockPoolAddress = "0x1234567890123456789012345678901234567890";
    const mockIMV = "1000000000000000000"; // 1 ETH in wei
    const mockPriceUSD = "3500";
    
    const [percentChange, setPercentChange] = useState(0);
    const [intervalVolume, setIntervalVolume] = useState(0); // Volume for selected interval
    const [chartSeries, setChartSeries] = useState([]);
    const [chartTimeframe, setChartTimeframe] = useState("24h");
    const [chartGranularity, setChartGranularity] = useState("30m");
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [ethPriceUSD, setEthPriceUSD] = useState(3500); // Default ETH price
    const [chartUpdateTrigger, setChartUpdateTrigger] = useState(0); // Trigger chart updates
    
    // Trade execution states
    const [buyArgs, setBuyArgs] = useState([]);
    const [sellArgs, setSellArgs] = useState([]);
    const [poolInfo, setPoolInfo] = useState({ poolAddress: null });
    const [isLoadingExecuteTrade, setIsLoadingExecuteTrade] = useState(false);
    const [balanceBeforePurchase, setBalanceBeforePurchase] = useState(0);
    const [balanceBeforeSale, setBalanceBeforeSale] = useState(0);
    
    // Calculate safe minimum Y value from chart data
    const computedMinY = chartSeries.length > 0 && chartSeries[0].data && chartSeries[0].data.length > 0
        ? Math.min(...chartSeries[0].data.map((item) => item.y[2])) * 0.95 // Use the lowest 'low' value with 5% padding
        : 0;
    const safeMinY = Math.max(0, computedMinY);
    
    // Chart options with professional styling
    const [chartOptions, setChartOptions] = useState({
        chart: {
            type: 'candlestick',
            background: '#1a1a1a',
            width: '100%',
            toolbar: {
                show: true,
                tools: {
                    download: false,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                },
                autoSelected: 'pan'
            },
            zoom: {
                enabled: true,
                type: 'x',
                autoScaleYaxis: true
            },
            selection: {
                enabled: true,
                type: 'x'  
            },
            pan: {
                enabled: true,
                type: 'x'
            },
            animations: {
                enabled: true,
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                }
            },
            dropShadow: {
                enabled: false
            },
            foreColor: '#888'
        },
        grid: {
            show: true,
            borderColor: '#2a2a2a',
            strokeDashArray: 0,
            xaxis: {
                lines: {
                    show: true,
                    color: '#252525'
                }
            },
            yaxis: {
                lines: {
                    show: true,
                    color: '#252525'
                }
            },
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                style: {
                    colors: '#4a4a4a',
                    fontSize: '10px',
                    fontFamily: 'inherit'
                },
                datetimeFormatter: {
                    hour: 'HH:mm'
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            },
            tooltip: {
                enabled: false
            }
        },
        yaxis: {
            opposite: true,
            min: safeMinY,
            forceNiceScale: true,
            labels: {
                style: {
                    colors: '#4a4a4a',
                    fontSize: '10px',
                    fontFamily: 'inherit'
                },
                formatter: (value) => {
                    if (!value || isNaN(value)) return '0';
                    if (value < 0.00001) return value.toFixed(8);
                    if (value < 0.01) return value.toFixed(6);
                    return value.toFixed(2);
                }
            },
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            }
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: '#22c55e',
                    downward: '#ef4444'
                },
                wick: {
                    useFillColor: true
                }
            }
        },
        stroke: {
            show: true,
            colors: ['#999'],
            width: 1
        },
        tooltip: {
            enabled: true,
            theme: 'dark',
            style: {
                fontSize: '11px',
                fontFamily: 'inherit'
            },
            x: {
                format: 'dd MMM HH:mm'
            },
            custom: function({ seriesIndex, dataPointIndex, w }) {
                try {
                    const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
                    const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
                    const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
                    const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
                    
                    if (!o || !h || !l || !c) return '';
                    
                    const formatValue = (val) => {
                        if (!val || isNaN(val)) return '0';
                        if (val < 0) return '0'; // Don't show negative values
                        if (val < 0.00001) return val.toFixed(8);
                        if (val < 0.01) return val.toFixed(8);
                        return val.toFixed(4);
                    };
                    
                    return '<div class="apexcharts-tooltip-candlestick" style="padding: 10px; background: #000; border: 1px solid #333; border-radius: 6px;">' +
                        '<div style="color: #666; font-size: 10px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">OHLC</div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #666; font-size: 11px;">Open:</span> <span style="color: #fff; margin-left: 20px; font-size: 11px;">' + formatValue(o) + '</span></div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #666; font-size: 11px;">High:</span> <span style="color: #22c55e; margin-left: 20px; font-size: 11px;">' + formatValue(h) + '</span></div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: 3px;"><span style="color: #666; font-size: 11px;">Low:</span> <span style="color: #dc2626; margin-left: 20px; font-size: 11px;">' + formatValue(l) + '</span></div>' +
                        '<div style="display: flex; justify-content: space-between;"><span style="color: #666; font-size: 11px;">Close:</span> <span style="color: #fff; margin-left: 20px; font-size: 11px;">' + formatValue(c) + '</span></div>' +
                    '</div>';
                } catch (e) {
                    return '';
                }
            }
        },
        annotations: {
            yaxis: [{
                y: 0, // This will be updated dynamically
                borderColor: '#4ade8040', // 40% opacity
                strokeDashArray: 5,
                borderWidth: 2,
                label: {
                    borderColor: '#4ade80',
                    borderWidth: 1,
                    borderRadius: 0,
                    style: {
                        color: '#000',
                        background: '#4ade80',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: {
                            left: 5,
                            right: 5,
                            top: 2,
                            bottom: 2
                        }
                    },
                    text: 'Spot Price',
                    textAnchor: 'middle',
                    position: 'right',
                    offsetX: 73,
                    offsetY: 0
                }
            }]
        }
    });

    // Generate mock OHLC data for chart
    const generateMockOHLCData = (timeframe) => {
        const data = [];
        const now = Date.now();
        let points = 24;
        let interval = 3600000; // 1 hour
        
        switch (timeframe) {
            case "15m":
                points = 15;
                interval = 60000; // 1 minute
                break;
            case "1h":
                points = 12;
                interval = 300000; // 5 minutes
                break;
            case "24h":
                points = 24;
                interval = 3600000; // 1 hour
                break;
            case "1w":
                points = 28;
                interval = 21600000; // 6 hours
                break;
            case "1M":
                points = 30;
                interval = 86400000; // 24 hours
                break;
        }
        
        let basePrice = selectedToken && selectedToken.price > 0 ? selectedToken.price : 0.0000186;
        
        // Ensure basePrice is a valid number
        if (isNaN(basePrice) || !isFinite(basePrice)) {
            basePrice = 0.0000186;
        }
        
        for (let i = points; i >= 0; i--) {
            const variation = (Math.random() - 0.5) * basePrice * 0.1;
            const open = Math.max(0.0000001, basePrice + variation);
            const close = Math.max(0.0000001, basePrice + (Math.random() - 0.5) * basePrice * 0.1);
            const high = Math.max(open, close) * (1 + Math.random() * 0.05);
            const low = Math.min(open, close) * (1 - Math.random() * 0.05);
            
            // Validate all values are finite numbers
            if (isFinite(open) && isFinite(high) && isFinite(low) && isFinite(close)) {
                data.push({
                    x: new Date(now - (i * interval)),
                    y: [
                        parseFloat(open.toFixed(8)),
                        parseFloat(high.toFixed(8)),
                        parseFloat(low.toFixed(8)),
                        parseFloat(close.toFixed(8))
                    ]
                });
            }
            
            basePrice = close;
        }
        
        return data;
    };
    
    const API_BASE_URL = import.meta.env.VITE_CHAIN === "local" ? "http://localhost:3001" : "https://pricefeed.noma.money";
    
    // Map chart timeframe to API interval
    const mapTimeframeToApiInterval = (timeframe: string): string => {
        switch (timeframe) {
            case "15m": return "15m";
            case "1h": return "1h";
            case "24h": return "24h";
            case "1w": return "7d";
            case "1M": return "30d";
            default: return "24h";
        }
    };
    
    // Fetch token price stats including percentage change based on interval
    const fetchTokenPriceStats = async (interval: string = "24h", pool?: string) => {
        try {
            const apiInterval = mapTimeframeToApiInterval(interval);
            const url = new URL(`${API_BASE_URL}/api/stats`);
            url.searchParams.append('interval', apiInterval);
            
            // Add pool parameter if available
            if (pool && pool !== '0x0000000000000000000000000000000000000000') {
                url.searchParams.append('pool', pool);
                console.log('[fetchTokenPriceStats] Adding pool parameter:', pool);
            } else {
                console.log('[fetchTokenPriceStats] No pool parameter provided or zero address');
            }
            
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching price stats:", error);
            return null;
        }
    };
    
    // Helper function to get time parameters for API
    const getTimeParams = (timeframe, granularity) => {
        const now = Date.now();
        let fromTimestamp;
        
        switch (timeframe) {
            case "15m":
                fromTimestamp = now - (15 * 60 * 1000);
                break;
            case "1h":
                fromTimestamp = now - (60 * 60 * 1000);
                break;
            case "24h":
                fromTimestamp = now - (24 * 60 * 60 * 1000);
                break;
            case "1w":
                fromTimestamp = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case "1M":
                fromTimestamp = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default:
                fromTimestamp = now - (24 * 60 * 60 * 1000);
        }
        
        return {
            from_timestamp: fromTimestamp,
            to_timestamp: now,
            interval: granularity
        };
    };
    
    // Fetch OHLC data from API
    const fetchOHLCData = async (timeframe, granularity, pool?) => {
        try {
            const { from_timestamp, to_timestamp, interval } = getTimeParams(timeframe, granularity);
            
            const url = new URL(`${API_BASE_URL}/api/price/ohlc`);
            url.searchParams.append('from_timestamp', from_timestamp.toString());
            url.searchParams.append('to_timestamp', to_timestamp.toString());
            url.searchParams.append('interval', interval);
            
            // Add pool address if available
            if (pool && pool !== '0x0000000000000000000000000000000000000000') {
                url.searchParams.append('pool', pool);
                console.log('[fetchOHLCData] Adding pool parameter:', pool);
            } else {
                console.log('[fetchOHLCData] No pool parameter provided or zero address');
            }
            
            console.log('[fetchOHLCData] Final URL:', url.toString());
            
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const responseJson = await response.json();
            
            if (responseJson && responseJson.ohlc && Array.isArray(responseJson.ohlc)) {
                const ohlcData = responseJson.ohlc
                    .map((candle) => {
                        const open = parseFloat(candle.open);
                        const high = parseFloat(candle.high);
                        const low = parseFloat(candle.low);
                        const close = parseFloat(candle.close);
                        
                        if (isFinite(open) && isFinite(high) && isFinite(low) && isFinite(close)) {
                            return {
                                x: new Date(candle.timestamp),
                                y: [open, high, low, close]
                            };
                        }
                        return null;
                    })
                    .filter(Boolean);
                
                return ohlcData.length > 0 ? ohlcData : generateMockOHLCData(timeframe);
            } else {
                return generateMockOHLCData(timeframe);
            }
        } catch (error) {
            console.error("Error fetching OHLC data:", error);
            return generateMockOHLCData(timeframe);
        }
    };
    
    // Update chart data when selected token or timeframe changes
    useEffect(() => {
        if (!selectedToken) {
            setChartSeries([]);
            setPercentChange(0);
            return;
        }
        
        // Reset chart when token changes
        setChartSeries([]);
        
        // Fetch data from API
        const loadChartData = async () => {
            // console.log("Loading chart data for token:", selectedToken.symbol, "timeframe:", chartTimeframe);
            setIsChartLoading(true);
            
            try {
                console.log('[loadChartData] poolInfo:', poolInfo);
                
                // Skip API calls if no pool address is available
                if (!poolInfo.poolAddress || poolInfo.poolAddress === '0x0000000000000000000000000000000000000000') {
                    console.log('[loadChartData] Skipping API calls - no valid pool address');
                    setIsChartLoading(false);
                    return;
                }
                
                // First try to fetch price stats for accurate percentage and volume based on selected interval
                const priceStats = await fetchTokenPriceStats(chartTimeframe, poolInfo.poolAddress);
                if (priceStats) {
                    if (priceStats.percentageChange !== undefined) {
                        setPercentChange(priceStats.percentageChange);
                    }
                    
                    // Set volume based on selected interval
                    if (priceStats && priceStats.volume) {
                        const intervalKey = mapTimeframeToApiInterval(chartTimeframe);
                        const volume = priceStats.volume[intervalKey] || priceStats.volume['24h'] || 0;
                        console.log('[Volume Debug] Pool:', poolInfo.poolAddress, 'API response:', priceStats, 'Selected interval:', intervalKey, 'Volume in MON:', volume);
                        setIntervalVolume(volume);
                    } else {
                        console.log('[Volume Debug] No volume data from API, setting to 0');
                        setIntervalVolume(0);
                    }
                }
                
                const ohlcData = await fetchOHLCData(chartTimeframe, chartGranularity, poolInfo.poolAddress);
                
                // Validate data before setting
                if (ohlcData && ohlcData.length > 0) {
                    // console.log("Chart data loaded:", ohlcData.length, "candles");
                    setChartSeries([{
                        name: `${selectedToken.symbol}/${token1Symbol}`,
                        data: ohlcData
                    }]);
                    
                    // Calculate percentage change based on timeframe
                    const calculatePercentChange = (data, timeframe) => {
                        if (!data || data.length < 2) return 0;
                        
                        const now = new Date().getTime();
                        let targetTimeAgo;
                    
                    // Calculate how far back to look based on the timeframe
                    switch (timeframe) {
                        case "15m":
                            targetTimeAgo = 15 * 60 * 1000; // 15 minutes
                            break;
                        case "1h":
                            targetTimeAgo = 60 * 60 * 1000; // 1 hour
                            break;
                        case "24h":
                            targetTimeAgo = 24 * 60 * 60 * 1000; // 24 hours
                            break;
                        case "1w":
                            targetTimeAgo = 7 * 24 * 60 * 60 * 1000; // 1 week
                            break;
                        case "1M":
                            targetTimeAgo = 30 * 24 * 60 * 60 * 1000; // 30 days
                            break;
                        default:
                            targetTimeAgo = 24 * 60 * 60 * 1000; // Default to 24h
                    }
                    
                    const targetTime = now - targetTimeAgo;
                    
                    // Find the candle closest to our target time
                    let targetCandle = data[0];
                    for (const candle of data) {
                        const candleTime = candle.x.getTime();
                        if (candleTime >= targetTime) {
                            break;
                        }
                        targetCandle = candle;
                    }
                    
                    const firstPrice = targetCandle.y[0]; // Open price of target candle
                    const lastPrice = data[data.length - 1].y[3]; // Close price of latest candle
                    
                    if (isFinite(firstPrice) && isFinite(lastPrice) && firstPrice > 0) {
                        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
                        return isFinite(change) ? change : 0;
                    }
                    
                    return 0;
                };
                
                // Only calculate from OHLC if we didn't get it from the API
                if (!priceStats || priceStats.percentageChange === undefined) {
                    const change = calculatePercentChange(ohlcData, chartTimeframe);
                    // console.log("Calculated percentage change:", change, "for timeframe:", chartTimeframe);
                    setPercentChange(change);
                }
            } else {
                // console.log("No chart data available");
                setChartSeries([{
                    name: `${selectedToken.symbol}/${token1Symbol}`,
                    data: []
                }]);
                // Only reset to 0 if we didn't get data from API
                if (!priceStats || priceStats.percentageChange === undefined) {
                    setPercentChange(0);
                }
            }
            } catch (error) {
                console.error("Error loading chart data:", error);
                setChartSeries([{
                    name: `${selectedToken.symbol}/${token1Symbol}`,
                    data: []
                }]);
                // Keep any API-fetched percentage even if chart fails
                if (!priceStats || priceStats.percentageChange === undefined) {
                    setPercentChange(0);
                }
            } finally {
                setIsChartLoading(false);
            }
        };
        
        // Load data immediately
        loadChartData();
        
        // Refresh chart every 30 seconds to get latest candles
        const interval = setInterval(() => {
            loadChartData();
        }, 30000);
        
        return () => clearInterval(interval);
        
    }, [selectedToken?.id, chartTimeframe, chartGranularity, token1Symbol, chartUpdateTrigger]);

    // Listen to Uniswap pool events for real-time price updates
    useEffect(() => {
        if (!poolInfo.poolAddress || poolInfo.poolAddress === zeroAddress) return;
        
        // console.log("Setting up event listener for pool:", poolInfo.poolAddress);
        
        const poolContract = new ethers.Contract(
            poolInfo.poolAddress,
            uniswapV3PoolABI,
            localProvider
        );
        
        // Function to update price from sqrtPriceX96
        const updatePriceFromSqrtPriceX96 = (sqrtPriceX96) => {
            try {
                // Convert sqrtPriceX96 to price
                // price = (sqrtPriceX96 / 2^96)^2
                const sqrtPrice = parseFloat(sqrtPriceX96.toString()) / Math.pow(2, 96);
                const price = Math.pow(sqrtPrice, 2);
                
                // If token0 is WETH/ETH, we need to invert the price
                const isToken0Weth = selectedToken?.token1?.toLowerCase() === config.protocolAddresses.WMON?.toLowerCase();
                const finalPrice = isToken0Weth ? price : 1 / price;
                
                // console.log("Price updated from pool event:", finalPrice);
                
                // Update the selected token's price
                if (selectedToken) {
                    // Safely convert price to string with fixed decimals
                    let priceString;
                    try {
                        // Ensure we have a valid number and limit decimals to 18
                        const priceNum = parseFloat(finalPrice.toString());
                        if (!isNaN(priceNum) && isFinite(priceNum)) {
                            // Convert to fixed decimals, max 18 for Ethereum
                            priceString = priceNum.toFixed(18).replace(/\.?0+$/, '');
                            
                            setSelectedToken(prev => ({
                                ...prev,
                                price: finalPrice,
                                spotPrice: parseEther(priceString)
                            }));
                            
                            // Update tokens list
                            setTokens(prevTokens => 
                                prevTokens.map(token => 
                                    token.id === selectedToken.id 
                                        ? { ...token, price: finalPrice, spotPrice: parseEther(priceString) }
                                        : token
                                )
                            );
                        } else {
                            console.error("Invalid price value:", finalPrice);
                        }
                    } catch (error) {
                        console.error("Error parsing price:", error);
                    }
                }
                    
                // Trigger chart update
                setChartUpdateTrigger(prev => prev + 1);
            } catch (error) {
                console.error("Error updating price from event:", error);
            }
        };
        
        // Listen to Swap events
        const handleSwap = async (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
            // console.log("Swap event detected");
            updatePriceFromSqrtPriceX96(sqrtPriceX96);
            
            // Add transaction to trade history
            try {
                const txHash = event.transactionHash;
                
                // Check if we've already processed this transaction
                if (processedTxHashes.has(txHash)) {
                    console.log("Transaction already processed:", txHash);
                    return;
                }
                
                // Skip if no actual amounts were swapped
                if (amount0.isZero() && amount1.isZero()) {
                    return;
                }
                
                // Mark as processed immediately to prevent duplicates
                processedTxHashes.add(txHash);
                
                const block = await event.getBlock();
                const timestamp = new Date(block.timestamp * 1000);
                
                // Determine if it's a buy or sell based on amounts and token positions
                // IMPORTANT: We need to check which position our selected token is in the pool
                // The pool's token0/token1 ordering may be different from our selectedToken.token0/token1
                
                // We know that token1 is always the reserve asset (MON/WMON)
                // So token0 is always the token being traded (e.g., NOMA)
                // We just need to check if our selectedToken.token0 matches the pool's token0
                
                const isSelectedTokenPoolToken0 = selectedToken?.token0?.toLowerCase() === poolInfo?.token0?.toLowerCase();
                
                // If our selected token is in the pool's token0 position:
                //   - amount0 < 0 means our token is flowing OUT of the pool (someone is BUYING our token)
                //   - amount0 > 0 means our token is flowing INTO the pool (someone is SELLING our token)
                // If our selected token is in the pool's token1 position:
                //   - amount1 < 0 means our token is flowing OUT of the pool (someone is BUYING our token)
                //   - amount1 > 0 means our token is flowing INTO the pool (someone is SELLING our token)
                const isBuy = isSelectedTokenPoolToken0 ? amount0.lt(0) : amount1.lt(0);
                
                // Get the correct amounts based on which token is which in the pool
                const tokenAmount = isSelectedTokenPoolToken0 ? amount0.abs() : amount1.abs();
                const ethAmount = isSelectedTokenPoolToken0 ? amount1.abs() : amount0.abs();
                
                // Calculate price
                const tokenAmountFormatted = parseFloat(formatEther(tokenAmount));
                const ethAmountFormatted = parseFloat(formatEther(ethAmount));
                
                // Price should be MON per TOKEN (how much MON for 1 TOKEN)
                // If buying: we spend MON to get TOKEN, so price = MON spent / TOKEN received
                // If selling: we give TOKEN to get MON, so price = MON received / TOKEN given
                const price = tokenAmountFormatted > 0 ? ethAmountFormatted / tokenAmountFormatted : 0;
                
                const newTrade = {
                    id: Date.now() + Math.random(), // Unique ID
                    type: isBuy ? "buy" : "sell",
                    token: selectedToken?.symbol || "TOKEN",
                    amount: tokenAmountFormatted, // Amount of TOKEN bought/sold
                    price: price, // Price in MON per TOKEN
                    total: ethAmountFormatted, // Total MON spent/received
                    time: timestamp,
                    txHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`,
                    // For swap events, sender is the router/pool, recipient is the user
                    sender: recipient, // The actual user who initiated the trade
                    recipient: sender, // The pool/router contract
                    fullTxHash: txHash
                };
                
                // Add to trade history (most recent first)
                setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]); // Keep last 100 trades
            } catch (error) {
                console.error("Error processing swap event:", error);
            }
        };
        
        // Get initial price from slot0
        const getInitialPrice = async () => {
            try {
                const slot0 = await poolContract.slot0();
                updatePriceFromSqrtPriceX96(slot0.sqrtPriceX96);
            } catch (error) {
                console.error("Error fetching initial price:", error);
            }
        };
        
        getInitialPrice();
        
        // Record the timestamp when we start listening
        const startListeningTime = Date.now();
        // console.log("Starting to listen for Swap events at:", new Date(startListeningTime));
        
        // Modified handleSwap to check timestamp
        const handleSwapWithTimeCheck = async (...args) => {
            try {
                const event = args[args.length - 1];
                const block = await event.getBlock();
                const eventTimestamp = block.timestamp * 1000;
                
                // Only process events that happened after we started listening
                if (eventTimestamp < startListeningTime) {
                    console.log("Ignoring historical event from:", new Date(eventTimestamp));
                    return;
                }
                
                // Process the event
                await handleSwap(...args);
            } catch (error) {
                console.error("Error in handleSwapWithTimeCheck:", error);
            }
        };
        
        // Attach event listener
        poolContract.on("Swap", handleSwapWithTimeCheck);
        
        // Cleanup
        return () => {
            // console.log("Removing pool event listener");
            poolContract.off("Swap", handleSwapWithTimeCheck);
        };
    }, [poolInfo.poolAddress, selectedToken?.id, selectedToken?.symbol]);

    // Fetch token1 symbol and spot price when token is selected
    useEffect(() => {
        if (!selectedToken || !selectedToken.token1 || !selectedToken.vault) return;
        
        const fetchTokenInfo = async () => {
            try {
                // Fetch token1 info
                const token1Contract = new ethers.Contract(
                    selectedToken.token1,
                    ERC20Abi,
                    localProvider
                );
                const token0Contract = new ethers.Contract(
                    selectedToken.token0,
                    ERC20Abi,
                    localProvider
                )

                const totalSupply = await token0Contract.totalSupply();
                setTotalSupply(totalSupply);
                
                const symbol = await token1Contract.symbol();
                setToken1Symbol(symbol);
                
                // If token1 is WETH/WMON, set it as MON for display
                if (symbol === "WMON" || symbol === "WETH") {
                    setToken1Symbol("MON");
                }
                
                // Fetch spot price from vault contract
                const VaultAbi = [
                    "function getVaultInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, address, address, uint256)"
                ];
                
                const vaultContract = new ethers.Contract(
                    selectedToken.vault,
                    VaultAbi,
                    localProvider
                );
                
                try {
                    const vaultInfo = await vaultContract.getVaultInfo();
                    // The vault info is returned as an array/tuple
                    // We only need the spot price from index 2
                    const spotPriceFromContract = vaultInfo[2]; // spotPriceX96 is at index 2
                    
                    const formattedPrice = formatEther(spotPriceFromContract);
                    const numericPrice = parseFloat(formattedPrice);
                    
                    if (!isNaN(numericPrice) && isFinite(numericPrice) && numericPrice > 0) {
                        setSpotPrice(numericPrice);
                    } else {
                        console.warn("Invalid spot price from contract, using fallback");
                        setSpotPrice(selectedToken.price || 0.0000186);
                    }
                    
                    // Floor price (IMV) is now fetched separately via useContractRead
                } catch (error) {
                    console.error("Error fetching vault info:", error);
                    // Fallback to token price if vault info fails
                    setSpotPrice(selectedToken.price || 0.0000186);
                }
                
                // Fetch pool address and token ordering
                if (selectedToken.token0 && selectedToken.token1) {
                    try {
                        // Determine protocol for this token - use token's own protocol or default to uniswap
                        const protocol = selectedToken.selectedProtocol || tokenProtocols[selectedToken.symbol] || "uniswap";
                        const poolAddress = await fetchPoolAddress(selectedToken.token0, selectedToken.token1, protocol);
                        
                        // Get token0 and token1 from the pool to determine correct ordering
                        if (poolAddress && poolAddress !== zeroAddress) {
                            const poolContract = new ethers.Contract(
                                poolAddress,
                                uniswapV3PoolABI,
                                localProvider
                            );
                            
                            const [poolToken0, poolToken1] = await Promise.all([
                                poolContract.token0(),
                                poolContract.token1()
                            ]);
                            
                            setPoolInfo({ 
                                poolAddress, 
                                token0: poolToken0,
                                token1: poolToken1
                            });
                        } else {
                            setPoolInfo({ poolAddress });
                        }
                    } catch (error) {
                        console.error("Error fetching pool info:", error);
                        setPoolInfo({ poolAddress: null });
                    }
                }
                
                // Set USD price for MON
                setPriceUSD(monPrice || 0);
            } catch (error) {
                console.error("Error fetching token info:", error);
                // Default to ETH if error
                setToken1Symbol("ETH");
                setSpotPrice(selectedToken.price);
            }
        };
        
        fetchTokenInfo();
    }, [selectedToken, monPrice]);

    // Update floor price when IMV data changes
    useEffect(() => {
        if (imvData) {
            // console.log("Raw IMV data from contract:", imvData);
            const formattedIMV = formatEther(imvData);
            const numericIMV = parseFloat(formattedIMV);
            
            // console.log("Formatted IMV:", formattedIMV, "Numeric:", numericIMV);
            
            if (!isNaN(numericIMV) && isFinite(numericIMV) && numericIMV > 0) {
                setFloorPrice(numericIMV);
                // console.log("Floor price (IMV) set to:", numericIMV);
            } else {
                setFloorPrice(0);
                console.log("Invalid IMV value, floor price set to 0");
            }
        } else {
            setFloorPrice(0);
            console.log("No IMV data available");
        }
    }, [imvData]);

    // Update chart y-axis min when chart data changes
    useEffect(() => {
        const newMinY = chartSeries.length > 0 && chartSeries[0].data && chartSeries[0].data.length > 0
            ? Math.min(...chartSeries[0].data.map((item) => item.y[2])) * 0.95
            : 0;
        const newSafeMinY = Math.max(0, newMinY);
        
        setChartOptions(prevOptions => ({
            ...prevOptions,
            yaxis: {
                ...prevOptions.yaxis,
                min: newSafeMinY
            }
        }));
    }, [chartSeries]);

    // Update chart annotations when spot price changes
    useEffect(() => {
        if (spotPrice > 0) {
            setChartOptions(prevOptions => ({
                ...prevOptions,
                annotations: {
                    yaxis: [{
                        y: spotPrice,
                        borderColor: '#4ade8040', // 40% opacity
                        strokeDashArray: 5,
                        borderWidth: 2,
                        label: {
                            borderColor: '#4ade80',
                            borderWidth: 1,
                            borderRadius: 0,
                            style: {
                                color: '#000',
                                background: '#4ade80',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: {
                                    left: 5,
                                    right: 5,
                                    top: 2,
                                    bottom: 2
                                }
                            },
                            text: `${spotPrice < 0.00001 ? spotPrice.toFixed(8) : spotPrice < 0.01 ? spotPrice.toFixed(8) : spotPrice.toFixed(6)}`,
                            textAnchor: 'middle',
                            position: 'right',
                            offsetX: 73,
                            offsetY: 0
                        }
                    }]
                }
            }));
        }
    }, [spotPrice]);


    const filteredTokens = tokens.filter(token => 
        (token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase())) &&
        // Additional safety check - only show tokens that were in deployedVaults
        vaultDescriptions.some(vault => vault.tokenSymbol === token.symbol)
    );
    
    // Fetch pool address from Uniswap V3 Factory
    const fetchPoolAddress = async (token0: string, token1: string, protocol: string = "uniswap") => {
        // protocol = "uniswap"
        // Select the appropriate factory based on protocol
        const factoryAddress = protocol === "uniswap" 
        ? config.protocolAddresses.uniswapV3Factory 
        : config.protocolAddresses.pancakeV3Factory;
        
        const factoryContract = new ethers.Contract(
        factoryAddress,
        uniswapV3FactoryABI, // Same ABI for both Uniswap and PancakeSwap V3
        localProvider
        );
        const feeTier = protocol === "uniswap" ? 3000 : 2500;

        const poolAddress = await factoryContract.getPool(token0, token1, feeTier);

        console.log(`Protocol is ${protocol} Fetched pool address for ${token0} is ${poolAddress} using ${factoryAddress}`)
        return poolAddress;
    }

    const WETH_ADDRESS = config.protocolAddresses.WMON;
    const [wrapAmount, setWrapAmount] = useState(0);
    const [isWrapping, setIsWrapping] = useState(false);
    const [isUnwrapping, setIsUnwrapping] = useState(false);
    const [isWrapDrawerOpen, setIsWrapDrawerOpen] = useState(false);
    const [isUnwrapDrawerOpen, setIsUnwrapDrawerOpen] = useState(false);
    
    // Fetch all deployers from factory contract
    const {
        data: deployersData,
        isError: isDeployersError,
    } = useContractRead({
        address: nomaFactoryAddress,
        abi: FactoryAbi,
        functionName: "getDeployers",
        enabled: true, // Always fetch tokens, not just when connected
    });
    
    // Fetch tokens and build protocol mapping
    useEffect(() => {
        const fetchTokenProtocols = async () => {
            try {
                const response = await tokenApi.getTokens({ includeAll: true });
                const protocols: { [symbol: string]: string } = {};
                
                // Build map for token symbols to their protocols
                response.tokens.forEach(token => {
                    if (token.tokenSymbol && token.selectedProtocol) {
                        protocols[token.tokenSymbol] = token.selectedProtocol;
                    }
                });
                
                setTokenProtocols(protocols);
                // console.log("Token protocols loaded:", protocols);
            } catch (error) {
                console.error("Failed to fetch token protocols:", error);
            }
        };
        
        fetchTokenProtocols();
    }, []);

    // Fetch vault data and convert to token list
    useEffect(() => {
        const fetchVaults = async () => {
            // Keep loading state for minimum time for better UX
            const minLoadingTime = 1500;
            const startTime = Date.now();
            
            try {
                // If no deployer data yet, wait for it
                if (!deployersData) {
                    return;
                }
                
                // If no deployers found, show empty state after minimum loading time
                if (deployersData.length === 0) {
                    const elapsedTime = Date.now() - startTime;
                    const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                    
                    setTimeout(() => {
                        setTokens([]);
                        setIsTokensLoading(false);
                    }, remainingTime);
                    return;
                }
                
                // Fetch deployed tokens from API (API now returns only deployed tokens by default)
                let deployedTokenSymbols = new Set();
                let deployedTokensMap = new Map();
                try {
                    const response = await tokenApi.getTokens();
                    // API already filters for deployed tokens
                    const deployedTokens = response.tokens;
                    console.log('[EXCHANGE] API Response tokens:', deployedTokens);
                    console.log('[EXCHANGE] Token statuses:', deployedTokens.map(t => ({ symbol: t.tokenSymbol, status: t.status })));
                    
                    deployedTokenSymbols = new Set(deployedTokens.map(token => token.tokenSymbol));
                    // Create a map for quick lookup
                    deployedTokens.forEach(token => {
                        deployedTokensMap.set(token.tokenSymbol, token);
                    });
                    console.log('Deployed tokens from API:', deployedTokens.length, 'tokens');
                    console.log('Token symbols:', Array.from(deployedTokenSymbols));
                } catch (error) {
                    console.error('Failed to fetch deployed tokens:', error);
                    // Continue without filtering if API fails
                }
                
                const nomaFactoryContract = new ethers.Contract(
                    nomaFactoryAddress,
                    FactoryAbi,
                    localProvider
                );
                
                const allVaultDescriptions = await Promise.all(
                    deployersData.map(async (deployer) => {
                        try {
                            console.log('[EXCHANGE] Fetching vaults for deployer:', deployer);
                            const vaultsData = await nomaFactoryContract.getVaults(deployer);
                            console.log('[EXCHANGE] Vaults data:', vaultsData);
                            
                            if (!vaultsData || vaultsData.length === 0) {
                                return [];
                            }
                            
                            return Promise.all(
                                vaultsData.map(async (vault) => {
                                    try {
                                        const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                                        
                                        // Fetch spot price from vault
                                        let spotPriceWei = "0";
                                        try {
                                            const VaultAbi = [
                                                "function getVaultInfo() view returns (uint256, uint256, uint256, uint256, uint256, uint256, address, address, uint256)"
                                            ];
                                            const vaultContract = new ethers.Contract(
                                                vaultDescriptionData[6],
                                                VaultAbi,
                                                localProvider
                                            );
                                            const vaultInfo = await vaultContract.getVaultInfo();
                                            spotPriceWei = vaultInfo[2].toString(); // spotPrice is at index 2
                                        } catch (error) {
                                            console.error("Error fetching vault spot price:", error);
                                        }
                                        
                                        // Determine protocol for this token
                                        const tokenSymbol = vaultDescriptionData[1];
                                        const protocol = tokenProtocols[tokenSymbol] || "uniswap";
                                        
                                        return {
                                            tokenName: vaultDescriptionData[0],
                                            tokenSymbol: vaultDescriptionData[1],
                                            tokenDecimals: Number(vaultDescriptionData[2]),
                                            token0: vaultDescriptionData[3],
                                            token1: vaultDescriptionData[4],
                                            deployer: vaultDescriptionData[5],
                                            vault: vaultDescriptionData[6],
                                            presaleContract: vaultDescriptionData[7],
                                            poolAddress: await fetchPoolAddress(
                                                vaultDescriptionData[3], 
                                                vaultDescriptionData[4],
                                                protocol
                                            ),
                                            spotPrice: spotPriceWei,
                                        };
                                    } catch (error) {
                                        console.error("Error fetching vault description:", error);
                                        return null;
                                    }
                                })
                            );
                        } catch (error) {
                            console.error(`Error fetching vaults for deployer ${deployer}:`, error);
                            return [];
                        }
                    })
                );
                
                const flattenedVaults = allVaultDescriptions.flat().filter(Boolean);
                
                // Filter vaults to only include deployed tokens
                console.log('[EXCHANGE] deployedTokenSymbols size:', deployedTokenSymbols.size);
                console.log('[EXCHANGE] deployedTokenSymbols:', Array.from(deployedTokenSymbols));
                console.log('[EXCHANGE] flattenedVaults count:', flattenedVaults.length);
                console.log('[EXCHANGE] vault symbols:', flattenedVaults.map(v => v.tokenSymbol));
                
                const deployedVaults = deployedTokenSymbols.size > 0 
                    ? flattenedVaults.filter(vault => {
                        // Check if token is in the deployed tokens set
                        const isDeployed = deployedTokenSymbols.has(vault.tokenSymbol);
                        if (!isDeployed) {
                            console.log(`[EXCHANGE] Filtering out non-deployed token: ${vault.tokenSymbol}`);
                        } else {
                            console.log(`[EXCHANGE] Including deployed token: ${vault.tokenSymbol}`);
                        }
                        return isDeployed;
                    })
                    : [] // If API fails, show no tokens rather than risk showing non-deployed ones
                
                console.log('[EXCHANGE] Final deployedVaults:', deployedVaults);
                setVaultDescriptions(deployedVaults);
                
                // Fetch price stats from API with default 24h interval
                let priceStats = null;
                if (poolInfo.poolAddress && poolInfo.poolAddress !== '0x0000000000000000000000000000000000000000') {
                    try {
                        priceStats = await fetchTokenPriceStats("24h", poolInfo.poolAddress);
                    } catch (error) {
                        console.error("Failed to fetch price stats:", error);
                    }
                }
                
                // Convert vault descriptions to token format for display
                // console.log('Creating token list from deployedVaults:', deployedVaults.length, 'vaults');
                const tokenList = deployedVaults.map((vault, index) => {
                    // Use API percentage change for NOMA token, random for others
                    const isNoma = vault.tokenSymbol === 'NOMA' || vault.tokenSymbol === 'noma';
                    const change24h = isNoma && priceStats?.percentageChange !== undefined 
                        ? priceStats.percentageChange 
                        : (Math.random() - 0.5) * 20; // Random change between -10% and +10%
                    
                    // Get logo URL from deployedTokensMap
                    const tokenData = deployedTokensMap.get(vault.tokenSymbol);
                    const logoUrl = tokenData?.logoUrl || tokenData?.logoPreview || null;
                    
                    return {
                        id: index + 1,
                        name: vault.tokenName,
                        symbol: vault.tokenSymbol,
                        price: vault.spotPrice ? (parseFloat(formatEther(vault.spotPrice)) || 0.0000186) : 0.0000186, // Use actual spot price with fallback
                        change24h: change24h,
                        volume24h: 0, // Start with 0 volume for new pools
                        marketCap: 0, // Should be calculated from price * circulating supply
                        liquidity: 0, // Should be fetched from pool
                        fdv: 0, // Should be calculated from price * total supply
                        holders: 0, // Should be fetched from blockchain
                        token0: vault.token0,
                        token1: vault.token1,
                        vault: vault.vault,
                        poolAddress: vault.poolAddress,
                        spotPrice: vault.spotPrice, // Keep the raw spot price
                        logoUrl: logoUrl, // Add logo URL
                        selectedProtocol: tokenProtocols[vault.tokenSymbol] || "uniswap" // Add protocol with uniswap as default
                    };
                });
                
                // Ensure minimum loading time for better UX
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                
                setTimeout(() => {
                    setTokens(tokenList);
                    setIsTokensLoading(false);
                    
                    // Select first token if none selected
                    if (!selectedToken && tokenList.length > 0) {
                        setSelectedToken(tokenList[0]);
                    }
                }, remainingTime);
                
            } catch (error) {
                console.error("Error fetching vaults:", error);
                
                // Show error state after minimum loading time
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                
                setTimeout(() => {
                    setTokens([]);
                    setIsTokensLoading(false);
                }, remainingTime);
            }
        };
        
        fetchVaults();
    }, [deployersData]);
    
    // Periodically update 24h change for tokens
    useEffect(() => {
        if (tokens.length === 0) return;
        
        const updateTokenStats = async () => {
            // Skip if no pool address is available
            if (!poolInfo.poolAddress || poolInfo.poolAddress === '0x0000000000000000000000000000000000000000') {
                return;
            }
            
            try {
                const priceStats = await fetchTokenPriceStats("24h", poolInfo.poolAddress);
                if (priceStats?.percentageChange !== undefined) {
                    // Update NOMA token's 24h change
                    setTokens(prevTokens => 
                        prevTokens.map(token => {
                            if (token.symbol === 'NOMA' || token.symbol === 'noma') {
                                return { ...token, change24h: priceStats.percentageChange };
                            }
                            return token;
                        })
                    );
                }
            } catch (error) {
                console.error("Error updating token stats:", error);
            }
        };
        
        // Update immediately
        updateTokenStats();
        
        // Then update every 60 seconds
        const interval = setInterval(updateTokenStats, 60000);
        
        return () => clearInterval(interval);
    }, [tokens.length]);
    
    const formatPrice = (price) => {
        if (price == null || price === undefined || isNaN(price)) return '0.00';
        if (price === 0) return '0.00';
        if (price < 0.000001) return price.toFixed(8);
        if (price < 0.01) return price.toFixed(6);
        if (price < 1) return price.toFixed(4);
        return commify(price, 2);
    };
    
    const formatNumber = (num) => {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }; 


    const handleClickNext = () => {
        if (deployStep == 1) {
            if (presale == 0) {
                setDeployStep(3);
                return
            }
        }
        let currentStep = deployStep + 1;
        if (currentStep > 3) {
        currentStep = 0;
        }
        if (deployStep == 0) {
            if (tokenName == "" || tokenSymbol == "" || tokenDecimals == 0) {
                console.log("error", "Please fill in all fields");
                setError("Please fill in all fields");
                return;
            }
        } else if (deployStep == 1) {
            if (tokenSupply == 0 || price == 0 || token1 == "") {
                console.log("error", "Please fill in all fields");
                setError("Please fill in all fields");
                return;
            }
        }
        calculateSoftCap();
        setDeployStep(currentStep);

    }

    const handleClickBack = (event) => {
        if (deployStep == 3) {
            if (presale == 0) {
                setDeployStep(1);
                return
            }
        }        
        let currentStep = deployStep - 1;
        if (currentStep < 0) {
        currentStep = 0;
        }
        console.log("Current Step: ", currentStep);
        setDeployStep(currentStep);
    }

    const handleSetTokenName = (event) => {
        setIsFirstSel(true);
        setError("");
        const value = event.target.value;
        // console.log("Token Name: ", value);
    
        // Fail if the input contains only numbers or numbers with special characters
        if (!/[a-zA-Z]/.test(value)) {
            toaster.create({
            title: "Error",
            description: "Token name must contain at least one letter (a-z, A-Z)"
          });
          setTokenName("");
          return;
        } else {
            // Update the state if validation passes
            setTokenName(value);
        }
    
        // Fail if the input contains special characters (other than hyphens and spaces)
        if (!/^[a-zA-Z0-9- ]*$/.test(value)) {
          toaster.create({
            title: "Error",
            description: "Token name must contain only letters, numbers, hyphens, and spaces"
          });
            setTokenName("");
          return;
        } else {
            // Update the state if validation passes
            setTokenName(value);
        }
      };


    const handleSetTokenSymbol = (event) => {
        setError("");
        const value = event.target.value;
        // console.log("Token Symbol: ", value);
    
        // Fail if the input contains only numbers or numbers with special characters
        if (!/[a-zA-Z]/.test(value)) {
            toaster.create({
            title: "Error",
            description: "Token symbol must contain at least one letter (a-z, A-Z)"
          });
          setTokenSymbol("");
          return;
        } else {
            // Update the state if validation passes
            setTokenSymbol(value);
        }
    
        // Fail if the input contains special characters (other than hyphens and spaces)
        if (!/^[a-zA-Z0-9- ]*$/.test(value)) {
          toaster.create({
            title: "Error",
            description: "Token symbol must contain only letters, numbers, hyphens, and spaces"
          });
            setTokenSymbol("");
          return;
        } else {
            // Update the state if validation passes
            setTokenSymbol(value);
        }

    }

    const handleSetDecimals = (event) => {
        // console.log("Token Decimals: ", event.target.value);
        if (event.target.value < 6) {
            event.target.value = 6;
        } else if (event.target.value > 18) {
            event.target.value = 18;
        }
                
        setTokenDecimals(event.target.value);
    }

    const handleSetSupply = (event) => {
        console.log("Token Supply: ", event.target.value);
        if (event.target.value != "") {
            const targetValue = unCommify(event.target.value);
            setTokenSupply(targetValue);
        }

        calculateSoftCap();
    }
    
    const calculateSoftCap = () => {
        // console.log(`${tokenSupply} * 10 / 100 * ${presalePrice} * 25 / 100`);
        const calculatedSoftCap = ((tokenSupply * 10 / 100) * presalePrice) * 20 / 100;
        setSoftCap(calculatedSoftCap);
    }

    const handleSetPrice = (value) => {
        console.log(`Got value ${value}`)
        if (value == (floorPrice * 1.25)) return;

        const inputValueStr = value.trim(); // Trim whitespace
    
        // If the input is empty, reset the price and floor price
        if (inputValueStr === "") {
          setPrice("");
          setFloorPrice("");
          return;
        }
    
        if (Number(inputValueStr) < 0.000001) {
          console.error("Invalid input: Price is too low");
          return;
        }
    
        // Parse the input value as a number
        const inputValue = parseFloat(inputValueStr);
    
        // Check if the input value is a valid number
        if (isNaN(inputValue)) {
          console.error("Invalid input: Not a number");
          return;
        }
    
        // Calculate the sale price with a 25% markup
        const salePrice = inputValue * 1.25;
    
        // Determine the number of decimal places in the input value
        const decimalPlaces = (inputValueStr.split('.')[1] || '').length;
    
        // Default to at least 6 decimal places if no decimal places exist
        const precision = decimalPlaces > 0 ? decimalPlaces : 6;
    
        // Ensure at least 7 decimals for very small values, avoiding scientific notation
        let formattedSalePrice = salePrice.toFixed(Math.max(precision, 7));
    
        // If the formatted sale price is still "0", ensure proper formatting
        if (formattedSalePrice === '0') {
          console.error("Invalid input: Sale price is zero");
          return;
        }
    
        // Log the result for debugging
        console.log(`Input: ${inputValueStr}, Sale Price: ${formattedSalePrice}`);
    
        // Update state
        setPrice(`${formattedSalePrice}`);
        setFloorPrice(`${inputValueStr}`);
        setPresalePrice(`${formattedSalePrice}`);
        calculateSoftCap();
      };
    
      // Use useEffect to trigger seftDefaultSoftCap after price and floorPrice are updated
    //   useEffect(() => {
    //     if (price && floorPrice) {
    //       seftDefaultSoftCap();
    //     }
    //   }, [price, floorPrice]); // Run this effect whenever price or floorPrice changes
       
       
    
    const handleSelectAsset = (event) => {
        // console.log("Selected Asset: ", event.target.value);
        setToken1(event.target.value);
    }

    const handleSetPresale = (event) => {
        console.log("Presale: ", event.target.value);
        setPresale(event.target.value);
    }

    const handleSetDuration = (event) => {
        console.log("Duration: ", event.target.value);
        setDuration(event.target.value);
    }

    const handleSetSoftCap = (event) => {
        console.log("Soft Cap: ", event.target.value);

        if (event.target.value != "") {
            const targetValue = unCommify(event.target.value);
            try {
                const valueNum = parseFloat(targetValue);
                if (!isNaN(valueNum) && isFinite(valueNum) && valueNum >= 0) {
                    const valueString = valueNum.toFixed(18).replace(/\.?0+$/, '');
                    console.log(`Setting soft cap to ${parseEther(valueString)}`);
                    setSoftCap(targetValue);
                } else {
                    console.error("Invalid soft cap value:", targetValue);
                }
            } catch (error) {
                console.error("Error parsing soft cap:", error);
            }
        }
    }

    const assets = createListCollection({
        items: [
          { label: "WMON", value: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" }, // WMON
            { label: "WMON", value: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" }, // WMON
        ],
      })
    
    const presaleChoices = createListCollection({
        items: [
            { label: "Yes", value: "1" },
            { label: "No (Default)", value: "0" },
            ],
    });

    const durationChoices = createListCollection({
        items: [
            { label: "30 days", value: Number((86400 * 30)).toString()} ,
            { label: "60 days", value: Number((86400 * 60)).toString()} ,
            { label: "90 days", value: Number((86400 * 90)).toString()},
            { label: "1 minute", value: Number((60)).toString() },
            { label: "30 seconds", value: Number((30)).toString() },
            ],
    });

    const getAssetLabelByValue = (value) => {
        return assets.items.find((asset) => asset.value === value)?.label;
    }

    const getDaysFromDuration = (duration) => {
        if (duration < 86400) {
            return Number(duration)
        }
        return Number(duration) / 86400;
    }

    // Fetch balances
    useEffect(() => {
        const fetchBalances = async () => {
            if (!address) return;
            
            try {
                // Fetch ETH balance
                const ethBal = await localProvider.getBalance(address);
                if (ethBal && ethBal._isBigNumber) {
                    setEthBalance(formatEther(ethBal));
                } else {
                    setEthBalance("0");
                }
                
                // Fetch WETH balance
                try {
                    // console.log("Fetching WMON balance from address:", WETH_ADDRESS, "for wallet:", address);
                    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                    const wethBal = await wethContract.balanceOf(address);
                    // console.log("Raw WMON balance:", wethBal?.toString());
                    if (wethBal && wethBal._isBigNumber) {
                        const formattedWethBalance = formatEther(wethBal);
                        // console.log("Formatted WMON balance:", formattedWethBalance);
                        setWethBalance(formattedWethBalance);
                    } else {
                        // console.log("Invalid WMON balance format, setting to 0");
                        setWethBalance("0");
                    }
                } catch (wethError) {
                    // console.error("Error fetching WETH balance:", wethError);
                    setWethBalance("0");
                }
                
                // Fetch selected token balance if available
                if (selectedToken && selectedToken.token0) {
                    try {
                        // console.log("Fetching balance for token:", selectedToken.symbol, "at address:", selectedToken.token0);
                        const tokenContract = new ethers.Contract(selectedToken.token0, ERC20Abi, localProvider);
                        const tokenBal = await tokenContract.balanceOf(address);
                        // console.log("Raw token balance:", tokenBal.toString());
                        
                        // Ensure we have a valid BigNumber before formatting
                        if (tokenBal && tokenBal._isBigNumber) {
                            const formattedBalance = formatEther(tokenBal);
                            // console.log("Formatted token balance:", formattedBalance);
                            setTokenBalance(formattedBalance);
                        } else {
                            // console.log("Invalid balance format, setting to 0");
                            setTokenBalance("0");
                        }
                    } catch (tokenError) {
                        // console.error("Error fetching token balance:", tokenError);
                        setTokenBalance("0");
                    }
                } else {
                    setTokenBalance("0");
                }
            } catch (error) {
                console.error("Error fetching balances:", error);
            }
        };
        
        fetchBalances();
        // Only set up interval if modals are not open
        let interval: NodeJS.Timeout | null = null;
        if (!isWrapDrawerOpen && !isUnwrapDrawerOpen) {
            interval = setInterval(() => {
                fetchBalances();
            }, 10000); // Refresh every 10 seconds
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [address, selectedToken, isWrapDrawerOpen, isUnwrapDrawerOpen]);
    
    // Build swap path for quotes
    const [swapPath, setSwapPath] = useState("");
    
    useEffect(() => {
        if (!selectedToken?.token0 || !selectedToken?.token1) return;
        
        const feeTier = 3000;
        if (isBuying) {
            // Buying token with ETH/WETH
            const buyPath = utils.solidityPack(
                ["address", "uint24", "address"],
                [selectedToken.token1, feeTier, selectedToken.token0]
            );
            setSwapPath(buyPath);
        } else {
            // Selling token for ETH/WETH
            const sellPath = utils.solidityPack(
                ["address", "uint24", "address"],
                [selectedToken.token0, feeTier, selectedToken.token1]
            );
            setSwapPath(sellPath);
        }
    }, [selectedToken, isBuying]);
    
    // Fetch quotes using wagmi hooks
    const quoterAddress = config.protocolAddresses?.uniswapQuoterV2;
    
    const { data: quoteData, isLoading: isQuoteLoading } = useContractRead({
        address: quoterAddress,
        abi: QuoterAbi,
        functionName: "quoteExactInput",
        args: swapPath && tradeAmount && parseFloat(tradeAmount) > 0 ? 
            [swapPath, safeParseEther(tradeAmount)] : undefined,
        enabled: !!swapPath && !!tradeAmount && parseFloat(tradeAmount) > 0 && !!quoterAddress,
        watch: true,
    });
    
    // Calculate quote and price impact
    useEffect(() => {
        if (!tradeAmount || !selectedToken || parseFloat(tradeAmount) === 0) {
            setQuote("");
            setPriceImpact("0");
            setShowQuoteLoading(false);
            return;
        }
        
        // Show loading spinner when input changes
        setShowQuoteLoading(true);
        const timer = setTimeout(() => {
            setShowQuoteLoading(false);
        }, 1000); // Show spinner for 1 second
        
        if (quoteData && quoteData[0]) {
            // Use actual quote from contract
            const amountOut = formatEther(quoteData[0]);
            setQuote(parseFloat(amountOut).toFixed(6));
            
            // Calculate price impact
            const amount = parseFloat(tradeAmount);
            if (isBuying) {
                const expectedOut = amount / selectedToken.price;
                const actualOut = parseFloat(amountOut);
                const impact = Math.abs((expectedOut - actualOut) / expectedOut * 100);
                setPriceImpact(impact.toFixed(2));
            } else {
                const expectedOut = amount * selectedToken.price;
                const actualOut = parseFloat(amountOut);
                const impact = Math.abs((expectedOut - actualOut) / expectedOut * 100);
                setPriceImpact(impact.toFixed(2));
            }
        } else {
            // Fallback to simple calculation if quote not available
            const amount = parseFloat(tradeAmount);
            if (isBuying) {
                const estimatedTokens = amount / selectedToken.price;
                setQuote(estimatedTokens.toFixed(6));
                setPriceImpact("0.3");
            } else {
                const estimatedETH = amount * selectedToken.price;
                setQuote(estimatedETH.toFixed(6));
                setPriceImpact("0.2");
            }
        }
        
        return () => clearTimeout(timer); // Cleanup timer
    }, [tradeAmount, selectedToken, isBuying, quoteData]);
    
    // Contract write hooks for WMON wrap/unwrap
    const {
        write: deposit
    } = useSafeContractWrite({
        address: WETH_ADDRESS,
        abi: IWETHAbi,
        functionName: "deposit",
        onSuccess(data) {
            toaster.create({
                title: "Success",
                description: `Wrapped ${wrapAmount} MON to WMON`,
            });
            // Refresh balances after 2 seconds
            setTimeout(async () => {
                const ethBal = await localProvider.getBalance(address);
                setEthBalance(formatEther(ethBal));
                const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                const wethBal = await wethContract.balanceOf(address);
                setWethBalance(formatEther(wethBal));
                
                // Reset states after balance update to keep drawer open longer
                setIsWrapping(false);
                setWrapAmount(0);
            }, 2000);
        },
        onError(error) {
            setIsWrapping(false);
            const msg = Number(error.message.toString().indexOf("exceeds")) > -1 ? "Not enough balance" :
                        error.message.indexOf("User rejected the request.") > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
            setWrapAmount(0);
        }
    });

    const {
        write: withdraw
    } = useSafeContractWrite({
        address: WETH_ADDRESS,
        abi: IWETHAbi,
        functionName: "withdraw",
        onSuccess(data) {
            toaster.create({
                title: "Success",
                description: `Unwrapped ${wrapAmount} WMON to MON`,
            });
            // Refresh balances after 2 seconds
            setTimeout(async () => {
                const ethBal = await localProvider.getBalance(address);
                setEthBalance(formatEther(ethBal));
                const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                const wethBal = await wethContract.balanceOf(address);
                setWethBalance(formatEther(wethBal));
                
                // Reset states after balance update to keep drawer open longer
                setIsUnwrapping(false);
                setWrapAmount(0);
            }, 2000);
        },
        onError(error) {
            setIsUnwrapping(false);
            const msg = Number(error.message.toString().indexOf("burn amount exceeds balance")) > -1 ? "Not enough balance" :
                        error.message.toString().indexOf("User rejected the request.") > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
            setWrapAmount(0);
        }
    });

    // Contract write hooks for trading
    const {
        write: buyTokensETH
    } = useSafeContractWrite({
        address: exchangeHelperAddress,
        abi: ExchangeHelperAbi,
        functionName: "buyTokens",
        onSuccess(data) {
            // Add transaction to history
            const tokenAmount = parseFloat(quoteData ? formatEther(quoteData[0] || "0") : "0");
            const ethAmount = parseFloat(tradeAmount);
            const price = ethAmount / tokenAmount;
            
            const newTrade = {
                id: Date.now() + Math.random(),
                type: "buy",
                token: selectedToken?.symbol || "TOKEN",
                amount: tokenAmount,
                price: price,
                total: ethAmount,
                time: new Date(),
                txHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`,
                sender: address,
                recipient: selectedToken?.token0,
                fullTxHash: data.hash
            };
            // Check if already processed
            if (!processedTxHashes.has(data.hash)) {
                processedTxHashes.add(data.hash);
                setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]);
            }
            
            // Track referral trade
            trackReferralTrade({
                type: 'buy',
                tokenAddress: selectedToken?.token0 || '',
                tokenName: selectedToken?.name || '',
                tokenSymbol: selectedToken?.symbol || '',
                volumeETH: ethAmount.toString(),
                volumeUSD: ethAmount * (monPrice || 0),
                txHash: data.hash
            });
            
            setTimeout(() => {
                const fetchBalances = async () => {
                    if (!selectedToken) return;
                    
                    const tokenContract = new ethers.Contract(
                        selectedToken.token0,
                        ERC20Abi,
                        localProvider
                    );

                    const ethBalance = await localProvider.getBalance(address);
                    const balance = await tokenContract.balanceOf(address);

                    setEthBalance(formatEther(ethBalance));
                    
                    // Also update WMON balance
                    try {
                        const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                        const wethBal = await wethContract.balanceOf(address);
                        if (wethBal && wethBal._isBigNumber) {
                            setWethBalance(formatEther(wethBal));
                        }
                    } catch (error) {
                        console.error("Error fetching WETH balance:", error);
                    }

                    const ethDiff = Number(formatEther(balanceBeforeSale)) - Number(formatEther(ethBalance));
                    const tokenDiff = Number(formatEther(balance)) - Number(formatEther(balanceBeforePurchase));
                    
                    // Update token balance
                    setTokenBalance(formatEther(balance));

                    setIsLoading(false);
                    setIsLoadingExecuteTrade(false);
                    toaster.create({
                        title: "Success",
                        description: `Spent ${commifyDecimals(ethDiff, 4)} ${token1Symbol}.\nReceived ${commify(tokenDiff, 4)} ${selectedToken.symbol}`,
                    });
                    
                    setTradeAmount("");
                    setQuote("");
                };
                fetchBalances();
            }, 6000);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = error.message.toString().indexOf("SlippageExceeded()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });
    
    const {
        write: buyTokensWETH
    } = useSafeContractWrite({
        address: exchangeHelperAddress,
        abi: ExchangeHelperAbi,
        functionName: "buyTokensWETH",
        onSuccess(data) {
            // Add transaction to history
            const tokenAmount = parseFloat(quoteData ? formatEther(quoteData[0] || "0") : "0");
            const ethAmount = parseFloat(tradeAmount);
            const price = ethAmount / tokenAmount;
            
            const newTrade = {
                id: Date.now() + Math.random(),
                type: "buy",
                token: selectedToken?.symbol || "TOKEN",
                amount: tokenAmount,
                price: price,
                total: ethAmount,
                time: new Date(),
                txHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`,
                sender: address,
                recipient: selectedToken?.token0,
                fullTxHash: data.hash
            };
            // Check if already processed
            if (!processedTxHashes.has(data.hash)) {
                processedTxHashes.add(data.hash);
                setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]);
            }
            
            // Track referral trade
            trackReferralTrade({
                type: 'buy',
                tokenAddress: selectedToken?.token0 || '',
                tokenName: selectedToken?.name || '',
                tokenSymbol: selectedToken?.symbol || '',
                volumeETH: ethAmount.toString(),
                volumeUSD: ethAmount * (monPrice || 0),
                txHash: data.hash
            });
            
            setTimeout(() => {
                const fetchBalances = async () => {
                    if (!selectedToken) return;
                    
                    const token0Contract = new ethers.Contract(
                        selectedToken.token0,
                        ERC20Abi,
                        localProvider
                    );
                    const token1Contract = new ethers.Contract(
                        selectedToken.token1,
                        ERC20Abi,
                        localProvider
                    );

                    const wethBalance = await token1Contract.balanceOf(address);
                    const balance = await token0Contract.balanceOf(address);
                    
                    // Update WETH balance state
                    setWethBalance(formatEther(wethBalance));

                    const wethDiff = Number(formatEther(balanceBeforeSale)) - Number(formatEther(wethBalance));
                    const tokenDiff = Number(formatEther(balance)) - Number(formatEther(balanceBeforePurchase));
                    
                    // Update token balance
                    setTokenBalance(formatEther(balance));

                    setIsLoading(false);
                    setIsLoadingExecuteTrade(false);
                    toaster.create({
                        title: "Success",
                        description: `Spent ${commifyDecimals(wethDiff, 4)} W${token1Symbol}.\nReceived ${commify(tokenDiff, 4)} ${selectedToken.symbol}`,
                    });
                    
                    setTradeAmount("");
                    setQuote("");
                };
                fetchBalances();
            }, 6000);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = error.message.toString().indexOf("SlippageExceeded()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });

    const {
        write: sellTokens
    } = useSafeContractWrite({
        address: exchangeHelperAddress,
        abi: ExchangeHelperAbi,
        functionName: useWeth ? "sellTokens" : "sellTokensETH",
        onSuccess(data) {
            // Add transaction to history
            const ethAmount = parseFloat(quoteData ? formatEther(quoteData[0] || "0") : "0");
            const tokenAmount = parseFloat(tradeAmount);
            const price = ethAmount / tokenAmount;
            
            const newTrade = {
                id: Date.now() + Math.random(),
                type: "sell",
                token: selectedToken?.symbol || "TOKEN",
                amount: tokenAmount,
                price: price,
                total: ethAmount,
                time: new Date(),
                txHash: `${data.hash.slice(0, 6)}...${data.hash.slice(-4)}`,
                sender: address,
                recipient: selectedToken?.token0,
                fullTxHash: data.hash
            };
            // Check if already processed
            if (!processedTxHashes.has(data.hash)) {
                processedTxHashes.add(data.hash);
                setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]);
            }
            
            // Track referral trade
            trackReferralTrade({
                type: 'sell',
                tokenAddress: selectedToken?.token0 || '',
                tokenName: selectedToken?.name || '',
                tokenSymbol: selectedToken?.symbol || '',
                volumeETH: ethAmount.toString(),
                volumeUSD: ethAmount * (monPrice || 0),
                txHash: data.hash
            });
            
            setTimeout(() => {
                const fetchBalances = async () => {
                    if (!selectedToken) return;
                    
                    const token0Contract = new ethers.Contract(
                        selectedToken.token0,
                        ERC20Abi,
                        localProvider
                    );
                    const token1Contract = new ethers.Contract(
                        selectedToken.token1,
                        ERC20Abi,
                        localProvider
                    );

                    const ethBalance = await localProvider.getBalance(address);
                    const wethBalance = await token1Contract.balanceOf(address);
                    const balance = await token0Contract.balanceOf(address);
                    
                    // Update both ETH and WETH balances
                    setEthBalance(formatEther(ethBalance));
                    setWethBalance(formatEther(wethBalance));

                    const wethDiff = (useWeth ? Number(formatEther(wethBalance)) : Number(formatEther(ethBalance))) - Number(formatEther(balanceBeforePurchase));
                    const tokenDiff = Number(formatEther(balanceBeforeSale)) - Number(formatEther(balance));

                    setIsLoading(false);
                    setIsLoadingExecuteTrade(false);
                    toaster.create({
                        title: "Success",
                        description: `Sold ${commify(tokenDiff, 4)} ${selectedToken.symbol}.\nReceived ${commify(wethDiff, 4)} ${useWeth ? "W" + token1Symbol : token1Symbol}`,
                    });
                    
                    setTradeAmount("");
                    setQuote("");
                };
                fetchBalances();
            }, 6000);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false); 
            const msg = error.message.toString().indexOf("SlippageExceeded()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("0xe450d38c") > -1 ? "Not enough balance" :
                        error.message.toString().indexOf("Amount must be greater than 0") > -1 ? "Invalid amount" :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });
    
    const {
        write: approve,
        isLoading: isApproving
    } = useSafeContractWrite({
        address: selectedToken?.token0 as `0x${string}` || zeroAddress,
        abi: ERC20Abi,
        functionName: "approve" as const,
        onSuccess(data) {
            sellTokens({
                args: sellArgs
            });
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = error.message.toString().indexOf("User rejected the request.") > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });

    const {
        write: approveWeth,
        isLoading: isApprovingWeth
    } = useSafeContractWrite({
        address: (selectedToken?.token1 || WETH_ADDRESS) as `0x${string}`,
        abi: ERC20Abi,
        functionName: "approve" as const,
        onSuccess(data) {
            buyTokensWETH({
                args: buyArgs
            });
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = error.message.toString().indexOf("User rejected the request.") > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });
    
    const handleBuy = () => {
        if (isLoading || !selectedToken || !tradeAmount || !poolInfo.poolAddress) return;
        
        // Validate amount
        const amount = parseFloat(tradeAmount);
        if (isNaN(amount) || amount <= 0) {
            toaster.create({
                title: "Invalid Amount",
                description: "Please enter a valid amount greater than 0",
                status: "error"
            });
            return;
        }
        
        // Check balance
        const availableBalance = useWeth 
            ? parseFloat(wethBalance || "0")
            : parseFloat(ethBalance || "0");
            
        if (amount > availableBalance) {
            toaster.create({
                title: "Insufficient Balance",
                description: `You only have ${availableBalance.toFixed(4)} ${useWeth ? 'WMON' : 'MON'}`,
                status: "error"
            });
            return;
        }
        
        // Validate token addresses
        if (!selectedToken.token0 || !selectedToken.token1) {
            toaster.create({
                title: "Error",
                description: "Invalid token addresses. Please select a different token.",
                status: "error"
            });
            return;
        }

        // Get spot price from selectedToken's vault
        let spotPriceWei;
        try {
            if (selectedToken.spotPrice) {
                spotPriceWei = selectedToken.spotPrice;
            } else {
                // Safely convert spot price to parseEther
                const priceNum = parseFloat(spotPrice.toString());
                if (!isNaN(priceNum) && isFinite(priceNum) && priceNum > 0) {
                    const priceString = priceNum.toFixed(18).replace(/\.?0+$/, '');
                    spotPriceWei = parseEther(priceString);
                } else {
                    spotPriceWei = parseEther("0.0000186"); // Default fallback
                }
            }
        } catch (error) {
            console.error("Error parsing spot price:", error);
            spotPriceWei = parseEther("0.0000186"); // Default fallback
        }

        // Convert slippage percentage to basis points (e.g., 1% = 100 basis points)
        const slippageTolerance = Math.floor(parseFloat(slippage) );
        
        // Different args for ETH vs WETH - buyTokensETH doesn't need amount parameter
        const args = useWeth ? [
            poolInfo.poolAddress,
            spotPriceWei.toString(),
            safeParseEther(tradeAmount),
            safeParseEther(`${parseFloat(quote) * (1 - parseFloat(slippage) / 100)}`), // min amount out after slippage
            address,
            false,
            slippageTolerance,
            urlReferralCode ? "0x" + urlReferralCode  :  "0x" + "00".repeat(8)
        ] : [
            poolInfo.poolAddress,
            spotPriceWei.toString(),
            safeParseEther(`${parseFloat(quote) * (1 - parseFloat(slippage) / 100)}`), // min amount out after slippage
            address,
            false,
            slippageTolerance,
            urlReferralCode ? "0x" + urlReferralCode  :  "0x" + "00".repeat(8)
        ];
        
        console.log({ args} );

        setIsLoading(true);
        setIsLoadingExecuteTrade(true);
        
        if (useWeth) {
            setBalanceBeforePurchase(safeParseEther(tokenBalance));
            setBalanceBeforeSale(safeParseEther(wethBalance));
            setBuyArgs(args);
            
            // Check if we already have enough WETH allowance
            const amountToApprove = approveMax ? ethers.constants.MaxUint256 : safeParseEther(tradeAmount);
            const currentAllowance = wethAllowance || BigInt(0);
            const requiredAmount = safeParseEther(tradeAmount).toBigInt();
            
            // Skip approval if:
            // 1. We have max approval and approveMax is true, OR
            // 2. We have enough allowance for the current transaction
            const hasMaxApproval = isMaxApprovedWeth();
            const skipApproval = (approveMax && hasMaxApproval) || (!approveMax && currentAllowance >= requiredAmount);
            
            console.log("Buy WETH approval check:", {
                approveMax,
                hasMaxApproval,
                currentAllowance: currentAllowance.toString(),
                requiredAmount: requiredAmount.toString(),
                skipApproval
            });
            
            if (skipApproval) {
                // Skip approval and directly buy
                buyTokensWETH({
                    args: args
                });
            } else {
                // Need approval first
                approveWeth({
                    args: [
                        exchangeHelperAddress,
                        amountToApprove
                    ]
                });
            }
        } else {
            setBalanceBeforePurchase(safeParseEther(tokenBalance));
            setBalanceBeforeSale(safeParseEther(ethBalance));
            setBuyArgs(args);
            buyTokensETH({
                args: args,
                value: safeParseEther(tradeAmount)
            });
        }
    };
    
    const handleSell = () => {
        if (isLoading || !selectedToken || !tradeAmount || !poolInfo.poolAddress) return;
        
        // Validate amount
        const amount = parseFloat(tradeAmount);
        if (isNaN(amount) || amount <= 0) {
            toaster.create({
                title: "Invalid Amount",
                description: "Please enter a valid amount greater than 0",
                status: "error"
            });
            return;
        }
        
        // Check token balance
        const tokenBalanceNum = parseFloat(tokenBalance || "0");
        if (amount > tokenBalanceNum) {
            toaster.create({
                title: "Insufficient Balance",
                description: `You only have ${tokenBalanceNum.toFixed(4)} ${selectedToken.symbol}`,
                status: "error"
            });
            return;
        }
        
        // Validate token addresses
        if (!selectedToken.token0 || !selectedToken.token1) {
            toaster.create({
                title: "Error",
                description: "Invalid token addresses. Please select a different token.",
                status: "error"
            });
            return;
        }

        // Get spot price from selectedToken's vault
        let spotPriceWei;
        try {
            if (selectedToken.spotPrice) {
                spotPriceWei = selectedToken.spotPrice;
            } else {
                // Safely convert spot price to parseEther
                const priceNum = parseFloat(spotPrice.toString());
                if (!isNaN(priceNum) && isFinite(priceNum) && priceNum > 0) {
                    const priceString = priceNum.toFixed(18).replace(/\.?0+$/, '');
                    spotPriceWei = parseEther(priceString);
                } else {
                    spotPriceWei = parseEther("0.0000186"); // Default fallback
                }
            }
        } catch (error) {
            console.error("Error parsing spot price:", error);
            spotPriceWei = parseEther("0.0000186"); // Default fallback
        }

        // Convert slippage percentage to basis points (e.g., 1% = 100 basis points)
        const slippageTolerance = Math.floor(parseFloat(slippage));
        
        const args = [
            poolInfo.poolAddress,
            spotPriceWei.toString(),
            safeParseEther(tradeAmount),
            safeParseEther(`${parseFloat(quote) * (1 - parseFloat(slippage) / 100)}`), // min amount out after slippage
            address,
            false,
            slippageTolerance,
            urlReferralCode ? "0x" + urlReferralCode  :  "0x" + "00".repeat(8)
        ];

        setBalanceBeforePurchase(useWeth ? safeParseEther(wethBalance) : safeParseEther(ethBalance));
        setBalanceBeforeSale(safeParseEther(tokenBalance));

        setIsLoading(true);
        setIsLoadingExecuteTrade(true);
        setSellArgs(args);
        
        // Check if we already have enough allowance
        const amountToApprove = approveMax ? ethers.constants.MaxUint256 : safeParseEther(tradeAmount);
        const currentAllowance = allowance || BigInt(0);
        const requiredAmount = safeParseEther(tradeAmount).toBigInt();
        
        // Skip approval if:
        // 1. We have max approval and approveMax is true, OR
        // 2. We have enough allowance for the current transaction
        const hasMaxApproval = isMaxApproved();
        const skipApproval = (approveMax && hasMaxApproval) || (!approveMax && currentAllowance >= requiredAmount);
        
        console.log("Sell token approval check:", {
            approveMax,
            hasMaxApproval,
            currentAllowance: currentAllowance.toString(),
            requiredAmount: requiredAmount.toString(),
            skipApproval
        });
        
        if (skipApproval) {
            // Skip approval and directly sell
            sellTokens({
                args: args
            });
        } else {
            // Need approval first
            approve({
                args: [
                    exchangeHelperAddress,
                    amountToApprove
                ]
            });
        }
    };

    // Update trade amount when useMax changes or when switching between buy/sell
    useEffect(() => {
        if (useMax) {
            if (isBuying) {
                const maxAmount = useWeth ? wethBalance : ethBalance;
                validateAndSetTradeAmount(maxAmount);
            } else {
                validateAndSetTradeAmount(tokenBalance);
            }
        }
    }, [useMax, isBuying, useWeth, wethBalance, ethBalance, tokenBalance]);


    return (
        <Container maxW="100%" p={0} bg="#0a0a0a"> 
            <Toaster />
            {!isConnected ? (
                <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
                    <Text color="white" fontSize="xl">Please connect your wallet</Text>
                </Box>
            ) : (
            <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4} minH="calc(100vh - 80px)" alignItems="stretch">
                {/* Left side - Token List */}
                <Box 
                    flex={isMobile ? "1" : "0 0 350px"} 
                    maxW={isMobile ? "100%" : "350px"} 
                    w={isMobile ? "100%" : "350px"}
                    display={isMobile && isTokenListCollapsed ? "none" : "flex"}
                    flexDirection="column"
                    gap={4}
                    h="100%"
                >
                    <Box bg="#1a1a1a" borderRadius="lg" pr={3} pl={3} py={3} overflowX="hidden" flex="1" display="flex" flexDirection="column">
                        <Flex alignItems="center" mb={3}>
                            <Input
                                placeholder="Search tokens..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                bg="#2a2a2a"
                                border="none"
                                _placeholder={{ color: "#666" }}
                                h="36px"
                                fontSize="sm"
                            />
                            <IconButton
                                ml={2}
                                variant="ghost"
                                color="#666"
                                size="sm"
                            >
                                <LuSearch />
                            </IconButton>
                        </Flex>
                        
                        <Box overflowY="auto" overflowX="hidden" flex="1" mx={isMobile ? -2 : 0}>
                            {isTokensLoading ? (
                                <VStack spacing={0} w="100%">
                                    {/* Show skeleton rows while loading */}
                                    {[...Array(8)].map((_, index) => (
                                        <Box 
                                            key={index} 
                                            w="100%" 
                                            p={isMobile ? 2 : 3} 
                                            borderBottom="1px solid" 
                                            borderColor="#2a2a2a"
                                        >
                                            <HStack justifyContent="space-between">
                                                <HStack spacing={isMobile ? 2 : 3}>
                                                    {/* Token logo skeleton */}
                                                    <Box 
                                                        w={isMobile ? "16px" : "20px"} 
                                                        h={isMobile ? "16px" : "20px"} 
                                                        bg="#2a2a2a" 
                                                        borderRadius="full"
                                                        animation="pulse 2s infinite"
                                                    />
                                                    {/* Token symbol skeleton */}
                                                    <Box 
                                                        w="50px" 
                                                        h="16px" 
                                                        bg="#2a2a2a" 
                                                        borderRadius="sm"
                                                        animation="pulse 2s infinite"
                                                        animationDelay={`${index * 0.1}s`}
                                                    />
                                                </HStack>
                                                <HStack spacing={isMobile ? 2 : 4}>
                                                    {/* Price skeleton */}
                                                    <Box 
                                                        w="60px" 
                                                        h="16px" 
                                                        bg="#2a2a2a" 
                                                        borderRadius="sm"
                                                        animation="pulse 2s infinite"
                                                        animationDelay={`${index * 0.1 + 0.2}s`}
                                                    />
                                                    {/* 24h change skeleton */}
                                                    <Box 
                                                        w="45px" 
                                                        h="16px" 
                                                        bg="#2a2a2a" 
                                                        borderRadius="sm"
                                                        animation="pulse 2s infinite"
                                                        animationDelay={`${index * 0.1 + 0.3}s`}
                                                    />
                                                    {/* Market cap skeleton (desktop only) */}
                                                    {!isMobile && (
                                                        <Box 
                                                            w="70px" 
                                                            h="16px" 
                                                            bg="#2a2a2a" 
                                                            borderRadius="sm"
                                                            animation="pulse 2s infinite"
                                                            animationDelay={`${index * 0.1 + 0.4}s`}
                                                        />
                                                    )}
                                                </HStack>
                                            </HStack>
                                        </Box>
                                    ))}
                                    {/* Loading message */}
                                    <Center pt={4} pb={2}>
                                        <HStack>
                                            <Box><Spinner size="sm" color="#4ade80" thickness="2px" /></Box>
                                            <Box><Text color="#4ade80" fontSize="xs">Fetching tokens from blockchain...</Text></Box>
                                        </HStack>
                                    </Center>
                                </VStack>
                            ) : tokens.length === 0 ? (
                                <Center py={10}>
                                    <Text color="#666" fontSize="sm">No tokens found</Text>
                                </Center>
                            ) : (
                            <Table.Root size="sm" variant="unstyled" borderSpacing="0">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader color="#888" fontSize="xs" py={2} pl={isMobile ? 2 : 0} pr={isMobile ? 1 : 3}>Token</Table.ColumnHeader>
                                        <Table.ColumnHeader color="#888" fontSize="xs" py={2} px={isMobile ? 1 : 2} textAlign="right">Price</Table.ColumnHeader>
                                        <Table.ColumnHeader color="#888" fontSize="xs" py={2} px={isMobile ? 1 : 2} textAlign="right">24h</Table.ColumnHeader>
                                        {!isMobile && <Table.ColumnHeader color="#888" fontSize="xs" py={2} pr={3} pl={2} textAlign="right">FDV</Table.ColumnHeader>}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {filteredTokens.map((token) => (
                                        <Table.Row
                                            key={token.id}
                                            cursor="pointer"
                                            onClick={() => {
                                                console.log("Selected token:", token);
                                                setSelectedToken(token);
                                                if (isMobile) {
                                                    setIsTokenListCollapsed(true);
                                                }
                                            }}
                                            transition="all 0.2s"
                                        >
                                            <Table.Cell 
                                                py={isMobile ? 1 : 2} 
                                                pl={selectedToken?.id === token.id ? "8px" : (isMobile ? 2 : 0)} 
                                                pr={isMobile ? 1 : 3} 
                                                bg={selectedToken?.id === token.id ? "#2a2a2a" : "transparent"}
                                                _hover={{ bg: selectedToken?.id === token.id ? "#2a2a2a" : "#252525" }}
                                                transition="all 0.2s"
                                                borderLeft={selectedToken?.id === token.id ? "3px solid #4ade80" : "3px solid transparent"}
                                            >
                                                <Box display="flex" alignItems="center" h="full">
                                                    <HStack gap={isMobile ? 1 : 2}>
                                                        <Box w={isMobile ? "16px" : "20px"} h={isMobile ? "16px" : "20px"}>
                                                            <Image
                                                                src={token.logoUrl || placeholderLogo}
                                                                alt={token.symbol}
                                                                w={isMobile ? "16px" : "20px"}
                                                                h={isMobile ? "16px" : "20px"}
                                                                onError={(e) => {
                                                                    e.currentTarget.src = placeholderLogo;
                                                                }}
                                                            />
                                                        </Box>
                                                        <Box>
                                                            <Text color="white" fontSize={isMobile ? "xs" : "sm"} fontWeight="500" whiteSpace="nowrap">
                                                                {token.symbol}
                                                            </Text>
                                                        </Box>
                                                    </HStack>
                                                </Box>
                                            </Table.Cell>
                                            <Table.Cell 
                                                py={isMobile ? 1 : 2} 
                                                px={isMobile ? 1 : 2} 
                                                textAlign="right" 
                                                verticalAlign="middle" 
                                                bg={selectedToken?.id === token.id ? "#2a2a2a" : "transparent"}
                                                _hover={{ bg: selectedToken?.id === token.id ? "#2a2a2a" : "#252525" }}
                                                transition="all 0.2s"
                                            >
                                                <Text color="white" fontSize="xs" whiteSpace="nowrap">
                                                    ${formatPrice(token.price * (monPrice || 0))}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell 
                                                py={isMobile ? 1 : 2} 
                                                px={isMobile ? 1 : 2} 
                                                textAlign="right" 
                                                verticalAlign="middle" 
                                                bg={selectedToken?.id === token.id ? "#2a2a2a" : "transparent"}
                                                _hover={{ bg: selectedToken?.id === token.id ? "#2a2a2a" : "#252525" }}
                                                transition="all 0.2s"
                                            >
                                                <Text 
                                                    color={token.change24h > 0 ? "#4ade80" : "#ef4444"} 
                                                    fontSize="xs" 
                                                    whiteSpace="nowrap"
                                                >
                                                    {token.change24h > 0 ? "+" : ""}{token.change24h.toFixed(2)}%
                                                </Text>
                                            </Table.Cell>
                                            {!isMobile && (
                                                <Table.Cell 
                                                    py={2} 
                                                    px={2} 
                                                    textAlign="right" 
                                                    verticalAlign="middle" 
                                                    bg={selectedToken?.id === token.id ? "#2a2a2a" : "transparent"}
                                                    _hover={{ bg: selectedToken?.id === token.id ? "#2a2a2a" : "#252525" }}
                                                    transition="all 0.2s"
                                                >
                                                    <Text color="white" fontSize="xs" whiteSpace="nowrap">
                                                        ${formatNumber(Number(formatEther(`${totalSupply}`)) * spotPrice * monPrice)} 
                                                    </Text>
                                                </Table.Cell>
                                            )}
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                            )}
                        </Box>
                    </Box>
                    
                    {/* Upcoming Presales */}
                    <Box flexShrink={0} w="100%">
                        <UpcomingPresales />
                    </Box>
                    
                    {/* Troll Box */}
                    <Box flexShrink={0} mt={4}>
                        <TrollBox />
                    </Box>
                    
                    {/* Referral Stats */}
                    <Box flexShrink={0} mt={4}>
                        <ReferralStats totalVolume={totalVolume} token0Symbol={selectedToken?.symbol} tokenPriceUsd={spotPrice} />
                    </Box>
                </Box>
                
                {/* Middle - Chart and Token Info */}
                <Box flex="1" overflowY="auto" h="100%">
                    {/* Show selected token info bar on mobile when list is collapsed */}
                    {isMobile && isTokenListCollapsed && selectedToken && (
                        <Box 
                            bg="#1a1a1a" 
                            p={3} 
                            mb={4} 
                            borderRadius="lg" 
                            display="flex" 
                            alignItems="center" 
                            justifyContent="space-between"
                            cursor="pointer"
                            onClick={() => setIsTokenListCollapsed(false)}
                        >
                            <HStack>
                                <Box>
                                    <Image 
                                        src={selectedToken.logoUrl || placeholderLogo} 
                                        alt={selectedToken.symbol} 
                                        w="24px" 
                                        h="24px"
                                        onError={(e) => {
                                            e.currentTarget.src = placeholderLogo;
                                        }}
                                    />
                                </Box>
                                <Box>
                                    <Text color="white" fontWeight="bold">{selectedToken.symbol}</Text>
                                </Box>
                                <Box>
                                    <Text color="#888">${formatPrice(selectedToken.price * (monPrice || 0))}</Text>
                                </Box>
                                <Box>
                                    <Text color={percentChange > 0 ? "#4ade80" : "#ef4444"} fontSize="sm">
                                        {percentChange > 0 ? "+" : ""}{percentChange.toFixed(2)}%
                                    </Text>
                                </Box>
                            </HStack>
                            <Text color="#888" fontSize="sm">Tap to change</Text>
                        </Box>
                    )}
                    {selectedToken ? (
                        <VStack gap={4}>
                            {/* Token Info Cards */}
                            <SimpleGrid columns={isMobile ? 2 : 4} gap={isMobile ? 2 : 4} w="100%">
                                <Box bg="#1a1a1a" p={4} borderRadius="lg">
                                    <Text color="#888" fontSize="sm" mb={2}>Price</Text>
                                    <VStack align="flex-start" spacing={1}>
                                        <HStack spacing={2}>
                                            <Box>
                                                <Text color="#4ade80" fontWeight="bold" fontSize="sm">SPOT</Text>
                                            </Box>
                                            <Box>
                                                <Text color="white" fontSize={isMobile ? "lg" : "xl"} fontWeight="bold">
                                                    ${commifyDecimals((spotPrice > 0 ? spotPrice : (selectedToken.price || 0)) * (priceUSD || 0), 6)}
                                                </Text>
                                            </Box>
                                        </HStack>
                                        <Box maxW="90%">
                                            <HStack spacing={2} flexWrap="wrap">
                                                <Box>
                                                    <Text color="#888" fontSize="xs">
                                                        {spotPrice > 0 ? commifyDecimals(spotPrice, 8) : commifyDecimals(selectedToken.price || 0, 8)} {selectedToken.symbol}/{token1Symbol}
                                                    </Text> 
                                                </Box>
                                                <Box>
                                                    <HStack spacing={1}>
                                                        <Box>
                                                            {percentChange > 0 ? (
                                                                <FaArrowTrendUp color="#4ade80" size={isMobile ? "10" : "12"} />
                                                            ) : percentChange < 0 ? (
                                                                <FaArrowTrendDown color="#ef4444" size={isMobile ? "10" : "12"} />
                                                            ) : null}
                                                        </Box>
                                                        <Box>
                                                            <Text 
                                                                color={percentChange < 0 ? "#ef4444" : percentChange > 0 ? "#4ade80" : "#888"} 
                                                                fontSize="xs" 
                                                                fontWeight="bold"
                                                            >
                                                                ({percentChange > 0 ? "+" : ""}{commifyDecimals(percentChange, 2)}%)
                                                            </Text>
                                                        </Box>
                                                    </HStack>
                                                </Box>
                                            </HStack>
                                        </Box>
                                    </VStack>
                                </Box>
                                
                                <Box bg="#1a1a1a" p={4} borderRadius="lg">
                                    <Text color="#888" fontSize="sm" mb={2}>
                                        {chartTimeframe === "15m" ? "15m" : 
                                         chartTimeframe === "1h" ? "1h" :
                                         chartTimeframe === "1w" ? "7d" :
                                         chartTimeframe === "1M" ? "30d" : "24h"} Volume
                                    </Text>
                                    <Box>
                                        <VStack align="start" spacing={0}>
                                            {intervalVolume > 0 && monPrice > 0 ? (
                                                <>
                                                <Box>
                                                    <Text color="white" fontSize="xl" fontWeight="bold">
                                                        ${formatNumber(intervalVolume * monPrice)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="xs">
                                                        {commify(intervalVolume.toFixed(2), 2)} MON
                                                    </Text>
                                                </Box>                                                
                                                </>
                                            ) : (
                                                <Box>
                                                    <Text color="white" fontSize="xl" fontWeight="bold">
                                                        ${formatNumber(selectedToken.volume24h)}
                                                    </Text>                                                    
                                                </Box>
                                            )}
                                        </VStack>
                                    </Box>
                                </Box>
                                
                                <Box bg="#1a1a1a" p={4} borderRadius="lg">
                                    <Text color="#888" fontSize="sm" mb={2}>Market Cap</Text>
                                    <Box>
                                        <Text color="white" fontSize="xl" fontWeight="bold">
                                            ${formatNumber(Number(formatEther(`${totalSupply}`)) * spotPrice * monPrice)}
                                        </Text>
                                    </Box>
                                    <Box mt={2}>
                                        <Text color="#888" fontSize="xs">
                                            {formatNumber(Number(formatEther(`${totalSupply}`)) * spotPrice)} MON
                                        </Text>                                       
                                    </Box>
                                </Box>

                                
                                <Box bg="#1a1a1a" p={4} borderRadius="lg">
                                    <Text color="#888" fontSize="sm" mb={2}>IMV</Text>
                                    <Box>
                                        <Text color="white" fontSize="xl" fontWeight="bold">
                                            ${commify(floorPrice * monPrice, 6)}
                                        </Text>
                                    </Box>
                                    <HStack spacing={2} flexWrap="wrap">
                                        <Box mt={2}>
                                            <Text color="#888" fontSize="xs">
                                                {floorPrice > 0 ? commifyDecimals(floorPrice, 8) : commifyDecimals(selectedToken.price || 0, 8)} {selectedToken.symbol}/{token1Symbol}
                                            </Text> 
                                        </Box>
                                    </HStack>
                                </Box>
                            </SimpleGrid>
                            
                            {/* Chart and History Container */}
                            <Box display="flex" flexDirection="column" gap={4} w="100%">
                                {/* Chart */}
                                <Box bg="#1a1a1a" p={isMobile ? 2 : 4} borderRadius="lg" w="100%" h={isMobile ? "350px" : "450px"} position="relative" overflow="hidden">
                                <HStack justifyContent="space-between" w="100%" mb={4}>
                                    <Box>
                                        <HStack spacing={2} alignItems="center">
                                            <Box>
                                                <Text color="#888" fontSize="sm">
                                                    Interval
                                                </Text>
                                            </Box>
                                            <Box>
                                                <SelectRoot
                                                    collection={createListCollection({
                                                        items: chartTimeframe === "15m" 
                                                            ? [{ label: "1m", value: "1m" }, { label: "5m", value: "5m" }, { label: "15m", value: "15m" }]
                                                            : chartTimeframe === "1h"
                                                            ? [{ label: "5m", value: "5m" }, { label: "15m", value: "15m" }, { label: "30m", value: "30m" }]
                                                            : chartTimeframe === "24h" 
                                                            ? [{ label: "30m", value: "30m" }, { label: "1h", value: "1h" }, { label: "6h", value: "6h" }, { label: "12h", value: "12h" }]
                                                            : chartTimeframe === "1w"
                                                            ? [{ label: "1h", value: "1h" }, { label: "6h", value: "6h" }, { label: "12h", value: "12h" }, { label: "24h", value: "24h" }]
                                                            : [{ label: "6h", value: "6h" }, { label: "12h", value: "12h" }, { label: "24h", value: "24h" }]
                                                    })}
                                                    size="xs"
                                                    value={[chartGranularity]}
                                                    onValueChange={(details) => setChartGranularity(details.value[0])}
                                                >
                                                    <SelectTrigger minW="80px">
                                                        <SelectValueText placeholder={chartGranularity} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(chartTimeframe === "15m" 
                                                            ? [{ label: "1m", value: "1m" }, { label: "5m", value: "5m" }, { label: "15m", value: "15m" }]
                                                            : chartTimeframe === "1h"
                                                            ? [{ label: "5m", value: "5m" }, { label: "15m", value: "15m" }, { label: "30m", value: "30m" }]
                                                            : chartTimeframe === "24h" 
                                                            ? [{ label: "30m", value: "30m" }, { label: "1h", value: "1h" }, { label: "6h", value: "6h" }, { label: "12h", value: "12h" }]
                                                            : chartTimeframe === "1w"
                                                            ? [{ label: "1h", value: "1h" }, { label: "6h", value: "6h" }, { label: "12h", value: "12h" }, { label: "24h", value: "24h" }]
                                                            : [{ label: "6h", value: "6h" }, { label: "12h", value: "12h" }, { label: "24h", value: "24h" }]
                                                        ).map((item) => (
                                                            <SelectItem key={item.value} item={item}>
                                                                {item.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </SelectRoot>
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box>
                                        <HStack gap={1}>
                                            {['15m', '1h', '24h', '1w', '1M'].map(tf => (
                                                <Box key={tf}>
                                                    <Button
                                                        size="xs"
                                                        variant={chartTimeframe === tf ? "solid" : "ghost"}
                                                        bg={chartTimeframe === tf ? "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)" : "rgba(255, 255, 255, 0.05)"}
                                                        backdropFilter={chartTimeframe === tf ? "blur(10px)" : "blur(5px)"}
                                                        color={chartTimeframe === tf ? "black" : "#888"}
                                                        border={chartTimeframe === tf ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid transparent"}
                                                        boxShadow={chartTimeframe === tf ? "0 2px 8px rgba(74, 222, 128, 0.2)" : "none"}
                                                        _hover={{ 
                                                            bg: chartTimeframe === tf ? "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)" : "rgba(74, 222, 128, 0.1)",
                                                            transform: "translateY(-1px)",
                                                            boxShadow: "0 4px 12px rgba(74, 222, 128, 0.15)"
                                                        }}
                                                        _active={{
                                                            transform: "translateY(0)",
                                                            boxShadow: "0 2px 6px rgba(74, 222, 128, 0.1)"
                                                        }}
                                                        onClick={() => {
                                                            setChartTimeframe(tf);
                                                            // Set default granularity based on timeframe (smallest interval)
                                                            if (tf === '15m') setChartGranularity('1m');
                                                            else if (tf === '1h') setChartGranularity('5m');
                                                            else if (tf === '24h') setChartGranularity('30m');
                                                            else if (tf === '1w') setChartGranularity('1h');
                                                            else if (tf === '1M') setChartGranularity('6h');
                                                        }}
                                                        fontSize="xs"
                                                        px={2}
                                                        transition="all 0.2s"
                                                        borderRadius="md"
                                                        fontWeight={chartTimeframe === tf ? "600" : "400"}
                                                    >
                                                        {tf}
                                                    </Button>
                                                </Box>
                                            ))}
                                        </HStack>
                                    </Box>
                                </HStack>
                                {isChartLoading ? (
                                    <Center h="calc(100% - 60px)">
                                        <VStack>
                                            <Spinner size="md" color="#4ade80" thickness="3px" />
                                            <Text color="#4ade80" fontSize="sm">Loading chart data...</Text>
                                        </VStack>
                                    </Center>
                                ) : chartSeries.length > 0 && chartSeries[0].data.length > 0 ? (
                                    <Box h="calc(100% - 60px)" minH="300px" w="100%">
                                        <ReactApexChart
                                            options={chartOptions}
                                            series={chartSeries}
                                            type="candlestick"
                                            height="100%"
                                            width="100%"
                                        />
                                    </Box>
                                ) : (
                                    <Center h="calc(100% - 60px)">
                                        <Text color="#666" fontSize="sm">No price data available</Text>
                                    </Center>
                                )}
                            </Box>
                            
                            {/* Trade History with Tabs - Only show on desktop */}
                            {!isMobile && (
                            <Box bg="#1a1a1a" borderRadius="lg" p={isMobile ? 3 : 4} w="100%">
                                <Tabs.Root value={tradeHistoryTab} onValueChange={(e) => setTradeHistoryTab(e.value)}>
                                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                                        <Tabs.List flex={1}>
                                            <Tabs.Trigger 
                                                value="my" 
                                                flex={1}
                                                _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                color="white"
                                                fontWeight="600"
                                                disabled={true}                                      
                                            >
                                                {"History"}
                                            </Tabs.Trigger>
                                        </Tabs.List>
                                        {tradeHistory.length > 0 && (
                                            <Button
                                                size="sm"
                                                ml={3}
                                                bg="#2a2a2a"
                                                color="#888"
                                                _hover={{ bg: "#3a3a3a", color: "white" }}
                                                onClick={() => setShowClearHistoryDialog(true)}
                                            >
                                                Clear History
                                            </Button>
                                        )}
                                    </Flex>
                                    
                                    <Tabs.Content value="all">
                                        <VStack gap={2} align="stretch">
                                                {getPaginatedData(tradeHistory, currentPage, itemsPerPage).map((trade) => (
                                                    <HStack
                                                        key={trade.id}
                                                        p={2}
                                                        bg="#2a2a2a"
                                                        borderRadius="md"
                                                        cursor="pointer"
                                                        _hover={{ bg: "#333" }}
                                                        gap={3}
                                                        alignItems="center"
                                                        justifyContent="space-between"
                                                        w="100%"
                                                    >
                                                        {/* Trade Type Badge */}
                                                        <Box w="50px">
                                                            <Badge
                                                                colorPalette={trade.type === "buy" ? "green" : "red"}
                                                                size="sm"
                                                                w="45px"
                                                                textAlign="center"
                                                                display="block"
                                                            >
                                                                {trade.type.toUpperCase()}
                                                            </Badge>
                                                        </Box>
                                                        
                                                        {/* Token Symbol */}
                                                        <Box w="60px">
                                                            <Text color="white" fontWeight="bold">
                                                                {trade.token}
                                                            </Text>
                                                        </Box>
                                                        
                                                        {/* Trade Details */}
                                                        <Box flex="1">
                                                            <Box 
                                                                px={3}
                                                                py={1}
                                                                w="100%"
                                                            >
                                                                <Text color="#888" fontSize="sm" isTruncated>
                                                                    {trade.amount.toLocaleString()} {trade.token} @ {formatPrice(trade.price)}
                                                                </Text>
                                                            </Box>
                                                        </Box>
                                                        
                                                        {/* MON Value */}
                                                        <Box w="200px">
                                                            <HStack
                                                                px={3}
                                                                py={1}
                                                                justifyContent="space-between"
                                                                spacing={2}
                                                                w="100%"
                                                            >
                                                                <Box>
                                                                    <Text color="white" fontWeight="bold">
                                                                        {trade.total.toFixed(4)}
                                                                    </Text>
                                                                </Box>
                                                                <Box>
                                                                    <Text color="white" fontSize="sm">
                                                                        MON
                                                                    </Text>
                                                                </Box>
                                                                {monPrice > 0 && (
                                                                    <Box>
                                                                        <Text color="#888" fontSize="xs">
                                                                            (${(trade.total * monPrice).toFixed(2)})
                                                                        </Text>
                                                                    </Box>
                                                                )}
                                                            </HStack>
                                                        </Box>
                                                        
                                                        {/* TX Hash */}
                                                        <Box w="100px">
                                                            <Text 
                                                                color="#4ade80" 
                                                                fontSize="xs"
                                                                cursor="pointer"
                                                                _hover={{ textDecoration: "underline" }}
                                                                onClick={() => window.open(`https://monadexplorer.com/tx/${trade.fullTxHash}`, "_blank")}
                                                                textAlign="center"
                                                            >
                                                                {trade.txHash}
                                                            </Text>
                                                        </Box>
                                                        
                                                        {/* Time */}
                                                        <Box w="80px">
                                                            <Text color="#888" fontSize="xs" textAlign="right">
                                                                {Math.floor((Date.now() - trade.time.getTime()) / 60000)}m ago
                                                            </Text>
                                                        </Box>
                                                    </HStack>
                                                ))}
                                            </VStack>
                                            
                                            {/* Pagination Controls */}
                                            {getTotalPages(tradeHistory, itemsPerPage) > 1 && (
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
                                                        {Array.from({ length: Math.min(5, getTotalPages(tradeHistory, itemsPerPage)) }, (_, i) => {
                                                            const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                                                            if (pageNum > 0 && pageNum <= getTotalPages(tradeHistory, itemsPerPage)) {
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
                                                        onClick={() => setCurrentPage(prev => Math.min(getTotalPages(tradeHistory, itemsPerPage), prev + 1))}
                                                        isDisabled={currentPage === getTotalPages(tradeHistory, itemsPerPage)}
                                                        bg="#2a2a2a"
                                                        _hover={{ bg: "#3a3a3a" }}
                                                    >
                                                        Next
                                                    </Button>
                                                </HStack>
                                            )}
                                    </Tabs.Content>
                                    
                                    <Tabs.Content value="my">
                                        {address ? (
                                                <VStack gap={2} align="stretch">
                                                    {(() => {
                                                        const myTrades = tradeHistory.filter(trade => 
                                                            trade.sender?.toLowerCase() === address.toLowerCase() || 
                                                            trade.recipient?.toLowerCase() === address.toLowerCase()
                                                        );
                                                        const paginatedMyTrades = getPaginatedData(myTrades, myTxCurrentPage, itemsPerPage);
                                                        
                                                        return myTrades.length > 0 ? (
                                                            <>
                                                                {paginatedMyTrades.map((trade) => (
                                                                    <HStack
                                                                        key={trade.id}
                                                                        p={2}
                                                                        bg="#2a2a2a"
                                                                        borderRadius="md"
                                                                        cursor="pointer"
                                                                        _hover={{ bg: "#333" }}
                                                                        gap={3}
                                                                        alignItems="center"
                                                                        justifyContent="space-between"
                                                                        w="100%"
                                                                    >
                                                                        {/* Trade Type Badge */}
                                                                        <Box w="50px">
                                                                            <Badge
                                                                                colorPalette={trade.type === "buy" ? "green" : "red"}
                                                                                size="sm"
                                                                                w="45px"
                                                                                textAlign="center"
                                                                                display="block"
                                                                            >
                                                                                {trade.type.toUpperCase()}
                                                                            </Badge>
                                                                        </Box>
                                                                        
                                                                        {/* Token Symbol */}
                                                                        <Box w="60px">
                                                                            <Text color="white" fontWeight="bold">
                                                                                {trade.token}
                                                                            </Text>
                                                                        </Box>
                                                                        
                                                                        {/* Trade Details */}
                                                                        <Box 
                                                                            flex="1"
                                                                            px={3}
                                                                            py={1}
                                                                        >
                                                                            <Text color="#888" fontSize="sm" isTruncated>
                                                                                {trade.amount.toLocaleString()} {trade.token} @ {formatPrice(trade.price)}
                                                                            </Text>
                                                                        </Box>
                                                                        
                                                                        {/* MON Value */}
                                                                        <Box w="200px">
                                                                            <HStack
                                                                                px={3}
                                                                                py={1}
                                                                                justifyContent="space-between"
                                                                                spacing={2}
                                                                            >
                                                                                <Box>
                                                                                    <Text color="white" fontWeight="bold">
                                                                                        {trade.total.toFixed(4)}
                                                                                    </Text>
                                                                                </Box>
                                                                                <Box>
                                                                                    <Text color="white" fontSize="sm">
                                                                                        MON
                                                                                    </Text>
                                                                                </Box>
                                                                                {monPrice > 0 && (
                                                                                    <Box>
                                                                                        <Text color="#888" fontSize="xs">
                                                                                            (${(trade.total * monPrice).toFixed(2)})
                                                                                        </Text>
                                                                                    </Box>
                                                                                )}
                                                                            </HStack>
                                                                        </Box>
                                                                        
                                                                        {/* TX Hash */}
                                                                        <Box w="100px">
                                                                            <Text 
                                                                                color="#4ade80" 
                                                                                fontSize="xs"
                                                                                cursor="pointer"
                                                                                _hover={{ textDecoration: "underline" }}
                                                                                onClick={() => {
                                                                                    const explorerUrl = config.chain === "monad" 
                                                                                        ? `https://monadexplorer.com/tx/${trade.fullTxHash || trade.txHash}`
                                                                                        : `https://bscscan.com/tx/${trade.fullTxHash || trade.txHash}`;
                                                                                    window.open(explorerUrl, "_blank");
                                                                                }}
                                                                                textAlign="center"
                                                                            >
                                                                                {trade.txHash}
                                                                            </Text>
                                                                        </Box>
                                                                        
                                                                        {/* Time */}
                                                                        <Box w="80px">
                                                                            <Text color="#888" fontSize="xs" textAlign="right">
                                                                                {Math.floor((Date.now() - trade.time.getTime()) / 60000)}m ago
                                                                            </Text>
                                                                        </Box>
                                                                    </HStack>
                                                                    ))}
                                                                    
                                                                    {/* Pagination Controls for My Transactions */}
                                                                    {getTotalPages(myTrades, itemsPerPage) > 1 && (
                                                                        <HStack justify="center" mt={4} gap={2}>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => setMyTxCurrentPage(prev => Math.max(1, prev - 1))}
                                                                                isDisabled={myTxCurrentPage === 1}
                                                                                bg="#2a2a2a"
                                                                                _hover={{ bg: "#3a3a3a" }}
                                                                            >
                                                                                Previous
                                                                            </Button>
                                                                            <HStack gap={1}>
                                                                                {Array.from({ length: Math.min(5, getTotalPages(myTrades, itemsPerPage)) }, (_, i) => {
                                                                                    const pageNum = myTxCurrentPage <= 3 ? i + 1 : myTxCurrentPage + i - 2;
                                                                                    if (pageNum > 0 && pageNum <= getTotalPages(myTrades, itemsPerPage)) {
                                                                                        return (
                                                                                            <Button
                                                                                                key={pageNum}
                                                                                                size="sm"
                                                                                                onClick={() => setMyTxCurrentPage(pageNum)}
                                                                                                bg={myTxCurrentPage === pageNum ? "#4ade80" : "#2a2a2a"}
                                                                                                color={myTxCurrentPage === pageNum ? "black" : "white"}
                                                                                                _hover={{ bg: myTxCurrentPage === pageNum ? "#4ade80" : "#3a3a3a" }}
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
                                                                                onClick={() => setMyTxCurrentPage(prev => Math.min(getTotalPages(myTrades, itemsPerPage), prev + 1))}
                                                                                isDisabled={myTxCurrentPage === getTotalPages(myTrades, itemsPerPage)}
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
                                                            No transactions found
                                                        </Text>
                                                            );
                                                        })()}
                                                </VStack>
                                            ) : (
                                                <Text color="#666" textAlign="center" py={8}>
                                                    Connect your wallet to view your transactions
                                                </Text>
                                            )}
                                    </Tabs.Content>
                                </Tabs.Root>
                                </Box>
                                )}
                            </Box>
                        </VStack>
                    ) : (
                        <Box
                            bg="#1a1a1a"
                            h="400px"
                            borderRadius="lg"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <Text color="#666">Select a token to view details</Text>
                        </Box>
                    )}
                </Box>
                
                {/* Right side - Trading Panel and History */}
                {!isMobile ? (
                    <Box w="300px" h="100%" display="flex">
                        <VStack gap={4} h="100%" flex="1">
                        {/* Wallet Balance Box */}
                        <WalletSidebar 
                            ethBalance={BigInt(Math.floor(parseFloat(ethBalance) * 1e18))}
                            token1Info={{
                                tokenSymbol: "WMON",
                                balance: BigInt(Math.floor(parseFloat(wethBalance) * 1e18)),
                                tokenAddress: WETH_ADDRESS,
                                decimals: 18
                            }}
                            selectedToken={selectedToken?.symbol}
                            selectedTokenBalance={BigInt(Math.floor(parseFloat(tokenBalance) * 1e18))}
                            selectedTokenAddress={selectedToken?.token0}
                            address={address}
                            deposit={deposit}
                            withdraw={withdraw}
                            isWrapping={isWrapping}
                            isUnwrapping={isUnwrapping}
                            setIsWrapping={setIsWrapping}
                            setIsUnwrapping={setIsUnwrapping}
                            wrapAmount={wrapAmount}
                            setWrapAmount={setWrapAmount}
                            isWrapDrawerOpen={isWrapDrawerOpen}
                            setIsWrapDrawerOpen={setIsWrapDrawerOpen}
                            isUnwrapDrawerOpen={isUnwrapDrawerOpen}
                            setIsUnwrapDrawerOpen={setIsUnwrapDrawerOpen}
                        />
                    
                    {/* Trading Panel */}
                    <Box 
                        bg="rgba(26, 26, 26, 0.85)" 
                        css={{
                            backdropFilter: "blur(24px) saturate(180%)",
                            WebkitBackdropFilter: "blur(24px) saturate(180%)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05)"
                        }}
                        borderRadius="xl" 
                        p={4} 
                        w="100%"
                        position="relative"
                        overflow="hidden"
                    >
                        <Text color="white" fontSize="lg" fontWeight="bold" mb={4}>
                            Trade {selectedToken?.symbol || "Token"}
                        </Text>
                        
                        <Flex mb={4}>
                            <Button
                                flex={1}
                                bg={isBuying 
                                    ? "linear-gradient(145deg, #52e88d, #1fa055)" 
                                    : "linear-gradient(145deg, #2a2a2a, #1a1a1a)"}
                                color={isBuying ? "white" : "#888"}
                                onClick={() => setIsBuying(true)}
                                borderRadius="0"
                                border="none"
                                boxShadow={isBuying 
                                    ? "0 0 15px rgba(74,222,128,0.3), 0 4px 8px rgba(0,0,0,0.2)" 
                                    : "0 2px 8px rgba(0,0,0,0.2)"}
                                _hover={{
                                    transform: isBuying ? "scale(1.02)" : "scale(1.01)",
                                    boxShadow: isBuying 
                                        ? "0 0 20px rgba(74,222,128,0.4), 0 6px 12px rgba(0,0,0,0.3)" 
                                        : "0 0 10px rgba(74,222,128,0.2), 0 4px 8px rgba(0,0,0,0.2)"
                                }}
                                _active={{
                                    transform: "scale(0.98)",
                                    boxShadow: isBuying 
                                        ? "0 0 10px rgba(74,222,128,0.2), inset 0 2px 4px rgba(0,0,0,0.2)" 
                                        : "inset 0 2px 4px rgba(0,0,0,0.2)"
                                }}
                                position="relative"
                                overflow="hidden"
                                transition="all 0.3s ease"
                                fontWeight="600"
                                fontSize="sm"
                                h="36px"
                            >
                                BUY
                            </Button>
                            <Button
                                flex={1}
                                ml={2}
                                bg={!isBuying 
                                    ? "linear-gradient(145deg, #ff4d4d, #cc0000)" 
                                    : "linear-gradient(145deg, #2a2a2a, #1a1a1a)"}
                                color={!isBuying ? "white" : "#888"}
                                onClick={() => setIsBuying(false)}
                                borderRadius="0"
                                border="none"
                                boxShadow={!isBuying 
                                    ? "0 0 15px rgba(239,68,68,0.3), 0 4px 8px rgba(0,0,0,0.2)" 
                                    : "0 2px 8px rgba(0,0,0,0.2)"}
                                _hover={{
                                    transform: !isBuying ? "scale(1.02)" : "scale(1.01)",
                                    boxShadow: !isBuying 
                                        ? "0 0 20px rgba(239,68,68,0.4), 0 6px 12px rgba(0,0,0,0.3)" 
                                        : "0 0 10px rgba(239,68,68,0.2), 0 4px 8px rgba(0,0,0,0.2)"
                                }}
                                _active={{
                                    transform: "scale(0.98)",
                                    boxShadow: !isBuying 
                                        ? "0 0 10px rgba(239,68,68,0.2), inset 0 2px 4px rgba(0,0,0,0.2)" 
                                        : "inset 0 2px 4px rgba(0,0,0,0.2)"
                                }}
                                position="relative"
                                overflow="hidden"
                                transition="all 0.3s ease"
                                fontWeight="600"
                                fontSize="sm"
                                h="36px"
                            >
                                SELL
                            </Button>
                        </Flex>
                        
                        <Box mb={4}>
                            <Box mb={2}>
                                <Flex justifyContent="space-between" alignItems="center">
                                    <Text color="#888" fontSize="sm" mb={"3px"}>Amount</Text>
                                    <Box display="inline-flex" alignItems="center" gap="12px">
                                        <Box display="inline-flex" alignItems="center" gap="6px">
                                            <Checkbox 
                                            size="sm" 
                                            checked={useWeth}
                                            onCheckedChange={(e) => setUseWeth(e.checked)}
                                            colorPalette="green"
                                            display="inline-block"
                                            css={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                '& .chakra-checkbox__control': {
                                                    borderColor: '#666',
                                                    backgroundColor: useWeth ? '#4ade80' : '#2a2a2a',
                                                    width: '16px',
                                                    height: '16px',
                                                    '&:hover': {
                                                        borderColor: '#4ade80'
                                                    }
                                                },
                                                '& .chakra-checkbox__control[data-checked]': {
                                                    borderColor: '#4ade80',
                                                    backgroundColor: '#4ade80'
                                                },
                                                '& .chakra-checkbox__label': {
                                                    display: 'none'
                                                }
                                            }}
                                            />
                                            <Text 
                                                as="span"
                                                fontSize="xs" 
                                                color="#888" 
                                                cursor="pointer" 
                                                onClick={() => setUseWeth(!useWeth)}
                                                userSelect="none"
                                                display="inline-block"
                                                lineHeight="16px"
                                            >
                                                Use WMON
                                            </Text>
                                        </Box>
                                        <Box display="inline-flex" alignItems="center" gap="6px">
                                            <Checkbox 
                                            size="sm" 
                                            checked={useMax}
                                            onCheckedChange={(e) => {
                                                setUseMax(e.checked);
                                                if (e.checked) {
                                                    // Set max amount based on whether buying or selling
                                                    if (isBuying) {
                                                        const maxAmount = useWeth ? wethBalance : ethBalance;
                                                        validateAndSetTradeAmount(maxAmount);
                                                    } else {
                                                        validateAndSetTradeAmount(tokenBalance);
                                                    }
                                                } else {
                                                    setTradeAmount("");
                                                }
                                            }}
                                            colorPalette="green"
                                            display="inline-block"
                                            css={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                '& .chakra-checkbox__control': {
                                                    borderColor: '#666',
                                                    backgroundColor: useMax ? '#4ade80' : '#2a2a2a',
                                                    width: '16px',
                                                    height: '16px',
                                                    '&:hover': {
                                                        borderColor: '#4ade80'
                                                    }
                                                },
                                                '& .chakra-checkbox__control[data-checked]': {
                                                    borderColor: '#4ade80',
                                                    backgroundColor: '#4ade80'
                                                },
                                                '& .chakra-checkbox__label': {
                                                    display: 'none'
                                                }
                                            }}
                                            />
                                            <Text 
                                                as="span"
                                                fontSize="xs" 
                                                color="#888" 
                                                cursor="pointer" 
                                                onClick={() => {
                                                    const newUseMax = !useMax;
                                                    setUseMax(newUseMax);
                                                    if (newUseMax) {
                                                        // Set max amount based on whether buying or selling
                                                        if (isBuying) {
                                                            const maxAmount = useWeth ? wethBalance : ethBalance;
                                                            validateAndSetTradeAmount(maxAmount);
                                                        } else {
                                                            validateAndSetTradeAmount(tokenBalance);
                                                        }
                                                    } else {
                                                        setTradeAmount("");
                                                    }
                                                }}
                                                userSelect="none"
                                                display="inline-block"
                                                lineHeight="16px"
                                            >
                                                Use Max
                                            </Text>
                                        </Box>
                                    </Box>
                                </Flex>
                            </Box>
                            <Input
                                placeholder="0.00"
                                value={tradeAmount}
                                onChange={(e) => validateAndSetTradeAmount(e.target.value)}
                                bg="#2a2a2a"
                                border="none"
                                size="lg"
                                _placeholder={{ color: "#666" }}
                                mt={-2}
                                h="35px"
                                css={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            />
                            <Box h="20px" mt={1} display="flex" alignItems="center">
                                {showQuoteLoading ? (
                                    <Spinner size="xs" color="#4ade80" />
                                ) : quote ? (
                                    <HStack>
                                        <Box w="80px">
                                             <Text color="#666" fontSize="xs">
                                                Receiving
                                             </Text>
                                        </Box>
                                        <Box w="120px">
                                            <Text color="#666" fontSize="xs">
                                               ≈ {formatNumber(parseFloat(quote))}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text color="#666" fontSize="xs">
                                                {isBuying ? selectedToken?.symbol : (useWeth ? "WMON" : "MON")}
                                            </Text>
                                        </Box>
                                    </HStack>
                                ) : null}
                            </Box>
                        </Box>
                        
                        <Box mb={4}>
                            <Flex justifyContent="space-between" mb={2}>
                                <Box>
                                    <Text color="#888" fontSize="sm">Price Impact</Text>
                                </Box>
                                <Box>
                                    <Text color={parseFloat(priceImpact) > 3 ? "#ef4444" : "#4ade80"} fontSize="sm">
                                        {priceImpact}%
                                    </Text>
                                </Box>
                            </Flex>
                            <Flex justifyContent="space-between" mb={2}>
                                <Box>
                                    <Text color="#888" fontSize="sm">Min Received</Text>
                                </Box>
                                <Box>
                                    <Text color="white" fontSize="sm">
                                        {formatNumber(Number(quote ? (parseFloat(quote) * (1 - parseFloat(slippage) / 100)) : "0"))} {isBuying ? selectedToken?.symbol : (useWeth ? "WMON" : "MON")}
                                    </Text>
                                </Box>
                            </Flex> 
                            {/* <Flex justifyContent="space-between" mb={2}> */}
                            <VStack alignItems={"left"} textAlign={"left"} mb={1} fontSize={"xs"}>
                                <Box  mt={2}>
                                    <Text color="#888" fontSize="sm">Max Slippage</Text>
                                </Box>   
                                    <Box  w="100%" >
                                        <HStack w="100%" gap={1}>
                                        <Button
                                            flex="1"
                                            size="xs"
                                            h="24px"
                                            bg={slippage === "0.1" ? "#4ade80" : "#2a2a2a"}
                                            color={slippage === "0.1" ? "black" : "white"}
                                            onClick={() => setSlippage("0.1")}
                                            _hover={{ bg: slippage === "0.1" ? "#4ade80" : "#3a3a3a" }}
                                        >
                                            0.1%
                                        </Button>
                                        <Button
                                            flex="1"
                                            size="xs"
                                            h="24px"
                                            bg={slippage === "0.5" ? "#4ade80" : "#2a2a2a"}
                                            color={slippage === "0.5" ? "black" : "white"}
                                            onClick={() => setSlippage("0.5")}
                                            _hover={{ bg: slippage === "0.5" ? "#4ade80" : "#3a3a3a" }}
                                        >
                                            0.5%
                                        </Button>
                                        <Button
                                            flex="1"
                                            size="xs"
                                            h="24px"
                                            bg={slippage === "1" ? "#4ade80" : "#2a2a2a"}
                                            color={slippage === "1" ? "black" : "white"}
                                            onClick={() => setSlippage("1")}
                                            _hover={{ bg: slippage === "1" ? "#4ade80" : "#3a3a3a" }}
                                        >
                                            1%
                                        </Button>
                                        <Button
                                            w="60px"
                                            size="xs"
                                            h="24px"
                                            bg={!["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#2a2a2a"}
                                            color={!["0.1", "0.5", "1"].includes(slippage) ? "black" : "white"}
                                            onClick={() => setIsSlippageModalOpen(true)}
                                            _hover={{ bg: !["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#3a3a3a" }}
                                            fontSize="xs"
                                        >
                                            {!["0.1", "0.5", "1"].includes(slippage) ? `${slippage}%` : "Custom"}
                                        </Button>
                                        </HStack>

                                    </Box>                          
                            </VStack>

                            {/* </Flex> */}
                            <Box mt={2}>
                                <br />
                            <Flex justifyContent="space-between" mb={2} mt={2}>
                                <Box>
                                    <Text color="#888" fontSize="sm">Network Fee</Text>
                                </Box>
                                <Box>
                                    <Text color="white" fontSize="sm">~$0.12</Text>
                                </Box>
                            </Flex>                                
                            </Box>
                            <Flex justifyContent="space-between" alignItems="center">
                                <Box display="inline-flex" alignItems="center" gap="6px">
                                    <Checkbox 
                                        size="sm" 
                                        checked={approveMax}
                                        onCheckedChange={(e) => handleApproveMaxChange(e.checked)}
                                        colorPalette="green"
                                        display="inline-block"
                                        css={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            '& .chakra-checkbox__control': {
                                                borderColor: '#666',
                                                backgroundColor: approveMax ? '#4ade80' : '#2a2a2a',
                                                width: '16px',
                                                height: '16px',
                                                '&:hover': {
                                                    borderColor: '#4ade80'
                                                }
                                            },
                                            '& .chakra-checkbox__control[data-checked]': {
                                                borderColor: '#4ade80',
                                                backgroundColor: '#4ade80'
                                            },
                                            '& .chakra-checkbox__label': {
                                                display: 'none'
                                            }
                                        }}
                                    />
                                    <Text 
                                        as="span"
                                        fontSize="xs" 
                                        color="#888" 
                                        cursor="pointer" 
                                        onClick={() => handleApproveMaxChange(!approveMax)}
                                        userSelect="none"
                                        display="inline-block"
                                        lineHeight="16px"
                                    >
                                        Approve Max
                                    </Text>
                                </Box>
                                <Tooltip content="Approve unlimited amount to avoid repeated approvals">
                                    <Box>
                                        <Text color="#666" fontSize="xs">ⓘ</Text>
                                    </Box>
                                </Tooltip>
                            </Flex>
                        </Box>
                        
                        <Button
                            w="100%"
                            h="48px"
                            bg={isBuying 
                                ? "linear-gradient(145deg, #52e88d, #1fa055)" 
                                : "linear-gradient(145deg, #ff4d4d, #cc0000)"}
                            color="white"
                            fontSize="lg"
                            fontWeight="700"
                            onClick={isBuying ? handleBuy : handleSell}
                            isDisabled={!selectedToken || !tradeAmount || isLoading || isLoadingExecuteTrade || !getTradeValidationState().isValid}
                            isLoading={isLoading || isLoadingExecuteTrade}
                            loadingText="Processing..."
                            borderRadius="0"
                            border="none"
                            boxShadow={isBuying 
                                ? "0 0 20px rgba(74,222,128,0.3), 0 4px 12px rgba(0,0,0,0.3)" 
                                : "0 0 20px rgba(239,68,68,0.3), 0 4px 12px rgba(0,0,0,0.3)"}
                            _hover={{
                                transform: "translateY(-2px)",
                                boxShadow: isBuying 
                                    ? "0 0 30px rgba(74,222,128,0.5), 0 8px 20px rgba(0,0,0,0.4)" 
                                    : "0 0 30px rgba(239,68,68,0.5), 0 8px 20px rgba(0,0,0,0.4)"
                            }}
                            _active={{
                                transform: "scale(0.98)",
                                boxShadow: isBuying 
                                    ? "0 0 15px rgba(74,222,128,0.2), inset 0 2px 4px rgba(0,0,0,0.2)" 
                                    : "0 0 15px rgba(239,68,68,0.2), inset 0 2px 4px rgba(0,0,0,0.2)"
                            }}
                            _disabled={{
                                bg: "linear-gradient(145deg, #3a3a3a, #2a2a2a)",
                                color: "#666",
                                cursor: "not-allowed",
                                transform: "none",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                            }}
                            opacity={isLoading || isLoadingExecuteTrade ? 0.8 : 1}
                            cursor={isLoading || isLoadingExecuteTrade ? "not-allowed" : "pointer"}
                            transition="all 0.3s ease"
                            position="relative"
                            letterSpacing="0.1em"
                        >
                            {(isLoading || isLoadingExecuteTrade) ? (
                                <Spinner size="sm" color={isBuying ? "black" : "white"} />
                            ) : (
                                `${isBuying ? "Buy" : "Sell"} ${selectedToken?.symbol || ""}`
                            )}
                        </Button>
                    </Box>
                    </VStack>
                    </Box>
                ) : (
                    /* Mobile Layout - Reordered */
                    <>
                        {/* Trade Box First on Mobile */}
                        <Box w="100%">
                            <Box 
                                bg="rgba(26, 26, 26, 0.85)" 
                                css={{
                                    backdropFilter: "blur(24px) saturate(180%)",
                                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05)"
                                }}
                                borderRadius="xl" 
                                p={4} 
                                w="100%"
                                position="relative"
                                overflow="hidden"
                            >
                                <Text color="white" fontSize="lg" fontWeight="bold" mb={4}>
                                    Trade {selectedToken?.symbol || "Token"}
                                </Text>
                                
                                <Flex mb={4}>
                                    <Button
                                        flex={1}
                                        bg={isBuying ? "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)" : "rgba(255, 255, 255, 0.05)"}
                                        backdropFilter="blur(10px)"
                                        color={isBuying ? "black" : "white"}
                                        onClick={() => setIsBuying(true)}
                                        borderRadius="md"
                                        border={isBuying ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)"}
                                        boxShadow={isBuying ? "0 4px 12px rgba(74, 222, 128, 0.2)" : "none"}
                                        _hover={{
                                            bg: isBuying ? "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)" : "rgba(74, 222, 128, 0.1)",
                                            transform: "translateY(-1px)",
                                            boxShadow: "0 6px 16px rgba(74, 222, 128, 0.25)"
                                        }}
                                        _active={{
                                            transform: "translateY(0)",
                                            boxShadow: "0 2px 8px rgba(74, 222, 128, 0.2)"
                                        }}
                                        transition="all 0.2s"
                                        fontWeight="600"
                                    >
                                        Buy
                                    </Button>
                                    <Button
                                        flex={1}
                                        ml={2}
                                        bg={!isBuying ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "rgba(255, 255, 255, 0.05)"}
                                        backdropFilter="blur(10px)"
                                        color="white"
                                        onClick={() => setIsBuying(false)}
                                        borderRadius="md"
                                        border={!isBuying ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)"}
                                        boxShadow={!isBuying ? "0 4px 12px rgba(239, 68, 68, 0.2)" : "none"}
                                        _hover={{
                                            bg: !isBuying ? "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)" : "rgba(239, 68, 68, 0.1)",
                                            transform: "translateY(-1px)",
                                            boxShadow: "0 6px 16px rgba(239, 68, 68, 0.25)"
                                        }}
                                        _active={{
                                            transform: "translateY(0)",
                                            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.2)"
                                        }}
                                        transition="all 0.2s"
                                        fontWeight="600"
                                    >
                                        Sell
                                    </Button>
                                </Flex>
                                
                                <Box mb={4}>
                                    <Box mb={2}>
                                        <Flex justifyContent="space-between" alignItems="center">
                                            <Text color="#888" fontSize="sm">Amount</Text>
                                            <Box display="inline-flex" alignItems="center" gap="12px">
                                                <Box display="inline-flex" alignItems="center" gap="6px">
                                                <Checkbox 
                                                    size="sm" 
                                                    checked={useWeth}
                                                    onCheckedChange={(e) => setUseWeth(e.checked)}
                                                    colorPalette="green"
                                                    display="inline-block"
                                                    css={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        '& .chakra-checkbox__control': {
                                                            borderColor: '#666',
                                                            backgroundColor: useWeth ? '#4ade80' : '#2a2a2a',
                                                            width: '16px',
                                                            height: '16px',
                                                            '&:hover': {
                                                                borderColor: '#4ade80'
                                                            }
                                                        },
                                                        '& .chakra-checkbox__control[data-checked]': {
                                                            borderColor: '#4ade80',
                                                            backgroundColor: '#4ade80'
                                                        },
                                                        '& .chakra-checkbox__label': {
                                                            display: 'none'
                                                        }
                                                    }}
                                                />
                                                <Text 
                                                    as="span"
                                                    fontSize="xs" 
                                                    color="#888" 
                                                    cursor="pointer" 
                                                    onClick={() => setUseWeth(!useWeth)}
                                                    userSelect="none"
                                                    display="inline-block"
                                                    lineHeight="16px"
                                                >
                                                    Use WMON
                                                </Text>
                                                </Box>
                                                <Box display="inline-flex" alignItems="center" gap="6px">
                                                <Checkbox 
                                                    size="sm" 
                                                    checked={useMax}
                                                    onCheckedChange={(e) => {
                                                        setUseMax(e.checked);
                                                        if (e.checked) {
                                                            // Set max amount based on whether buying or selling
                                                            if (isBuying) {
                                                                const maxAmount = useWeth ? wethBalance : ethBalance;
                                                                validateAndSetTradeAmount(maxAmount);
                                                            } else {
                                                                validateAndSetTradeAmount(tokenBalance);
                                                            }
                                                        } else {
                                                            setTradeAmount("");
                                                        }
                                                    }}
                                                    colorPalette="green"
                                                    display="inline-block"
                                                    css={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        '& .chakra-checkbox__control': {
                                                            borderColor: '#666',
                                                            backgroundColor: useMax ? '#4ade80' : '#2a2a2a',
                                                            width: '16px',
                                                            height: '16px',
                                                            '&:hover': {
                                                                borderColor: '#4ade80'
                                                            }
                                                        },
                                                        '& .chakra-checkbox__control[data-checked]': {
                                                            borderColor: '#4ade80',
                                                            backgroundColor: '#4ade80'
                                                        },
                                                        '& .chakra-checkbox__label': {
                                                            display: 'none'
                                                        }
                                                    }}
                                                />
                                                <Text 
                                                    as="span"
                                                    fontSize="xs" 
                                                    color="#888" 
                                                    cursor="pointer" 
                                                    onClick={() => {
                                                        const newUseMax = !useMax;
                                                        setUseMax(newUseMax);
                                                        if (newUseMax) {
                                                            // Set max amount based on whether buying or selling
                                                            if (isBuying) {
                                                                const maxAmount = useWeth ? wethBalance : ethBalance;
                                                                validateAndSetTradeAmount(maxAmount);
                                                            } else {
                                                                validateAndSetTradeAmount(tokenBalance);
                                                            }
                                                        } else {
                                                            setTradeAmount("");
                                                        }
                                                    }}
                                                    userSelect="none"
                                                    display="inline-block"
                                                    lineHeight="16px"
                                                >
                                                    Use Max
                                                </Text>
                                                </Box>
                                            </Box>
                                        </Flex>
                                    </Box>
                                    <Input
                                        placeholder="0.00"
                                        value={tradeAmount}
                                        onChange={(e) => validateAndSetTradeAmount(e.target.value)}
                                        bg="#2a2a2a"
                                        border="none"
                                        size="lg"
                                        _placeholder={{ color: "#666" }}
                                        mt={-2}
                                        css={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    />
                                    <Box h="20px" mt={1} display="flex" alignItems="center">
                                        {showQuoteLoading ? (
                                            <Spinner size="xs" color="#4ade80" />
                                        ) : quote ? (
                                            <Text color="#666" fontSize="xs">
                                                You will {isBuying ? "receive" : "pay"} ≈ {quote} {isBuying ? selectedToken?.symbol : (useWeth ? "WMON" : "MON")}
                                            </Text>
                                        ) : null}
                                    </Box>
                                </Box>
                                
                                <Box mb={4}>
                                    <Flex justifyContent="space-between" mb={2}>
                                        <Box>
                                            <Text color="#888" fontSize="sm">Price Impact</Text>
                                        </Box>
                                        <Box>
                                            <Text color={parseFloat(priceImpact) > 3 ? "#ef4444" : "#4ade80"} fontSize="sm">
                                                {priceImpact}%
                                            </Text>
                                        </Box>
                                    </Flex>
                                    <Flex justifyContent="space-between" mb={2}>
                                        <Box>
                                            <Text color="#888" fontSize="sm">Min Received</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm">
                                                {quote || "0"} {isBuying ? selectedToken?.symbol : (useWeth ? "WMON" : "MON")}
                                            </Text>
                                        </Box>
                                    </Flex>

                                    <VStack textAlign={"left"} alignItems={"left"} mb={2}>
                                        <Box>
                                            <Text color="#888" fontSize="sm">Max Slippage</Text>
                                        </Box>
                                        <Box  w="100%">
                                            <HStack w="100%" gap={1}>
                                            <Button
                                                flex="1"
                                                size="xs"
                                                h="24px"
                                                bg={slippage === "0.1" ? "#4ade80" : "#2a2a2a"}
                                                color={slippage === "0.1" ? "black" : "white"}
                                                onClick={() => setSlippage("0.1")}
                                                _hover={{ bg: slippage === "0.1" ? "#4ade80" : "#3a3a3a" }}
                                            >
                                                0.1%
                                            </Button>
                                            <Button
                                                flex="1"
                                                size="xs"
                                                h="24px"
                                                bg={slippage === "0.5" ? "#4ade80" : "#2a2a2a"}
                                                color={slippage === "0.5" ? "black" : "white"}
                                                onClick={() => setSlippage("0.5")}
                                                _hover={{ bg: slippage === "0.5" ? "#4ade80" : "#3a3a3a" }}
                                            >
                                                0.5%
                                            </Button>
                                            <Button
                                                flex="1"
                                                size="xs"
                                                h="24px"
                                                bg={slippage === "1" ? "#4ade80" : "#2a2a2a"}
                                                color={slippage === "1" ? "black" : "white"}
                                                onClick={() => setSlippage("1")}
                                                _hover={{ bg: slippage === "1" ? "#4ade80" : "#3a3a3a" }}
                                            >
                                                1%
                                            </Button>
                                            <Button
                                                w="60px"
                                                size="xs"
                                                h="24px"
                                                bg={!["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#2a2a2a"}
                                                color={!["0.1", "0.5", "1"].includes(slippage) ? "black" : "white"}
                                                onClick={() => setIsSlippageModalOpen(true)}
                                                _hover={{ bg: !["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#3a3a3a" }}
                                                fontSize="xs"
                                            >
                                                {!["0.1", "0.5", "1"].includes(slippage) ? `${slippage}%` : "Custom"}
                                            </Button>
                                            </HStack>

                                        </Box>
                                    </VStack>
                                    <Flex justifyContent="space-between" mb={2}>
                                        <Box>
                                            <Text color="#888" fontSize="sm">Network Fee</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm">~$0.12</Text>
                                        </Box>
                                    </Flex>
                                    <Flex justifyContent="space-between" alignItems="center">
                                        <Box display="inline-flex" alignItems="center" gap="6px">
                                            <Checkbox 
                                                size="sm" 
                                                checked={approveMax}
                                                onCheckedChange={(e) => handleApproveMaxChange(e.checked)}
                                                colorPalette="green"
                                                display="inline-block"
                                                css={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    '& .chakra-checkbox__control': {
                                                        borderColor: '#666',
                                                        backgroundColor: approveMax ? '#4ade80' : '#2a2a2a',
                                                        width: '16px',
                                                        height: '16px',
                                                        '&:hover': {
                                                            borderColor: '#4ade80'
                                                        }
                                                    },
                                                    '& .chakra-checkbox__control[data-checked]': {
                                                        borderColor: '#4ade80',
                                                        backgroundColor: '#4ade80'
                                                    },
                                                    '& .chakra-checkbox__label': {
                                                        display: 'none'
                                                    }
                                                }}
                                            />
                                            <Text 
                                                as="span"
                                                fontSize="xs" 
                                                color="#888" 
                                                cursor="pointer" 
                                                onClick={() => handleApproveMaxChange(!approveMax)}
                                                userSelect="none"
                                                display="inline-block"
                                                lineHeight="16px"
                                            >
                                                Approve Max
                                            </Text>
                                        </Box>
                                        <Tooltip content="Approve unlimited amount to avoid repeated approvals">
                                            <Box>
                                                <Text color="#666" fontSize="xs">ⓘ</Text>
                                            </Box>
                                        </Tooltip>
                                    </Flex>
                                </Box>
                                
                                <Button
                                    w="100%"
                                    h="56px"
                                    bg={isBuying ? "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}
                                    backdropFilter="blur(10px)"
                                    color={isBuying ? "black" : "white"}
                                    fontSize="lg"
                                    fontWeight="bold"
                                    onClick={isBuying ? handleBuy : handleSell}
                                    isDisabled={!selectedToken || !tradeAmount || isLoading || !getTradeValidationState().isValid}
                                    isLoading={isLoading}
                                    borderRadius="xl"
                                    boxShadow={isBuying ? "0 8px 24px rgba(74, 222, 128, 0.3)" : "0 8px 24px rgba(239, 68, 68, 0.3)"}
                                    _hover={{
                                        bg: isBuying ? "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)" : "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)",
                                        transform: "translateY(-2px)",
                                        boxShadow: isBuying ? "0 12px 32px rgba(74, 222, 128, 0.4)" : "0 12px 32px rgba(239, 68, 68, 0.4)"
                                    }}
                                    _active={{
                                        transform: "translateY(0)",
                                        boxShadow: isBuying ? "0 4px 16px rgba(74, 222, 128, 0.3)" : "0 4px 16px rgba(239, 68, 68, 0.3)"
                                    }}
                                    _disabled={{
                                        bg: "rgba(255, 255, 255, 0.05)",
                                        backdropFilter: "blur(5px)",
                                        color: "#666",
                                        cursor: "not-allowed",
                                        transform: "none",
                                        boxShadow: "none"
                                    }}
                                    transition="all 0.2s"
                                    position="relative"
                                    overflow="hidden"
                                >
                                    {isBuying ? "Buy" : "Sell"} {selectedToken?.symbol || ""}
                                </Button>
                            </Box>
                        </Box>
                        
                        {/* Wallet Balance Second on Mobile */}
                        <Box w="100%">
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
                                                    {address ? parseFloat(ethBalance).toFixed(4) : "0.00"}
                                                </Text>
                                            </Box>
                                        </Flex>
                                        <Text color="#666" fontSize="xs" textAlign="right">
                                            ≈ ${address ? (parseFloat(ethBalance) * 50).toFixed(2) : "0.00"}
                                        </Text>
                                    </Box>
                                    
                                    {/* WMON Balance */}
                                    <Box>
                                        <Flex justifyContent="space-between" alignItems="center">
                                            <HStack>
                                                <Box w="20px" h="20px">
                                                    <Image
                                                        src={monadLogo}
                                                        alt="WMON"
                                                        w="20px"
                                                        h="20px"
                                                    />
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm">WMON</Text>
                                                </Box>
                                            </HStack>
                                            <Box>
                                                <Text color="white" fontWeight="bold">
                                                    {address ? parseFloat(wethBalance).toFixed(4) : "0.00"}
                                                </Text>
                                            </Box>
                                        </Flex>
                                        <Text color="#666" fontSize="xs" textAlign="right">
                                            ≈ ${address ? (parseFloat(wethBalance) * 50).toFixed(2) : "0.00"}
                                        </Text>
                                    </Box>
                                    
                                    {/* Selected Token Balance */}
                                    {selectedToken && (
                                        <Box>
                                            <Flex justifyContent="space-between" alignItems="center">
                                                <HStack>
                                                    <Box w="20px" h="20px">
                                                        <Image
                                                            src={selectedToken.logoUrl || placeholderLogo}
                                                            alt={selectedToken.symbol}
                                                            w="20px"
                                                            h="20px"
                                                            onError={(e) => {
                                                                e.currentTarget.src = placeholderLogo;
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box>
                                                        <Text color="#888" fontSize="sm">{selectedToken.symbol}</Text>
                                                    </Box>
                                                </HStack>
                                                <Box>
                                                    <Text color="white" fontWeight="bold">
                                                        {address ? parseFloat(tokenBalance).toFixed(2) : "0.00"}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                            <Text color="#666" fontSize="xs" textAlign="right">
                                                ≈ ${address && selectedToken ? (parseFloat(tokenBalance) * selectedToken.price * (monPrice || 0)).toFixed(2) : "0.00"}
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
                                                        parseFloat(ethBalance) * 50 + 
                                                        (selectedToken ? parseFloat(tokenBalance) * selectedToken.price : 0)
                                                    ).toFixed(2) : "0.00"}
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Box>
                                </VStack>
                            </Box>
                        </Box>
                        
                        {/* Trade History Last on Mobile */}
                        {selectedToken && (
                        <Box w="100%">
                            <Box bg="#1a1a1a" borderRadius="lg" p={3} w="100%">
                                <Tabs.Root value={tradeHistoryTab} onValueChange={(e) => setTradeHistoryTab(e.value)}>
                                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                                        <Tabs.List flex={1}>
                                        <Tabs.Trigger 
                                            value="my" 
                                            flex={1}
                                            // _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                            color="#888"
                                            fontWeight="600"     
                                            disabled={true}                                      
                                        >
                                            {"History"}
                                        </Tabs.Trigger>
                                    </Tabs.List>
                                    {tradeHistory.length > 0 && (
                                        <Button
                                            size="sm"
                                            ml={2}
                                            bg="#2a2a2a"
                                            color="#888"
                                            _hover={{ bg: "#3a3a3a", color: "white" }}
                                            onClick={clearTradeHistory}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </Flex>
                                    
                                <Tabs.Content value="all">
                                        <VStack gap={2} align="stretch">
                                                {getPaginatedData(tradeHistory, currentPage, itemsPerPage).map((trade) => (
                                                    <Box
                                                        key={trade.id}
                                                        p={3}
                                                        bg="#2a2a2a"
                                                        borderRadius="md"
                                                        cursor="pointer"
                                                        _hover={{ bg: "#333" }}
                                                    >
                                                        {/* First Row: Badge, Token, Amount */}
                                                        <Flex justifyContent="space-between" alignItems="center" mb={2}>
                                                            <HStack gap={2}>
                                                                <Box>
                                                                    <Badge
                                                                        colorPalette={trade.type === "buy" ? "green" : "red"}
                                                                        size="sm"
                                                                    >
                                                                        {trade.type.toUpperCase()}
                                                                    </Badge>
                                                                </Box>
                                                                <Box>
                                                                    <Text color="white" fontWeight="bold">
                                                                        {trade.token}
                                                                    </Text>
                                                                </Box>
                                                            </HStack>
                                                            <Box>
                                                                <Text color="white" fontWeight="bold">
                                                                    {trade.total.toFixed(4)} MON {monPrice > 0 && <Text as="span" fontSize="xs" color="#888">(${(trade.total * monPrice).toFixed(2)})</Text>}
                                                                </Text>
                                                            </Box>
                                                        </Flex>
                                                        
                                                        {/* Second Row: Trade details and time */}
                                                        <Flex justifyContent="space-between" alignItems="center">
                                                            <Box>
                                                                <Text color="#888" fontSize="xs">
                                                                    {trade.amount.toLocaleString()} {trade.token} @ {formatPrice(trade.price)} MON
                                                                </Text>
                                                            </Box>
                                                            <HStack gap={3}>
                                                                <Box>
                                                                    <Text 
                                                                        color="#4ade80" 
                                                                        fontSize="xs"
                                                                        cursor="pointer"
                                                                        _hover={{ textDecoration: "underline" }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(`https://monadexplorer.com/tx/${trade.fullTxHash}`, "_blank");
                                                                        }}
                                                                    >
                                                                        {trade.txHash}
                                                                    </Text>
                                                                </Box>
                                                                <Box>
                                                                    <Text color="#888" fontSize="xs">
                                                                        {Math.floor((Date.now() - trade.time.getTime()) / 60000)}m ago
                                                                    </Text>
                                                                </Box>
                                                            </HStack>
                                                        </Flex>
                                                    </Box>
                                                ))}
                                                
                                                {/* Pagination Controls for Mobile */}
                                                {getTotalPages(tradeHistory, itemsPerPage) > 1 && (
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
                                                            {Array.from({ length: Math.min(3, getTotalPages(tradeHistory, itemsPerPage)) }, (_, i) => {
                                                                const pageNum = currentPage <= 2 ? i + 1 : currentPage + i - 1;
                                                                if (pageNum > 0 && pageNum <= getTotalPages(tradeHistory, itemsPerPage)) {
                                                                    return (
                                                                        <Button
                                                                            key={pageNum}
                                                                            size="sm"
                                                                            onClick={() => setCurrentPage(pageNum)}
                                                                            bg={currentPage === pageNum ? "#4ade80" : "#2a2a2a"}
                                                                            color={currentPage === pageNum ? "black" : "white"}
                                                                            _hover={{ bg: currentPage === pageNum ? "#4ade80" : "#3a3a3a" }}
                                                                            minW="35px"
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
                                                            onClick={() => setCurrentPage(prev => Math.min(getTotalPages(tradeHistory, itemsPerPage), prev + 1))}
                                                            isDisabled={currentPage === getTotalPages(tradeHistory, itemsPerPage)}
                                                            bg="#2a2a2a"
                                                            _hover={{ bg: "#3a3a3a" }}
                                                        >
                                                            Next
                                                        </Button>
                                                    </HStack>
                                                )}
                                            </VStack>
                                    </Tabs.Content>
                                    
                                    <Tabs.Content value="my">
                                        {address ? (
                                                <VStack gap={2} align="stretch">
                                                    {(() => {
                                                        const myTrades = tradeHistory.filter(trade => 
                                                            trade.sender?.toLowerCase() === address.toLowerCase() || 
                                                            trade.recipient?.toLowerCase() === address.toLowerCase()
                                                        );
                                                        const paginatedMyTrades = getPaginatedData(myTrades, myTxCurrentPage, itemsPerPage);
                                                        
                                                        return myTrades.length > 0 ? (
                                                            <>
                                                                {paginatedMyTrades.map((trade) => (
                                                                    <Box
                                                                        key={trade.id}
                                                                        p={3}
                                                                        bg="#2a2a2a"
                                                                        borderRadius="md"
                                                                        cursor="pointer"
                                                                        _hover={{ bg: "#333" }}
                                                                    >
                                                                        {/* First Row: Badge, Token, Amount */}
                                                                        <Flex justifyContent="space-between" alignItems="center" mb={2}>
                                                                            <HStack gap={2}>
                                                                                <Box>
                                                                                    <Badge
                                                                                        colorPalette={trade.type === "buy" ? "green" : "red"}
                                                                                        size="sm"
                                                                                    >
                                                                                        {trade.type.toUpperCase()}
                                                                                    </Badge>
                                                                                </Box>
                                                                                <Box>
                                                                                    <Text color="white" fontWeight="bold">
                                                                                        {trade.token}
                                                                                    </Text>
                                                                                </Box>
                                                                            </HStack>
                                                                            <Box>
                                                                                <Text color="white" fontWeight="bold">
                                                                                    {trade.total.toFixed(4)} MON {monPrice > 0 && <Text as="span" fontSize="xs" color="#888">(${(trade.total * monPrice).toFixed(2)})</Text>}
                                                                                </Text>
                                                                            </Box>
                                                                        </Flex>
                                                                        
                                                                        {/* Second Row: Trade details and time */}
                                                                        <Flex justifyContent="space-between" alignItems="center">
                                                                            <Box>
                                                                                <Text color="#888" fontSize="xs">
                                                                                    {trade.amount.toLocaleString()} {trade.token} @ {formatPrice(trade.price)} MON
                                                                                </Text>
                                                                            </Box>
                                                                            <HStack gap={3}>
                                                                                <Box>
                                                                                    <Text 
                                                                                        color="#4ade80" 
                                                                                        fontSize="xs"
                                                                                        cursor="pointer"
                                                                                        _hover={{ textDecoration: "underline" }}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            window.open(`https://monadexplorer.com/tx/${trade.fullTxHash}`, "_blank");
                                                                                        }}
                                                                                    >
                                                                                        {trade.txHash}
                                                                                    </Text>
                                                                                </Box>
                                                                                <Box>
                                                                                    <Text color="#888" fontSize="xs">
                                                                                        {Math.floor((Date.now() - trade.time.getTime()) / 60000)}m ago
                                                                                    </Text>
                                                                                </Box>
                                                                            </HStack>
                                                                        </Flex>
                                                                    </Box>
                                                                    ))}
                                                                    
                                                                    {/* Pagination Controls for My Transactions Mobile */}
                                                                    {getTotalPages(myTrades, itemsPerPage) > 1 && (
                                                                        <HStack justify="center" mt={4} gap={2}>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => setMyTxCurrentPage(prev => Math.max(1, prev - 1))}
                                                                                isDisabled={myTxCurrentPage === 1}
                                                                                bg="#2a2a2a"
                                                                                _hover={{ bg: "#3a3a3a" }}
                                                                            >
                                                                                Previous
                                                                            </Button>
                                                                            <HStack gap={1}>
                                                                                {Array.from({ length: Math.min(3, getTotalPages(myTrades, itemsPerPage)) }, (_, i) => {
                                                                                    const pageNum = myTxCurrentPage <= 2 ? i + 1 : myTxCurrentPage + i - 1;
                                                                                    if (pageNum > 0 && pageNum <= getTotalPages(myTrades, itemsPerPage)) {
                                                                                        return (
                                                                                            <Button
                                                                                                key={pageNum}
                                                                                                size="sm"
                                                                                                onClick={() => setMyTxCurrentPage(pageNum)}
                                                                                                bg={myTxCurrentPage === pageNum ? "#4ade80" : "#2a2a2a"}
                                                                                                color={myTxCurrentPage === pageNum ? "black" : "white"}
                                                                                                _hover={{ bg: myTxCurrentPage === pageNum ? "#4ade80" : "#3a3a3a" }}
                                                                                                minW="35px"
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
                                                                                onClick={() => setMyTxCurrentPage(prev => Math.min(getTotalPages(myTrades, itemsPerPage), prev + 1))}
                                                                                isDisabled={myTxCurrentPage === getTotalPages(myTrades, itemsPerPage)}
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
                                                                    No transactions found
                                                                </Text>
                                                            );
                                                        })()}
                                                </VStack>
                                            ) : (
                                                <Text color="#666" textAlign="center" py={8}>
                                                    Connect your wallet to view your transactions
                                                </Text>
                                            )}
                                    </Tabs.Content>
                                </Tabs.Root>
                            </Box>
                        </Box>
                        )}
                    </>
                )}
            </Flex>
            )}
            
            {/* Clear History Confirmation Dialog */}
            <DialogRoot 
                open={showClearHistoryDialog} 
                onOpenChange={(e) => setShowClearHistoryDialog(e.open)}
                placement="center"
                motionPreset="scale"
            >
                <DialogBackdrop />
                <DialogContent
                    position="fixed"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    bg="#1a1a1a"
                    borderRadius="xl"
                    boxShadow="0 20px 40px rgba(0, 0, 0, 0.8)"
                    border="1px solid rgba(255, 255, 255, 0.08)"
                    _open={{
                        animation: "fadeIn 0.2s ease-out"
                    }}
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
                            Clear Trade History
                        </DialogTitle>
                    </DialogHeader>
                    
                    <DialogBody px={6} py={8}>
                        <VStack align="start" spacing={4}>
                            <Text 
                                color="rgba(255, 255, 255, 0.85)" 
                                fontSize="md"
                                lineHeight="1.6"
                            >
                                Are you sure you want to clear all trade history?
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
                                clearTradeHistory();
                                setShowClearHistoryDialog(false);
                            }}
                        >
                            Clear History
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>

            {/* Standalone Modals */}
            <StandaloneWrapModal
                isOpen={isWrapDrawerOpen}
                onClose={() => setIsWrapDrawerOpen(false)}
                onWrap={(amount) => {
                    setWrapAmount(parseFloat(amount));
                    setIsWrapping(true);
                    deposit({
                        value: parseEther(amount)
                    });
                }}
                isWrapping={isWrapping}
                bnbBalance={ethBalance}
            />
            <StandaloneUnwrapModal
                isOpen={isUnwrapDrawerOpen}
                onClose={() => setIsUnwrapDrawerOpen(false)}
                onUnwrap={(amount) => {
                    setWrapAmount(parseFloat(amount));
                    setIsUnwrapping(true);
                    withdraw({
                        args: [parseEther(amount)]
                    });
                }}
                isUnwrapping={isUnwrapping}
                wethBalance={wethBalance}
            />
            <StandaloneSlippageModal
                isOpen={isSlippageModalOpen}
                onClose={() => setIsSlippageModalOpen(false)}
                currentSlippage={slippage}
                onSetSlippage={(newSlippage) => {
                    setSlippage(newSlippage);
                    setIsSlippageModalOpen(false);
                }}
            />
        </Container>
    );
};

export default Exchange;
 