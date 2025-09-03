import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { zeroAddress } from 'viem';

export const useAllowance = (
    tokenAddress?: string,
    spenderAddress?: string
) => {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [allowance, setAllowance] = useState<bigint>(BigInt(0));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchAllowance = async () => {
            if (!tokenAddress || !spenderAddress || !address || !publicClient) {
                setAllowance(BigInt(0));
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                // Dynamically import ERC20 ABI to avoid initialization issues
                const ERC20Artifact = await import('../assets/ERC20.json');
                const ERC20Abi = ERC20Artifact.abi;

                const allowanceResult = await publicClient.readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: ERC20Abi,
                    functionName: 'allowance',
                    args: [address, spenderAddress]
                });

                setAllowance(allowanceResult as bigint);
                // console.log(`Allowance for ${tokenAddress} to ${spenderAddress}:`, allowanceResult.toString());
            } catch (err) {
                console.error('Error fetching allowance:', err);
                setError(err as Error);
                setAllowance(BigInt(0));
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllowance();
        
        // Poll for allowance updates every 5 seconds
        const interval = setInterval(fetchAllowance, 5000);
        
        return () => clearInterval(interval);
    }, [tokenAddress, spenderAddress, address, publicClient]);

    const hasEnoughAllowance = (amount: bigint): boolean => {
        return allowance >= amount;
    };

    const isMaxApproved = (): boolean => {
        return allowance === ethers.constants.MaxUint256.toBigInt();
    };

    return {
        allowance,
        isLoading,
        error,
        hasEnoughAllowance,
        isMaxApproved
    };
};