import { useEffect, useState, useMemo, useCallback } from 'react';
import { ethers } from "ethers";
const { JsonRpcProvider } = ethers.providers;

import { generateBytes32String, generateReferralCodeBytes32 } from "../utils";
import config from "../config";

const { formatEther } = ethers.utils;

const usePresaleContract = (network, userAddress, presaleContractAddress, referralCode) => {
    // console.log(`Got referral code: ${referralCode} for user ${userAddress} on network ${network} with presale contract ${presaleContractAddress}`);
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
                config.chain == "local"
                ? "http://localhost:8545"
                :  config.RPC_URL
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
                PresaleContract.totalRaised(),
                PresaleContract.getParticipantCount(),
                PresaleContract.finalized(),
                PresaleContract.softCapReached(),
                PresaleContract.contributions(userAddress),
                PresaleContract.getTotalReferredByCode(referralCode ? `0x${referralCode}` : "0x" + "00".repeat(8)),
                PresaleContract.getReferralUserCount(referralCode ? `0x${referralCode}` : "0x" + "00".repeat(8)),
                PresaleContract.getPresaleParams(),
                PresaleContract.deployer(),
                PresaleContract.getTimeLeft(),
                PresaleContract.hasExpired(),
                PresaleContract.getCurrentTimestamp()
            ]);


            // console.log("presaleInfo array:", presaleInfo?.map(v => v?.toString()));
            
            console.log("usePresaleContract raw values:", {
                contributions: contributions?.toString(),
                totalReferred: totalReferred?.toString(),
                referralCount: referralCount?.toString(),
                presaleInfo0: presaleInfo[0]?.toString(),
                presaleInfo1: presaleInfo[1]?.toString(),
                presaleInfo2: presaleInfo[2]?.toString()
            });

            setPresaleData({
                totalRaised: formatEther(totalRaised),
                participantCount: participantCount?.toString() || "0",
                finalized,
                softCapReached,
                contributions: contributions ? formatEther(contributions) : "0",
                totalReferred: totalReferred ? formatEther(totalReferred) : "0", 
                referralCount: referralCount?.toString() || "0",
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
