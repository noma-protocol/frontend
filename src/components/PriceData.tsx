import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import { Box } from "@chakra-ui/react";
import { ethers } from "ethers";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { isMobile } from "react-device-detect";
const { formatEther } = ethers.utils;

type UniswapPriceChartProps = {
  poolAddress: string;
  providerUrl: string;
  token0Symbol: string;
  token1Symbol: string;
  imv: string;
};

const PriceData: React.FC<UniswapPriceChartProps> = ({
  poolAddress,
  providerUrl,
  token0Symbol,
  token1Symbol,
  imv,
}) => {
  const [series, setSeries] = useState([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: [] }]);
  const [spotPrice, setSpotPrice] = useState<number | null>(null);
  const lastPrice = useRef<number | null>(null);

  const fetchLatestPrice = async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(providerUrl);
      const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);
      const slot0 = await poolContract.slot0();
      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const price = (Number(sqrtPriceX96) ** 2) / 2 ** 192;
      // console.log("Fetched price:", price);
      return price;
    } catch (error) { 
      console.error("Error fetching price:", error);
      return null;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startFetching = async () => {
      // console.log("Starting price updates...");
      const initialPrice = await fetchLatestPrice();
      if (initialPrice === null) return;
      lastPrice.current = initialPrice;
      setSpotPrice(initialPrice);

      const now = Date.now();
      const initialData = Array.from({ length: 10 }, (_, i) => [
        now - (9 - i) * 5000,
        initialPrice * (1 + (Math.random() - 0.5) * 0.02),
      ]) as [number, number][];

      setSeries([{ name: `Price ${token0Symbol}/${token1Symbol}`, data: initialData }]);
      // console.log("Initial data:", initialData);

      interval = setInterval(async () => {
        const newPrice = await fetchLatestPrice();
        if (newPrice !== null && newPrice !== lastPrice.current) {
          lastPrice.current = newPrice;
          setSpotPrice(newPrice);
          setSeries((prevSeries) => {
            const newData = [...prevSeries[0].data, [Date.now(), newPrice]];
            if (newData.length > 10) newData.shift();
            // console.log("Updated series:", JSON.stringify(newData, null, 2));
            return [{ ...prevSeries[0], data: newData }];
          });
        }
      }, 5000);
    };

    startFetching();
    return () => clearInterval(interval);
  }, [poolAddress, providerUrl, token0Symbol, token1Symbol]);

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
                text: `Spot Price: ${spotPrice.toFixed(6)} ${token1Symbol || '--'}/${token0Symbol || '--'}`,
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
                text: `IMV: ${Number(formatEther(`${imv}`)).toFixed(6)}`,
                offsetY: -10, // Adjust offset if needed
              },
            },
          ]
        : [],
    },
  };

  return (
    <Box>
      {series[0].data.length === 0 ? (
        <p>Loading price data...</p>
      ) : (
        <Chart options={chartOptions} series={series} type="area" height={isMobile ? 250 : 300} />
      )}
    </Box>
  );
};

export default PriceData;
