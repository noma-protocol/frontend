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
  const lastRefreshTime = useRef<number | null>(null); // For tracking when we last refreshed data
  const API_BASE_URL = "http://localhost:3000"; //"https://prices.oikos.cash";

  const fetchLatestPrice = async () => {
    try {
      // Try different API endpoint formats for latest price
      let apiUrl = `${API_BASE_URL}/api/price/latest`;
      console.log(`Trying to fetch latest price from: ${apiUrl}`);

      let response = await fetch(apiUrl);

      // If that fails, try without the /api prefix
      if (!response.ok) {
        apiUrl = `${API_BASE_URL}/price/latest`;
        console.log(`First latest price attempt failed, trying: ${apiUrl}`);
        response = await fetch(apiUrl);
      }

      // If all attempts failed, throw an error
      if (!response.ok) {
        throw new Error(`API error: ${response.status} - Could not fetch latest price`);
      }

      const data = await response.json();

      // Extract price from different possible API response formats
      let priceValue;

      console.log("Latest price data:", data);

      if (typeof data.price !== 'undefined') {
        // Direct price property
        priceValue = data.price;
        console.log("Found direct price:", priceValue);
      }
      // Check for 'latest' property - new format
      else if (typeof data.latest !== 'undefined') {
        priceValue = data.latest;
        console.log("Found latest price:", priceValue);
      }
      // Check for dataPoints array (new format)
      else if (Array.isArray(data.dataPoints) && data.dataPoints.length > 0) {
        const latestPoint = data.dataPoints[data.dataPoints.length - 1];

        // Check what format the data point has
        if (typeof latestPoint.price !== 'undefined') {
          priceValue = latestPoint.price;
        } else if (typeof latestPoint.value !== 'undefined') {
          priceValue = latestPoint.value;
        } else if (Array.isArray(latestPoint) && latestPoint.length >= 2) {
          priceValue = latestPoint[1]; // Assuming [timestamp, price] format
        }
        console.log("Found price in dataPoints:", priceValue);
      }
      // Check for data property with nested price
      else if (data.data && typeof data.data.price !== 'undefined') {
        // Nested data object with price
        priceValue = data.data.price;
        console.log("Found nested price:", priceValue);
      }
      // Check for data array
      else if (Array.isArray(data.data) && data.data.length > 0) {
        const latestEntry = data.data[data.data.length-1];

        // Check what properties the entry has
        if (typeof latestEntry.price !== 'undefined') {
          priceValue = latestEntry.price;
        } else if (typeof latestEntry.value !== 'undefined') {
          priceValue = latestEntry.value;
        } else if (Array.isArray(latestEntry) && latestEntry.length >= 2) {
          priceValue = latestEntry[1]; // Assuming [timestamp, price] format
        }
        console.log("Found price in data array:", priceValue);
      }
      // Check stats object for average price
      else if (data.stats && typeof data.stats.avg !== 'undefined') {
        priceValue = data.stats.avg;
        console.log("Using average price from stats:", priceValue);
      }
      else {
        console.error("Invalid price data format:", data);
        return null;
      }

      // Ensure we return a number or null if conversion fails
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
      // Try different API endpoint formats until we find the one that works
      // First try with explicit interval parameter
      let apiUrl = `${API_BASE_URL}/api/price/history?interval=${intervalMinutes}`;
      console.log(`Trying to fetch price history from: ${apiUrl}`);

      let response = await fetch(apiUrl);

      // If that fails, try the older endpoint format
      if (!response.ok) {
        // Format interval according to API expectations (with 'm' suffix if needed)
        const formattedInterval = intervalMinutes.includes('m') ? intervalMinutes : `${intervalMinutes}m`;
        apiUrl = `${API_BASE_URL}/api/price/${formattedInterval}`;
        console.log(`First attempt failed, trying: ${apiUrl}`);
        response = await fetch(apiUrl);

        // If that also fails, try without the /api prefix
        if (!response.ok) {
          apiUrl = `${API_BASE_URL}/price/${formattedInterval}`;
          console.log(`Second attempt failed, trying: ${apiUrl}`);
          response = await fetch(apiUrl);
        }
      }

      // If all attempts failed, throw an error
      if (!response.ok) {
        throw new Error(`API error: ${response.status} - All endpoint attempts failed`);
      }

      const responseJson = await response.json();

      // Extract the price data array
      // The API might return either an array directly or an object with a data property
      let priceDataArray;

      if (Array.isArray(responseJson)) {
        // If the response is already an array, use it directly
        priceDataArray = responseJson;
      } else if (responseJson && typeof responseJson === 'object') {
        // Check for different possible property names for the data array
        if (Array.isArray(responseJson.data)) {
          priceDataArray = responseJson.data;
          console.log(`Found ${priceDataArray.length} price points from data array at ${intervalMinutes} minute interval`);
        } else if (Array.isArray(responseJson.dataPoints)) {
          priceDataArray = responseJson.dataPoints;
          console.log(`Found ${priceDataArray.length} price points from dataPoints array at ${intervalMinutes} minute interval`);
        } else {
          // Neither format is valid
          console.error("API response doesn't contain valid price data array:", responseJson);
          return [];
        }
      } else {
        // Not a valid format at all
        console.error("API response is not in a recognized format:", responseJson);
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
          console.log("Sample data point:", firstItem);

          // Process based on the structure we find
          if (typeof firstItem.timestamp !== 'undefined' && typeof firstItem.price !== 'undefined') {
            // Standard format with timestamp and price fields
            const data = priceDataArray.map((item) => ({
              timestamp: typeof item.timestamp === 'number' && item.timestamp > 1000000000000
                ? item.timestamp  // Already in milliseconds
                : item.timestamp * 1000, // Convert to milliseconds
              price: item.price,
            }));

            return data.map(item => [
              Number(item.timestamp),
              typeof item.price === 'number' ? item.price : parseFloat(item.price)
            ] as [number, number]);
          }
          else if (typeof firstItem.time !== 'undefined' && typeof firstItem.value !== 'undefined') {
            // Alternative format with time and value fields
            const data = priceDataArray.map((item) => ({
              timestamp: typeof item.time === 'number' && item.time > 1000000000000
                ? item.time  // Already in milliseconds
                : item.time * 1000, // Convert to milliseconds
              price: item.value,
            }));

            return data.map(item => [
              Number(item.timestamp),
              typeof item.price === 'number' ? item.price : parseFloat(item.price)
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
            // Unrecognized format - log and return empty
            console.error("Unrecognized data point format:", firstItem);
            return [];
          }
        }

        return [];
      } catch (err) {
        console.error("Error processing price data:", err, "Raw data array:", priceDataArray);
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
        const now = Date.now();
        console.log(`Polling for price updates at ${new Date(now).toISOString()}`);

        // Always fetch the latest price
        const newPrice = await fetchLatestPrice();
        console.log(`Current price=${lastPrice.current}, New price=${newPrice}`);

        // Even if price is the same, we periodically refresh all data
        const refreshInterval = 30000; // 30 seconds
        const shouldRefreshAll = !lastRefreshTime.current || (now - lastRefreshTime.current > refreshInterval);

        // Update the price if we got a valid value
        if (newPrice !== null) {
          // If price has changed, log it
          if (lastPrice.current !== newPrice) {
            console.log(`Price changed from ${lastPrice.current} to ${newPrice}`);
          }

          // Always update the latest price reference and UI state
          lastPrice.current = newPrice;
          setSpotPrice(newPrice);

          // For 5-minute interval, we can append to the existing chart data
          if (selectedInterval === "5" && !shouldRefreshAll) {
            setSeries((prevSeries) => {
              // Create a copy of the existing data
              const newData = [...prevSeries[0].data];

              // Add the new data point with current timestamp
              newData.push([now, newPrice]);
              console.log(`Added new data point: [${new Date(now).toISOString()}, ${newPrice}]`);

              // Limit the number of data points to keep the chart performant
              if (newData.length > 100) newData.shift();

              return [{ ...prevSeries[0], data: newData }];
            });
          }
          // For any interval, we should occasionally refresh the complete dataset
          else if (shouldRefreshAll) {
            console.log(`Full data refresh for ${selectedInterval} minute interval`);
            fetchPriceHistory(selectedInterval).then(historyData => {
              if (historyData.length > 0) {
                console.log(`Refreshed chart with ${historyData.length} data points`);
                setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: historyData }]);
                lastRefreshTime.current = now;
              } else {
                console.warn(`No data returned during refresh for ${selectedInterval} minute interval`);
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
    console.log(`Changing interval from ${selectedInterval} to ${newInterval}`);

    // Only proceed if the interval is actually changing
    if (newInterval === selectedInterval) {
      return;
    }

    // Update the selected interval state
    setSelectedInterval(newInterval);

    // Fetch new price history data immediately when interval changes
    const historyData = await fetchPriceHistory(newInterval);

    // Always update the series, even if empty (to clear any existing data)
    setSeries([{
      name: `Price ${token0Symbol}/${token1Symbol}`,
      data: historyData
    }]);

    // Update the last refresh time
    lastRefreshTime.current = Date.now();

    // Log what we're setting
    console.log(`Updated chart with ${historyData.length} data points for ${newInterval} minute interval`);
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
        // Try multiple endpoints to check API connection
        let isConnected = false;

        // Try first endpoint
        try {
          const response = await fetch(`${API_BASE_URL}/api/price/latest`);
          if (response.ok) {
            isConnected = true;
            console.log("API connection check successful with /api/price/latest");
          }
        } catch (e) {
          console.log("First API connection check failed, trying alternate endpoint");
        }

        // If first check failed, try alternate endpoint
        if (!isConnected) {
          try {
            const response = await fetch(`${API_BASE_URL}/price/latest`);
            if (response.ok) {
              isConnected = true;
              console.log("API connection check successful with /price/latest");
            }
          } catch (e) {
            console.log("Second API connection check failed");
          }
        }

        // Update the error state based on our connection checks
        setApiError(!isConnected);

        if (!isConnected) {
          console.error("All API connection checks failed");
        }
      } catch (error) {
        console.error("Unexpected API connection error:", error);
        setApiError(true);
      }
    };

    checkApiConnection();
    const connectionCheck = setInterval(checkApiConnection, 30000); // Check connection every 30 seconds

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
