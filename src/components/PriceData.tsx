import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import { Box, Text } from "@chakra-ui/react";
import { ethers } from "ethers";
import { isMobile } from "react-device-detect";
const { formatEther } = ethers.utils;

type UniswapPriceChartProps = {
  poolAddress: string;
  providerUrl: string;
  token0Symbol: string;
  token1Symbol: string;
  imv: string;
  interval?: string; // Optional interval parameter
};

// Price data type from API
type PriceData = {
  timestamp: number;
  price: number;
};

const PriceData: React.FC<UniswapPriceChartProps> = ({
  poolAddress,
  providerUrl,
  token0Symbol,
  token1Symbol,
  imv,
  interval = "5", // Default to 5 minutes interval
}) => {
  const [series, setSeries] = useState([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: [] }]);
  const [spotPrice, setSpotPrice] = useState<number | null>(null);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<string>(interval);
  const [apiError, setApiError] = useState<boolean>(false);
  const lastPrice = useRef<number | null>(null);
  const lastRefreshTime = useRef<number | null>(null);
  const API_BASE_URL = "http://localhost:3000";

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

  const fetchPriceHistory = async (intervalMinutes: string) => {
    try {
      // Use the correct endpoint
      const response = await fetch(`${API_BASE_URL}/api/price/${intervalMinutes}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseJson = await response.json();

      // Extract the price data array
      let priceDataArray;
      
      if (Array.isArray(responseJson)) {
        // If the response is already an array, use it directly
        priceDataArray = responseJson;
      } else if (responseJson && typeof responseJson === 'object' && Array.isArray(responseJson.dataPoints)) {
        // If the response has dataPoints array
        priceDataArray = responseJson.dataPoints;
      } else {
        console.error("API response doesn't contain valid price data:", responseJson);
        return [];
      }

      // Check if array is empty
      if (priceDataArray.length === 0) {
        return [];
      }

      try {
        // Check the structure of the first item to determine the format
        if (priceDataArray.length > 0) {
          const firstItem = priceDataArray[0];
          
          // Process based on the structure we find
          if (typeof firstItem.timestamp !== 'undefined' && typeof firstItem.price !== 'undefined') {
            // Standard format with timestamp and price fields
            return priceDataArray.map(item => [
              typeof item.timestamp === 'number' && item.timestamp > 1000000000000
                ? item.timestamp  // Already in milliseconds
                : item.timestamp * 1000, // Convert to milliseconds
              typeof item.price === 'number' ? item.price : parseFloat(item.price)
            ] as [number, number]);
          } 
          else if (typeof firstItem.time !== 'undefined' && typeof firstItem.value !== 'undefined') {
            // Alternative format with time and value fields
            return priceDataArray.map(item => [
              typeof item.time === 'number' && item.time > 1000000000000
                ? item.time  // Already in milliseconds
                : item.time * 1000, // Convert to milliseconds
              typeof item.value === 'number' ? item.value : parseFloat(item.value)
            ] as [number, number]);
          }
          else if (Array.isArray(firstItem) && firstItem.length === 2) {
            // Already in [timestamp, price] format
            return priceDataArray.map(item => [
              Number(item[0]),
              typeof item[1] === 'number' ? item[1] : parseFloat(item[1])
            ] as [number, number]);
          }
          else {
            console.error("Unrecognized data point format:", firstItem);
            return [];
          }
        }
        
        return [];
      } catch (err) {
        console.error("Error processing price data:", err);
        return [];
      }
    } catch (error) {
      console.error("Error fetching price history:", error);
      return [];
    }
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const startFetching = async () => {
      // Fetch the initial price history
      const historyData = await fetchPriceHistory(selectedInterval);

      // Fetch the latest price
      const latestPrice = await fetchLatestPrice();

      if (latestPrice !== null) {
        lastPrice.current = latestPrice;
        setSpotPrice(latestPrice);

        // Only display actual price history data
        if (historyData.length > 0) {
          setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: historyData }]);
        } else {
          // Set empty data array when no history is available
          setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: [] }]);
        }
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
            console.log(`Refreshing price data for ${selectedInterval} interval`);
            fetchPriceHistory(selectedInterval).then(historyData => {
              if (historyData.length > 0) {
                setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: historyData }]);
                lastRefreshTime.current = now;
              }
            });
          }
        }
      }, 5000); // Poll every 5 seconds
    };

    startFetching();
    return () => clearInterval(pollInterval);
  }, [poolAddress, providerUrl, token0Symbol, token1Symbol, selectedInterval]);

  // Compute the minimum y value from your series data
  const computedMinY =
    series[0].data.length > 0
      ? Math.min(...series[0].data.map((item: [number, number]) => item[1]))
      : 0;

  const chartOptions = {
    chart: {
      type: "area",
      animations: { enabled: true, easing: "linear", speed: 1000 },
      toolbar: { show: false },
    },
    xaxis: {
      type: "datetime",
      labels: { show: false },
    },
    yaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        inverseColors: false,
        opacityFrom: 0.6,
        opacityTo: 0.1,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: "#00ffff", opacity: 0.7 },
          { offset: 100, color: "#00ffff", opacity: 0.1 },
        ],
      },
    },
    colors: ["#00ffff"],
    tooltip: { enabled: false },
    grid: { show: false },
    dataLabels: { enabled: false },
  };

  useEffect(() => {
    // Use predefined intervals instead of fetching from API
    setAvailableIntervals(predefinedIntervals);
  }, []);

  const handleIntervalChange = async (newInterval: string) => {
    // Only proceed if the interval is actually changing
    if (newInterval === selectedInterval) {
      return;
    }
    
    // Update the selected interval state
    setSelectedInterval(newInterval);
    
    // Fetch new price history data immediately when interval changes
    const historyData = await fetchPriceHistory(newInterval);
    
    // Always update the series, even if empty
    setSeries([{
      name: `Price ${token0Symbol}/${token1Symbol}`,
      data: historyData
    }]);
    
    // Update the last refresh time
    lastRefreshTime.current = Date.now();
  };

  // Define predefined time intervals
  const predefinedIntervals = ["5", "15", "30", "60", "1440"]; // 5m, 15m, 30m, 1h, 24h in minutes

  // Convert numeric interval to display format
  const formatIntervalDisplay = (interval: string) => {
    const num = parseInt(interval, 10);
    if (num < 60) return `${num}m`;
    if (num === 60) return `1h`;
    if (num === 1440) return `24h`;
    return `${num / 60}h`;
  };

  // Update error handlers
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/price/latest`);
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

  // Format the IMV value for display
  const imvValue = imv ? parseFloat(formatEther(imv)).toFixed(6) : '0.00';
  const spotPriceFormatted = typeof spotPrice === 'number' ? spotPrice.toFixed(6) : '0.00';

  return (
    <Box ml={isMobile ? -5 : 0}>
      {apiError ? (
        <Box h="30px" bg="red.800" p={2} borderRadius="md">
          <Text fontSize="sm" color="white">API connection error. Please check that the price API is running on port 3000.</Text>
        </Box>
      ) : series[0].data.length === 0 ? (
        <Box h="30px"><Text fontSize="sm" ml={isMobile ? 5 : 0}>Loading price data... </Text></Box>
      ) : (
        <>
          <Box
            display="flex"
            justifyContent="left"
            mt={-4}
            ml={isMobile ? 2 : 0}
            p={2}
            borderRadius="md"
            boxShadow="md"
            h="40px"
          >
            {availableIntervals.length > 0 && (
              <Box display="flex" gap={3} alignItems="left">
                {availableIntervals.map((int) => (
                  <Box
                    key={int}
                    px={3}
                    py={1}
                    borderRadius="md"
                    bg={selectedInterval === int ? "#00ffc0" : "gray.700"}
                    cursor="pointer"
                    onClick={() => handleIntervalChange(int)}
                    _hover={{ bg: selectedInterval === int ? "cyan.600" : "gray.600" }}
                    transition="all 0.2s"
                  >
                    <Text
                      mt={-4}
                      fontSize="xs"
                      fontWeight={selectedInterval === int ? "bold" : "normal"}
                      color={selectedInterval === int ? "black" : "white"}
                    >
                      {formatIntervalDisplay(int)}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          
          {/* Price Information Display */}
          <Box display="flex" justifyContent="space-between" mt={2} mb={-2} px={2}>
            <Text fontSize="xs" color="#FF4560">
              <strong>Spot Price:</strong> {spotPriceFormatted} {token1Symbol}/{token0Symbol}
            </Text>
            {imv && (
              <Text fontSize="xs" color="yellow">
                <strong>IMV:</strong> {imvValue}
              </Text>
            )}
          </Box>
          
          <Box mt={1}>
            <Chart options={chartOptions} series={series} type="area" height={isMobile ? 250 : 300} w={isMobile ? "200px": "auto"} />
          </Box>
        </>
      )}
    </Box>
  );
};

export default PriceData;