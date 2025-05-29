import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import { Box, Text } from "@chakra-ui/react";
import { css, Global } from "@emotion/react";
import { ethers } from "ethers";
import { isMobile } from "react-device-detect";
import { isWithinPercentageDifference } from "../utils";
const { formatEther } = ethers.utils;

// Set default font size for all ApexCharts
if (typeof window !== "undefined") {
  window.ApexCharts?.exec?.(
    "all",
    "updateOptions",
    {
      chart: {
        fontSize: 8,
        fontFamily: 'Helvetica, Arial, sans-serif',
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
}

const PriceData: React.FC<ExtendedPriceChartProps> = ({
  poolAddress,
  providerUrl,
  token0Symbol,
  token1Symbol,
  imv,
  interval = "5m", // Default to 5 minute interval
  setPercentChange = () => {}, // Default no-op function
  onPercentChange,
}) => {
  const [series, setSeries] = useState([{
    name: `Price ${token0Symbol}/${token1Symbol}`,
    data: []
  }]);
  const [spotPrice, setSpotPrice] = useState<number | null>(null);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);
  const [selectedInterval, setSelectedInterval] = useState<string>(interval);
  const [apiError, setApiError] = useState<boolean>(false);
  const lastPrice = useRef<number | null>(null);
  const lastRefreshTime = useRef<number | null>(null);
  const API_BASE_URL = "http://localhost:3000" //"https://prices.oikos.cash"; // API base URL

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

  // Fetch OHLC data from API
  const fetchOHLCData = async (intervalMinutes: string) => {
    try {
      // Use the OHLC endpoint
      const response = await fetch(`${API_BASE_URL}/api/price/ohlc/${intervalMinutes}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseJson = await response.json();

      // Check if we have OHLC data
      if (responseJson && responseJson.ohlc && Array.isArray(responseJson.ohlc)) {
        // Format the OHLC data for ApexCharts
        const ohlcData = responseJson.ohlc.map((candle: OHLCData) => ({
          x: new Date(candle.timestamp),
          y: [candle.open, candle.high, candle.low, candle.close]
        }));

        // Update last refresh time
        lastRefreshTime.current = Date.now();

        return ohlcData;
      } else {
        console.error("API response doesn't contain valid OHLC data:", responseJson);
        return [];
      }
    } catch (error) {
      console.error("Error fetching OHLC data:", error);
      return [];
    }
  };

  // Calculate percentage change based on OHLC data
  const calculatePercentChange = (ohlcData: any[]) => {
    if (!ohlcData || ohlcData.length < 2) return 0;

    // Get first and last price points
    const firstPrice = ohlcData[0].y[0]; // open of first candle
    const lastPrice = ohlcData[ohlcData.length - 1].y[3]; // close of last candle

    // Calculate percentage change
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    return change;
  };

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const startFetching = async () => {
      // Fetch the initial OHLC data
      const ohlcData = await fetchOHLCData(selectedInterval);

      // Fetch the latest price
      const latestPrice = await fetchLatestPrice();

      if (latestPrice !== null) {
        lastPrice.current = latestPrice;
        setSpotPrice(latestPrice);

        // Only display actual price history data
        if (ohlcData.length > 0) {
          setSeries([{
            name: `${token0Symbol}/${token1Symbol}`,
            data: ohlcData
          }]);

          // Calculate and set percentage change
          const change = calculatePercentChange(ohlcData);
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
            console.log(`Refreshing OHLC data for ${selectedInterval} interval`);

            // Fetch OHLC data for the current interval
            const ohlcData = await fetchOHLCData(selectedInterval);

            if (ohlcData.length > 0) {
              setSeries([{
                name: `${token0Symbol}/${token1Symbol}`,
                data: ohlcData
              }]);

              // Recalculate percentage change with new data
              const change = calculatePercentChange(ohlcData);
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
  }, [poolAddress, providerUrl, token0Symbol, token1Symbol, selectedInterval]);

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
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
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
          // Only show values near our annotations
          if (spotPrice && (
              Math.abs(val - spotPrice) / spotPrice < 0.005 ||
              Math.abs(val - Number(formatEther(`${imv || 0}`))) / Number(formatEther(`${imv || 0}`)) < 0.005
            )) {
            return val.toFixed(8);
          }
          return ''; // Hide other y-axis labels
        },
        style: {
          colors: "#f8f8f8",
          fontSize: '6px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        }
      },
      tickAmount: 5,
      floating: false,
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      style: {
        fontSize: '8px',
        fontFamily: 'Helvetica, Arial, sans-serif',
      },
      x: {
        format: "dd MMM HH:mm"
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#00B746",
          downward: "#EF403C"
        },
        wick: {
          useFillColor: true,
        }
      }
    },
    legend: {
      fontSize: '8px',
      fontFamily: 'Helvetica, Arial, sans-serif',
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
        fontFamily: 'Helvetica, Arial, sans-serif',
        colors: ['#f8f8f8']
      }
    },
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
                  fontSize: '6px',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                  cssClass: 'small-text-annotation',
                },
                text: ``, // `Spot Price: ${typeof spotPrice === 'number' ? spotPrice.toFixed(9) : '0.00'}`,
                offsetY: 25,
              },
            },
            {
              y: spotPrice - (spotPrice * 0.09 / 100),
              borderColor: "ivory",
              strokeDashArray: 4,
              label: {
                borderColor: "ivory",
                style: {
                  color: "#fff",
                  background: "black",
                  fontSize: '6px',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
                  cssClass: 'small-text-annotation',
                },
                text: `IMV: ${imv ? Number(formatEther(`${imv}`)).toFixed(9) : '0.00'}`,
                offsetY: -25,
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

    // Fetch new OHLC data immediately when interval changes
    const ohlcData = await fetchOHLCData(newInterval);

    // Always update the series, even if empty
    setSeries([{
      name: `${token0Symbol}/${token1Symbol}`,
      data: ohlcData
    }]);

    // Update the last refresh time
    lastRefreshTime.current = Date.now();
  };

  // Define predefined time intervals
  const predefinedIntervals = ["5m", "15m", "1h", "24h"];

  // Update error handlers
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/price/ohlc/5m`);
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

  return (
    <Box ml={isMobile ? -5 : 0}>
      <Global styles={css`
        .apexcharts-text tspan,
        .apexcharts-label,
        .apexcharts-legend-text,
        .apexcharts-tooltip,
        .apexcharts-xaxis-label,
        .apexcharts-yaxis-label,
        .apexcharts-xaxis-title,
        .apexcharts-yaxis-title,
        .apexcharts-title,
        .small-text-annotation text,
        .apexcharts-xaxis text,
        .apexcharts-yaxis text {
          font-size: 14px !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif !important;
        }
      `} />
      {apiError ? (
        <Box h="30px" bg="red.800" p={2} borderRadius="md">
          <Text fontSize="sm" color="white">API connection error. Please check that the price API is running.</Text>
        </Box>
      ) : series[0].data.length === 0 ? (
        <Box h="30px"><Text fontSize="sm" ml={isMobile ? 5 : 0}>Loading price data... </Text></Box>
      ) : (
        <>
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
            {availableIntervals.length > 0 && (
              <Box display="flex" gap={3} alignItems="left">
                {availableIntervals.map((int) => {
                  return (
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
                      position="relative"
                    >
                      <Text
                        mt={-4}
                        fontSize="xs"
                        fontWeight={selectedInterval === int ? "bold" : "normal"}
                        color={selectedInterval === int ? "black" : "white"}
                      >
                        {int}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
          <Box h={isMobile ? 200 : 275} ml={isMobile ? "20px" : -2}  borderRadius={5} border="1px solid ivory" mb={5} w="101%">
            <Box
              ml={1}
            >
              <Chart
                options={chartOptions}
                series={series}
                type="candlestick"
                height={isMobile ? 200 : 273}
                width={"101%"}
            />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PriceData;