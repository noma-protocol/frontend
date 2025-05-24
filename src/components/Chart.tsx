import React, { useState, useEffect } from 'react';
import { commify, tickToPrice } from "../utils.tsx";
import {ethers} from 'ethers';
import PriceRangeVisualization from "./PriceRangeVisualization.tsx";
import {Box} from "@chakra-ui/react";

const { formatEther, formatUnits, parseEther } = ethers.utils;

const MyChart = ({ positions, isMobile }) => {
   const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const data = getPositionsWithPriceRange(positions);
        setChartData(data);
    }, [positions]); // Recalculate when positions prop changes

    // Function to convert ticks to price ranges
    const getPositionsWithPriceRange = (positions) => {
        return Object.entries(positions).map(([key, pos]) => {
        
        // Use only the first element from what tickToPrice returns
        const priceLower = tickToPrice(pos?.lowerTick)[0];
        const priceUpper = tickToPrice(pos?.upperTick)[0];
    
        // Assuming BigNumbers have a method to convert to a string
        // to avoid precision issues with large numbers in JavaScript
        const amount0 = pos?.amount0.toString(); // Assuming BigNumber's toString method
        const amount1 = pos?.amount1.toString(); // Assuming BigNumber's toString method
    
        // Construct an object for the chart data
        let obj = {
            name: key,
            priceLower: parseFloat(priceLower),
            priceUpper: parseFloat(priceUpper),
            amount0: formatEther(amount0),
            amount1: formatEther(amount1),
        };

        return obj;
        });
    };
  
    return (
        <Box ml={isMobile? "5px" : "20px"}>
            <PriceRangeVisualization data={chartData} width={isMobile? 350 : 900} height={300}  />
        </Box>
    );
};

export default MyChart;