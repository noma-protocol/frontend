import { useEffect, useState, useMemo, useCallback } from 'react';
import { ethers } from "ethers";
const { JsonRpcProvider } = ethers.providers;

import { generateBytes32String } from "../utils";

const { formatEther } = ethers.utils;

const usePresaleContract = (network, userAddress, presaleContractAddress, referralCode) => {

    const [presaleData, setPresaleData] = useState({
        totalRaised: "0",
        participantCount: "0",
        finalized: false,
        softCapReached: false,
        contributions: "0",
        totalReferred: "0",
        referralCount: "0",
        softCap: "0",
        hardCap: "0",
        initialPrice: "0",
        deployer: "",
        timeLeftInSeconds: "0",
        hasExpired: false,
        currentTimestamp: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Setup Provider
    const provider = useMemo(
        () =>
            new JsonRpcProvider(
                network === "ganache"
                    ? "http://localhost:8545"
                    : process.env.REACT_APP_PROVIDER_URL
            ),
        [network]
    );

    // Function to fetch presale info
    const fetchPresaleInfo = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Dynamically import the required JSON based on the network
            const Presale = await import(`../assets/Presale.json`);
            const PresaleAbi = Presale.abi;

            // Initialize the contract
            const PresaleContract = new ethers.Contract(
                presaleContractAddress,
                PresaleAbi,
                provider
            );

            // Fetch data from contract
            const [
                totalRaised,
                participantCount,
                finalized,
                softCapReached,
                contributions,
                totalReferred,
                referralCount,
                presaleInfo,
                deployer,
                timeLeftInSeconds,
                hasExpired,
                currentTimestamp
            ] = await Promise.all([
                PresaleContract.getTotalRaised(),
                PresaleContract.getParticipantCount(),
                PresaleContract.finalized(),
                PresaleContract.softCapReached(),
                PresaleContract.contributions(userAddress),
                PresaleContract.getTotalReferredByCode(generateBytes32String(referralCode)),
                PresaleContract.getReferralUserCount(generateBytes32String(referralCode)),
                PresaleContract.getPresaleParams(),
                PresaleContract.deployer(),
                PresaleContract.getTimeLeft(),
                PresaleContract.hasExpired(),
                PresaleContract.getCurrentTimestamp()
            ]);


            console.log(presaleInfo);

            setPresaleData({
                totalRaised: formatEther(totalRaised),
                participantCount: participantCount,
                finalized,
                softCapReached,
                contributions: contributions,
                totalReferred: totalReferred,
                referralCount: referralCount,
                softCap: formatEther(presaleInfo[0]),
                hardCap:  formatEther(presaleInfo[1]),
                initialPrice: formatEther(presaleInfo[2]),
                deployer,
                timeLeftInSeconds,
                hasExpired,
                currentTimestamp
            });
        } catch (error) {
            console.error("Failed to fetch presale info:", error);
            setError("Failed to fetch presale information.");
        } finally {
            setLoading(false);
        }
    }, [provider, presaleContractAddress, userAddress, referralCode]);

    // Fetch data on component mount and when dependencies change
    useEffect(() => {
        fetchPresaleInfo();
    }, [fetchPresaleInfo]);

    // Return presale data and refetch function
    return { ...presaleData, loading, error, refetch: fetchPresaleInfo };
};

export default usePresaleContract;
