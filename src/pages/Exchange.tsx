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
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox"
  
import { useAccount, useBalance, useContractRead } from "wagmi";
import { useSafeContractWrite } from "../hooks/useSafeContractWrite";
import { isMobile } from "react-device-detect";
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

import { unCommify, commify, commifyDecimals, generateBytes32String, getContractAddress } from "../utils";
import WalletSidebar from "../components/WalletSidebar";
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

// Import Exchange Helper ABI
const ExchangeHelperArtifact = await import(`../assets/ExchangeHelper.json`);
const ExchangeHelperAbi = ExchangeHelperArtifact.abi;

// Import QuoterV2 ABI
const QuoterArtifact = await import(`../assets/QuoterV2.json`);
const QuoterAbi = QuoterArtifact.abi;

// Import ERC20 ABI
const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

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
import config from '../config';
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import addressesBsc from "../assets/deployment.json";
import { FaArrowTrendUp, FaArrowTrendDown } from "react-icons/fa6";
import { LuSearch } from "react-icons/lu";

const addresses = config.chain == "local"
  ? addressesLocal
  : addressesBsc;

const { environment, presaleContractAddress } = config;

const FactoryArtifact = await import(`../assets/OikosFactory.json`);
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
    config.chain === "local" ? addressesLocal : addressesBsc, 
    config.chain === "local" ? "1337" : "10143", 
    "Exchange"
);

// Provider setup
const localProvider = new providers.JsonRpcProvider(
    config.chain == "local" ? "http://localhost:8545" : config.RPC_URL
);

