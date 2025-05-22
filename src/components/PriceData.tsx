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
  const API_BASE_URL = "https://prices.oikos.cash";

  const fetchLatestPrice = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/price/latest`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Check if data has a price property
      if (!data || typeof data.price === 'undefined') {
        console.error("Invalid price data format:", data);
        return null;
      }

      // Ensure we return a number or null if conversion fails
      try {
        return typeof data.price === 'number' ? data.price : parseFloat(data.price);
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
      const response = await fetch(`${API_BASE_URL}/prices/${intervalMinutes}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseJson = await response.json();

      // Check if the response is an array
      if (!Array.isArray(responseJson)) {
        console.error("API response is not an array:", responseJson);
        return [];
      }

      // Check if array is empty
      if (responseJson.length === 0) {
        return [];
      }

      try {
        const data = responseJson.map((item: PriceData) => ({
          timestamp: item.timestamp * 1000, // Convert to milliseconds
          price: item.price,
        }));

        return data.map(item => [
          Number(item.timestamp),
          typeof item.price === 'number' ? item.price : parseFloat(item.price)
        ] as [number, number]);
      } catch (err) {
        console.error("Error processing price data:", err, "Raw response:", responseJson);
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

        // Only display actual price history data, no placeholder random data
        if (historyData.length > 0) {
          setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: historyData }]);
        } else {
          // Set empty data array when no history is available
          setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: [] }]);
        }
      }

      // Set up polling for price updates
      pollInterval = setInterval(async () => {
        const newPrice = await fetchLatestPrice();
        if (newPrice !== null && newPrice !== lastPrice.current) {
          lastPrice.current = newPrice;
          setSpotPrice(newPrice);
          setSeries((prevSeries) => {
            const newData = [...prevSeries[0].data, [Date.now(), newPrice]];
            // Limit the number of data points to keep the chart performant
            if (newData.length > 100) newData.shift();
            return [{ ...prevSeries[0], data: newData }];
          });
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
    annotations: {
      yaxis: spotPrice && imv
        ? [
            {
              y: spotPrice,
              borderColor: "#FF4560",
              strokeDashArray: 4,
              label: {
                borderColor: "#FF4560",
                style: {
                  color: "#fff",
                  background: "#FF4560",
                },
                text: `Spot Price: ${typeof spotPrice === 'number' ? spotPrice.toFixed(6) : '0.00'} ${token1Symbol || '--'}/${token0Symbol || '--'}`,
              },
            },
            {
              y: computedMinY, // Always uses the computed minimum from your series
              borderColor: "yellow",
              strokeDashArray: 4,
              label: {
                borderColor: "yellow",
                style: {
                  color: "#fff",
                  background: "black",
                },
                text: `IMV: ${imv ? Number(formatEther(`${imv}`)).toFixed(6) : '0.00'}`,
                offsetY: -10, // Adjust offset if needed
              },
            },
          ]
        : [],
    },
  };

  useEffect(() => {
    // Use predefined intervals instead of fetching from API
    setAvailableIntervals(predefinedIntervals);

    // Optionally, you can still fetch from API and merge with predefined intervals
    /*
    const fetchIntervals = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/intervals`);
        if (response.ok) {
          const data = await response.json();
          // Filter out any intervals that might conflict with predefined ones
          const apiIntervals = data.filter(i => !predefinedIntervals.includes(i));
          setAvailableIntervals([...predefinedIntervals, ...apiIntervals]);
        }
      } catch (error) {
        console.error("Error fetching intervals:", error);
        // Fall back to predefined intervals if API fails
        setAvailableIntervals(predefinedIntervals);
      }
    };

    fetchIntervals();
    */
  }, []);

  const handleIntervalChange = async (newInterval: string) => {
    setSelectedInterval(newInterval);

    // Fetch new price history data immediately when interval changes
    const historyData = await fetchPriceHistory(newInterval);
    if (historyData.length > 0) {
      setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: historyData }]);
    }
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
        const response = await fetch(`${API_BASE_URL}/`);
        setApiError(!response.ok);
      } catch (error) {
        console.error("API connection error:", error);
        setApiError(true);
      }
    };

    checkApiConnection();
    const connectionCheck = setInterval(checkApiConnection, 10000); // Check connection every 10 seconds

    return () => clearInterval(connectionCheck);
  }, []);

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
          <Box mt={-5}>
            <Chart options={chartOptions} series={series} type="area" height={isMobile ? 250 : 300} w={isMobile ? "200px": "auto"} />
          </Box>
        </>
      )}
    </Box>
  );
};

export default PriceData;
