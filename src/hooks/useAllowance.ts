import { useState, useEffect, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { zeroAddress } from 'viem';

// Import ERC20 ABI once at module level to avoid repeated imports
const ERC20AbiPromise = import('../assets/ERC20.json').then(module => module.abi);

export const useAllowance = (
    tokenAddress?: string,
    spenderAddress?: string
) => {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [allowance, setAllowance] = useState<bigint>(BigInt(0));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const lastFetchRef = useRef<number>(0);

    useEffect(() => {
        const fetchAllowance = async () => {
            if (!tokenAddress || !spenderAddress || !address || !publicClient) {
                setAllowance(BigInt(0));
                return;
            }

            // Debounce to prevent excessive calls
            const now = Date.now();
            if (now - lastFetchRef.current < 5000) { // Don't fetch more than once per 5 seconds
                return;
            }
            lastFetchRef.current = now;

            try {
                setIsLoading(true);
                setError(null);

                // Use the pre-imported ABI
                const ERC20Abi = await ERC20AbiPromise;

                // Re-enable RPC call for allowance checking
                const allowanceResult = await publicClient.readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: ERC20Abi,
                    functionName: 'allowance',
                    args: [address, spenderAddress]
                });

                setAllowance(allowanceResult as bigint);
                console.log(`Allowance for ${tokenAddress} to ${spenderAddress}:`, allowanceResult.toString());
            } catch (err) {
                console.error('Error fetching allowance:', err);
                setError(err as Error);
                setAllowance(BigInt(0));
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllowance();
        
        // Reduce polling frequency to 60 seconds - allowances rarely change
        const interval = setInterval(fetchAllowance, 60000);
        
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