const Launchpad: React.FC = () => {
    const { address, isConnected } = useAccount();
    const { selectedToken, setSelectedToken } = useToken();
    const [searchTerm, setSearchTerm] = useState("");
    const [tradeAmount, setTradeAmount] = useState("");
    const [isBuying, setIsBuying] = useState(true);
    const [tradeHistoryTab, setTradeHistoryTab] = useState("all");
    
    // Input validation function
    const validateAndSetTradeAmount = (value) => {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = value.replace(/[^0-9.]/g, '');
        
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
    const [spotPrice, setSpotPrice] = useState(0);
    const [slippage, setSlippage] = useState("1");
    const [quote, setQuote] = useState("");
    const [priceImpact, setPriceImpact] = useState("0");
    const [showQuoteLoading, setShowQuoteLoading] = useState(false);
    
    // Token data from blockchain
    const [tokens, setTokens] = useState([]);
    const [isTokensLoading, setIsTokensLoading] = useState(true);
    const [vaultDescriptions, setVaultDescriptions] = useState([]);
    const [token1Symbol, setToken1Symbol] = useState("ETH"); // Default to ETH
    const [priceUSD, setPriceUSD] = useState(0); // Price of token1 in USD
    
    // Trade history data with local storage persistence
    const [tradeHistory, setTradeHistory] = useState([]);
    const [processedTxHashes] = useState(() => new Set());
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [myTxCurrentPage, setMyTxCurrentPage] = useState(1);
    
    // Load trade history from local storage on mount
    useEffect(() => {
        const loadTradeHistory = () => {
            try {
                const stored = localStorage.getItem('oikos_trade_history');
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
    
    // Save trade history to local storage whenever it changes
    useEffect(() => {
        if (tradeHistory.length > 0) {
            try {
                localStorage.setItem('oikos_trade_history', JSON.stringify(tradeHistory));
            } catch (error) {
                console.error("Error saving trade history:", error);
            }
        }
    }, [tradeHistory]);
    
    // Function to clear trade history
    const clearTradeHistory = () => {
        setTradeHistory([]);
        processedTxHashes.clear();
        localStorage.removeItem('oikos_trade_history');
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
    const [chartSeries, setChartSeries] = useState([]);
    const [chartTimeframe, setChartTimeframe] = useState("24h");
    const [chartGranularity, setChartGranularity] = useState("1h");
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
    
    // Chart options with professional styling
    const [chartOptions, setChartOptions] = useState({
        chart: {
            type: 'candlestick',
            background: '#1a1a1a',
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
            labels: {
                style: {
                    colors: '#4a4a4a',
                    fontSize: '10px',
                    fontFamily: 'inherit'
                },
                formatter: (value) => {
                    if (!value || isNaN(value)) return '0';
                    if (value < 0.00001) return value.toExponential(2);
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
                        if (val < 0.00001) return val.toExponential(4);
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
                    offsetX: 80, // Position 30px more to the right
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
    
    const API_BASE_URL = "https://pricefeed.noma.money";
    
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
    const fetchOHLCData = async (timeframe, granularity) => {
        try {
            const { from_timestamp, to_timestamp, interval } = getTimeParams(timeframe, granularity);
            
            const url = new URL(`${API_BASE_URL}/api/price/ohlc`);
            url.searchParams.append('from_timestamp', from_timestamp.toString());
            url.searchParams.append('to_timestamp', to_timestamp.toString());
            url.searchParams.append('interval', interval);
            
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
                const ohlcData = await fetchOHLCData(chartTimeframe, chartGranularity);
                
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
                
                const change = calculatePercentChange(ohlcData, chartTimeframe);
                // console.log("Calculated percentage change:", change, "for timeframe:", chartTimeframe);
                setPercentChange(change);
            } else {
                // console.log("No chart data available");
                setChartSeries([{
                    name: `${selectedToken.symbol}/${token1Symbol}`,
                    data: []
                }]);
                setPercentChange(0);
            }
            } catch (error) {
                console.error("Error loading chart data:", error);
                setChartSeries([{
                    name: `${selectedToken.symbol}/${token1Symbol}`,
                    data: []
                }]);
                setPercentChange(0);
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
        
    }, [selectedToken, chartTimeframe, chartGranularity, token1Symbol, chartUpdateTrigger]);

    // Listen to Uniswap pool events for real-time price updates
    useEffect(() => {
        if (!poolInfo.poolAddress || poolInfo.poolAddress === zeroAddress) return;
        
        console.log("Setting up event listener for pool:", poolInfo.poolAddress);
        
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
                
                console.log("Price updated from pool event:", finalPrice);
                
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
            console.log("Swap event detected");
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
                
                // Determine if it's a buy or sell based on amounts
                // If amount0 is negative, token0 is being sold (and token1 bought)
                // If amount0 is positive, token0 is being bought (and token1 sold)
                const isBuy = amount0.gt(0);
                const tokenAmount = isBuy ? amount0.abs() : amount1.abs();
                const ethAmount = isBuy ? amount1.abs() : amount0.abs();
                
                // Calculate price
                const tokenAmountFormatted = parseFloat(formatEther(tokenAmount));
                const ethAmountFormatted = parseFloat(formatEther(ethAmount));
                const price = ethAmountFormatted / tokenAmountFormatted;
                
                const newTrade = {
                    id: Date.now() + Math.random(), // Unique ID
                    type: isBuy ? "buy" : "sell",
                    token: selectedToken?.symbol || "TOKEN",
                    amount: tokenAmountFormatted,
                    price: price,
                    total: ethAmountFormatted,
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
            console.log("Removing pool event listener");
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
                    // Based on Exchange.tsx, the order is:
                    // [liquidityRatio, circulatingSupply, spotPrice, anchorCapacity, floorCapacity, token0Address, token1Address, newFloorPrice]
                    const spotPriceFromContract = vaultInfo[2]; // spotPrice is at index 2
                    
                    const formattedPrice = formatEther(spotPriceFromContract);
                    const numericPrice = parseFloat(formattedPrice);
                    
                    if (!isNaN(numericPrice) && isFinite(numericPrice) && numericPrice > 0) {
                        setSpotPrice(numericPrice);
                    } else {
                        console.warn("Invalid spot price from contract, using fallback");
                        setSpotPrice(selectedToken.price || 0.0000186);
                    }
                } catch (error) {
                    console.error("Error fetching vault info:", error);
                    // Fallback to token price if vault info fails
                    setSpotPrice(selectedToken.price || 0.0000186);
                }
                
                // Fetch pool address
                if (selectedToken.token0 && selectedToken.token1) {
                    try {
                        const poolAddress = await fetchPoolAddress(selectedToken.token0, selectedToken.token1);
                        setPoolInfo({ poolAddress });
                    } catch (error) {
                        console.error("Error fetching pool address:", error);
                    }
                }
                
                // Fetch USD price for the token1
                const fetchToken1Price = async () => {
                    try {
                        // For now, assume MON price is similar to BNB
                        // In production, this should query actual price feeds
                        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
                        const data = await response.json();
                        if (data.binancecoin && data.binancecoin.usd) {
                            setPriceUSD(data.binancecoin.usd);
                        }
                    } catch (error) {
                        console.error('Error fetching token1 price:', error);
                        setPriceUSD(300); // Default fallback price
                    }
                };
                
                fetchToken1Price();
            } catch (error) {
                console.error("Error fetching token info:", error);
                // Default to ETH if error
                setToken1Symbol("ETH");
                setSpotPrice(selectedToken.price);
            }
        };
        
        fetchTokenInfo();
    }, [selectedToken]);

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
                            text: `${spotPrice < 0.00001 ? spotPrice.toExponential(2) : spotPrice < 0.01 ? spotPrice.toFixed(6) : spotPrice.toFixed(4)}`,
                            textAnchor: 'middle',
                            position: 'right',
                            offsetX: 80, // Position 30px more to the right
                            offsetY: 0
                        }
                    }]
                },
                yaxis: {
                    ...prevOptions.yaxis,
                    labels: {
                        ...prevOptions.yaxis.labels,
                        formatter: function(value, index) {
                            // Hide label if it's too close to spot price
                            if (Math.abs(value - spotPrice) / spotPrice < 0.02) {
                                return '';
                            }
                            if (!value || isNaN(value)) return '0';
                            if (value < 0.00001) return value.toExponential(2);
                            if (value < 0.01) return value.toFixed(6);
                            return value.toFixed(2);
                        }
                    }
                }
            }));
        }
    }, [spotPrice]);

    const filteredTokens = tokens.filter(token => 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Fetch pool address from Uniswap V3 Factory
    const fetchPoolAddress = async (token0, token1) => {
        const uniswapV3FactoryContract = new ethers.Contract(
            config.protocolAddresses.uniswapV3Factory,
            uniswapV3FactoryABI,
            localProvider
        );
        
        const poolAddress = await uniswapV3FactoryContract.getPool(token0, token1, feeTier);
        return poolAddress;
    };
    
    const WETH_ADDRESS = config.protocolAddresses.WMON;
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
                
                const nomaFactoryContract = new ethers.Contract(
                    nomaFactoryAddress,
                    FactoryAbi,
                    localProvider
                );
                
                const allVaultDescriptions = await Promise.all(
                    deployersData.map(async (deployer) => {
                        try {
                            const vaultsData = await nomaFactoryContract.getVaults(deployer);
                            
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
                                                vaultDescriptionData[4]
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
                setVaultDescriptions(flattenedVaults);
                
                // Convert vault descriptions to token format for display
                const tokenList = flattenedVaults.map((vault, index) => ({
                    id: index + 1,
                    name: vault.tokenName,
                    symbol: vault.tokenSymbol,
                    price: vault.spotPrice ? parseFloat(formatEther(vault.spotPrice)) : 0.0000186, // Use actual spot price
                    change24h: (Math.random() - 0.5) * 20, // Mock 24h change
                    volume24h: Math.floor(Math.random() * 1000000),
                    marketCap: Math.floor(Math.random() * 10000000),
                    liquidity: Math.floor(Math.random() * 1000000),
                    fdv: Math.floor(Math.random() * 10000000),
                    holders: Math.floor(Math.random() * 10000),
                    token0: vault.token0,
                    token1: vault.token1,
                    vault: vault.vault,
                    poolAddress: vault.poolAddress,
                    spotPrice: vault.spotPrice // Keep the raw spot price
                }));
                
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
    
    const formatPrice = (price) => {
        if (price < 0.00001) return price.toExponential(2);
        if (price < 1) return price.toFixed(6);
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
        const interval = setInterval(fetchBalances, 5000); // Refresh every 5 seconds
        
        return () => clearInterval(interval);
    }, [address, selectedToken]);
    
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
        value: parseEther(`${wrapAmount}`),
        onSuccess(data) {
            setIsWrapping(false);
            toaster.create({
                title: "Success",
                description: `Wrapped ${wrapAmount} MON to WMON`,
            });
            setWrapAmount(0);
            // Refresh balances after 2 seconds
            setTimeout(async () => {
                const ethBal = await localProvider.getBalance(address);
                setEthBalance(formatEther(ethBal));
                const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                const wethBal = await wethContract.balanceOf(address);
                setWethBalance(formatEther(wethBal));
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
        args: [parseEther(`${wrapAmount}`)],
        onSuccess(data) {
            setIsUnwrapping(false);
            toaster.create({
                title: "Success",
                description: `Unwrapped ${wrapAmount} WMON to MON`,
            });
            setWrapAmount(0);
            // Refresh balances after 2 seconds
            setTimeout(async () => {
                const ethBal = await localProvider.getBalance(address);
                setEthBalance(formatEther(ethBal));
                const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                const wethBal = await wethContract.balanceOf(address);
                setWethBalance(formatEther(wethBal));
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
            const msg = error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation" :
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
            const msg = error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation" :
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
            const msg = error.message.toString().indexOf("InvalidSwap()") > -1 ? "Error with swap operation" :
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

        const args = [
            poolInfo.poolAddress,
            spotPriceWei.toString(),
            safeParseEther(tradeAmount),
            address,
            false
        ];

        setIsLoading(true);
        setIsLoadingExecuteTrade(true);
        
        if (useWeth) {
            setBalanceBeforePurchase(safeParseEther(tokenBalance));
            setBalanceBeforeSale(safeParseEther(wethBalance));
            setBuyArgs(args);
            approveWeth({
                args: [
                    exchangeHelperAddress,
                    safeParseEther(tradeAmount)
                ]
            });
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

        const args = [
            poolInfo.poolAddress,
            spotPriceWei.toString(),
            safeParseEther(tradeAmount),
            address,
            false
        ];

        setBalanceBeforePurchase(useWeth ? safeParseEther(wethBalance) : safeParseEther(ethBalance));
        setBalanceBeforeSale(safeParseEther(tokenBalance));

        setIsLoading(true);
        setIsLoadingExecuteTrade(true);
        setSellArgs(args);
        approve({
            args: [
                exchangeHelperAddress,
                safeParseEther(tradeAmount)
            ]
        });
    };



    return (
        <Container maxW="100%" p={0} bg="#0a0a0a"> 
            <Toaster />
            {!isConnected ? (
                <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
                    <Text color="white" fontSize="xl">Please connect your wallet</Text>
                </Box>
            ) : (
            <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4} minH="calc(100vh - 80px)">
                {/* Left side - Token List */}
                <Box 
                    flex={isMobile ? "1" : "0 0 350px"} 
                    maxW={isMobile ? "100%" : "350px"} 
                    w={isMobile ? "100%" : "350px"}
                    display={isMobile && isTokenListCollapsed ? "none" : "flex"}
                    flexDirection="column"
                    gap={4}
                    overflowY="auto"
                    maxH="calc(100vh - 120px)"
                >
                    <Box bg="#1a1a1a" borderRadius="lg" pr={3} pl={3} py={3} overflowX="hidden">
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
                        
                        <Box overflowY="auto" overflowX="hidden" h="300px" mx={isMobile ? -2 : 0}>
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
                                        {!isMobile && <Table.ColumnHeader color="#888" fontSize="xs" py={2} pr={3} pl={2} textAlign="right">MCap</Table.ColumnHeader>}
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
                                                                src={placeholderLogo}
                                                                alt={token.symbol}
                                                                w={isMobile ? "16px" : "20px"}
                                                                h={isMobile ? "16px" : "20px"}
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
                                                    ${formatPrice(token.price)}
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
                                                        ${formatNumber(token.marketCap)}
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
                    
                    {/* Troll Box */}
                    <Box flexShrink={0}>
                        <TrollBox />
                    </Box>
                </Box>
                
                {/* Middle - Chart and Token Info */}
                <Box flex={isMobile ? "1" : "2"} w={isMobile ? "100%" : "auto"}>
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
                                    <Image src={placeholderLogo} alt={selectedToken.symbol} w="24px" h="24px" />
                                </Box>
                                <Box>
                                    <Text color="white" fontWeight="bold">{selectedToken.symbol}</Text>
                                </Box>
                                <Box>
                                    <Text color="#888">${formatPrice(selectedToken.price)}</Text>
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
                                                    {spotPrice > 0 ? commifyDecimals(spotPrice, 8) : commifyDecimals(selectedToken.price || 0, 8)}
                                                </Text>
                                            </Box>
                                        </HStack>
                                        <Box maxW="90%">
                                            <HStack spacing={2} flexWrap="wrap">
                                                <Box>
                                                    <Text color="#888" fontSize="xs">
                                                        {selectedToken.symbol}/{token1Symbol}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="xs">
                                                        (${commifyDecimals((spotPrice > 0 ? spotPrice : (selectedToken.price || 0)) * (priceUSD || 0), 2)})
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
                                    <Text color="#888" fontSize="sm" mb={2}>24h Volume</Text>
                                    <Box>
                                        <Text color="white" fontSize="xl" fontWeight="bold">
                                            ${formatNumber(selectedToken.volume24h)}
                                        </Text>
                                    </Box>
                                </Box>
                                
                                <Box bg="#1a1a1a" p={4} borderRadius="lg">
                                    <Text color="#888" fontSize="sm" mb={2}>Market Cap</Text>
                                    <Box>
                                        <Text color="white" fontSize="xl" fontWeight="bold">
                                            ${formatNumber(selectedToken.marketCap)}
                                        </Text>
                                    </Box>
                                </Box>
                                
                                <Box bg="#1a1a1a" p={4} borderRadius="lg">
                                    <Text color="#888" fontSize="sm" mb={2}>Liquidity</Text>
                                    <Box>
                                        <Text color="white" fontSize="xl" fontWeight="bold">
                                            ${formatNumber(selectedToken.liquidity)}
                                        </Text>
                                    </Box>
                                </Box>
                            </SimpleGrid>
                            
                            {/* Chart */}
                            <Box bg="#1a1a1a" p={isMobile ? 2 : 4} borderRadius="lg" w="100%" h={isMobile ? "350px" : "450px"}>
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
                                                            // Set default granularity based on timeframe
                                                            if (tf === '15m') setChartGranularity('5m');
                                                            else if (tf === '1h') setChartGranularity('15m');
                                                            else if (tf === '24h') setChartGranularity('1h');
                                                            else if (tf === '1w') setChartGranularity('6h');
                                                            else if (tf === '1M') setChartGranularity('24h');
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
                                    <Box h="calc(100% - 60px)" minH="300px">
                                        <ReactApexChart
                                            options={chartOptions}
                                            series={chartSeries}
                                            type="candlestick"
                                            height="100%"
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
                                    <Tabs.List mb={4}>
                                        <Tabs.Trigger 
                                            value="all" 
                                            flex={1}
                                            _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                            color="#888"
                                            fontWeight="600"
                                        >
                                            All Transactions
                                        </Tabs.Trigger>
                                        <Tabs.Trigger 
                                            value="my" 
                                            flex={1}
                                            _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                            color="#888"
                                            fontWeight="600"
                                        >
                                            My Transactions
                                        </Tabs.Trigger>
                                    </Tabs.List>
                                    
                                    <Tabs.Content value="all">
                                        <VStack gap={2} align="stretch">
                                                {getPaginatedData(tradeHistory, currentPage, itemsPerPage).map((trade) => (
                                                    <Flex
                                                        key={trade.id}
                                                        p={2}
                                                        bg="#2a2a2a"
                                                        borderRadius="md"
                                                        cursor="pointer"
                                                        _hover={{ bg: "#333" }}
                                                        alignItems="center"
                                                        gap={isMobile ? 2 : 4}
                                                        flexWrap={isMobile ? "wrap" : "nowrap"}
                                                    >
                                                        <Box>
                                                            <Badge
                                                                colorPalette={trade.type === "buy" ? "green" : "red"}
                                                                size="sm"
                                                                minW="45px"
                                                                textAlign="center"
                                                            >
                                                                {trade.type.toUpperCase()}
                                                            </Badge>
                                                        </Box>
                                                        
                                                        <HStack flex="1" gap={4}>
                                                            <Box>
                                                                <Text color="white" fontWeight="bold" minW="60px">
                                                                    {trade.token}
                                                                </Text>
                                                            </Box>
                                                            <Box>
                                                                <Text color="#888" fontSize="sm">
                                                                    {trade.amount.toLocaleString()} @ ${formatPrice(trade.price)}
                                                                </Text>
                                                            </Box>
                                                        </HStack>
                                                        
                                                        <Box>
                                                            <Text color="white" fontWeight="bold" minW="80px" textAlign="right">
                                                                ${trade.total.toFixed(2)}
                                                            </Text>
                                                        </Box>
                                                        
                                                        <Box>
                                                            <Text 
                                                                color="#4ade80" 
                                                                fontSize="xs"
                                                                cursor="pointer"
                                                                _hover={{ textDecoration: "underline" }}
                                                                onClick={() => window.open(`https://monadexplorer.com/tx/${trade.txHash}`, "_blank")}
                                                                minW="100px"
                                                                textAlign="right"
                                                            >
                                                                {trade.txHash}
                                                            </Text>
                                                        </Box>
                                                        
                                                        <Box>
                                                            <Text color="#888" fontSize="xs" minW="60px" textAlign="right">
                                                                {Math.floor((Date.now() - trade.time.getTime()) / 60000)}m ago
                                                            </Text>
                                                        </Box>
                                                    </Flex>
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
                                                                    <Flex
                                                                        key={trade.id}
                                                                        p={2}
                                                                        bg="#2a2a2a"
                                                                        borderRadius="md"
                                                                        cursor="pointer"
                                                                        _hover={{ bg: "#333" }}
                                                                        alignItems="center"
                                                                        gap={4}
                                                                    >
                                                            <Box>
                                                                <Badge
                                                                    colorPalette={trade.type === "buy" ? "green" : "red"}
                                                                    size="sm"
                                                                    minW="45px"
                                                                    textAlign="center"
                                                                >
                                                                    {trade.type.toUpperCase()}
                                                                </Badge>
                                                            </Box>
                                                            
                                                            <HStack flex="1" gap={4}>
                                                                <Box>
                                                                    <Text color="white" fontWeight="bold" minW="60px">
                                                                        {trade.token}
                                                                    </Text>
                                                                </Box>
                                                                <Box>
                                                                    <Text color="#888" fontSize="sm">
                                                                        {trade.amount.toLocaleString()} @ ${formatPrice(trade.price)}
                                                                    </Text>
                                                                </Box>
                                                            </HStack>
                                                            
                                                            <Box>
                                                                <Text color="white" fontWeight="bold" minW="80px" textAlign="right">
                                                                    ${trade.total.toFixed(2)}
                                                                </Text>
                                                            </Box>
                                                            
                                                            <Box>
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
                                                                    minW="100px"
                                                                    textAlign="right"
                                                                >
                                                                    {trade.txHash}
                                                                </Text>
                                                            </Box>
                                                            
                                                            <Box>
                                                                <Text color="#888" fontSize="xs" minW="60px" textAlign="right">
                                                                    {Math.floor((Date.now() - trade.time.getTime()) / 60000)}m ago
                                                                </Text>
                                                            </Box>
                                                        </Flex>
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
                        </VStack>
                    ) : (
                        <Box
                            bg="#1a1a1a"
                            h="600px"
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
                    <Box w="300px">
                        <VStack gap={4}>
                        {/* Wallet Balance Box */}
                        <WalletSidebar 
                            ethBalance={BigInt(Math.floor(parseFloat(ethBalance) * 1e18))}
                            token1Info={{
                                tokenSymbol: "WMON",
                                balance: BigInt(Math.floor(parseFloat(wethBalance) * 1e18))
                            }}
                            selectedToken={selectedToken?.symbol}
                            selectedTokenBalance={BigInt(Math.floor(parseFloat(tokenBalance) * 1e18))}
                            address={address}
                            deposit={deposit}
                            withdraw={withdraw}
                            isWrapping={isWrapping}
                            isUnwrapping={isUnwrapping}
                            setIsWrapping={setIsWrapping}
                            setIsUnwrapping={setIsUnwrapping}
                            wrapAmount={wrapAmount}
                            setWrapAmount={setWrapAmount}
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
                            <Flex justifyContent="space-between">
                                <Box>
                                    <Text color="#888" fontSize="sm">Network Fee</Text>
                                </Box>
                                <Box>
                                    <Text color="white" fontSize="sm">~$0.12</Text>
                                </Box>
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
                                    <Flex justifyContent="space-between">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Network Fee</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm">~$0.12</Text>
                                        </Box>
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
                                    Wallet Balance
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
                                                            src={placeholderLogo}
                                                            alt={selectedToken.symbol}
                                                            w="20px"
                                                            h="20px"
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
                                                ≈ ${address && selectedToken ? (parseFloat(tokenBalance) * selectedToken.price).toFixed(2) : "0.00"}
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
                                    <Tabs.List mb={4}>
                                        <Tabs.Trigger 
                                            value="all" 
                                            flex={1}
                                            _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                            color="#888"
                                            fontWeight="600"
                                        >
                                            All Transactions
                                        </Tabs.Trigger>
                                        <Tabs.Trigger 
                                            value="my" 
                                            flex={1}
                                            _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                            color="#888"
                                            fontWeight="600"
                                        >
                                            My Transactions
                                        </Tabs.Trigger>
                                    </Tabs.List>
                                    
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
                                                                    ${trade.total.toFixed(2)}
                                                                </Text>
                                                            </Box>
                                                        </Flex>
                                                        
                                                        {/* Second Row: Trade details and time */}
                                                        <Flex justifyContent="space-between" alignItems="center">
                                                            <Box>
                                                                <Text color="#888" fontSize="xs">
                                                                    {trade.amount.toLocaleString()} @ ${formatPrice(trade.price)}
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
                                                                            window.open(`https://monadexplorer.com/tx/${trade.txHash}`, "_blank");
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
                                                                                    ${trade.total.toFixed(2)}
                                                                                </Text>
                                                                            </Box>
                                                                        </Flex>
                                                                        
                                                                        {/* Second Row: Trade details and time */}
                                                                        <Flex justifyContent="space-between" alignItems="center">
                                                                            <Box>
                                                                                <Text color="#888" fontSize="xs">
                                                                                    {trade.amount.toLocaleString()} @ ${formatPrice(trade.price)}
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
                                                                                            window.open(`https://monadexplorer.com/tx/${trade.txHash}`, "_blank");
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
        </Container>
    );
};

export default Launchpad;
 