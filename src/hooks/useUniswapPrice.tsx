import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { getProvider } from "../services/providerService";

const useUniswapPrice = (poolAddress, providerUrl) => {
    const [priceData, setPriceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startTime, setStartTime] = useState(Date.now());
    const [percentageChange, setPercentageChange] = useState(0);
    const [initialPrice, setInitialPrice] = useState(null); // Store initial price

    const fetchLatestPrice = async () => {
        try {
            const provider = getProvider();
            const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);
            const slot0 = await poolContract.slot0();
            const sqrtPriceX96 = slot0.sqrtPriceX96;
            return (Number(sqrtPriceX96) ** 2) / 2 ** 192;
        } catch (error) {
            console.error("Error fetching latest price:", error);
            return null;
        }
    };

    useEffect(() => {
        let interval;
        const initializePriceData = async () => {
            try {
                const initialPrice = await fetchLatestPrice();
                if (initialPrice === null) return;
                setStartTime(Date.now());
                setPriceData([{ timestamp: Date.now(), price: initialPrice }]);
                setInitialPrice(initialPrice); // Set initial price
                setLoading(false);

                interval = setInterval(async () => {
                    const newPrice = await fetchLatestPrice();
                    if (newPrice !== null) {
                        setPriceData((prevData) => {
                            if (!prevData) return prevData;
                            
                            const change = initialPrice ? ((newPrice - initialPrice) / initialPrice) * 100 : 0;
                            setPercentageChange(change);
                            
                            return [...prevData.slice(-9), { timestamp: Date.now(), price: newPrice }];
                        });
                    }
                }, 3000);
            } catch (error) {
                console.error("Error initializing price data:", error);
                setLoading(false);
            }
        };

        initializePriceData();
        return () => clearInterval(interval);
    }, [poolAddress, providerUrl, initialPrice]); // Add initialPrice to dependency array

    return { priceData, loading, percentageChange };
};

export default useUniswapPrice;
