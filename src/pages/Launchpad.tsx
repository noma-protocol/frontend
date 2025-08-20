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
  
import { useAccount, useBalance, useContractWrite, useContractRead } from "wagmi";
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

import { unCommify, commify, generateBytes32String, getContractAddress } from "../utils";
import Logo from "../assets/images/noma_logo_transparent.png";
import { ethers } from "ethers"; // Import ethers.js
import { formatEther, parseEther } from "viem";
const { utils, providers } = ethers;

import { ProgressLabel, ProgressBar, ProgressRoot, ProgressValueText } from "../components/ui/progress"
import PresaleDetails from "../components/PresaleDetails";
import usePresaleContract from '../hooks/usePresaleContract';
import { set } from "react-ga";
import placeholderLogo from "../assets/images/question.svg";
import wethLogo from "../assets/images/weth.svg";
import monadLogo from "../assets/images/monad.png";
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

const feeTier = 3000;

import ReactApexChart from 'react-apexcharts'; 

// Contract ABIs
const ERC20Abi = [
    "function totalSupply() view returns (uint)",
    "function balanceOf(address) view returns (uint)",
    "function decimals() view returns (uint)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

const IWETHAbi = [
    "function deposit() payable external",
    "function withdraw(uint256) external",
    "function balanceOf(address) view returns (uint)"
];

// Provider setup
const localProvider = new providers.JsonRpcProvider(
    config.chain == "local" ? "http://localhost:8545" : config.RPC_URL
);

const Launchpad: React.FC = () => {
    const { address, isConnected } = useAccount();
    const [selectedToken, setSelectedToken] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [tradeAmount, setTradeAmount] = useState("");
    const [isBuying, setIsBuying] = useState(true);
    const [tradeHistoryTab, setTradeHistoryTab] = useState("all");
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
    
    // Token data from blockchain
    const [tokens, setTokens] = useState([]);
    const [isTokensLoading, setIsTokensLoading] = useState(true);
    const [vaultDescriptions, setVaultDescriptions] = useState([]);
    
    // Trade history data
    const [tradeHistory] = useState([
        { id: 1, type: "buy", token: "CLOWN", amount: 50000, price: 0.0000186, total: 0.93, time: new Date(Date.now() - 60000), txHash: "0x1234...5678" },
        { id: 2, type: "sell", token: "DOGE", amount: 100, price: 0.08523, total: 8.523, time: new Date(Date.now() - 180000), txHash: "0x2345...6789" },
        { id: 3, type: "buy", token: "PEPE", amount: 1000000, price: 0.0000012, total: 1.2, time: new Date(Date.now() - 300000), txHash: "0x3456...7890" },
        { id: 4, type: "buy", token: "CLOWN", amount: 25000, price: 0.0000182, total: 0.455, time: new Date(Date.now() - 600000), txHash: "0x4567...8901" },
        { id: 5, type: "sell", token: "SHIB", amount: 10000, price: 0.0000089, total: 0.089, time: new Date(Date.now() - 900000), txHash: "0x5678...9012" },
    ]);
    
    // Mock data for price chart
    const mockPoolAddress = "0x1234567890123456789012345678901234567890";
    const mockIMV = "1000000000000000000"; // 1 ETH in wei
    const mockPriceUSD = "3500";
    
    const [percentChange, setPercentChange] = useState(0);
    const [chartSeries, setChartSeries] = useState([]);
    const [chartTimeframe, setChartTimeframe] = useState("24h");
    const [chartGranularity, setChartGranularity] = useState("1h");
    const [isChartLoading, setIsChartLoading] = useState(false);
    
    // Chart options with professional styling
    const [chartOptions] = useState({
        chart: {
            type: 'candlestick',
            background: 'transparent',
            toolbar: {
                show: true,
                tools: {
                    download: false,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: false,
                    reset: true
                },
                autoSelected: 'zoom'
            },
            zoom: {
                enabled: true,
                type: 'x',
                autoScaleYaxis: true
            },
            animations: {
                enabled: true,
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                }
            }
        },
        grid: {
            borderColor: '#1a1a1a',
            strokeDashArray: 4,
            xaxis: {
                lines: {
                    show: true
                }
            },
            yaxis: {
                lines: {
                    show: true
                }
            },
            padding: {
                top: 10,
                right: 20,
                bottom: 10,
                left: 10
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                style: {
                    colors: '#666',
                    fontSize: '11px',
                    fontFamily: 'inherit'
                },
                datetimeFormatter: {
                    hour: 'HH:mm'
                }
            },
            axisBorder: {
                show: true,
                color: '#1a1a1a'
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
                    colors: '#666',
                    fontSize: '11px',
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
                    upward: '#4ade80',
                    downward: '#ef4444'
                },
                wick: {
                    useFillColor: true
                }
            }
        },
        tooltip: {
            enabled: true,
            theme: 'dark',
            style: {
                fontSize: '12px',
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
                        return val.toFixed(2);
                    };
                    
                    return '<div class="apexcharts-tooltip-candlestick" style="padding: 8px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 4px;">' +
                        '<div style="color: #888; font-size: 11px; margin-bottom: 4px;">OHLC</div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span style="color: #666;">Open:</span> <span style="color: #fff; margin-left: 16px;">' + formatValue(o) + '</span></div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span style="color: #666;">High:</span> <span style="color: #fff; margin-left: 16px;">' + formatValue(h) + '</span></div>' +
                        '<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span style="color: #666;">Low:</span> <span style="color: #fff; margin-left: 16px;">' + formatValue(l) + '</span></div>' +
                        '<div style="display: flex; justify-content: space-between;"><span style="color: #666;">Close:</span> <span style="color: #fff; margin-left: 16px;">' + formatValue(c) + '</span></div>' +
                    '</div>';
                } catch (e) {
                    return '';
                }
            }
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
            return;
        }
        
        setIsChartLoading(true);
        
        // Fetch data from API
        const loadChartData = async () => {
            const ohlcData = await fetchOHLCData(chartTimeframe, chartGranularity);
            
            // Validate data before setting
            if (ohlcData && ohlcData.length > 0) {
                setChartSeries([{
                    name: `${selectedToken.symbol}/ETH`,
                    data: ohlcData
                }]);
                
                // Calculate percentage change
                const firstPrice = ohlcData[0].y[0];
                const lastPrice = ohlcData[ohlcData.length - 1].y[3];
                if (isFinite(firstPrice) && isFinite(lastPrice) && firstPrice > 0) {
                    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
                    setPercentChange(isFinite(change) ? change : 0);
                } else {
                    setPercentChange(0);
                }
            } else {
                setChartSeries([{
                    name: `${selectedToken.symbol}/ETH`,
                    data: []
                }]);
                setPercentChange(0);
            }
            
            setIsChartLoading(false);
        };
        
        loadChartData();
        
        // Refresh data every 30 seconds
        const interval = setInterval(loadChartData, 30000);
        
        return () => clearInterval(interval);
    }, [selectedToken, chartTimeframe, chartGranularity]);

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
    
    const WETH_ADDRESS = config.chain === "local" ? 
        "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" : 
        "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    
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
                    price: 0.0000186 + Math.random() * 0.001, // Mock price for now
                    change24h: (Math.random() - 0.5) * 20, // Mock 24h change
                    volume24h: Math.floor(Math.random() * 1000000),
                    marketCap: Math.floor(Math.random() * 10000000),
                    liquidity: Math.floor(Math.random() * 1000000),
                    fdv: Math.floor(Math.random() * 10000000),
                    holders: Math.floor(Math.random() * 10000),
                    token0: vault.token0,
                    token1: vault.token1,
                    vault: vault.vault,
                    poolAddress: vault.poolAddress
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
            console.log(`Setting soft cap to ${parseEther(`${targetValue}`)}`);
            setSoftCap(targetValue);
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
            if (!address || !selectedToken) return;
            
            try {
                // Fetch ETH balance
                const ethBal = await localProvider.getBalance(address);
                setEthBalance(formatEther(ethBal));
                
                // Fetch WETH balance
                const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20Abi, localProvider);
                const wethBal = await wethContract.balanceOf(address);
                setWethBalance(formatEther(wethBal));
                
                // Fetch selected token balance if available
                if (selectedToken && selectedToken.token0) {
                    const tokenContract = new ethers.Contract(selectedToken.token0, ERC20Abi, localProvider);
                    const tokenBal = await tokenContract.balanceOf(address);
                    setTokenBalance(formatEther(tokenBal));
                }
            } catch (error) {
                console.error("Error fetching balances:", error);
            }
        };
        
        fetchBalances();
        const interval = setInterval(fetchBalances, 5000); // Refresh every 5 seconds
        
        return () => clearInterval(interval);
    }, [address, selectedToken]);
    
    // Calculate quote and price impact
    useEffect(() => {
        if (!tradeAmount || !selectedToken || parseFloat(tradeAmount) === 0) {
            setQuote("");
            setPriceImpact("0");
            return;
        }
        
        // Mock quote calculation (replace with real DEX quote)
        const amount = parseFloat(tradeAmount);
        if (isBuying) {
            const estimatedTokens = amount / selectedToken.price;
            setQuote(estimatedTokens.toFixed(2));
            setPriceImpact((amount * 0.003).toFixed(2)); // Mock 0.3% impact
        } else {
            const estimatedETH = amount * selectedToken.price;
            setQuote(estimatedETH.toFixed(6));
            setPriceImpact((amount * 0.002).toFixed(2)); // Mock 0.2% impact
        }
    }, [tradeAmount, selectedToken, isBuying]);
    
    const handleBuy = async () => {
        if (isLoading || !selectedToken || !tradeAmount) return;
        
        setIsLoading(true);
        try {
            // Mock buy logic - in real implementation, this would call the exchange contract
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction
            
            toaster.create({
                title: "Trade Executed",
                description: `Bought ${quote} ${selectedToken.symbol} for ${tradeAmount} ${useWeth ? 'WETH' : 'ETH'}`,
                status: "success"
            });
            
            setTradeAmount("");
            setQuote("");
        } catch (error) {
            toaster.create({
                title: "Trade Failed",
                description: error.message || "Transaction failed",
                status: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSell = async () => {
        if (isLoading || !selectedToken || !tradeAmount) return;
        
        setIsLoading(true);
        try {
            // Mock sell logic - in real implementation, this would call the exchange contract
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate transaction
            
            toaster.create({
                title: "Trade Executed",
                description: `Sold ${tradeAmount} ${selectedToken.symbol} for ${quote} ${useWeth ? 'WETH' : 'ETH'}`,
                status: "success"
            });
            
            setTradeAmount("");
            setQuote("");
        } catch (error) {
            toaster.create({
                title: "Trade Failed",
                description: error.message || "Transaction failed",
                status: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <Container maxW="100%" p={0} bg="#0a0a0a"> 
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
            ) : (
            <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4} minH="calc(100vh - 80px)">
                {/* Left side - Token List */}
                <Box 
                    flex={isMobile ? "1" : "0 0 350px"} 
                    maxW={isMobile ? "100%" : "350px"} 
                    w={isMobile ? "100%" : "350px"}
                    display={isMobile && isTokenListCollapsed ? "none" : "block"}
                >
                    <Box bg="#1a1a1a" borderRadius="lg" pr={3} pl={0} py={3} overflowX="hidden">
                        <Flex alignItems="center" mb={3} pl={3}>
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
                        
                        <Box overflowY="auto" overflowX="hidden" maxH={isMobile ? "300px" : "calc(100vh - 180px)"} mx={isMobile ? -2 : 0}>
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
                                            <Spinner size="sm" color="#4ade80" thickness="2px" />
                                            <Text color="#4ade80" fontSize="xs">Fetching tokens from blockchain...</Text>
                                        </HStack>
                                    </Center>
                                </VStack>
                            ) : tokens.length === 0 ? (
                                <Center py={10}>
                                    <Text color="#666" fontSize="sm">No tokens found</Text>
                                </Center>
                            ) : (
                            <Table.Root size="sm" variant="unstyled">
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
                                            _hover={{ bg: "#2a2a2a" }}
                                            onClick={() => {
                                                setSelectedToken(token);
                                                if (isMobile) {
                                                    setIsTokenListCollapsed(true);
                                                }
                                            }}
                                            bg={selectedToken?.id === token.id ? "#2a2a2a" : "transparent"}
                                            transition="background 0.2s"
                                        >
                                            <Table.Cell py={isMobile ? 1 : 2} pl={isMobile ? 2 : 0} pr={isMobile ? 1 : 3}>
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
                                            <Table.Cell py={isMobile ? 1 : 2} px={isMobile ? 1 : 2} textAlign="right" verticalAlign="middle">
                                                <Text color="white" fontSize="xs" whiteSpace="nowrap">
                                                    ${formatPrice(token.price)}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell py={isMobile ? 1 : 2} px={isMobile ? 1 : 2} textAlign="right" verticalAlign="middle">
                                                <Text 
                                                    color={token.change24h > 0 ? "#4ade80" : "#ef4444"} 
                                                    fontSize="xs" 
                                                    whiteSpace="nowrap"
                                                >
                                                    {token.change24h > 0 ? "+" : ""}{token.change24h.toFixed(2)}%
                                                </Text>
                                            </Table.Cell>
                                            {!isMobile && (
                                                <Table.Cell py={2} px={2} textAlign="right" verticalAlign="middle">
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
                                    <HStack alignItems="baseline" gap={isMobile ? 2 : 3}>
                                        <Box>
                                            <Text color="white" fontSize={isMobile ? "md" : "xl"} fontWeight="bold">
                                                ${formatPrice(selectedToken.price)}
                                            </Text>
                                        </Box>
                                        <Box>
                                            <HStack gap={1}>
                                                <Box>
                                                    {percentChange > 0 ? (
                                                        <FaArrowTrendUp color="#4ade80" size={isMobile ? "10" : "14"} />
                                                    ) : (
                                                        <FaArrowTrendDown color="#ef4444" size={isMobile ? "10" : "14"} />
                                                    )}
                                                </Box>
                                                <Box>
                                                    <Text color={percentChange > 0 ? "#4ade80" : "#ef4444"} fontSize={isMobile ? "xs" : "sm"} fontWeight="600">
                                                        {percentChange > 0 ? "+" : ""}{percentChange.toFixed(2)}%
                                                    </Text>
                                                </Box>
                                            </HStack>
                                        </Box>
                                    </HStack>
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
                                        <HStack spacing={4}>
                                            <Box>
                                                <Text color="white" fontSize="lg" fontWeight="bold">
                                                    {selectedToken.symbol}/ETH
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
                                                        bg={chartTimeframe === tf ? "#4ade80" : "transparent"}
                                                        color={chartTimeframe === tf ? "black" : "#888"}
                                                        _hover={{ bg: chartTimeframe === tf ? "#4ade80" : "#2a2a2a" }}
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
                                                {tradeHistory.map((trade) => (
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
                                    </Tabs.Content>
                                    
                                    <Tabs.Content value="my">
                                        {address ? (
                                                <VStack gap={2} align="stretch">
                                                    {tradeHistory.filter((_, index) => index % 2 === 0).map((trade) => (
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
                    
                    {/* Trading Panel */}
                    <Box bg="#1a1a1a" borderRadius="lg" p={4} w="100%">
                        <Text color="white" fontSize="lg" fontWeight="bold" mb={4}>
                            Trade {selectedToken?.symbol || "Token"}
                        </Text>
                        
                        <Flex mb={4}>
                            <Button
                                flex={1}
                                bg={isBuying ? "#4ade80" : "transparent"}
                                color={isBuying ? "black" : "white"}
                                onClick={() => setIsBuying(true)}
                                borderRadius="md"
                                border="1px solid #2a2a2a"
                            >
                                Buy
                            </Button>
                            <Button
                                flex={1}
                                ml={2}
                                bg={!isBuying ? "#ef4444" : "transparent"}
                                color={!isBuying ? "white" : "white"}
                                onClick={() => setIsBuying(false)}
                                borderRadius="md"
                                border="1px solid #2a2a2a"
                            >
                                Sell
                            </Button>
                        </Flex>
                        
                        <Box mb={4}>
                            <Flex justifyContent="space-between" alignItems="center" mb={2}>
                                <Text color="#888" fontSize="sm">Amount</Text>
                                <HStack gap={2}>
                                    <Checkbox 
                                        size="sm" 
                                        checked={useWeth}
                                        onCheckedChange={(e) => setUseWeth(e.checked)}
                                    >
                                        <Text fontSize="xs" color="#888">Use WETH</Text>
                                    </Checkbox>
                                </HStack>
                            </Flex>
                            <Input
                                placeholder="0.00"
                                value={tradeAmount}
                                onChange={(e) => setTradeAmount(e.target.value)}
                                bg="#2a2a2a"
                                border="none"
                                size="lg"
                                _placeholder={{ color: "#666" }}
                            />
                            {quote && (
                                <Text color="#666" fontSize="xs" mt={1}>
                                    You will {isBuying ? "receive" : "pay"} ≈ {quote} {isBuying ? selectedToken?.symbol : (useWeth ? "WETH" : "ETH")}
                                </Text>
                            )}
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
                                        {quote || "0"} {isBuying ? selectedToken?.symbol : (useWeth ? "WETH" : "ETH")}
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
                            bg={isBuying ? "#4ade80" : "#ef4444"}
                            color={isBuying ? "black" : "white"}
                            fontSize="lg"
                            fontWeight="bold"
                            onClick={isBuying ? handleBuy : handleSell}
                            isDisabled={!selectedToken || !tradeAmount || isLoading}
                            isLoading={isLoading}
                            _hover={{
                                bg: isBuying ? "#22c55e" : "#dc2626"
                            }}
                        >
                            {isBuying ? "Buy" : "Sell"} {selectedToken?.symbol || ""}
                        </Button>
                    </Box>
                    </VStack>
                    </Box>
                ) : (
                    /* Mobile Layout - Reordered */
                    <>
                        {/* Trade Box First on Mobile */}
                        <Box w="100%">
                            <Box bg="#1a1a1a" borderRadius="lg" p={4} w="100%">
                                <Text color="white" fontSize="lg" fontWeight="bold" mb={4}>
                                    Trade {selectedToken?.symbol || "Token"}
                                </Text>
                                
                                <Flex mb={4}>
                                    <Button
                                        flex={1}
                                        bg={isBuying ? "#4ade80" : "transparent"}
                                        color={isBuying ? "black" : "white"}
                                        onClick={() => setIsBuying(true)}
                                        borderRadius="md"
                                        border="1px solid #2a2a2a"
                                    >
                                        Buy
                                    </Button>
                                    <Button
                                        flex={1}
                                        ml={2}
                                        bg={!isBuying ? "#ef4444" : "transparent"}
                                        color={!isBuying ? "white" : "white"}
                                        onClick={() => setIsBuying(false)}
                                        borderRadius="md"
                                        border="1px solid #2a2a2a"
                                    >
                                        Sell
                                    </Button>
                                </Flex>
                                
                                <Box mb={4}>
                                    <Flex justifyContent="space-between" alignItems="center" mb={2}>
                                        <Text color="#888" fontSize="sm">Amount</Text>
                                        <HStack gap={2}>
                                            <Checkbox 
                                                size="sm" 
                                                checked={useWeth}
                                                onCheckedChange={(e) => setUseWeth(e.checked)}
                                            >
                                                <Text fontSize="xs" color="#888">Use WETH</Text>
                                            </Checkbox>
                                        </HStack>
                                    </Flex>
                                    <Input
                                        placeholder="0.00"
                                        value={tradeAmount}
                                        onChange={(e) => setTradeAmount(e.target.value)}
                                        bg="#2a2a2a"
                                        border="none"
                                        size="lg"
                                        _placeholder={{ color: "#666" }}
                                    />
                                    {quote && (
                                        <Text color="#666" fontSize="xs" mt={1}>
                                            You will {isBuying ? "receive" : "pay"} ≈ {quote} {isBuying ? selectedToken?.symbol : (useWeth ? "WETH" : "ETH")}
                                        </Text>
                                    )}
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
                                                {quote || "0"} {isBuying ? selectedToken?.symbol : (useWeth ? "WETH" : "ETH")}
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
                                    bg={isBuying ? "#4ade80" : "#ef4444"}
                                    color={isBuying ? "black" : "white"}
                                    fontSize="lg"
                                    fontWeight="bold"
                                    onClick={isBuying ? handleBuy : handleSell}
                                    isDisabled={!selectedToken || !tradeAmount || isLoading}
                                    isLoading={isLoading}
                                    _hover={{
                                        bg: isBuying ? "#22c55e" : "#dc2626"
                                    }}
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
                                                {tradeHistory.map((trade) => (
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
                                            </VStack>
                                    </Tabs.Content>
                                    
                                    <Tabs.Content value="my">
                                        {address ? (
                                                <VStack gap={2} align="stretch">
                                                    {tradeHistory.filter((_, index) => index % 2 === 0).map((trade) => (
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
 