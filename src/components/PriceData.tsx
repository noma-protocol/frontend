import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import { Box, HStack, Text, Spinner, VStack, createListCollection } from "@chakra-ui/react";
import { css, Global } from "@emotion/react";
import { ethers } from "ethers";
import { isMobile } from "react-device-detect";
import { isWithinPercentageDifference } from "../utils";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "./ui/select";
const { formatEther } = ethers.utils;

// Set default font size for all ApexCharts
if (typeof window !== "undefined") {
  window.ApexCharts?.exec?.(
    "all",
    "updateOptions",
    {
      chart: {
        fontSize: 8,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }
    },
    false,
    true
  );
}

type UniswapPriceChartProps = {
  poolAddress: string;
  providerUrl: string;
  token0Symbol: string;
  token1Symbol: string;
  imv: string;
  priceUSD: string;
  interval?: string; // Optional interval parameter
};

// OHLC data type from API
type OHLCData = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// Add onPercentChange callback to props
interface ExtendedPriceChartProps extends UniswapPriceChartProps {
  setPercentChange?: (percent: number) => void; // Optional callback to set percent change
  onPercentChange?: (percent: number) => void;
  isTokenInfoLoading?: boolean; // Optional loading state for token info
}

const PriceData: React.FC<ExtendedPriceChartProps> = ({
  poolAddress,
  providerUrl,
  token0Symbol,
  token1Symbol,
  isTokenInfoLoading,
  imv,
  priceUSD,
  interval = "1M", // Default to 1M interval
  setPercentChange = () => {}, // Default no-op function
  onPercentChange,
}) => {
  const [series, setSeries] = useState([{
    name: `Price ${token0Symbol}/${token1Symbol}`,
    data: []
  }]);
  const [spotPrice, setSpotPrice] = useState<number | null>(null);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<string>(interval || "1M");
  // Set appropriate default granularity based on timeframe
  const getDefaultGranularity = (timeframe: string) => {
    switch (timeframe) {
      case "15m": return "5m";
      case "1h": return "30m";
      case "24h": return "1h";
      case "1w": return "24h";
      case "1M": return "24h";
      default: return "24h";
    }
  };
  
  const [selectedGranularity, setSelectedGranularity] = useState<string>(() => {
    const defaultGran = getDefaultGranularity(interval || "1M");
    console.log(`[Debug] Initial granularity for ${interval || "1M"}: ${defaultGran}`);
    return defaultGran;
  });
  const [apiError, setApiError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastPrice = useRef<number | null>(null);
  const lastRefreshTime = useRef<number | null>(null);
  const API_BASE_URL = "https://pricefeed.noma.money"; //"https://prices.oikos.cash"; // API base URL

  // Helper function to convert interval string to milliseconds
  const getIntervalMs = (interval: string): number => {
    switch (interval) {
      case "1m": return 60 * 1000;
      case "5m": return 5 * 60 * 1000;
      case "15m": return 15 * 60 * 1000;
      case "30m": return 30 * 60 * 1000;
      case "1h": return 60 * 60 * 1000;
      case "6h": return 6 * 60 * 60 * 1000;
      case "12h": return 12 * 60 * 60 * 1000;
      case "24h": return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default 1h
    }
  };

  // Fetch latest price
  const fetchLatestPrice = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/price/latest`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract price from different possible API response formats
      let priceValue;

      if (typeof data.latest !== 'undefined') {
        // New format with 'latest' property
        priceValue = data.latest;
      } else if (typeof data.price !== 'undefined') {
        // Direct price property
        priceValue = data.price;
      } else if (data.ohlc && data.ohlc.length > 0) {
        // OHLC format - use the close price of the most recent candle
        const lastCandle = data.ohlc[data.ohlc.length - 1];
        priceValue = lastCandle.close;
      } else {
        console.error("Invalid price data format:", data);
        return null;
      }

      // Ensure we return a number
      try {
        return typeof priceValue === 'number' ? priceValue : parseFloat(priceValue);
      } catch (err) {
        console.error("Error parsing price value:", err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching latest price:", error);
      return null;
    }
  };

  // Calculate timestamp range and interval based on timeframe and granularity
  const getTimeParams = (timeframe: string, granularity: string = selectedGranularity) => {
    const now = Date.now();
    let fromTimestamp: number;
    let interval: string;

    switch (timeframe) {
      case "15m":
        fromTimestamp = now - (15 * 60 * 1000); // 15 minutes ago
        interval = granularity; // Use selected granularity (1m, 5m, 15m)
        break;
      case "1h":
        fromTimestamp = now - (60 * 60 * 1000); // 1 hour ago
        interval = granularity; // Use selected granularity (5m, 15m, 30m)
        break;
      case "24h":
        fromTimestamp = now - (24 * 60 * 60 * 1000); // 24 hours ago
        interval = granularity; // Use selected granularity (30m, 1h, 6h, 12h)
        break;
      case "1w":
        fromTimestamp = now - (7 * 24 * 60 * 60 * 1000); // 1 week ago
        interval = granularity; // Use selected granularity (1h, 6h, 12h, 24h)
        break;
      case "1M":
        fromTimestamp = now - (30 * 24 * 60 * 60 * 1000); // 30 days ago
        interval = granularity; // Use selected granularity (6h, 12h, 24h)
        break;
      default:
        fromTimestamp = now - (24 * 60 * 60 * 1000); // Default to 24h
        interval = "1h";
    }

    return {
      from_timestamp: fromTimestamp, // Keep in milliseconds
      to_timestamp: now, // Keep in milliseconds
      interval
    };
  };

  // Fetch OHLC data from API
  const fetchOHLCData = async (timeframe: string) => {
    try {
      const { from_timestamp, to_timestamp, interval } = getTimeParams(timeframe, selectedGranularity);
      
      // Build the API URL with query parameters
      const url = new URL(`${API_BASE_URL}/api/price/ohlc`);
      url.searchParams.append('from_timestamp', from_timestamp.toString());
      url.searchParams.append('to_timestamp', to_timestamp.toString());
      url.searchParams.append('interval', interval);
      
      console.log(`[Debug] Fetching OHLC data from: ${url.toString()}`);
      console.log(`[Debug] Time range: ${new Date(from_timestamp)} to ${new Date(to_timestamp)} (${((to_timestamp - from_timestamp) / (1000 * 60 * 60)).toFixed(1)} hours)`);
      console.log(`[Debug] Expected datapoints with ${interval} intervals: ~${Math.ceil((to_timestamp - from_timestamp) / getIntervalMs(interval))}`);
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseJson = await response.json();
      console.log(`[Debug] API Response:`, responseJson);

      // Check if we have OHLC data
      if (responseJson && responseJson.ohlc && Array.isArray(responseJson.ohlc)) {
        // Format the OHLC data for ApexCharts
        const ohlcData = responseJson.ohlc.map((candle: OHLCData) => ({
          x: new Date(candle.timestamp),
          y: [candle.open, candle.high, candle.low, candle.close]
        }));

        console.log(`[Debug] Formatted OHLC data (${ohlcData.length} candles):`, ohlcData.slice(0, 3));

        // Update last refresh time
        lastRefreshTime.current = Date.now();
        setIsLoading(false); // Data fetched successfully

        return ohlcData;
      } else {
        console.log("API response contains empty OHLC data - this is normal for test environment");
        setIsLoading(false); // Mark as loaded even if empty
        return [];
      }
    } catch (error) {
      console.error("Error fetching OHLC data:", error);
      setIsLoading(false); // Mark as loaded on error
      return [];
    }
  };

  // Calculate percentage change based on OHLC data and selected interval
  const calculatePercentChange = (ohlcData: any[], interval: string) => {
    // console.log(`[Debug] calculatePercentChange called with interval: ${interval}, data length: ${ohlcData?.length}`);
    
    if (!ohlcData || ohlcData.length < 1) {
      // console.log('[Debug] No data for percentage calculation');
      return 0;
    }
    
    if (ohlcData.length === 1) {
      // console.log('[Debug] Only one data point, cannot calculate percentage change');
      return 0;
    }

    const now = new Date().getTime();
    let targetTimeAgo: number;

    // Calculate how far back to look based on the interval
    switch (interval) {
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
        targetTimeAgo = 30 * 24 * 60 * 60 * 1000; // 1 month (30 days)
        break;
      default:
        // Fallback to first and last candle
        const firstPrice = ohlcData[0].y[3];
        const lastPrice = ohlcData[ohlcData.length - 1].y[3];
        return ((lastPrice - firstPrice) / firstPrice) * 100;
    }

    const targetTime = now - targetTimeAgo;
    // console.log(`[Debug] Looking for data ${targetTimeAgo / (60 * 60 * 1000)} hours ago (${new Date(targetTime)})`);

    // Find the candle closest to our target time (but not in the future)
    let startCandle = ohlcData[0]; // fallback to first candle
    let minTimeDiff = Infinity;

    // console.log(`[Debug] Looking for candle closest to: ${new Date(targetTime)}`);
    // console.log(`[Debug] Available candles:`);
    // ohlcData.forEach((candle, index) => {
    //   const candleTime = new Date(candle.x).getTime();
    //   const timeDiff = Math.abs(candleTime - targetTime);
    //   console.log(`  [${index}] ${new Date(candle.x)} - Price: ${candle.y[3]} - Diff: ${(timeDiff / (60*60*1000)).toFixed(1)}h`);
    // });

    // For 24h periods, prefer candles that are further back to capture actual daily change
    // For shorter periods, use closest candle
    for (const candle of ohlcData) {
      const candleTime = new Date(candle.x).getTime();
      const timeDiff = Math.abs(candleTime - targetTime);
      const hoursAway = timeDiff / (60 * 60 * 1000);
      
      // For 24h intervals, prefer the candle that's closest to actually being 24h ago
      // rather than just the closest candle
      if (interval === "24h") {
        // Look for a candle that's between 20-50 hours ago (closer to actual 24h)
        if (hoursAway >= 20 && hoursAway <= 50 && hoursAway < minTimeDiff / (60 * 60 * 1000)) {
          minTimeDiff = timeDiff;
          startCandle = candle;
        }
      } else if (interval === "1w") {
        // For 1 week, look for data that's 5+ days old (200+ hours) - closer to beginning
        if (hoursAway >= 200 && hoursAway > minTimeDiff / (60 * 60 * 1000)) {
          minTimeDiff = timeDiff;
          startCandle = candle;
        }
      } else if (interval === "1M") {
        // For 1 month, look for the oldest available data (furthest back)
        if (hoursAway > minTimeDiff / (60 * 60 * 1000)) {
          minTimeDiff = timeDiff;
          startCandle = candle;
        }
      } else {
        // For other intervals, use closest candle
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          startCandle = candle;
        }
      }
    }

    // Use the most recent candle as the end point
    const endCandle = ohlcData[ohlcData.length - 1];
    
    // If start and end candle are the same, use the previous candle as start
    if (startCandle === endCandle && ohlcData.length > 1) {
      // Find the candle before the end candle
      for (let i = ohlcData.length - 2; i >= 0; i--) {
        const candidateCandle = ohlcData[i];
        const candidateTime = new Date(candidateCandle.x).getTime();
        const timeDiff = Math.abs(candidateTime - targetTime);
        const hoursAway = timeDiff / (60 * 60 * 1000);
        
        if (interval === "24h" && hoursAway >= 20 && hoursAway <= 50) {
          startCandle = candidateCandle;
          break;
        } else if (interval === "1w" && hoursAway >= 200) { // 1 week = look for 200+ hours (5+ days)
          startCandle = candidateCandle;
          break;
        } else if (interval === "1M" && hoursAway >= 600) { // 1 month = ~720h, look for 600+ hours
          startCandle = candidateCandle;
          break;
        } else if (interval !== "24h" && interval !== "1M" && interval !== "1w") {
          startCandle = candidateCandle;
          break;
        }
      }
    }
    
    const startPrice = startCandle.y[3]; // close price
    const endPrice = endCandle.y[3]; // close price

    // Calculate percentage change using raw token prices
    const change = ((endPrice - startPrice) / startPrice) * 100;
    
    return change;
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const startFetching = async () => {
      // Fetch the initial OHLC data
      const ohlcData = await fetchOHLCData(selectedInterval);

      // Fetch the latest price
      const latestPrice = await fetchLatestPrice();

      // Always display OHLC data if available, regardless of latest price
      if (ohlcData.length > 0) {
        console.log(`[Debug] Setting series data with ${ohlcData.length} data points`);
        setSeries([{
          name: `${token0Symbol}/${token1Symbol}`,
          data: ohlcData
        }]);

        // Calculate and set percentage change
        const change = calculatePercentChange(ohlcData, selectedInterval);
        setPercentChange(change);

        // Notify parent component if callback provided
        if (onPercentChange) {
          onPercentChange(change);
        }
      } else {
        // Set empty data array when no history is available
        setSeries([{ name: `${token0Symbol}/${token1Symbol}`, data: [] }]);
        setPercentChange(0);

        // Notify parent with zero change
        if (onPercentChange) {
          onPercentChange(0);
        }
      }

      // Set spot price if latest price is available
      if (latestPrice !== null) {
        lastPrice.current = latestPrice;
        setSpotPrice(latestPrice);
      }

      // Set up polling for price updates
      pollInterval = setInterval(async () => {
        const now = Date.now();

        // Fetch the latest price
        const newPrice = await fetchLatestPrice();

        // Update the price if we got a valid value
        if (newPrice !== null) {
          // If price has changed, update it
          if (lastPrice.current !== newPrice) {
            lastPrice.current = newPrice;
            setSpotPrice(newPrice);
          }

          // Periodically refresh the complete dataset
          const refreshInterval = 30000; // 30 seconds
          const shouldRefreshAll = !lastRefreshTime.current || (now - lastRefreshTime.current > refreshInterval);

          if (shouldRefreshAll) {
            // console.log(`Refreshing OHLC data for ${selectedInterval} interval`);

            // Fetch OHLC data for the current interval
            const ohlcData = await fetchOHLCData(selectedInterval);

            if (ohlcData.length > 0) {
              setSeries([{
                name: `${token0Symbol}/${token1Symbol}`,
                data: ohlcData
              }]);

              // Recalculate percentage change with new data
              const change = calculatePercentChange(ohlcData, selectedInterval);
              setPercentChange(change);

              // Notify parent component if callback provided
              if (onPercentChange) {
                onPercentChange(change);
              }

              lastRefreshTime.current = now;
            }
          }
        }
      }, 5000); // Poll every 5 seconds
    };

    startFetching();
    return () => clearInterval(pollInterval);
  }, [poolAddress, providerUrl, token0Symbol, token1Symbol, selectedInterval, selectedGranularity]);

  // Compute the minimum y value from your series data
  const computedMinY = series[0].data.length > 0
    ? Math.min(...series[0].data.map((item: any) => item.y[2])) // Use the lowest 'low' value
    : 0;

  // Chart options for candlestick chart
  const chartOptions = {
    chart: {
      type: "candlestick",
      height: 350,
      animations: { enabled: true },
      toolbar: { show: false },
      background: "#222831",
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      defaultLocale: 'en',
      fontWeight: 400,
      fontSize: 8,
      offsetX: -2, // Shift chart to the left to center it
    },
    title: {
      text: ``,
      align: "left",
      style: {
        color: "#ffffff",
        fontSize: '8px',
      }
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: "#f8f8f8",
          fontSize: '6px', // Try smaller font size for better compatibility
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        datetimeUTC: false,
      },
      tickAmount: 6,
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        formatter: (val: number) => {
          // Format with appropriate precision and remove trailing zeros
          let formatted;
          if (val < 0.0001) {
            formatted = val.toFixed(6);
          } else if (val < 0.01) {
            formatted = val.toFixed(4);
          } else if (val < 1) {
            formatted = val.toFixed(3);
          } else {
            formatted = val.toFixed(2);
          }
          // Remove trailing zeros and unnecessary decimal point
          return parseFloat(formatted).toString();
        },
        offsetX: -10, // This will effectively move the labels left (negative X direction)
        style: {
          colors: "#f8f8f8",
          fontSize: '6px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }
      },
      tickAmount: 6,
      floating: false,
      forceNiceScale: true, // Enable nice scaling to avoid gaps
      decimalsInFloat: 4, // Reduce decimal places
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      shared: true,
      intersect: false,
      followCursor: true,
      hideDelay: 300, // Add delay before hiding tooltip
      showDelay: 0,   // No delay to show tooltip
      sticky: true,   // Make tooltip sticky
      fixed: {
        enabled: false
      },
      custom: function({seriesIndex, dataPointIndex, w}) {
        try {
          // Get the raw OHLC values
          const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
          const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
          const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
          const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];

          // Format values with a helper function to ensure exactly 8 decimal places
          const formatValue = (val) => {
            // Convert to a number first to handle any string inputs
            return Number(val).toLocaleString('en-US', {
              minimumFractionDigits: 8,
              maximumFractionDigits: 8
            });
          };

          // Format date/time
          const timestamp = w.globals.seriesX[seriesIndex][dataPointIndex];
          const date = new Date(timestamp);
          const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          const dateStr = date.toLocaleDateString([], {month: 'short', day: 'numeric'});

          return (
            '<div class="apexcharts-tooltip-candlestick" style="font-size: 14px; padding: 5px;">' +
            '<div style="text-align: center; font-weight: bold; margin-bottom: 5px;">' + dateStr + ' ' + timeStr + '</div>' +
            '<div>Open: <span style="float: right;">' + formatValue(o) + '</span></div>' +
            '<div>High: <span style="float: right;">' + formatValue(h) + '</span></div>' +
            '<div>Low: <span style="float: right;">' + formatValue(l) + '</span></div>' +
            '<div>Close: <span style="float: right;">' + formatValue(c) + '</span></div>' +
            '</div>'
          );
        } catch (e) {
          console.error("Error formatting tooltip:", e);
          return '<div class="apexcharts-tooltip-candlestick">Error displaying data</div>';
        }
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#4ade80",
          downward: "#ef4444"
        },
        wick: {
          useFillColor: true,
        }
      }
    },
    legend: {
      fontSize: '8px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      labels: {
        colors: "#f8f8f8",
        useSeriesColors: false
      },
      itemMargin: {
        horizontal: 5,
        vertical: 0
      },
    },
    grid: {
      borderColor: "#444",
      strokeDashArray: 3,
      padding: {
        right: 10, // Adjust right padding to center chart
      },
    },
    dataLabels: {
      enabled: false,
      style: {
        fontSize: '8px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        colors: ['#f8f8f8']
      }
    },
    annotations: {
      yaxis: spotPrice && imv
        ? [
            {
              y: spotPrice,
              borderColor: "#86efac",
              strokeDashArray: 4,
              label: {
                borderColor: "#86efac",
                style: {
                  color: "#fff",
                  background: "#86efac",
                  fontSize: '6px',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  cssClass: 'small-text-annotation',
                },
                text: ``, // `Spot Price: ${typeof spotPrice === 'number' ? spotPrice.toFixed(9) : '0.00'}`,
                offsetY: 25,
              },
            },
          ]
        : [],
    },
  };

  useEffect(() => {
    // Use predefined intervals
    setAvailableIntervals(predefinedIntervals);
  }, []);

  const handleIntervalChange = async (newInterval: string) => {
    // Only proceed if the interval is actually changing
    if (newInterval === selectedInterval) {
      return;
    }

    // Update the selected interval state
    setSelectedInterval(newInterval);
    // Set appropriate default granularity for the new timeframe
    const newGranularity = getDefaultGranularity(newInterval);
    console.log(`[Debug] Changing to ${newInterval} timeframe, setting granularity to: ${newGranularity}`);
    setSelectedGranularity(newGranularity);
    setIsLoading(true);

    // Fetch new OHLC data immediately when interval changes
    const ohlcData = await fetchOHLCData(newInterval);

    // Always update the series, even if empty
    setSeries([{
      name: `${token0Symbol}/${token1Symbol}`,
      data: ohlcData
    }]);

    // Calculate and set percentage change for new interval
    if (ohlcData.length > 0) {
      const change = calculatePercentChange(ohlcData, newInterval);
      setPercentChange(change);

      // Notify parent component if callback provided
      if (onPercentChange) {
        onPercentChange(change);
      }
    } else {
      // Set zero change if no data available
      setPercentChange(0);
      if (onPercentChange) {
        onPercentChange(0);
      }
    }

    // Update the last refresh time
    lastRefreshTime.current = Date.now();
  };

  const handleGranularityChange = async (newGranularity: string) => {
    // Only proceed if the granularity is actually changing
    if (newGranularity === selectedGranularity) {
      return;
    }

    // Update the selected granularity state
    setSelectedGranularity(newGranularity);
    setIsLoading(true);

    // Fetch new OHLC data immediately when granularity changes
    const ohlcData = await fetchOHLCData(selectedInterval);

    // Always update the series, even if empty
    setSeries([{
      name: `${token0Symbol}/${token1Symbol}`,
      data: ohlcData
    }]);

    // Calculate and set percentage change for new granularity
    if (ohlcData.length > 0) {
      const change = calculatePercentChange(ohlcData, selectedInterval);
      setPercentChange(change);

      // Notify parent component if callback provided
      if (onPercentChange) {
        onPercentChange(change);
      }
    } else {
      // Set zero change if no data available
      setPercentChange(0);
      if (onPercentChange) {
        onPercentChange(0);
      }
    }

    // Update the last refresh time
    lastRefreshTime.current = Date.now();
  };

  // Define predefined time intervals
  const predefinedIntervals = ["15m", "1h", "24h", "1w", "1M"];
  
  // Map intervals to display names
  const getIntervalDisplayName = (interval: string) => {
    switch (interval) {
      case "1M": return "1m";
      default: return interval;
    }
  };

  // Update error handlers
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        // Test with a simple 1h timeframe
        const { from_timestamp, to_timestamp, interval } = getTimeParams("1h", selectedGranularity);
        const url = new URL(`${API_BASE_URL}/api/price/ohlc`);
        url.searchParams.append('from_timestamp', from_timestamp.toString());
        url.searchParams.append('to_timestamp', to_timestamp.toString());
        url.searchParams.append('interval', interval);
        
        const response = await fetch(url.toString());
        setApiError(!response.ok);
      } catch (error) {
        console.error("API connection error:", error);
        setApiError(true);
      }
    };

    checkApiConnection();
    const connectionCheck = setInterval(checkApiConnection, 30000); // Check connection every 30 seconds

    return () => clearInterval(connectionCheck);
  }, []);

  // console.log(Number(formatEther(`${imv || 0}`)) * Number(priceUSD), "IMV in USD");
  return (
    <Box ml={isMobile ? -5 : 0} mt={isMobile ? 0 : "-55px"}>
      <Global styles={css`
        .apexcharts-text tspan,
        .apexcharts-label,
        .apexcharts-legend-text,
        .apexcharts-xaxis-label,
        .apexcharts-yaxis-label,
        .apexcharts-xaxis-title,
        .apexcharts-yaxis-title,
        .apexcharts-title,
        .small-text-annotation text,
        .apexcharts-xaxis text,
        .apexcharts-yaxis text {
          font-size: 12px !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important;
        }
        
        .apexcharts-tooltip {
          background-color: #222831 !important;
          border: 1px solid #444 !important;
          font-size: 16px !important;
        }
        
        .apexcharts-tooltip-title {
          background-color: #333 !important;
          border-bottom: 1px solid #444 !important;
          font-size: 16px !important;
        }
        
        .apexcharts-tooltip-y-group {
          padding: 4px 0 !important;
        }
        
        .apexcharts-tooltip-text {
          font-size: 16px !important;
        }
        
        .apexcharts-tooltip-text-y-value {
          font-size: 16px !important;
        }
        
        .apexcharts-tooltip-marker {
          width: 8px !important;
          height: 8px !important;
        }
        
        .apexcharts-tooltip-box {
          font-size: 16px !important;
        }
        
        .apexcharts-yaxis-label {
          transform: translateX(-10px);
        }
        
        /* This will truncate the long decimals in tooltip */
        .apexcharts-tooltip-text-y-value {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `} />
      {apiError ? (
        <Box h="30px" bg="red.800" p={2} borderRadius="md">
          <Text fontSize="sm" color="white">API connection error. Please check that the price API is running.</Text>
        </Box>
      ) : isLoading ? (
        <Box h="30px"><Text fontSize="sm" ml={isMobile ? 5 : 0}>Loading price data... </Text></Box>
      ) : series[0].data.length === 0 ? (
        <Box h="30px"><Text fontSize="sm" ml={isMobile ? 5 : 0}>No price data available for this timeframe</Text></Box>
      ) : (
        <>
        <VStack alignItems="left" mt={-5} >
          <Box mb={2} ml={isMobile ? 5 : 0}>
            <HStack>
              <Box w="80px"><Text fontSize="sm">Interval</Text></Box>
              <Box>
                {/* Granularity Selector - show different options based on timeframe */}
                {(selectedInterval === "15m" || selectedInterval === "1h" || selectedInterval === "24h" || selectedInterval === "1w" || selectedInterval === "1M") && (
                  <Box ml="auto">
                    <SelectRoot
                      ml={-2}
                      fontSize="xs"
                      key={`${selectedInterval}-${selectedGranularity}`}
                      collection={createListCollection({
                        items: selectedInterval === "15m" 
                          ? [
                              { label: "1m", value: " 1m" },
                              { label: "5m", value: " 5m" },
                              { label: "15m", value: " 15m" }
                            ]
                          : selectedInterval === "1h"
                          ? [
                              { label: "5m", value: " 5m" },
                              { label: "15m", value: " 15m" },
                              { label: "30m", value: " 30m" }
                            ]
                          : selectedInterval === "24h" 
                          ? [
                              { label: "30m", value: " 30m" },
                              { label: "1h", value: " 1h" },
                              { label: "6h", value: " 6h" },
                              { label: "12h", value: " 12h" }
                            ]
                          : selectedInterval === "1w"
                          ? [
                              { label: "1h", value: " 1h" },
                              { label: "6h", value: " 6h" },
                              { label: "12h", value: " 12h" },
                              { label: "24h", value: " 24h" }
                            ]
                          : [
                              { label: "6h", value: " 6h" },
                              { label: "12h", value: " 12h" },
                              { label: "24h", value: " 24h" }
                            ]
                      })}
                      size="xs"
                      width="80px"
                      value={[selectedGranularity]}
                      onValueChange={(details) => {
                        handleGranularityChange(details.value[0]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder={selectedGranularity} />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedInterval === "15m" 
                          ? [
                              { label: "1m", value: "1m" },
                              { label: "5m", value: "5m" },
                              { label: "15m", value: "15m" }
                            ]
                          : selectedInterval === "1h"
                          ? [
                              { label: "5m", value: "5m" },
                              { label: "15m", value: "15m" },
                              { label: "30m", value: "30m" }
                            ]
                          : selectedInterval === "24h" 
                          ? [
                              { label: "30m", value: "30m" },
                              { label: "1h", value: "1h" },
                              { label: "6h", value: "6h" },
                              { label: "12h", value: "12h" }
                            ]
                          : selectedInterval === "1w"
                          ? [
                              { label: "1h", value: "1h" },
                              { label: "6h", value: "6h" },
                              { label: "12h", value: "12h" },
                              { label: "24h", value: "24h" }
                            ]
                          : [
                              { label: "6h", value: "6h" },
                              { label: "12h", value: "12h" },
                              { label: "24h", value: "24h" }
                            ]
                        ).map((item) => (
                          <SelectItem key={item.value} item={item}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Box>
                )}                  
              </Box>
            </HStack>
          </Box>
          <Box>
        <HStack justifyContent="space-between">
          <Box w="100%">
            <Box
              display="flex"
              justifyContent="space-between"
              mt={-4}
              ml={isMobile ? 2 : 0}
              p={2}
              borderRadius="md"
              boxShadow="md"
              h="40px"
              w="100%"
            >
              <HStack spacing={4} w="100%" mt={1}>
                {availableIntervals.length > 0 && (
                  <Box display="flex" gap={3} alignItems="left">
                    {availableIntervals.map((int) => {
                      return (
                        <Box
                          key={int}
                          px={3}
                          py={1}
                          borderRadius="md"
                          bg={selectedInterval === int ? "#4ade80" : "gray.700"}
                          cursor="pointer"
                          onClick={() => handleIntervalChange(int)}
                          _hover={{ bg: selectedInterval === int ? "#22c55e" : "gray.600" }}
                          transition="all 0.2s"
                          position="relative"
                        >
                          <Text
                            mt={-4}
                            fontSize="xs"
                            fontWeight={selectedInterval === int ? "bold" : "normal"}
                            color={selectedInterval === int ? "black" : "white"}
                          >
                            {getIntervalDisplayName(int)}
                          </Text>
                        </Box>
                      );
                    })}
                  </Box>
                )}

              </HStack>
            </Box>
          </Box>
              {isMobile ? (
              <VStack ml={-10} mt={-10}>
                <Box mt={-4} mr={isMobile ? 2 : 0} ml={isMobile ? 7 : 0} textAlign={isMobile ? "right" : "left"} alignItems={isMobile ? "right" : "left"}>
                    <Text fontSize={"xs"}>IMV {Number(formatEther(`${imv || 0}`)).toFixed(8)} {isTokenInfoLoading ? <Spinner size="sm" /> : `${token1Symbol}/${token0Symbol}`} </Text>
                </Box>
                <Box  mt={-2} ml={"35%"}>
                  <Text fontSize={"xs"}>(${(Number(formatEther(`${imv || 0}`)) * priceUSD).toFixed(4)})</Text>
                </Box>
              </VStack>
              ) : 
              <Box w="120%">
                <HStack>
                  <Box mt={-3} mr={0} ml={10} w="95%" >
                    <Text fontSize={"xs"}>IMV {Number(formatEther(`${imv || 0}`)).toFixed(8)} {isTokenInfoLoading ? <Spinner size="sm" /> : `${token1Symbol}/${token0Symbol}`} </Text>
                  </Box>
                  <Box  mt={-2} ml={2}>
                    <Text fontSize={"xx-small"}>(${(Number(formatEther(`${imv || 0}`)) * priceUSD).toFixed(4)})</Text>
                  </Box>
                </HStack>
              </Box>
              }
        </HStack>            
          </Box>
        </VStack>
          <Box h={isMobile ? 200 : 285} ml={isMobile ? "20px" : 0}  borderRadius={5} border="1px solid ivory" mb={5} w={isMobile ? "92%" : "99%"} mt={1}>
            <Box
              ml={1}
              
            >
              <Chart
                options={chartOptions}
                series={series}
                type="candlestick"
                height={isMobile ? 198 : 283}
                width={isMobile ? "100%" : "100%"}
            />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PriceData;
//