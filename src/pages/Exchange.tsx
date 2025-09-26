import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { useBlockchainWebSocketWagmi } from '../hooks/useBlockchainWebSocketWagmi';
import { features } from '../config/features';
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
import { isMobile } from "react-device-detect";
import { tokenApi } from '../services/tokenApi';
import { useVault } from '../hooks/useVault';
import { vaultApiService } from '../services/vaultApiService';
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
import { LuSearch, LuArrowUpDown, LuArrowUp, LuArrowDown } from "react-icons/lu"

import { useSearchParams } from "react-router-dom"; // Import useSearchParams

import { unCommify, commify, commifyDecimals, generateBytes32String, getContractAddress, generateReferralCode } from "../utils";
import WalletSidebar from "../components/WalletSidebar";
import StandaloneWrapModal from "../components/StandaloneWrapModal";
import StandaloneUnwrapModal from "../components/StandaloneUnwrapModal";
import StandaloneSlippageModal from "../components/StandaloneSlippageModal";
// import UpcomingPresales from "../components/UpcomingPresales"; // DISABLED TO FIND RPC ISSUES
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
        // console.error("Error in safeParseEther:", error, "for value:", value);
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
import { useMonPrice } from '../contexts/MonPriceContext';
import { useGasPrice } from '../hooks/useGasPrice';
import { useMulticallBalances } from '../hooks/useMulticallBalances';
import { useMulticallAllowances } from '../hooks/useMulticallAllowances';

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
// Use singleton provider to prevent multiple instances and reduce eth_chainId calls
import { localProvider } from '../services/providerService';

console.log('[Provider] Using singleton provider instance');

const Exchange: React.FC = () => {
    const { address, isConnected } = useAccount();
    const { selectedToken, setSelectedToken } = useToken();
    const { monPrice } = useMonPrice();
    const [searchTerm, setSearchTerm] = useState(""); // Search disabled to find RPC issues
    const [sortBy, setSortBy] = useState("default"); // "default", "price", "24h"
    const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"
    const [tradeAmount, setTradeAmount] = useState("");
    const [isBuying, setIsBuying] = useState(true);
    const [tradeHistoryTab, setTradeHistoryTab] = useState("global");
    const [globalTrades, setGlobalTrades] = useState([]);
    const [poolToTokenMap, setPoolToTokenMap] = useState<{ [poolAddress: string]: { symbol: string, token0: string, token1: string } }>({});
    
    // Define WETH_ADDRESS early to avoid initialization errors
    const WETH_ADDRESS = config.protocolAddresses.WMON;
    
    // Hardcoded pool mappings as a fallback for global trades
    const KNOWN_POOLS = {
        '0x90666407c841fe58358f3ed04a245c5f5bd6fd0a': { symbol: 'BUN', token0: '', token1: '' },
        '0xcacab5abdc478c6a05ac59125865b2658df982ca': { symbol: 'SBF', token0: '', token1: '' },
        // Add more pools as needed
    };
    const [totalVolume, setTotalVolume] = useState(0);
    // Parse referral code from URL
    const [searchParams] = useSearchParams();
    const urlReferralCode = searchParams.get("r") || "";
    
    // WebSocket connection for real-time trade monitoring
    const {
        isConnected: wsConnected,
        isAuthenticated: wsAuthenticated,
        events: wsEvents,
        error: wsError,
        authenticate: wsAuthenticate,
        subscribe: wsSubscribe,
        unsubscribe: wsUnsubscribe,
        getHistory: wsGetHistory,
        getGlobalTrades: wsGetGlobalTrades,
        clearEvents
    } = useBlockchainWebSocketWagmi({
        autoConnect: true,
        autoAuthenticate: false, // Manual auth to prevent startup errors
        pools: [] // Will subscribe after we have pool info
    });
    
    // Referral state
    const [referralCode, setReferralCode] = useState("");
    const [referredBy, setReferredBy] = useState<string | null>(null);
    
    // Use multicall for allowance checking - reduces 2 polling hooks to 1
    const {
        tokenAllowance: allowance,
        wethAllowance,
        hasEnoughTokenAllowance: hasEnoughAllowance,
        hasEnoughWethAllowance,
        isTokenMaxApproved: isMaxApproved,
        isWethMaxApproved: isMaxApprovedWeth,
    } = useMulticallAllowances({
        tokenAddress: selectedToken?.token0,
        wethAddress: selectedToken?.token1 || WETH_ADDRESS,
        spenderAddress: exchangeHelperAddress,
        refetchInterval: 60000, // 60 seconds
        enabled: !!address,
    });
    
    // Gas price hook for real-time network fees
    const { 
        estimatedFeeEth, 
        estimatedFeeUsd, 
        isLoading: gasLoading,
        gasPriceGwei 
    } = useGasPrice('swap', monPrice);
    
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
    const [useWeth, setUseWeth] = useState(false);
    const [useMax, setUseMax] = useState(false);
    
    // Wrap/Unwrap drawer states - needed for multicall hook
    const [isWrapDrawerOpen, setIsWrapDrawerOpen] = useState(false);
    const [isUnwrapDrawerOpen, setIsUnwrapDrawerOpen] = useState(false);
    
    // Use multicall for balance fetching
    const { balances, refetch: refetchBalances } = useMulticallBalances({
        userAddress: address,
        wethAddress: WETH_ADDRESS,
        tokenAddress: selectedToken?.token0,
        refetchInterval: 30000, // 30 seconds
        enabled: !!address && (!isWrapDrawerOpen && !isUnwrapDrawerOpen), // Disable during modal operations
    });
    
    // Extract balances for backward compatibility
    const ethBalance = balances.eth;
    const wethBalance = balances.weth;
    const tokenBalance = balances.token;
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
    
    // Use vault API hook for selected token's vault - moved here to avoid initialization error
    const { vault: selectedVaultData, loading: selectedVaultLoading } = useVault({
        address: selectedToken?.vault,
        autoFetch: !!selectedToken?.vault,
        refetchInterval: 30000 // Refresh every 30 seconds
    });
    const [totalSupply, setTotalSupply] = useState("0");
    const [shouldRefreshBalances, setShouldRefreshBalances] = useState(true);
    const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false);
    const [slippageAutoAdjusted, setSlippageAutoAdjusted] = useState(false);

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
    const [tokenStats, setTokenStats] = useState<{ [symbol: string]: number }>({});
    
    // Fetch IMV (Intrinsic Minimum Value) from ModelHelper contract - Temporarily disabled
    // const { data: imvData } = useContractRead({
    //     address: modelHelperAddress,
    //     abi: ModelHelperAbi,
    //     functionName: "getIntrinsicMinimumValue",
    //     args: selectedToken?.vault ? [selectedToken.vault] : undefined,
    //     watch: false, // Disable continuous polling to reduce RPC calls
    //     enabled: !!selectedToken?.vault
    // });
    const imvData = null;
    
    // Trade history data with local storage persistence
    const [tradeHistory, setTradeHistory] = useState([]);
    const processedTxHashes = useRef(new Set());
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [myTxCurrentPage, setMyTxCurrentPage] = useState(1);
    const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
    
    // DISABLED TO FIND RPC ISSUES
    // useEffect(() => {
    //     const loadReferralStats = async () => {
    //         if (address) {
    //             try {
    //                 const vaultContract = new ethers.Contract(
    //                     selectedToken?.vault || zeroAddress,
    //                     AuxVaultAbi,
    //                     localProvider
    //                 );
    //                 // console.log({ selectedToken });
    //                 if (typeof selectedToken?.vault == "undefined") return;

    //                 // console.log(`Selected vault address is ${selectedToken?.vault}`);
    //                 const referralEntity = await vaultContract.getReferralEntity(address);

    //                 setTotalVolume(parseFloat(referralEntity.totalReferred || "0"));
    //                 // console.log({ referralEntity}) 
    //                 // console.log(`Total referred for ${address} is ${formatEther(referralEntity.totalReferred)}`);
    //             } catch (error) {
    //                 console.error("Error fetching referral stats:", error);
    //             }
    //         }
    //     };
    //     loadReferralStats();
    // }, [address, selectedToken]);

    
    
    // Function to clear trade history
    const clearTradeHistory = () => {
        setTradeHistory([]);
        processedTxHashes.current.clear();
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
        if (!referredBy || !address || !poolInfo.poolAddress) return;
        
        try {
            // Track trade via API with poolAddress
            await referralApi.trackTrade({
                userAddress: address,
                referralCode: referredBy,
                type: tradeData.type,
                tokenAddress: tradeData.tokenAddress,
                tokenName: tradeData.tokenName,
                tokenSymbol: tradeData.tokenSymbol,
                volumeETH: tradeData.volumeETH,
                volumeUSD: tradeData.volumeUSD.toString(),
                txHash: tradeData.txHash,
                poolAddress: poolInfo.poolAddress
            });
            
            // console.log('Referral trade tracked via API');
            
            // Also store locally as backup with pool info
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
                poolAddress: poolInfo.poolAddress,
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
    
    // Track if we're already subscribed to avoid re-subscribing
    const subscribedPoolRef = useRef<string | null>(null);
    // Track if localStorage has been loaded for the current pool
    const localStorageLoadedRef = useRef<string | null>(null);
    // Track if authentication is in progress to prevent loops
    const authInProgressRef = useRef(false);
    
    // Load trade history from local storage when pool changes
    useEffect(() => {
        console.log('[Exchange] Load history effect triggered, poolAddress:', poolInfo.poolAddress, 'token:', selectedToken?.symbol);
        if (!poolInfo.poolAddress || poolInfo.poolAddress === '0x0000000000000000000000000000000000000000') {
            console.log('[Exchange] No valid pool address, skipping history load');
            return;
        }
        
        const loadTradeHistory = () => {
            try {
                // Clear existing trade history first to avoid mixing trades from different pools
                console.log('[Exchange] Clearing trade history for token switch to:', selectedToken?.symbol);
                console.log('[Exchange] Current localStorage keys:', Object.keys(localStorage).filter(k => k.includes('noma_trade_history')));
                setTradeHistory([]);
                
                // Use pool-specific key
                const key = `noma_trade_history_${poolInfo.poolAddress}`;
                console.log('[Exchange] Attempting to load trade history with key:', key, 'for token:', selectedToken?.symbol);
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    console.log('[Exchange] Raw parsed trades from localStorage:', parsed.length, 'trades');
                    console.log('[Exchange] First trade:', parsed[0]?.token, 'from pool:', poolInfo.poolAddress);
                    // Convert time strings back to Date objects
                    const history = parsed.map(trade => {
                        let convertedTime;
                        // Handle different time formats
                        if (trade.time instanceof Date) {
                            convertedTime = trade.time;
                        } else if (typeof trade.time === 'string') {
                            convertedTime = new Date(trade.time);
                        } else if (typeof trade.time === 'number') {
                            // Assume it's a timestamp in milliseconds
                            convertedTime = new Date(trade.time);
                        } else {
                            console.error('[Exchange] Unknown time format:', trade.time, 'type:', typeof trade.time);
                            convertedTime = new Date(); // Default to now
                        }
                        console.log('[Exchange] Converting time:', trade.time, 'to:', convertedTime, 'isValid:', !isNaN(convertedTime.getTime()), 'type:', typeof trade.time);
                        return {
                            ...trade,
                            time: convertedTime
                        };
                    });
                    // Filter trades to only include the current token
                    const filteredHistory = history.filter(trade => trade.token === selectedToken?.symbol);
                    console.log('[Exchange] Loaded', history.length, 'total trades, filtered to', filteredHistory.length, 'trades for', selectedToken?.symbol);
                    console.log('[Exchange] Pool address check - expected:', poolInfo.poolAddress);
                    
                    setTradeHistory(filteredHistory);
                    localStorageLoadedRef.current = poolInfo.poolAddress;
                } else {
                    console.log('[Exchange] No stored trade history found for key:', key);
                    localStorageLoadedRef.current = poolInfo.poolAddress;
                }
            } catch (error) {
                console.error("Error loading trade history:", error);
            }
        };
        loadTradeHistory();
    }, [poolInfo.poolAddress, selectedToken?.symbol]); // Added selectedToken.symbol to ensure reload on token change
    
    // Save trade history to local storage whenever it changes
    useEffect(() => {
        console.log('[Exchange] Trade history updated:', tradeHistory.length, 'trades');
        if (tradeHistory.length > 0 && poolInfo.poolAddress && poolInfo.poolAddress !== '0x0000000000000000000000000000000000000000') {
            console.log('[Exchange] Latest trade:', tradeHistory[0]);
            try {
                // Use pool-specific key
                const key = `noma_trade_history_${poolInfo.poolAddress}`;
                
                // Double-check we're saving the right token's trades
                const tokenMismatch = tradeHistory.some(trade => trade.token !== selectedToken?.symbol);
                if (tokenMismatch) {
                    console.error('[Exchange] WARNING: Saving trades for wrong token! Current token:', selectedToken?.symbol);
                    console.error('[Exchange] Trade tokens in history:', [...new Set(tradeHistory.map(t => t.token))]);
                }
                
                console.log('[Exchange] Saving trade to localStorage for token:', selectedToken?.symbol, 'pool:', poolInfo.poolAddress);
                console.log('[Exchange] First trade:', tradeHistory[0].token, 'time:', tradeHistory[0].time);
                localStorage.setItem(key, JSON.stringify(tradeHistory));
                console.log('[Exchange] Saved', tradeHistory.length, 'trades to localStorage with key:', key);
            } catch (error) {
                console.error("Error saving trade history:", error);
            }
        }
    }, [tradeHistory, poolInfo.poolAddress]);
    
    
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
            min: 0,  // Will be dynamically updated
            max: undefined,  // Will be dynamically updated
            forceNiceScale: false,  // Disable nice scale to use exact min/max
            tickAmount: 6,  // Optimal number of ticks
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
                        fontSize: '12px',  // Reduced from 10px
                        fontWeight: '600',  // Changed from 'bold' to '600'
                        fontFamily: 'inherit',
                        padding: {
                            left: 3,  // Further reduced padding
                            right: 3,
                            top: 0,
                            bottom: 0
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
    
    const API_BASE_URL = import.meta.env.VITE_ENV === "dev" ? "http://localhost:3001" : "https://pricefeed.noma.money";
    
    // Add custom styles for ApexCharts annotations
    useEffect(() => {
        // Create style element to override ApexCharts annotation label font size
        const style = document.createElement('style');
        style.textContent = `
            .apexcharts-yaxis-annotation-label {
                font-size: 13px !important;
                font-weight: 600 !important;
            }
            .apexcharts-yaxis-annotation-label text {
                font-size: 13px !important;
            }
            .apexcharts-annotation-label {
                font-size: 13px !important;
            }
        `;
        document.head.appendChild(style);
        
        // Cleanup on unmount
        return () => {
            document.head.removeChild(style);
        };
    }, []);
    
    // Handle referral code from URL with pool-specific logic
    useEffect(() => {
        const handleReferral = async () => {
            // Only process referrals if we have a valid pool address
            if (urlReferralCode && address && poolInfo.poolAddress && poolInfo.poolAddress !== '0x0000000000000000000000000000000000000000') {
                try {
                    // Check if user is already referred for THIS POOL via API
                    const referralStatus = await referralApi.checkReferral(address, poolInfo.poolAddress);
                    
                    if (referralStatus.referred) {
                        // User is already referred for this pool
                        setReferredBy(referralStatus.referralCode || '');
                        // console.log(`User already referred by: ${referralStatus.referralCode} for pool: ${poolInfo.poolAddress}`);
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
                        
                        // Register new pool-specific referral
                        await referralApi.registerReferral({
                            referralCode: urlReferralCode,
                            referrerAddress: '', // Will be resolved by backend
                            referredAddress: address,
                            poolAddress: poolInfo.poolAddress
                        });
                        
                        setReferredBy(urlReferralCode);
                        // console.log(`User ${address} referred by code: ${urlReferralCode} for pool: ${poolInfo.poolAddress}`);
                        
                        // Store pool-specific referral
                        localStorage.setItem(`noma_referred_by_${address}_${poolInfo.poolAddress}`, urlReferralCode);
                        
                        toaster.create({
                            title: "Referral Success",
                            description: `You've been successfully referred for ${selectedToken?.symbol || 'this pool'}!`,
                            status: "success",
                            duration: 3000,
                        });
                    }
                } catch (error) {
                    console.error('Error handling referral:', error);
                    // Fallback to pool-specific localStorage
                    const existingReferral = localStorage.getItem(`noma_referred_by_${address}_${poolInfo.poolAddress}`);
                    if (existingReferral) {
                        setReferredBy(existingReferral);
                    }
                }
            } else if (address && poolInfo.poolAddress && poolInfo.poolAddress !== '0x0000000000000000000000000000000000000000') {
                // Check for existing pool-specific referral
                try {
                    const referralStatus = await referralApi.checkReferral(address, poolInfo.poolAddress);
                    if (referralStatus.referred) {
                        setReferredBy(referralStatus.referralCode || '');
                    } else {
                        // Fallback to pool-specific localStorage
                        const existingReferral = localStorage.getItem(`noma_referred_by_${address}_${poolInfo.poolAddress}`);
                        if (existingReferral) {
                            setReferredBy(existingReferral);
                        } else {
                            // Clear referredBy if no pool-specific referral exists
                            setReferredBy('');
                        }
                    }
                } catch (error) {
                    console.error('Error checking referral:', error);
                    // Fallback to pool-specific localStorage
                    const existingReferral = localStorage.getItem(`noma_referred_by_${address}_${poolInfo.poolAddress}`);
                    if (existingReferral) {
                        setReferredBy(existingReferral);
                    } else {
                        setReferredBy('');
                    }
                }
            } else {
                // No valid pool address yet, clear referral
                setReferredBy('');
            }
            
            // Generate referral code for current user (this remains global)
            if (address) {
                const code = generateReferralCode(address);
                setReferralCode(code || ""); // Already returns 8 chars
            }
        };
        
        handleReferral();
    }, [urlReferralCode, address, poolInfo.poolAddress, selectedToken?.symbol]); // Added poolInfo.poolAddress to dependencies

    // Authenticate WebSocket when wallet is connected
    useEffect(() => {
        console.log('[Exchange] WebSocket auth check:', {
            wsConnected,
            wsAuthenticated,
            walletConnected: isConnected,
            address: address || 'no address',
            authInProgress: authInProgressRef.current
        });
        
        if (!wsConnected || wsAuthenticated || !isConnected || !address || authInProgressRef.current) {
            return;
        }
        
        console.log('[Exchange] Attempting WebSocket authentication...');
        authInProgressRef.current = true;
        
        wsAuthenticate()
            .then(success => {
                if (success) {
                    console.log('[Exchange] WebSocket authenticated successfully');
                } else {
                    console.error('[Exchange] WebSocket authentication failed');
                }
            })
            .catch(err => {
                console.error('[Exchange] WebSocket authentication error:', err);
            })
            .finally(() => {
                authInProgressRef.current = false;
            });
    }, [wsConnected, wsAuthenticated, isConnected, address]); // Remove wsAuthenticate from deps to prevent loops

    
    // Subscribe to WebSocket events for the current pool
    useEffect(() => {
        console.log('[Exchange] Pool subscription check:', {
            wsConnected,
            wsAuthenticated,
            poolAddress: poolInfo.poolAddress,
            selectedToken: selectedToken?.symbol,
            alreadySubscribed: subscribedPoolRef.current === poolInfo.poolAddress
        });
        
        if (!wsConnected || !wsAuthenticated || !poolInfo.poolAddress || poolInfo.poolAddress === '0x0000000000000000000000000000000000000000') {
            return;
        }

        // Wait for localStorage to load first
        if (localStorageLoadedRef.current !== poolInfo.poolAddress) {
            console.log('[Exchange] Waiting for localStorage to load for pool:', poolInfo.poolAddress);
            return;
        }

        // Skip if already subscribed to this pool
        if (subscribedPoolRef.current === poolInfo.poolAddress) {
            console.log('[Exchange] Already subscribed to pool:', poolInfo.poolAddress);
            return;
        }

        // Unsubscribe from previous pool if there was one
        if (subscribedPoolRef.current && wsUnsubscribe) {
            console.log('[Exchange] Unsubscribing from previous pool:', subscribedPoolRef.current);
            wsUnsubscribe([subscribedPoolRef.current]);
        }

        // Clear everything when subscribing to a NEW pool
        console.log('[Exchange] Subscribing to NEW pool...');
        // TEMPORARILY DISABLED - processedTxHashes.current = new Set(); // Create new Set
        // Don't clear trade history - it should persist from localStorage
        // setTradeHistory([]);
        // Don't reset lastProcessedEventIndex - it should track wsEvents array
        // setLastProcessedEventIndex(0);
        
        // Clear WebSocket events from previous pool
        if (clearEvents) {
            console.log('[Exchange] Clearing WebSocket events from previous pool');
            clearEvents();
        }
        
        // Subscribe to the current pool
        console.log('[Exchange] Subscribing to pool events:', poolInfo.poolAddress);
        wsSubscribe([poolInfo.poolAddress]);
        subscribedPoolRef.current = poolInfo.poolAddress;

        // Fetch recent history - try 24 hours instead of 1 hour
        // Only fetch if we don't have any trades yet (to avoid overwriting loaded history)
        const shouldFetchHistory = tradeHistory.length === 0;
        
        if (!shouldFetchHistory) {
            console.log('[Exchange] Skipping history fetch - already have', tradeHistory.length, 'trades');
            return;
        }
        
        const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 3600);
        const now = Math.floor(Date.now() / 1000);
        
        console.log('[Exchange] Fetching history for pool:', poolInfo.poolAddress, 'from:', new Date(oneDayAgo * 1000), 'to:', new Date(now * 1000));
        
        wsGetHistory([poolInfo.poolAddress], oneDayAgo, now, 100)
            .then(history => {
                console.log('[Exchange] Fetched historical events:', history.length);
                console.log('[Exchange] Raw history response:', history);
                
                // Process historical swap events
                const swapEvents = history.filter(event => event.eventName === 'Swap');
                console.log('[Exchange] Processing', swapEvents.length, 'historical swap events');
                
                const historicalTrades = swapEvents.map(event => {
                    const amount0 = ethers.BigNumber.from(event.args.amount0 || '0');
                    const amount1 = ethers.BigNumber.from(event.args.amount1 || '0');
                    
                    // Skip zero-amount swaps
                    if (amount0.isZero() && amount1.isZero()) return null;
                    
                    // For pool token positions
                    const isSelectedTokenPoolToken0 = selectedToken?.token0?.toLowerCase() === poolInfo?.token0?.toLowerCase();
                    
                    // Simplified buy/sell determination based on which token is being traded
                    const isBuy = isSelectedTokenPoolToken0 ? amount0.lt(0) : amount1.lt(0);
                    
                    const tokenAmount = isSelectedTokenPoolToken0 ? amount0.abs() : amount1.abs();
                    const ethAmount = isSelectedTokenPoolToken0 ? amount1.abs() : amount0.abs();
                    
                    const tokenAmountFormatted = parseFloat(formatEther(tokenAmount));
                    const ethAmountFormatted = parseFloat(formatEther(ethAmount));
                    const price = tokenAmountFormatted > 0 ? ethAmountFormatted / tokenAmountFormatted : 0;
                    
                    return {
                        id: `${event.transactionHash}-${event.blockNumber}`,
                        type: isBuy ? "buy" : "sell",
                        token: selectedToken?.symbol || "TOKEN",
                        amount: tokenAmountFormatted,
                        price: price,
                        total: ethAmountFormatted,
                        // Smart timestamp conversion - check if result is reasonable
                        time: (() => {
                            const testDate = new Date(event.timestamp);
                            if (testDate.getFullYear() >= 2020 && testDate.getFullYear() <= 2030) {
                                return testDate;
                            } else {
                                const testDate2 = new Date(event.timestamp * 1000);
                                if (testDate2.getFullYear() >= 2020 && testDate2.getFullYear() <= 2030) {
                                    return testDate2;
                                }
                                console.error('[Exchange] Invalid historical timestamp:', event.timestamp);
                                return new Date();
                            }
                        })(),
                        txHash: `${event.transactionHash.slice(0, 6)}...${event.transactionHash.slice(-4)}`,
                        sender: event.args.recipient,
                        recipient: event.args.sender,
                        fullTxHash: event.transactionHash
                    };
                }).filter(Boolean);
                
                // Add historical trades to trade history
                if (historicalTrades.length > 0) {
                    console.log('[Exchange] Historical trades to add:', historicalTrades);
                    
                    setTradeHistory(prev => {
                        console.log('[Exchange] Previous trade history length:', prev.length);
                        
                        // IMPORTANT: Filter historical trades to only include current token
                        const tokenFilteredHistoricalTrades = historicalTrades.filter(t => t.token === selectedToken?.symbol);
                        console.log('[Exchange] Filtered historical trades from', historicalTrades.length, 'to', tokenFilteredHistoricalTrades.length, 'for token:', selectedToken?.symbol);
                        
                        // Also filter existing trades to ensure they're for current token
                        const tokenFilteredPrev = prev.filter(t => t.token === selectedToken?.symbol);
                        if (tokenFilteredPrev.length !== prev.length) {
                            console.warn('[Exchange] Had to filter existing trades from', prev.length, 'to', tokenFilteredPrev.length);
                        }
                        
                        // Merge historical trades with existing, avoiding duplicates
                        const existingHashes = new Set(tokenFilteredPrev.map(t => t.fullTxHash));
                        const newTrades = tokenFilteredHistoricalTrades.filter(t => !existingHashes.has(t.fullTxHash));
                        
                        console.log('[Exchange] New trades to add:', newTrades.length);
                        
                        // Sort by time descending (most recent first)
                        const combined = [...newTrades, ...tokenFilteredPrev].sort((a, b) => b.time - a.time);
                        
                        console.log('[Exchange] Combined trades length:', combined.length);
                        
                        // Keep only last 100 trades
                        return combined.slice(0, 100);
                    });
                    
                    // Mark these as processed AFTER state update
                    console.log('[Exchange] About to mark as processed:', historicalTrades.map(t => t.fullTxHash));
                    
                    // Don't mark as processed yet - let the state update happen first
                    // historicalTrades.forEach(trade => {
                    //     processedTxHashes.current.add(trade.fullTxHash);
                    // });
                    
                    console.log('[Exchange] Added', historicalTrades.length, 'historical trades to history');
                    console.log('[Exchange] ProcessedTxHashes size:', processedTxHashes.current.size);
                }
            })
            .catch(err => {
                console.error('[Exchange] Failed to fetch history:', err);
            });
    // Re-run when localStorage is loaded
    }, [wsConnected, wsAuthenticated, poolInfo.poolAddress, selectedToken, wsSubscribe, wsGetHistory, tradeHistory.length, localStorageLoadedRef.current]);
    
    // Keep track of last processed event index
    const [lastProcessedEventIndex, setLastProcessedEventIndex] = useState(0);
    
    // Reset last processed index and clear processed hashes when pool changes
    useEffect(() => {
        console.log('[Exchange] Pool change detected, clearing state for pool:', poolInfo.poolAddress);
        // Reset lastProcessedEventIndex since we're clearing events when switching pools
        setLastProcessedEventIndex(0);
        // TEMPORARILY DISABLED - Create a new Set instead of clearing to ensure it's truly empty
        // processedTxHashes.current = new Set();
        
        // Don't clear trade history here - it will be loaded from localStorage
        // setTradeHistory([]); // Clear trade history when switching pools
        
        // Reset subscribed pool ref so we can subscribe to the new pool
        if (subscribedPoolRef.current !== poolInfo.poolAddress) {
            subscribedPoolRef.current = null;
            localStorageLoadedRef.current = null; // Reset localStorage loaded flag
        }
        console.log('[Exchange] Reset subscription tracking for pool change');
    }, [poolInfo.poolAddress]);

    // Process WebSocket events and add to trade history
    useEffect(() => {
        console.log('[Exchange] WebSocket events:', wsEvents.length, 'selectedToken:', !!selectedToken, 'poolAddress:', poolInfo.poolAddress, 'lastProcessed:', lastProcessedEventIndex);
        if (wsEvents.length === 0 || !selectedToken || !poolInfo.poolAddress) return;
        
        // Only process new events
        if (wsEvents.length <= lastProcessedEventIndex) return;

        // Function to update price from sqrtPriceX96
        const updatePriceFromSqrtPriceX96 = (sqrtPriceX96) => {
            try {
                // Convert sqrtPriceX96 to price
                const sqrtPrice = parseFloat(sqrtPriceX96.toString()) / Math.pow(2, 96);
                const price = Math.pow(sqrtPrice, 2);
                
                // If token0 is WETH/ETH, we need to invert the price
                const isToken0Weth = selectedToken?.token1?.toLowerCase() === config.protocolAddresses.WMON?.toLowerCase();
                const finalPrice = isToken0Weth ? price : 1 / price;
                
                // Update the selected token's price
                if (selectedToken) {
                    let priceString;
                    try {
                        const priceNum = parseFloat(finalPrice.toString());
                        if (!isNaN(priceNum) && isFinite(priceNum)) {
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

        // Process only new events
        const newEvents = wsEvents.slice(lastProcessedEventIndex);
        console.log('[Exchange] Processing new WebSocket events:', newEvents.length, 'of', wsEvents.length, 'total');
        console.log('[Exchange] All events:', wsEvents);
        console.log('[Exchange] New events to process:', newEvents);
        
        newEvents.forEach(event => {
            console.log('[Exchange] Processing event:', event);
            
            // Check if event is for current pool
            if (event.poolAddress.toLowerCase() !== poolInfo.poolAddress?.toLowerCase()) {
                console.log('[Exchange] Skipping event for different pool:', event.poolAddress, 'vs', poolInfo.poolAddress);
                return;
            }
            
            if (event.eventName !== 'Swap') {
                console.log('[Exchange] Skipping non-swap event:', event.eventName);
                return;
            }

            // Check if we've already processed this transaction
            const txHash = event.transactionHash;
            // TEMPORARILY DISABLED - Always process events
            // if (processedTxHashes.current.has(txHash)) {
            //     console.log('[Exchange] Transaction already processed:', txHash);
            //     console.log('[Exchange] Current trade history length:', tradeHistory.length);
            //     console.log('[Exchange] ProcessedTxHashes size:', processedTxHashes.current.size);
            //     console.log('[Exchange] ProcessedTxHashes contents:', Array.from(processedTxHashes.current));
            //     // Force process if trade history is empty but hash is marked as processed
            //     if (tradeHistory.length === 0) {
            //         console.log('[Exchange] Force processing - trade history is empty but tx marked as processed');
            //     } else {
            //         return;
            //     }
            // }

            // Skip if no actual amounts were swapped
            const amount0 = ethers.BigNumber.from(event.args.amount0 || '0');
            const amount1 = ethers.BigNumber.from(event.args.amount1 || '0');
            if (amount0.isZero() && amount1.isZero()) {
                console.log('[Exchange] Skipping zero-amount swap');
                return;
            }

            // Process the swap event BEFORE marking as processed
            console.log('[Exchange] Processing new trade:', txHash);
            console.log('[Exchange] Raw event.timestamp:', event.timestamp, 'type:', typeof event.timestamp);
            
            // Check if timestamp is already in milliseconds (13+ digits) or seconds (10 digits)
            const timestampValue = typeof event.timestamp === 'number' ? event.timestamp : parseInt(event.timestamp);
            
            // A reasonable timestamp should be between year 2020 and 2030
            // In seconds: 1577836800 (2020) to 1893456000 (2030)
            // In milliseconds: 1577836800000 to 1893456000000
            let timestamp;
            
            // First try as-is
            let testDate = new Date(timestampValue);
            if (testDate.getFullYear() >= 2020 && testDate.getFullYear() <= 2030) {
                timestamp = testDate;
            } else {
                // Try multiplying by 1000 (convert seconds to milliseconds)
                testDate = new Date(timestampValue * 1000);
                if (testDate.getFullYear() >= 2020 && testDate.getFullYear() <= 2030) {
                    timestamp = testDate;
                } else {
                    console.error('[Exchange] Invalid timestamp:', timestampValue, 'results in year:', new Date(timestampValue).getFullYear());
                    timestamp = new Date(); // Default to now
                }
            }
            
            console.log('[Exchange] Timestamp conversion:', 'raw:', timestampValue, 'result:', timestamp, 'year:', timestamp.getFullYear());
            
            // Determine if it's a buy or sell
            const isSelectedTokenPoolToken0 = selectedToken?.token0?.toLowerCase() === poolInfo?.token0?.toLowerCase();
            const isBuy = isSelectedTokenPoolToken0 ? amount0.lt(0) : amount1.lt(0);
            
            // Get the correct amounts
            const tokenAmount = isSelectedTokenPoolToken0 ? amount0.abs() : amount1.abs();
            const ethAmount = isSelectedTokenPoolToken0 ? amount1.abs() : amount0.abs();
            
            // Calculate price
            const tokenAmountFormatted = parseFloat(formatEther(tokenAmount));
            const ethAmountFormatted = parseFloat(formatEther(ethAmount));
            const price = tokenAmountFormatted > 0 ? ethAmountFormatted / tokenAmountFormatted : 0;
            
            const newTrade = {
                id: Date.now() + Math.random(),
                type: isBuy ? "buy" : "sell",
                token: selectedToken?.symbol || "TOKEN",
                amount: tokenAmountFormatted,
                price: price,
                total: ethAmountFormatted,
                time: timestamp,
                txHash: `${txHash.slice(0, 6)}...${txHash.slice(-4)}`,
                sender: event.actualSender || event.tradeInfo?.sender || event.args.sender,
                recipient: event.actualRecipient || event.tradeInfo?.recipient || event.args.recipient,
                fullTxHash: txHash
            };
            
            // Add to trade history
            console.log('[Exchange] Raw event args:', {
                sender: event.args.sender,
                recipient: event.args.recipient,
                amount0: event.args.amount0?.toString(),
                amount1: event.args.amount1?.toString(),
                actualSender: event.actualSender,
                actualRecipient: event.actualRecipient
            });
            console.log('[Exchange] TradeInfo:', event.tradeInfo);
            console.log('[Exchange] Adding new trade to history:', newTrade);
            console.log('[Exchange] Trade timestamp:', event.timestamp, 'converted:', timestamp, 'isValid:', !isNaN(timestamp.getTime()), 'year:', timestamp.getFullYear());
            
            // IMPORTANT: Only add trades for the current token
            if (newTrade.token !== selectedToken?.symbol) {
                console.error('[Exchange] SKIPPING TRADE - Wrong token! Trade token:', newTrade.token, 'Current token:', selectedToken?.symbol);
                return;
            }
            
            setTradeHistory(prev => {
                console.log('[Exchange] Previous trade history length:', prev.length);
                
                // Double-check all trades in history are for current token
                const wrongTokenTrades = prev.filter(t => t.token !== selectedToken?.symbol);
                if (wrongTokenTrades.length > 0) {
                    console.error('[Exchange] Found', wrongTokenTrades.length, 'trades for wrong token in history!');
                    console.error('[Exchange] Wrong token trades:', wrongTokenTrades.map(t => ({ token: t.token, txHash: t.txHash })));
                    // Filter out wrong token trades
                    const filtered = prev.filter(t => t.token === selectedToken?.symbol);
                    console.log('[Exchange] Filtered history from', prev.length, 'to', filtered.length, 'trades');
                    prev = filtered;
                }
                
                // Check if this trade already exists in history
                const exists = prev.some(t => t.fullTxHash === txHash);
                if (exists) {
                    console.log('[Exchange] Trade already exists in history, skipping');
                    return prev;
                }
                
                const updated = [newTrade, ...prev.slice(0, 99)];
                console.log('[Exchange] Updated trade history length:', updated.length);
                
                // TEMPORARILY DISABLED - Mark as processed only after successfully adding
                // processedTxHashes.current.add(txHash);
                // console.log('[Exchange] Marked transaction as processed:', txHash);
                
                return updated;
            });
            
            // Update price from sqrtPriceX96
            if (event.args.sqrtPriceX96) {
                updatePriceFromSqrtPriceX96(event.args.sqrtPriceX96);
            }
        });
        
        // Update last processed index
        setLastProcessedEventIndex(wsEvents.length);
    }, [wsEvents, selectedToken, poolInfo, setSelectedToken, setTokens, setChartUpdateTrigger, lastProcessedEventIndex]);
    
    // Subscribe to all pools when viewing global trades
    useEffect(() => {
        if (tradeHistoryTab === 'global' && wsAuthenticated && Object.keys(poolToTokenMap).length > 0) {
            // Subscribe to all known pools for global trades
            const allPools = Object.keys(poolToTokenMap);
            if (allPools.length > 0) {
                console.log('[Exchange] Subscribing to all pools for global trades:', allPools);
                wsSubscribe(allPools);
            }
        }
    }, [tradeHistoryTab, wsAuthenticated, poolToTokenMap, wsSubscribe]);

    // Update global trades with new WebSocket events
    useEffect(() => {
        if (tradeHistoryTab === 'global' && wsEvents.length > 0 && Object.keys(poolToTokenMap).length > 0) {
            // Process all WebSocket events and add them to global trades
            const newGlobalTrades = wsEvents.map((event, index) => {
                const poolAddress = (event.poolAddress || '').toLowerCase();
                const tokenInfo = poolToTokenMap[poolAddress];
                
                // Try to get token symbol
                let tokenSymbol = tokenInfo?.symbol || KNOWN_POOLS[poolAddress]?.symbol || 'UNKNOWN';
                
                // Debug log the event structure
                if (index < 2) {
                    console.log('[Exchange] Real-time WebSocket event:', {
                        event,
                        amount0: event.args?.amount0,
                        amount0AsString: event.args?.amount0?.toString(),
                        tradeInfo: event.tradeInfo
                    });
                }
                
                // Parse amounts
                const tokenAmount = Math.abs(parseFloat(ethers.utils.formatEther(event.args?.amount0 || '0')));
                const ethAmount = Math.abs(parseFloat(ethers.utils.formatEther(event.args?.amount1 || '0')));
                const price = tokenAmount > 0 ? ethAmount / tokenAmount : 0;
                
                // Determine trade type
                // For token0: If amount0 < 0, tokens are leaving the pool (someone is buying token0)
                // For token0: If amount0 > 0, tokens are entering the pool (someone is selling token0)
                // We assume the traded token is always token0 for simplicity in global view
                const amount0Raw = event.args?.amount0 || '0';
                const amount0 = BigInt(amount0Raw);
                
                // Always determine from amounts, don't trust tradeInfo.type
                // The actual behavior seems to be opposite of the spec
                // When someone BUYS: amount0 < 0 (tokens leave the pool)
                // When someone SELLS: amount0 > 0 (tokens enter the pool)
                const tradeType = amount0 < 0n ? "buy" : "sell";
                
                // Debug: Check if tradeInfo.type matches our determination
                if (event.tradeInfo?.type && event.tradeInfo.type !== tradeType) {
                    console.log('[Exchange] Trade type mismatch:', {
                        calculatedType: tradeType,
                        tradeInfoType: event.tradeInfo.type,
                        amount0: amount0.toString(),
                        txHash: event.transactionHash
                    });
                }
                
                return {
                    id: `${event.transactionHash}-${index}`,
                    type: tradeType,
                    token: tokenSymbol,
                    amount: tokenAmount,
                    price: price,
                    total: ethAmount,
                    time: new Date(event.timestamp),
                    txHash: `${event.transactionHash.slice(0, 6)}...${event.transactionHash.slice(-4)}`,
                    fullTxHash: event.transactionHash,
                    sender: event.actualSender || event.tradeInfo?.sender || event.args?.sender,
                    recipient: event.actualRecipient || event.tradeInfo?.recipient || event.args?.recipient,
                    poolAddress: event.poolAddress
                };
            });
            
            // Combine with existing global trades and sort by time
            setGlobalTrades(prev => {
                const combined = [...newGlobalTrades, ...prev];
                // Remove duplicates based on transaction hash
                const unique = combined.filter((trade, index, self) =>
                    index === self.findIndex(t => t.fullTxHash === trade.fullTxHash)
                );
                // Sort by time descending and keep only the latest 50
                return unique.sort((a, b) => b.time - a.time).slice(0, 50);
            });
        }
    }, [wsEvents, tradeHistoryTab, poolToTokenMap]);

    // Fetch global trades when tab switches to global
    useEffect(() => {
        const fetchGlobalTrades = async () => {
            // Only fetch global trades if we have tokens loaded (poolToTokenMap populated)
            if (tradeHistoryTab === 'global' && wsAuthenticated && wsGetGlobalTrades && Object.keys(poolToTokenMap).length > 0) {
                try {
                    console.log('[Exchange] Fetching global trades...');
                    const trades = await wsGetGlobalTrades(50);
                    console.log('[Exchange] Received global trades:', trades.length);
                    console.log('[Exchange] First trade structure:', trades[0]);
                    console.log('[Exchange] poolToTokenMap has', Object.keys(poolToTokenMap).length, 'entries');
                    
                    // Transform the trades to match the expected format
                    const formattedTrades = trades.map((trade, index) => {
                        // Get token info from pool address
                        const poolAddress = (trade.poolAddress || trade.data?.poolAddress || '').toLowerCase();
                        const tokenInfo = poolToTokenMap[poolAddress];
                        
                        // Try to get token symbol from different sources
                        let tokenSymbol = 'UNKNOWN';
                        if (tokenInfo) {
                            tokenSymbol = tokenInfo.symbol;
                        } else if (KNOWN_POOLS[poolAddress]) {
                            tokenSymbol = KNOWN_POOLS[poolAddress].symbol;
                        } else if (trade.tokenSymbol) {
                            // If trade includes token symbol directly
                            tokenSymbol = trade.tokenSymbol;
                        } else if (trade.token0Symbol && trade.token1Symbol) {
                            // Try to determine which token is not WMON
                            tokenSymbol = trade.token1Symbol === 'WMON' ? trade.token0Symbol : trade.token1Symbol;
                        }
                        
                        // Debug logging only for unknown tokens
                        if (!tokenInfo && !KNOWN_POOLS[poolAddress]) {
                            console.log('[Exchange] Unknown pool in global trades:', {
                                poolAddress,
                                tokenSymbol,
                                tradeData: trade,
                                hasTokenSymbol: !!trade.tokenSymbol,
                                hasToken0Symbol: !!trade.token0Symbol,
                                hasToken1Symbol: !!trade.token1Symbol,
                                tradeInfoKeys: trade.tradeInfo ? Object.keys(trade.tradeInfo) : []
                            });
                        }
                        
                        // Parse amounts
                        const tokenAmount = Math.abs(parseFloat(ethers.utils.formatEther(trade.tradeInfo?.amount0 || trade.args?.amount0 || '0')));
                        const ethAmount = Math.abs(parseFloat(ethers.utils.formatEther(trade.tradeInfo?.amount1 || trade.args?.amount1 || '0')));
                        const price = tokenAmount > 0 ? ethAmount / tokenAmount : 0;
                        
                        // Always determine from amounts for consistency
                        const amount0Raw = trade.tradeInfo?.amount0 || trade.args?.amount0 || '0';
                        const amount0 = BigInt(amount0Raw);
                        // The actual behavior seems to be opposite of the spec
                        // When someone BUYS: amount0 < 0 (tokens leave the pool)
                        // When someone SELLS: amount0 > 0 (tokens enter the pool)
                        const tradeType = amount0 < 0n ? "buy" : "sell";
                        
                        // Debug: Check if tradeInfo.type exists and differs
                        if (trade.tradeInfo?.type && trade.tradeInfo.type !== tradeType) {
                            console.log('[Exchange] Global trade type mismatch:', {
                                calculatedType: tradeType,
                                tradeInfoType: trade.tradeInfo.type,
                                amount0: amount0.toString(),
                                txHash: trade.transactionHash
                            });
                        }
                        
                        return {
                            id: `global-${trade.transactionHash}-${index}`,
                            type: tradeType,
                            token: tokenSymbol,
                            amount: tokenAmount,
                            price: price,
                            total: ethAmount,
                            time: new Date(trade.timestamp),
                            txHash: `${trade.transactionHash.slice(0, 6)}...${trade.transactionHash.slice(-4)}`,
                            fullTxHash: trade.transactionHash,
                            sender: trade.data?.actualSender || trade.actualSender || trade.tradeInfo?.sender || trade.args?.sender,
                            recipient: trade.data?.actualRecipient || trade.actualRecipient || trade.tradeInfo?.recipient || trade.args?.recipient,
                            poolAddress: trade.poolAddress
                        };
                    });
                    
                    setGlobalTrades(formattedTrades);
                } catch (error) {
                    console.error('[Exchange] Error fetching global trades:', error);
                }
            }
        };
        
        fetchGlobalTrades();
    }, [tradeHistoryTab, wsAuthenticated, wsGetGlobalTrades, poolToTokenMap]);
    
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
                // console.log('[fetchTokenPriceStats] Adding pool parameter:', pool);
            } else {
                // console.log('[fetchTokenPriceStats] No pool parameter provided or zero address');
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
                // console.log('[fetchOHLCData] Adding pool parameter:', pool);
            } else {
                // console.log('[fetchOHLCData] No pool parameter provided or zero address');
            }
            
            // console.log('[fetchOHLCData] Final URL:', url.toString());
            
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
                console.log('[loadChartData] poolInfo.poolAddress:', poolInfo.poolAddress);
                console.log('[loadChartData] selectedToken:', selectedToken);
                
                // Skip API calls if no pool address is available, but show mock data
                if (!poolInfo.poolAddress || poolInfo.poolAddress === '0x0000000000000000000000000000000000000000') {
                    console.log('[loadChartData] No valid pool address - showing mock data');
                    
                    // Generate mock data for display
                    const mockData = generateMockOHLCData(chartTimeframe);
                    if (mockData && mockData.length > 0) {
                        setChartSeries([{
                            name: `${selectedToken.symbol}/${token1Symbol}`,
                            data: mockData
                        }]);
                    }
                    
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
                        // console.log('[Volume Debug] Pool:', poolInfo.poolAddress, 'API response:', priceStats, 'Selected interval:', intervalKey, 'Volume in MON:', volume);
                        setIntervalVolume(volume);
                    } else {
                        // console.log('[Volume Debug] No volume data from API, setting to 0');
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
        
    }, [selectedToken?.id, chartTimeframe, chartGranularity, token1Symbol, chartUpdateTrigger, poolInfo.poolAddress]);

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
        
        // DISABLED: handleSwap - now using WebSocket for trade history
        /*
        // Listen to Swap events
        const handleSwap = async (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick, event) => {
            // console.log("Swap event detected");
            updatePriceFromSqrtPriceX96(sqrtPriceX96);
            
            // Add transaction to trade history
            try {
                const txHash = event.transactionHash;
                
                // Check if we've already processed this transaction
                if (processedTxHashes.current.has(txHash)) {
                    // console.log("Transaction already processed:", txHash);
                    return;
                }
                
                // Skip if no actual amounts were swapped
                if (amount0.isZero() && amount1.isZero()) {
                    return;
                }
                
                // Mark as processed immediately to prevent duplicates
                processedTxHashes.current.add(txHash);
                
                // Temporarily disabled RPC call
                // const block = await event.getBlock();
                // const timestamp = new Date(block.timestamp * 1000);
                const timestamp = new Date();
                
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
        */
        
        // Get initial price from slot0 - Temporarily disabled
        const getInitialPrice = async () => {
            try {
                // const slot0 = await poolContract.slot0();
                // updatePriceFromSqrtPriceX96(slot0.sqrtPriceX96);
                // Use default price
                updatePriceFromSqrtPriceX96(BigInt("1844674407370955161600000000"));
            } catch (error) {
                console.error("Error fetching initial price:", error);
            }
        };
        
        // getInitialPrice();
        
        // DISABLED: Pool event listeners - now using WebSocket for trade history
        /*
        // Record the timestamp when we start listening
        const startListeningTime = Date.now();
        // console.log("Starting to listen for Swap events at:", new Date(startListeningTime));
        
        // Modified handleSwap to check timestamp
        const handleSwapWithTimeCheck = async (...args) => {
            try {
                const event = args[args.length - 1];
                // Temporarily disabled RPC call
                // const block = await event.getBlock();
                // const eventTimestamp = block.timestamp * 1000;
                const eventTimestamp = Date.now();
                
                // Only process events that happened after we started listening
                if (eventTimestamp < startListeningTime) {
                    // console.log("Ignoring historical event from:", new Date(eventTimestamp));
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
        */
    }, [poolInfo.poolAddress, selectedToken?.id, selectedToken?.symbol]);

    // Fetch token1 symbol and spot price when token is selected
    useEffect(() => {
        console.log('[Token Selection Effect] selectedToken:', selectedToken);
        if (!selectedToken || !selectedToken.token1 || !selectedToken.vault) {
            console.log('[Token Selection Effect] Returning early - missing data:', {
                hasToken: !!selectedToken,
                hasToken1: !!selectedToken?.token1,
                hasVault: !!selectedToken?.vault
            });
            return;
        }
        
        const fetchTokenInfo = async () => {
            console.log('[fetchTokenInfo] Starting with token:', selectedToken.symbol);
            try {
                // Skip RPC calls if provider is having issues - use defaults
                let symbol = "MON"; // Default to MON
                
                try {
                    // Try to fetch token1 info
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

                    // Temporarily disabled RPC calls
                    // const totalSupply = await token0Contract.totalSupply();
                    // setTotalSupply(totalSupply);
                    setTotalSupply(BigNumber.from("1000000000000000000000000")); // Default 1M tokens
                    
                    // symbol = await token1Contract.symbol();
                    // setToken1Symbol(symbol);
                    symbol = "MON"; // Default symbol
                    
                    // If token1 is WETH/WMON, set it as MON for display
                    if (symbol === "WMON" || symbol === "WETH") {
                        setToken1Symbol("MON");
                    }
                } catch (rpcError) {
                    console.warn('[fetchTokenInfo] RPC calls failed, using defaults:', rpcError.message);
                    setToken1Symbol("MON");
                    // Continue with the rest of the function
                }
                
                // Use spot price from vault API data if available
                if (selectedVaultData) {
                    try {
                        const spotPriceFromAPI = selectedVaultData.spotPriceX96;
                        const formattedPrice = formatEther(spotPriceFromAPI);
                        const numericPrice = parseFloat(formattedPrice);
                        
                        if (!isNaN(numericPrice) && isFinite(numericPrice) && numericPrice > 0) {
                            setSpotPrice(numericPrice);
                        } else {
                            console.warn("Invalid spot price from API, using fallback");
                            setSpotPrice(selectedToken.price || 0.0000186);
                        }
                        
                        // Additional vault data is now available from API
                        // console.log("Vault data from API:", selectedVaultData);
                    } catch (error) {
                        console.error("Error processing vault data:", error);
                        // Fallback to token price if vault info fails
                        setSpotPrice(selectedToken.price || 0.0000186);
                    }
                } else if (!selectedVaultLoading) {
                    // No vault data available, use fallback
                    setSpotPrice(selectedToken.price || 0.0000186);
                }
                
                // Use pool address from token if available, otherwise fetch it
                console.log('[fetchTokenInfo] Checking poolAddress:', selectedToken.poolAddress);
                if (selectedToken.poolAddress) {
                    // Token already has pool address from vault data
                    // console.log("Using pool address from token:", selectedToken.poolAddress);
                    // console.log("Setting poolInfo with address:", selectedToken.poolAddress);
                    // console.log("Setting poolInfo with address:", selectedToken.poolAddress);
                    console.log('[Exchange] Setting poolInfo for token:', selectedToken.symbol, 'poolAddress:', selectedToken.poolAddress);
                    setPoolInfo({ 
                        poolAddress: selectedToken.poolAddress,
                        token0: selectedToken.token0,
                        token1: selectedToken.token1
                    });
                    // console.log("poolInfo should now be updated");
                    // console.log("poolInfo should now be updated");
                } else if (selectedToken.token0 && selectedToken.token1) {
                    // Fallback: fetch pool address if not available
                    console.log('[fetchTokenInfo] No poolAddress, will fetch it. token0:', selectedToken.token0, 'token1:', selectedToken.token1);
                    try {
                        // Determine protocol for this token - use token's own protocol or default to uniswap
                        const protocol = selectedToken.selectedProtocol || tokenProtocols[selectedToken.symbol] || "uniswap";
                        // console.log(`[TOKEN SELECTION] Token: ${selectedToken.symbol}, Protocol: ${protocol}`);
                        // console.log(`[TOKEN SELECTION] selectedToken.selectedProtocol:`, selectedToken.selectedProtocol);
                        // console.log(`[TOKEN SELECTION] tokenProtocols[${selectedToken.symbol}]:`, tokenProtocols[selectedToken.symbol]);
                        // console.log(`[TOKEN SELECTION] Full tokenProtocols:`, tokenProtocols);
                        // console.log(`[TOKEN SELECTION] Token0: ${selectedToken.token0}, Token1: ${selectedToken.token1}`);
                        
                        // Check if we have a valid pool address already
                        if (selectedToken.poolAddress && selectedToken.poolAddress !== zeroAddress) {
                            // console.log(`[TOKEN SELECTION] Using existing pool address: ${selectedToken.poolAddress}`);
                            setPoolInfo({ 
                                poolAddress: selectedToken.poolAddress,
                                token0: selectedToken.token0,
                                token1: selectedToken.token1
                            });
                        } else {
                            // Fetch pool address if not available or is zero address
                            // console.log(`[TOKEN SELECTION] Fetching new pool address...`);

                            // const poolAddress = await fetchPoolAddress(selectedToken.token0, selectedToken.token1, protocol);

                            // console.log(`[TOKEN SELECTION] Fetched new pool address ${poolAddress}...`);

                            // if (poolAddress && poolAddress !== zeroAddress) {
                            //     // Use token addresses from vault data instead of RPC calls
                            //     const poolToken0 = selectedToken.token0;
                            //     const poolToken1 = selectedToken.token1;
                                
                            //     setPoolInfo({ 
                            //         poolAddress, 
                            //         token0: poolToken0,
                            //         token1: poolToken1
                            //     });
                            //     // console.log(`[TOKEN SELECTION] Pool info updated with address: ${poolAddress}`);
                            // } else {
                            //     // console.log(`[TOKEN SELECTION] No valid pool found, pool address is: ${poolAddress}`);
                            //     setPoolInfo({ poolAddress: poolAddress || null });
                            // }
                            
                            // For now, just set pool info to null if not available from API
                            setPoolInfo({ poolAddress: null });
                        }
                    } catch (error) {
                        console.error("[TOKEN SELECTION] Error fetching pool info:", error);
                        setPoolInfo({ poolAddress: null });
                    }
                } else {
                    // console.log("[TOKEN SELECTION] Missing token0 or token1, cannot fetch pool");
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
    }, [selectedToken, monPrice, selectedVaultData, selectedVaultLoading]);

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
                // console.log("Invalid IMV value, floor price set to 0");
            }
        } else {
            setFloorPrice(0);
            // console.log("No IMV data available");
        }
    }, [imvData]);

    // Update chart y-axis min when chart data changes
    useEffect(() => {
        if (chartSeries.length > 0 && chartSeries[0].data && chartSeries[0].data.length > 0) {
            const allLows = chartSeries[0].data.map((item) => item.y[2]);
            const allHighs = chartSeries[0].data.map((item) => item.y[1]);
            
            const minPrice = Math.min(...allLows);
            const maxPrice = Math.max(...allHighs);
            const priceRange = maxPrice - minPrice;
            
            // Calculate dynamic padding based on price range
            let paddingPercentage = 0.15; // Default 15%
            
            // For very small ranges, use more padding to avoid cramped candles
            if (priceRange < minPrice * 0.01) {
                paddingPercentage = 0.5; // 50% for very stable prices
            } else if (priceRange < minPrice * 0.05) {
                paddingPercentage = 0.3; // 30% for low volatility
            } else if (priceRange > minPrice * 0.5) {
                paddingPercentage = 0.1; // 10% for high volatility
            }
            
            const padding = priceRange * paddingPercentage;
            
            // Ensure minimum padding to prevent candles from touching edges
            const minPadding = minPrice * 0.01; // At least 1% of min price
            const effectivePadding = Math.max(padding, minPadding);
            
            const newMinY = Math.max(0, minPrice - effectivePadding);
            const newMaxY = maxPrice + effectivePadding;
            
            setChartOptions(prevOptions => ({
                ...prevOptions,
                yaxis: {
                    ...prevOptions.yaxis,
                    min: newMinY,
                    max: newMaxY,
                    tickAmount: 6, // Reduce tick marks for cleaner look
                    labels: {
                        ...prevOptions.yaxis.labels,
                        formatter: (value) => {
                            if (!value || isNaN(value)) return '0';
                            // Improved formatting based on value magnitude
                            if (value === 0) return '0';
                            if (value < 0.00000001) return value.toExponential(2);
                            if (value < 0.00001) return value.toFixed(8);
                            if (value < 0.001) return value.toFixed(6);
                            if (value < 0.01) return value.toFixed(5);
                            if (value < 1) return value.toFixed(4);
                            if (value < 10) return value.toFixed(3);
                            if (value < 100) return value.toFixed(2);
                            if (value < 1000) return value.toFixed(1);
                            return value.toFixed(0);
                        }
                    }
                }
            }));
        }
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
                                fontSize: '13px',  // Reduced from 10px
                                fontWeight: '600',  // Changed from 'bold' to '600'
                                fontFamily: 'inherit',
                                padding: {
                                    left: 3,  // Further reduced padding
                                    right: 3,
                                    top: 0,
                                    bottom: 0
                                },
                                width:"110%"
                            },
                            text: `${spotPrice < 0.00001 ? spotPrice.toFixed(6) : spotPrice < 0.01 ? spotPrice.toFixed(6) : spotPrice.toFixed(6)}`,
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


    const filteredTokens = useMemo(() => {
        // First filter tokens based on search term
        let filtered = tokens.filter(token => 
            (token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.symbol.toLowerCase().includes(searchTerm.toLowerCase())) &&
            // Additional safety check - only show tokens that were in deployedVaults
            vaultDescriptions.some(vault => vault.tokenSymbol === token.symbol)
        );

        // Then sort based on selected criteria
        if (sortBy !== "default") {
            filtered.sort((a, b) => {
                let aValue, bValue;
                
                if (sortBy === "price") {
                    // Calculate USD price as token.price * monPrice
                    aValue = (parseFloat(a.price) || 0) * (monPrice || 0);
                    bValue = (parseFloat(b.price) || 0) * (monPrice || 0);
                } else if (sortBy === "24h") {
                    // Get 24h change from tokenStats
                    aValue = tokenStats[a.symbol] || parseFloat(a.change24h) || 0;
                    bValue = tokenStats[b.symbol] || parseFloat(b.change24h) || 0;
                }
                
                if (sortOrder === "desc") {
                    return bValue - aValue;
                } else {
                    return aValue - bValue;
                }
            });
        }
        
        return filtered;
    }, [tokens, searchTerm, vaultDescriptions, sortBy, sortOrder, monPrice, tokenStats]);
    
    // Fetch pool address from Uniswap V3 Factory
    const fetchPoolAddress = async (token0: string, token1: string, protocol?: string) => {
        console.log(`[fetchPoolAddress] Called with:`, {
            token0,
            token1,
            protocol: protocol || "auto-detect"
        });

        const factories = [
            {
                name: "uniswap",
                address: config.protocolAddresses.uniswapV3Factory,
                feeTier: 3000
            },
            {
                name: "pancakeswap",
                address: config.protocolAddresses.pancakeV3Factory,
                feeTier: 2500
            }
        ];

        // Check both factories
        for (const factory of factories) {
            try {
                const factoryContract = new ethers.Contract(
                    factory.address,
                    uniswapV3FactoryABI,
                    localProvider
                );

                const poolAddress = await factoryContract.getPool(token0, token1, factory.feeTier);

                if (poolAddress !== ethers.constants.AddressZero) {
                    console.log(`[fetchPoolAddress] Found pool in ${factory.name}: ${poolAddress}`);
                    return poolAddress;
                }
            } catch (error) {
                console.error(`[fetchPoolAddress] Error checking ${factory.name} factory:`, error);
                console.error(`[fetchPoolAddress] Factory address: ${factory.address}`);
                console.error(`[fetchPoolAddress] RPC URL: ${config.RPC_URL}`);
                console.error(`[fetchPoolAddress] Provider network:`, await localProvider.getNetwork().catch(e => 'Failed to get network'));
            }
        }

        console.log(`[fetchPoolAddress] No pool found in any factory for tokens ${token0} and ${token1}`);
        return ethers.constants.AddressZero;
    }


    const [wrapAmount, setWrapAmount] = useState(0);
    const [isWrapping, setIsWrapping] = useState(false);
    const [isUnwrapping, setIsUnwrapping] = useState(false);
    
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
    
    // Token protocols will be loaded when deployed tokens are fetched

    // Use vault API hook to fetch all vaults
    const { vaults: allVaultsData, loading: vaultsLoading, error: vaultsError } = useVault({
        autoFetch: true,
        refetchInterval: 60000 // Refresh every minute
    });

    // Fetch vault data and convert to token list
    useEffect(() => {
        const processVaults = async () => {
            // Keep loading state for minimum time for better UX
            const minLoadingTime = 1500;
            const startTime = Date.now();
            
            try {
                // If still loading vaults, wait
                if (vaultsLoading || !allVaultsData) {
                    return;
                }
                
                // console.log('[VAULT FETCH] Processing vaults from API:', allVaultsData.length);
                
                // If no vaults found, show empty state after minimum loading time
                if (allVaultsData.length === 0) {
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
                    // console.log('[EXCHANGE] API Response tokens:', deployedTokens);
                    // console.log('[EXCHANGE] Token statuses:', deployedTokens.map(t => ({ symbol: t.tokenSymbol, status: t.status })));
                    
                    deployedTokenSymbols = new Set(deployedTokens.map(token => token.tokenSymbol));
                    // Create a map for quick lookup and update protocols
                    const protocols: { [symbol: string]: string } = {};
                    deployedTokens.forEach(token => {
                        deployedTokensMap.set(token.tokenSymbol, token);
                        if (token.tokenSymbol && token.selectedProtocol) {
                            protocols[token.tokenSymbol] = token.selectedProtocol;
                            // console.log(`[EXCHANGE] Token protocol: ${token.tokenSymbol} -> ${token.selectedProtocol}`);
                        }
                    });
                    // Update token protocols from deployed tokens
                    setTokenProtocols(protocols);
                    // console.log('Deployed tokens from API:', deployedTokens.length, 'tokens');
                    // console.log('Token symbols:', Array.from(deployedTokenSymbols));
                } catch (error) {
                    console.error('Failed to fetch deployed tokens:', error);
                    // Continue without filtering if API fails
                }
                
                // Process vaults from API - no more RPC calls needed!
                const processedVaults = await Promise.all(
                    allVaultsData.map(async (vault) => {
                        try {
                            // Determine protocol for this token
                            const tokenData = deployedTokensMap.get(vault.tokenSymbol);
                            const protocol = tokenData?.selectedProtocol || tokenProtocols[vault.tokenSymbol] || "uniswap";
                            
                            // Pool address is now provided by the vault API
                            
                            return {
                                tokenName: vault.tokenName,
                                tokenSymbol: vault.tokenSymbol,
                                tokenDecimals: Number(vault.tokenDecimals),
                                token0: vault.token0,
                                token1: vault.token1,
                                deployer: vault.deployer,
                                vault: vault.address,
                                presaleContract: vault.presaleContract,
                                stakingContract: vault.stakingContract,
                                poolAddress: vault.poolAddress || null,
                                spotPrice: vault.spotPriceX96, // API provides spot price
                                // Additional fields from API
                                liquidityRatio: vault.liquidityRatio,
                                circulatingSupply: vault.circulatingSupply,
                                anchorCapacity: vault.anchorCapacity,
                                floorCapacity: vault.floorCapacity,
                                newFloor: vault.newFloor,
                                totalInterest: vault.totalInterest
                            };
                        } catch (error) {
                            console.error("Error processing vault:", error);
                            return null;
                        }
                    })
                );
                
                const flattenedVaults = processedVaults.filter(Boolean);
                
                // Filter vaults to only include deployed tokens
                // console.log('[EXCHANGE] deployedTokenSymbols size:', deployedTokenSymbols.size);
                // console.log('[EXCHANGE] deployedTokenSymbols:', Array.from(deployedTokenSymbols));
                // console.log('[EXCHANGE] flattenedVaults count:', flattenedVaults.length);
                // console.log('[EXCHANGE] vault symbols:', flattenedVaults.map(v => v.tokenSymbol));
                
                const deployedVaults = deployedTokenSymbols.size > 0 
                    ? flattenedVaults.filter(vault => {
                        // Check if token is in the deployed tokens set
                        const isDeployed = deployedTokenSymbols.has(vault.tokenSymbol);
                        if (!isDeployed) {
                            // console.log(`[EXCHANGE] Filtering out non-deployed token: ${vault.tokenSymbol}`);
                        } else {
                            // console.log(`[EXCHANGE] Including deployed token: ${vault.tokenSymbol}`);
                        }
                        return isDeployed;
                    })
                    : [] // If API fails, show no tokens rather than risk showing non-deployed ones
                
                // console.log('[EXCHANGE] Final deployedVaults:', deployedVaults);
                setVaultDescriptions(deployedVaults);
                
                // Convert vault descriptions to token format for display
                console.log('Creating token list from deployedVaults:', deployedVaults.length, 'vaults');
                console.log('Vault pool addresses:', deployedVaults.map(v => ({ symbol: v.tokenSymbol, poolAddress: v.poolAddress })));
                const tokenList = await Promise.all(deployedVaults.map(async (vault, index) => {
                    // Fetch price stats for this specific token's pool
                    let change24h = (Math.random() - 0.5) * 20; // Default random change
                    if (vault.poolAddress && vault.poolAddress !== '0x0000000000000000000000000000000000000000') {
                        try {
                            const priceStats = await fetchTokenPriceStats("24h", vault.poolAddress);
                            if (priceStats?.percentageChange !== undefined) {
                                change24h = priceStats.percentageChange;
                            }
                        } catch (error) {
                            console.error(`Failed to fetch price stats for ${vault.tokenSymbol}:`, error);
                        }
                    }
                    
                    // Get logo URL and token supply from deployedTokensMap
                    const tokenData = deployedTokensMap.get(vault.tokenSymbol);
                    const logoUrl = tokenData?.logoUrl || tokenData?.logoPreview || null;
                    const tokenSupply = tokenData?.tokenSupply || "0";
                    
                    const tokenProtocol = tokenProtocols[vault.tokenSymbol] || "uniswap";
                    // console.log(`[TOKEN LIST] Token ${vault.tokenSymbol} protocol: ${tokenProtocol}`);
                    
                    // Calculate price and FDV
                    const tokenPrice = vault.spotPrice ? (parseFloat(formatEther(vault.spotPrice)) || 0.0000186) : 0.0000186;
                    const supplyInTokens = parseFloat(tokenSupply);
                    const calculatedFdv = supplyInTokens * tokenPrice * (monPrice || 1); // Use 1 as fallback if monPrice not loaded
                    // console.log(`[TOKEN LIST] ${vault.tokenSymbol} - Supply: ${tokenSupply}, Price: ${tokenPrice}, MonPrice: ${monPrice}, FDV: ${calculatedFdv}`);
                    
                    return {
                        id: index + 1,
                        name: vault.tokenName,
                        symbol: vault.tokenSymbol,
                        price: tokenPrice,
                        change24h: change24h,
                        volume24h: 0, // Start with 0 volume for new pools
                        marketCap: 0, // Should be calculated from price * circulating supply
                        liquidity: 0, // Should be fetched from pool
                        fdv: calculatedFdv,
                        holders: 0, // Should be fetched from blockchain
                        token0: vault.token0,
                        tokenSupply: tokenSupply, // Store token supply for later use
                        token1: vault.token1,
                        vault: vault.vault,
                        poolAddress: vault.poolAddress,
                        spotPrice: vault.spotPrice, // Keep the raw spot price
                        logoUrl: logoUrl, // Add logo URL
                        selectedProtocol: tokenProtocol // Add protocol with uniswap as default
                    };
                }));
                
                // Ensure minimum loading time for better UX
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                
                setTimeout(() => {
                    setTokens(tokenList);
                    
                    // Build pool to token mapping
                    const newPoolMap: { [poolAddress: string]: { symbol: string, token0: string, token1: string } } = {};
                    tokenList.forEach(token => {
                        if (token.poolAddress && token.poolAddress !== '0x0000000000000000000000000000000000000000') {
                            newPoolMap[token.poolAddress.toLowerCase()] = {
                                symbol: token.symbol,
                                token0: token.token0,
                                token1: token.token1
                            };
                            console.log('[Exchange] Adding to pool map:', token.symbol, '->', token.poolAddress.toLowerCase());
                            if (token.poolAddress.toLowerCase() === '0x8eb5c457f7a29554536dc964b3fada2961dd8212') {
                                console.log('[Exchange] Found the mystery pool! Token:', token.symbol);
                            }
                        }
                    });
                    setPoolToTokenMap(newPoolMap);
                    console.log('[Exchange] Built pool to token map:', Object.keys(newPoolMap).length, 'pools');
                    console.log('[Exchange] Pool addresses in map:', Object.keys(newPoolMap));
                    console.log('[Exchange] Full poolToTokenMap:', newPoolMap);
                    
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
        
        processVaults();
    }, [allVaultsData, vaultsLoading]);
    
    // Update token stats when tokens are loaded
    useEffect(() => {
        if (tokens.length === 0) return;
        
        const updateTokenStats = async () => {
            try {
                const stats: { [symbol: string]: number } = {};
                
                // Fetch stats for each token
                await Promise.all(
                    tokens.map(async (token) => {
                        if (token.poolAddress && token.poolAddress !== '0x0000000000000000000000000000000000000000') {
                            try {
                                const priceStats = await fetchTokenPriceStats("24h", token.poolAddress);
                                if (priceStats?.percentageChange !== undefined) {
                                    stats[token.symbol] = priceStats.percentageChange;
                                }
                            } catch (error) {
                                console.error(`Error updating stats for ${token.symbol}:`, error);
                            }
                        }
                    })
                );
                
                setTokenStats(stats);
            } catch (error) {
                console.error("Error updating token stats:", error);
            }
        };
        
        // Update stats once when tokens change
        updateTokenStats();
        
        // Set up interval for periodic updates
        const interval = setInterval(updateTokenStats, 60000);
        
        return () => clearInterval(interval);
    }, [tokens.length]); // Only re-run when number of tokens changes
    
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
                // console.log("error", "Please fill in all fields");
                setError("Please fill in all fields");
                return;
            }
        } else if (deployStep == 1) {
            if (tokenSupply == 0 || price == 0 || token1 == "") {
                // console.log("error", "Please fill in all fields");
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
        // console.log("Current Step: ", currentStep);
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
        // console.log("Token Supply: ", event.target.value);
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
        // console.log(`Got value ${value}`)
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
        // console.log(`Input: ${inputValueStr}, Sale Price: ${formattedSalePrice}`);
    
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
        // console.log("Presale: ", event.target.value);
        setPresale(event.target.value);
    }

    const handleSetDuration = (event) => {
        // console.log("Duration: ", event.target.value);
        setDuration(event.target.value);
    }

    const handleSetSoftCap = (event) => {
        // console.log("Soft Cap: ", event.target.value);

        if (event.target.value != "") {
            const targetValue = unCommify(event.target.value);
            try {
                const valueNum = parseFloat(targetValue);
                if (!isNaN(valueNum) && isFinite(valueNum) && valueNum >= 0) {
                    const valueString = valueNum.toFixed(18).replace(/\.?0+$/, '');
                    // console.log(`Setting soft cap to ${parseEther(valueString)}`);
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

    // Balance fetching is now handled by useMulticallBalances hook above
    
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
    
    // Quote fetching - Temporarily disabled
    // const { data: quoteData, isLoading: isQuoteLoading } = useContractRead({
    //     address: quoterAddress,
    //     abi: QuoterAbi,
    //     functionName: "quoteExactInput",
    //     args: swapPath && tradeAmount && parseFloat(tradeAmount) > 0 ? 
    //         [swapPath, safeParseEther(tradeAmount)] : undefined,
    //     enabled: !!swapPath && !!tradeAmount && parseFloat(tradeAmount) > 0 && !!quoterAddress,
    //     watch: false, // Disable to reduce RPC calls - will update on dependencies change
    // });
    const quoteData = null;
    const isQuoteLoading = false;
    
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
    
    // Dynamically adjust slippage based on price impact
    useEffect(() => {
        const impact = parseFloat(priceImpact);
        if (isNaN(impact) || impact === 0) return;
        
        // Calculate recommended slippage based on price impact
        let recommendedSlippage: number;
        
        if (impact <= 0.1) {
            // Very low impact, use 0.1% preset
            recommendedSlippage = 0.1;
        } else if (impact <= 0.5) {
            // Low impact, use 0.5% preset
            recommendedSlippage = 0.5;
        } else if (impact <= 1) {
            // Moderate impact, use 1% preset
            recommendedSlippage = 1.0;
        } else {
            // Higher impact, use custom value with small buffer
            recommendedSlippage = impact + 0.5; // Add 0.5% buffer
        }
        
        // Check if it's a preset value
        const presetValues = [0.1, 0.5, 1];
        const isPreset = presetValues.includes(recommendedSlippage);
        
        // Format slippage
        const newSlippage = isPreset ? recommendedSlippage.toString() : recommendedSlippage.toFixed(1);
        
        // Update slippage
        if (newSlippage !== slippage) {
            setSlippage(newSlippage);
            setSlippageAutoAdjusted(!isPreset); // Only mark as auto-adjusted if not a preset
        }
    }, [priceImpact]);
    
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
                // Refetch all balances using multicall
                await refetchBalances();
                
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
                // Refetch all balances using multicall
                await refetchBalances();
                
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
            if (!processedTxHashes.current.has(data.hash)) {
                processedTxHashes.current.add(data.hash);
                // setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]);
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
            
            const msg = error.message.toString().indexOf("fb8f41b2") > -1 ? "Insufficient allowance" :
                        error.message.toString().indexOf("rate limited") > -1 ? "Rate limited. Slow down and try again." :
                        error.message.toString().indexOf("SlippageExceeded()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("NoTokensExchanged()") > -1 ? "Not yet available for trading." :
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
            if (!processedTxHashes.current.has(data.hash)) {
                processedTxHashes.current.add(data.hash);
                // setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]);
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
            const msg = error.message.toString().indexOf("fb8f41b2") > -1 ? "Insufficient allowance" :
                        error.message.toString().indexOf("rate limited") > -1 ? "Rate limited. Slow down and try again." :
                        error.message.toString().indexOf("SlippageExceeded()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("NoTokensExchanged()") > -1 ? "Not yet available for trading." :
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
            if (!processedTxHashes.current.has(data.hash)) {
                processedTxHashes.current.add(data.hash);
                // setTradeHistory(prev => [newTrade, ...prev.slice(0, 99)]);
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
            const msg = error.message.toString().indexOf("fb8f41b2") > -1 ? "Insufficient allowance" :
                        error.message.toString().indexOf("rate limited") > -1 ? "Rate limited. Slow down and try again." :
                        error.message.toString().indexOf("SlippageExceeded()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation. Try to increase slippage tolerance." :
                        error.message.toString().indexOf("0xe450d38c") > -1 ? "Not enough balance" :
                        error.message.toString().indexOf("Amount must be greater than 0") > -1 ? "Invalid amount" :
                        error.message.toString().indexOf("NoTokensExchanged()") > -1 ? "Not yet available for trading." :
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
            const msg = error.message.toString().indexOf("rate limited") > -1 ? "Rate limited. Slow down and try again." :
                        error.message.toString().indexOf("fb8f41b2") > -1 ? "Insufficient allowance" :
                        error.message.toString().indexOf("User rejected the request.") > -1 ? "Rejected operation" : error.message;
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
            const msg = error.message.toString().indexOf("fb8f41b2") > -1 ? "Insufficient allowance" :
                        error.message.toString().indexOf("User rejected the request.") > -1 ? "Rejected operation" : error.message;
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
        
        // console.log({ args} );

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
            
            // console.log("Buy WETH approval check:", {
            //     approveMax,
            //     hasMaxApproval,
            //     currentAllowance: currentAllowance.toString(),
            //     requiredAmount: requiredAmount.toString(),
            //     skipApproval
            // });
            
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
        
        // console.log("Sell token approval check:", {
        //     approveMax,
        //     hasMaxApproval,
        //     currentAllowance: currentAllowance.toString(),
        //     requiredAmount: requiredAmount.toString(),
        //     skipApproval
        // });
        
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
                        {/* Search box - DISABLED TO FIND RPC ISSUES */}
                        {/* <Flex alignItems="center" mb={3}>
                            <Input
                                placeholder="Search tokens..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                bg="#2a2a2a"
                                border="none"
                                _placeholder={{ color: "#666", fontSize: "xs" }}
                                h="32px"
                                fontSize="xs"
                            />
                            <IconButton
                                ml={2}
                                variant="ghost"
                                color="#666"
                                size="sm"
                            >
                                <LuSearch />
                            </IconButton>
                        </Flex> */}
                        
                        {/* Sorting Controls */}
                        <Flex mb={3} gap={2}>
                            <Button
                                size="xs"
                                variant={sortBy === "price" ? "solid" : "ghost"}
                                bg={sortBy === "price" ? "#ff9500" : "transparent"}
                                color={sortBy === "price" ? "black" : "#888"}
                                _hover={{ bg: sortBy === "price" ? "#ff9500" : "#2a2a2a" }}
                                onClick={() => {
                                    if (sortBy === "price") {
                                        setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                                    } else {
                                        setSortBy("price");
                                        setSortOrder("desc");
                                    }
                                }}
                                rightIcon={
                                    sortBy === "price" ? (
                                        sortOrder === "desc" ? <LuArrowDown /> : <LuArrowUp />
                                    ) : <LuArrowUpDown />
                                }
                                fontSize="xs"
                                h="32px"
                            >
                                Price
                            </Button>
                            <Button
                                size="xs"
                                variant={sortBy === "24h" ? "solid" : "ghost"}
                                bg={sortBy === "24h" ? "#ff9500" : "transparent"}
                                color={sortBy === "24h" ? "black" : "#888"}
                                _hover={{ bg: sortBy === "24h" ? "#ff9500" : "#2a2a2a" }}
                                onClick={() => {
                                    if (sortBy === "24h") {
                                        setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                                    } else {
                                        setSortBy("24h");
                                        setSortOrder("desc");
                                    }
                                }}
                                rightIcon={
                                    sortBy === "24h" ? (
                                        sortOrder === "desc" ? <LuArrowDown /> : <LuArrowUp />
                                    ) : <LuArrowUpDown />
                                }
                                fontSize="xs"
                                h="32px"
                            >
                                24h Change
                            </Button>
                            {sortBy !== "default" && (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    color="#888"
                                    _hover={{ bg: "#2a2a2a" }}
                                    onClick={() => {
                                        setSortBy("default");
                                        setSortOrder("desc");
                                    }}
                                    fontSize="xs"
                                    h="32px"
                                >
                                    Clear
                                </Button>
                            )}
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
                                        <Table.ColumnHeader color="#888" fontSize="2xs" py={1} pl={isMobile ? 2 : 0} pr={isMobile ? 1 : 3}>Token</Table.ColumnHeader>
                                        <Table.ColumnHeader color="#888" fontSize="2xs" py={1} px={isMobile ? 1 : 2} textAlign="right">Price</Table.ColumnHeader>
                                        <Table.ColumnHeader color="#888" fontSize="2xs" py={1} px={isMobile ? 1 : 2} textAlign="right">24h</Table.ColumnHeader>
                                        {!isMobile && <Table.ColumnHeader color="#888" fontSize="2xs" py={1} pr={3} pl={2} textAlign="right">FDV</Table.ColumnHeader>}
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {filteredTokens.map((token) => (
                                        <Table.Row
                                            key={token.id}
                                            cursor="pointer"
                                            onClick={() => {
                                                // console.log("=== TOKEN CLICK ===");
                                                // console.log("=== TOKEN CLICK ===");
                                                // console.log("Selected token:", token);
                                                // console.log("Token pool address:", token.poolAddress);
                                                // console.log("Token protocol:", token.selectedProtocol);
                                                // console.log("Full token object:", JSON.stringify(token, null, 2));
                                                setSelectedToken(token);
                                                if (isMobile) {
                                                    setIsTokenListCollapsed(true);
                                                }
                                            }}
                                            transition="all 0.2s"
                                        >
                                            <Table.Cell 
                                                py={isMobile ? 0.5 : 1} 
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
                                                            <Text color="white" fontSize="xs" fontWeight="500" whiteSpace="nowrap">
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
                                                <Text color="white" fontSize="2xs" whiteSpace="nowrap">
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
                                                    color={(tokenStats[token.symbol] || token.change24h || 0) > 0 ? "#4ade80" : "#ef4444"} 
                                                    fontSize="2xs" 
                                                    whiteSpace="nowrap"
                                                >
                                                    {(tokenStats[token.symbol] || token.change24h || 0) > 0 ? "+" : ""}{(tokenStats[token.symbol] || token.change24h || 0).toFixed(2)}%
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
                                                    <Text color="white" fontSize="2xs" whiteSpace="nowrap">
                                                        ${formatNumber(parseFloat(token.tokenSupply || "0") * token.price * monPrice)} 
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
                    
                    {/* Upcoming Presales - DISABLED TO FIND RPC ISSUES */}
                    {/* <Box flexShrink={0} w="100%">
                        <UpcomingPresales />
                    </Box> */}
                    
                    {/* Troll Box */}
                    <Box flexShrink={0} mt={4}>
                        <TrollBox />
                    </Box>
                    
                    {/* Referral Stats */}
                    <Box flexShrink={0} mt={4}>
                        <ReferralStats 
                            totalVolume={totalVolume} 
                            token0Symbol={selectedToken?.symbol} 
                            tokenPriceUsd={spotPrice} 
                            poolAddress={poolInfo?.poolAddress}
                        />
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
                                {(() => {
                                    console.log('[Chart Render] isChartLoading:', isChartLoading);
                                    console.log('[Chart Render] chartSeries:', chartSeries);
                                    console.log('[Chart Render] chartSeries.length:', chartSeries.length);
                                    console.log('[Chart Render] chartSeries[0]?.data.length:', chartSeries[0]?.data?.length);
                                    
                                    if (isChartLoading) {
                                        return (
                                            <Center h="calc(100% - 60px)">
                                                <VStack>
                                                    <Spinner size="md" color="#4ade80" thickness="3px" />
                                                    <Text color="#4ade80" fontSize="sm">Loading chart data...</Text>
                                                </VStack>
                                            </Center>
                                        );
                                    } else if (chartSeries.length > 0 && chartSeries[0].data.length > 0) {
                                        return (
                                            <Box h="calc(100% - 60px)" minH="300px" w="100%">
                                                <ReactApexChart
                                                    options={chartOptions}
                                                    series={chartSeries}
                                                    type="candlestick"
                                                    height="100%"
                                                    width="100%"
                                                />
                                            </Box>
                                        );
                                    } else {
                                        return (
                                            <Center h="calc(100% - 60px)">
                                                <Text color="#666" fontSize="sm">No price data available</Text>
                                            </Center>
                                        );
                                    }
                                })()}
                            </Box>
                            
                            {/* Trade History with Tabs - Only show on desktop */}
                            {!isMobile && (
                            <Box bg="#1a1a1a" borderRadius="lg" p={isMobile ? 3 : 4} w="100%">
                                <Tabs.Root value={tradeHistoryTab} onValueChange={(e) => setTradeHistoryTab(e.value)}>
                                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                                        <Tabs.List flex={1}>
                                            <Tabs.Trigger 
                                                value="global" 
                                                flex={1}
                                                _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                color="white"
                                                fontWeight="600"
                                            >
                                                Global
                                            </Tabs.Trigger>
                                            <Tabs.Trigger 
                                                value="my" 
                                                flex={1}
                                                _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                color="white"
                                                fontWeight="600"
                                            >
                                                My Trades
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
                                    
                                    <Tabs.Content value="global">
                                        <VStack gap={2} align="stretch">
                                                {globalTrades.length === 0 && (
                                                    <Box p={4} textAlign="center" color="gray.500">
                                                        Fetching global trades...
                                                    </Box>
                                                )}
                                                {getPaginatedData(globalTrades, currentPage, itemsPerPage).map((trade) => (
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
                                                                {(() => {
                                                                    try {
                                                                        let timeMs;
                                                                        if (trade.time instanceof Date) {
                                                                            timeMs = trade.time.getTime();
                                                                        } else if (typeof trade.time === 'string' || typeof trade.time === 'number') {
                                                                            timeMs = new Date(trade.time).getTime();
                                                                        } else {
                                                                            console.error('[Exchange] Invalid time format:', trade.time);
                                                                            return 'Unknown';
                                                                        }
                                                                        
                                                                        const diff = Date.now() - timeMs;
                                                                        
                                                                        // Debug log
                                                                        if (isNaN(diff)) {
                                                                            console.error('[Exchange] Time diff is NaN. trade.time:', trade.time, 'timeMs:', timeMs, 'Date.now():', Date.now());
                                                                            return 'Unknown';
                                                                        }
                                                                        
                                                                        if (diff < 0) {
                                                                            console.warn('[Exchange] Time is in the future:', trade.time);
                                                                            return 'Just now';
                                                                        }
                                                                        
                                                                        const minutes = Math.floor(diff / 60000);
                                                                        if (minutes < 1) return 'Just now';
                                                                        if (minutes < 60) return `${minutes}m ago`;
                                                                        const hours = Math.floor(minutes / 60);
                                                                        if (hours < 24) return `${hours}h ago`;
                                                                        return `${Math.floor(hours / 24)}d ago`;
                                                                    } catch (e) {
                                                                        console.error('Error formatting time:', e, trade.time);
                                                                        return 'Unknown';
                                                                    }
                                                                })()}
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
                                                        console.log('[My Trades Debug] Total trades:', tradeHistory.length);
                                                        console.log('[My Trades Debug] My address:', address);
                                                        console.log('[My Trades Debug] ALL trades before filter:');
                                                        tradeHistory.forEach((t, index) => {
                                                            console.log(`Trade ${index}:`, {
                                                                type: t.type,
                                                                sender: t.sender,
                                                                recipient: t.recipient,
                                                                amount: t.amount,
                                                                senderMatches: t.sender?.toLowerCase() === address.toLowerCase(),
                                                                recipientMatches: t.recipient?.toLowerCase() === address.toLowerCase(),
                                                                isMine: t.sender?.toLowerCase() === address.toLowerCase() || t.recipient?.toLowerCase() === address.toLowerCase()
                                                            });
                                                        });
                                                        console.log('[My Trades Debug] Filtered my trades:', myTrades.length);
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
                                                                                {(() => {
                                                                                    try {
                                                                                        const timeMs = trade.time instanceof Date ? trade.time.getTime() : new Date(trade.time).getTime();
                                                                                        const diff = Date.now() - timeMs;
                                                                                        if (isNaN(diff) || diff < 0) return 'Just now';
                                                                                        const minutes = Math.floor(diff / 60000);
                                                                                        if (minutes < 1) return 'Just now';
                                                                                        if (minutes < 60) return `${minutes}m ago`;
                                                                                        const hours = Math.floor(minutes / 60);
                                                                                        if (hours < 24) return `${hours}h ago`;
                                                                                        return `${Math.floor(hours / 24)}d ago`;
                                                                                    } catch (e) {
                                                                                        console.error('Error formatting time:', e, trade.time);
                                                                                        return 'Unknown';
                                                                                    }
                                                                                })()}
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
                            vaultToken0={selectedToken?.token0}
                            vaultToken1={selectedToken?.token1}
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
                                            onClick={() => {
                                                setSlippage("0.1");
                                                setSlippageAutoAdjusted(false);
                                            }}
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
                                            onClick={() => {
                                                setSlippage("0.5");
                                                setSlippageAutoAdjusted(false);
                                            }}
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
                                            onClick={() => {
                                                setSlippage("1");
                                                setSlippageAutoAdjusted(false);
                                            }}
                                            _hover={{ bg: slippage === "1" ? "#4ade80" : "#3a3a3a" }}
                                        >
                                            1%
                                        </Button>
                                        <Button
                                            w="60px"
                                            size="xs"
                                            h="24px"
                                            bg={slippageAutoAdjusted ? "#ef4444" : (!["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#2a2a2a")}
                                            color={slippageAutoAdjusted || !["0.1", "0.5", "1"].includes(slippage) ? "white" : "white"}
                                            onClick={() => {
                                                setIsSlippageModalOpen(true);
                                                setSlippageAutoAdjusted(false);
                                            }}
                                            _hover={{ bg: slippageAutoAdjusted ? "#dc2626" : (!["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#3a3a3a") }}
                                            fontSize="xs"
                                            title={slippageAutoAdjusted ? "Slippage auto-adjusted based on price impact" : ""}
                                        >
                                            {slippageAutoAdjusted ? `${slippage}%*` : (!["0.1", "0.5", "1"].includes(slippage) ? `${slippage}%` : "Custom")}
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
                                    <VStack align="end" spacing={0}>
                                        <Box>
                                        {!gasLoading && gasPriceGwei && (
                                            <Text color="#888" fontSize="xs">
                                                {parseFloat(gasPriceGwei).toFixed(4)} Gwei
                                            </Text>
                                        )}                                            
                                        </Box>
                                        <Box>
                                        <Text color="white" fontSize="sm">
                                            {gasLoading ? (
                                                <Spinner size="xs" color="#4ade80" />
                                            ) : (
                                                `~$${estimatedFeeUsd}`
                                            )}
                                        </Text>                                            
                                        </Box>

                                    </VStack>
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
                                                onClick={() => {
                                                setSlippage("0.1");
                                                setSlippageAutoAdjusted(false);
                                            }}
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
                                                onClick={() => {
                                                setSlippage("0.5");
                                                setSlippageAutoAdjusted(false);
                                            }}
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
                                                onClick={() => {
                                                setSlippage("1");
                                                setSlippageAutoAdjusted(false);
                                            }}
                                                _hover={{ bg: slippage === "1" ? "#4ade80" : "#3a3a3a" }}
                                            >
                                                1%
                                            </Button>
                                            <Button
                                                w="60px"
                                                size="xs"
                                                h="24px"
                                                bg={slippageAutoAdjusted ? "#ef4444" : (!["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#2a2a2a")}
                                                color={slippageAutoAdjusted || !["0.1", "0.5", "1"].includes(slippage) ? "white" : "white"}
                                                onClick={() => {
                                                    setIsSlippageModalOpen(true);
                                                    setSlippageAutoAdjusted(false);
                                                }}
                                                _hover={{ bg: slippageAutoAdjusted ? "#dc2626" : (!["0.1", "0.5", "1"].includes(slippage) ? "#4ade80" : "#3a3a3a") }}
                                                fontSize="xs"
                                                title={slippageAutoAdjusted ? "Slippage auto-adjusted based on price impact" : ""}
                                            >
                                                {slippageAutoAdjusted ? `${slippage}%*` : (!["0.1", "0.5", "1"].includes(slippage) ? `${slippage}%` : "Custom")}
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
                                                value="global" 
                                                flex={1}
                                                _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                color="white"
                                                fontWeight="600"
                                            >
                                                Global
                                            </Tabs.Trigger>
                                            <Tabs.Trigger 
                                                value="my" 
                                                flex={1}
                                                _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                color="white"
                                                fontWeight="600"
                                            >
                                                My Trades
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
                                    
                                <Tabs.Content value="global">
                                        <VStack gap={2} align="stretch">
                                                {globalTrades.length === 0 && (
                                                    <Box p={4} textAlign="center" color="gray.500">
                                                        Fetching global trades...
                                                    </Box>
                                                )}
                                                {getPaginatedData(globalTrades, currentPage, itemsPerPage).map((trade) => (
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
                                                                        {(() => {
                                                                            try {
                                                                                const timeMs = trade.time instanceof Date ? trade.time.getTime() : new Date(trade.time).getTime();
                                                                                const diff = Date.now() - timeMs;
                                                                                if (isNaN(diff) || diff < 0) return 'Just now';
                                                                                const minutes = Math.floor(diff / 60000);
                                                                                if (minutes < 1) return 'Just now';
                                                                                if (minutes < 60) return `${minutes}m ago`;
                                                                                const hours = Math.floor(minutes / 60);
                                                                                if (hours < 24) return `${hours}h ago`;
                                                                                return `${Math.floor(hours / 24)}d ago`;
                                                                            } catch (e) {
                                                                                console.error('Error formatting time:', e, trade.time);
                                                                                return 'Unknown';
                                                                            }
                                                                        })()}
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
                                                        console.log('[My Trades Debug] Total trades:', tradeHistory.length);
                                                        console.log('[My Trades Debug] My address:', address);
                                                        console.log('[My Trades Debug] ALL trades before filter:');
                                                        tradeHistory.forEach((t, index) => {
                                                            console.log(`Trade ${index}:`, {
                                                                type: t.type,
                                                                sender: t.sender,
                                                                recipient: t.recipient,
                                                                amount: t.amount,
                                                                senderMatches: t.sender?.toLowerCase() === address.toLowerCase(),
                                                                recipientMatches: t.recipient?.toLowerCase() === address.toLowerCase(),
                                                                isMine: t.sender?.toLowerCase() === address.toLowerCase() || t.recipient?.toLowerCase() === address.toLowerCase()
                                                            });
                                                        });
                                                        console.log('[My Trades Debug] Filtered my trades:', myTrades.length);
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
                                                                                        {(() => {
                                                                                            try {
                                                                                                const timeMs = trade.time instanceof Date ? trade.time.getTime() : new Date(trade.time).getTime();
                                                                                                const diff = Date.now() - timeMs;
                                                                                                if (isNaN(diff) || diff < 0) return 'Just now';
                                                                                                const minutes = Math.floor(diff / 60000);
                                                                                                if (minutes < 1) return 'Just now';
                                                                                                if (minutes < 60) return `${minutes}m ago`;
                                                                                                const hours = Math.floor(minutes / 60);
                                                                                                if (hours < 24) return `${hours}h ago`;
                                                                                                return `${Math.floor(hours / 24)}d ago`;
                                                                                            } catch (e) {
                                                                                                console.error('Error formatting time:', e, trade.time);
                                                                                                return 'Unknown';
                                                                                            }
                                                                                        })()}
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
                    setSlippageAutoAdjusted(false);
                    setIsSlippageModalOpen(false);
                }}
            />
        </Container>
    );
};

export default Exchange;
 