import React, { useState, useEffect, memo, useCallback } from 'react';
import { Box, Text, VStack, HStack, Flex, Image, Button, useDisclosure, SimpleGrid } from "@chakra-ui/react";
import { formatEther } from 'viem';
import { commify } from '../utils';
import { useMonPrice } from '../contexts/MonPriceContext';
import monadLogo from '../assets/images/monad.png';
import wmonLogo from '../assets/images/monad.png';
import placeholderLogoDark from '../assets/images/question_white.svg';
import { ethers } from 'ethers';
import { usePublicClient } from 'wagmi';
import TransferModal from './TransferModal';
import config from '../config';

interface TokenInfo {
    tokenSymbol?: string;
    balance?: bigint;
}

interface WalletSidebarProps {
    ethBalance: bigint | string;
    token0Info?: TokenInfo;
    token1Info?: TokenInfo;
    selectedToken?: string;
    selectedTokenBalance?: bigint;
    address?: string;
    deposit?: () => void;
    withdraw?: () => void;
    isWrapping?: boolean;
    isUnwrapping?: boolean;
    setIsWrapping?: (value: boolean) => void;
    setIsUnwrapping?: (value: boolean) => void;
    wrapAmount?: number | string;
    setWrapAmount?: (value: number | string) => void;
    isWrapDrawerOpen?: boolean;
    setIsWrapDrawerOpen?: (value: boolean) => void;
    isUnwrapDrawerOpen?: boolean;
    setIsUnwrapDrawerOpen?: (value: boolean) => void;
}

const WalletSidebar: React.FC<WalletSidebarProps> = ({
    ethBalance,
    token0Info,
    token1Info,
    selectedToken,
    selectedTokenBalance,
    address,
    deposit,
    withdraw,
    isWrapping = false,
    isUnwrapping = false,
    setIsWrapping,
    setIsUnwrapping,
    wrapAmount = '',
    setWrapAmount,
    isWrapDrawerOpen = false,
    setIsWrapDrawerOpen,
    isUnwrapDrawerOpen = false,
    setIsUnwrapDrawerOpen
}) => {
    const [actionType, setActionType] = useState('');
    const [nomaSpotPrice, setNomaSpotPrice] = useState<number>(0);
    const ethBalanceValue = typeof ethBalance === 'string' ? BigInt(ethBalance) : ethBalance;
    const { monPrice } = useMonPrice();
    const publicClient = usePublicClient();
    
    // Transfer modal state
    const { isOpen: isTransferOpen, onOpen: onTransferOpen, onClose: onTransferClose } = useDisclosure();
    const [transferTokenInfo, setTransferTokenInfo] = useState<{
        address?: string;
        symbol?: string;
        decimals?: number;
        logo?: string;
    }>({});
    
    // Fetch NOMA spot price from Uniswap V3 pool
    useEffect(() => {
        const fetchNomaSpotPrice = async () => {
            try {
                // NOMA/WMON pool address from the logs
                const poolAddress = "0xBb7EfF3E685c6564F2F09DD90b6C05754E3BDAC0";
                const provider = new ethers.providers.JsonRpcProvider(publicClient?.transport?.url || config.RPC_URL);
                
                const poolABI = [
                    "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
                    "function token0() view returns (address)",
                    "function token1() view returns (address)"
                ];
                
                const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
                
                // Get slot0 data
                const slot0 = await poolContract.slot0();
                const sqrtPriceX96 = slot0[0];
                
                // Get token addresses to determine price direction
                const token0 = await poolContract.token0();
                const token1 = await poolContract.token1();
                
                // Convert sqrtPriceX96 to price
                const sqrtPrice = parseFloat(sqrtPriceX96.toString()) / Math.pow(2, 96);
                const price = Math.pow(sqrtPrice, 2);
                
                // WMON address
                const WMON = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";
                
                // Determine if we need to invert the price
                // If token0 is WMON, then price is NOMA/WMON
                // If token1 is WMON, then price is WMON/NOMA and we need to invert
                const isToken0Wmon = token0.toLowerCase() === WMON.toLowerCase();
                const finalPrice = isToken0Wmon ? price : 1 / price;
                
                // console.log('NOMA spot price from pool:', {
                //     token0,
                //     token1,
                //     sqrtPriceX96: sqrtPriceX96.toString(),
                //     price,
                //     isToken0Wmon,
                //     finalPrice
                // });
                
                if (!isNaN(finalPrice) && isFinite(finalPrice) && finalPrice > 0) {
                    setNomaSpotPrice(finalPrice);
                }
            } catch (error) {
                console.error("Error fetching NOMA spot price:", error);
                // Use a more accurate fallback based on the logs
                setNomaSpotPrice(0.00012841);
            }
        };
        
        fetchNomaSpotPrice();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNomaSpotPrice, 30000);
        
        return () => clearInterval(interval);
    }, [publicClient]);

    const handleAction = useCallback(() => {
        if (wrapAmount === '' || wrapAmount === '0') return;
        
        if (actionType === 'wrap' && deposit && setIsWrapping) {
            setIsWrapping(true);
            deposit();
        } else if (actionType === 'unwrap' && withdraw && setIsUnwrapping) {
            setIsUnwrapping(true);
            withdraw();
        }
    }, [wrapAmount, actionType, deposit, withdraw, setIsWrapping, setIsUnwrapping]);

    // Intelligent USD formatting function
    const formatUsdValue = (value: number): string => {
        if (value === 0) return '0.00';
        
        // For values >= 0.01, show 2 decimal places
        if (value >= 0.01) {
            return commify(value, 2);
        }
        
        // For very small values (< 0.000001), show as < $0.000001
        if (value < 0.000001) {
            return '0.00';
        }
        
        // For values between 0.000001 and 0.01, show up to 6 decimal places
        // Find first non-zero digit position
        const log = Math.floor(Math.log10(value));
        const decimals = Math.min(6, Math.abs(log) + 1);
        
        return value.toFixed(decimals).replace(/\.?0+$/, '');
    };

    const TokenBalanceCard = ({ 
        symbol, 
        balance, 
        logo, 
        isSelected = false,
        showWrapButton = false,
        showUnwrapButton = false,
        tokenAddress,
        decimals = 18,
        showTransferButton = false
    }: { 
        symbol: string; 
        balance: bigint | undefined; 
        logo: string;
        isSelected?: boolean;
        showWrapButton?: boolean;
        showUnwrapButton?: boolean;
        tokenAddress?: string;
        decimals?: number;
        showTransferButton?: boolean;
    }) => {
        const balanceValue = balance ? parseFloat(formatEther(balance)) : 0;
        
        // Calculate USD value based on token
        let usdValue = 0;
        if (monPrice) {
            if (symbol === 'MON' || symbol === 'WMON') {
                usdValue = balanceValue * monPrice;
            } else if (symbol === 'NOMA') {
                // NOMA price calculation using spot price from vault
                const nomaPrice = (1 / nomaSpotPrice) * monPrice;
                usdValue = balanceValue * nomaPrice;
                
                // console.log(`Spot is ${1 / nomaSpotPrice} Noma price is ${nomaPrice} usd value ${usdValue}`)
                // console.log('NOMA USD calculation:', {
                //     balanceValue,
                //     nomaSpotPrice,
                //     monPrice,
                //     nomaPrice,
                //     usdValue
                // });
            }
            // Add other token prices here as needed
        }

        const handleTransfer = () => {
            setTransferTokenInfo({
                address: tokenAddress,
                symbol,
                decimals,
                logo
            });
            onTransferOpen();
        };

        return (
            <Box 
                // display="grid"
                // gridTemplateColumns={showWrapButton || showUnwrapButton || showTransferButton ? "24px 1fr auto" : "24px 60px 1fr"}
                // gap="8px"
                alignItems="center"
                bg="rgba(255, 255, 255, 0.03)"
                borderRadius="md"
                p="8px 12px"
                border={`1px solid ${isSelected ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`}
                transition="all 0.2s"
                _hover={{
                    bg: "rgba(255, 255, 255, 0.05)",
                    borderColor: "rgba(255, 255, 255, 0.12)"
                }}
            >
                <SimpleGrid columns={2}>
                {/* Icon */}
                <Box 
                    // w="24px" 
                    // h="24px"
                    display="flex"
                    alignItems="left"
                    justifyContent="left"
                >
                    <VStack>
                        <Box>
                            <HStack>
                                <Box>
                                    <Image
                                        src={logo}
                                        alt={symbol}
                                        w="20px"
                                        h="20px"
                                    />
                                </Box>
                                 <Box w="50px"><Text color="white" fontSize="sm" fontWeight="600">{symbol}</Text></Box>                                      
                            </HStack>                          
                        </Box>
                        <Box>
                        {showWrapButton && setIsWrapDrawerOpen && (
                            <Button
                                size="xs"
                                fontSize="xs"
                                h="22px"
                                w="60px"
                                px={2}
                                ml={-4}
                                mt={-1}
                                bg="transparent"
                                border="1px solid #4ade80"
                                borderColor="#4ade80"
                                color="#4ade80"
                                borderRadius={4}
                                _hover={{ bg: "rgba(74, 222, 128, 0.1)", borderColor: "#4ade80" }}
                                onClick={() => setIsWrapDrawerOpen(true)}
                            >
                                Wrap
                            </Button>
                        )}
                        {showUnwrapButton && setIsUnwrapDrawerOpen && (
                            <Button
                                size="xs"
                                fontSize="xs"
                                h="22px"
                                w="60px"
                                px={2}
                                ml={-4}
                                mt={-1}
                                bg="transparent"
                                border="1px solid #4ade80"
                                borderColor="#4ade80"
                                color="#4ade80"
                                borderRadius={4}
                                _hover={{ bg: "rgba(74, 222, 128, 0.1)", borderColor: "#4ade80" }}
                                onClick={() => setIsUnwrapDrawerOpen(true)}
                            >
                                Unwrap
                            </Button>
                        )}     
                        {showTransferButton && tokenAddress && (
                            <Button
                                size="xs"
                                fontSize="xs"
                                h="22px"
                                w="60px"
                                px={2}
                                bg="transparent"
                                border="1px solid #4ade80"
                                borderColor="#4ade80"
                                color="#4ade80"
                                borderRadius={4}
                                _hover={{ bg: "rgba(74, 222, 128, 0.1)", borderColor: "#4ade80" }}
                                onClick={handleTransfer}
                            >
                                Transfer
                            </Button>
                        )}
                        
                        </Box>
                    </VStack>
                </Box>      

                <Box textAlign="right">
                    <Text color="white" fontWeight="bold" fontSize="sm" lineHeight="1.2">
                        {commify(balanceValue, 4)}
                    </Text>
                    <Text color="#4ade80" fontSize="xs" lineHeight="1.2" whiteSpace="nowrap">
                        ≈ ${formatUsdValue(usdValue)}
                    </Text>
                </Box>     
                </SimpleGrid>

                
                {/* Symbol and Button */}
                <Box flex="1" display="flex" alignItems="center" gap={2}>
                    <Box w="60px">

                    </Box>
                </Box>
                
                {/* Amounts */}

                
            </Box>
        );
    };

    const totalValue = address && monPrice ? (() => {
        let total = parseFloat(formatEther(ethBalanceValue)) * monPrice;
        
        // Add WMON value
        if (token1Info?.tokenSymbol === "WMON") {
            total += parseFloat(formatEther(token1Info.balance || BigInt(0))) * monPrice;
        } else if (token0Info?.tokenSymbol === "WMON") {
            total += parseFloat(formatEther(token0Info.balance || BigInt(0))) * monPrice;
        }
        
        // Add selected token value if it's NOMA and not already included
        if (selectedToken === "NOMA" && selectedTokenBalance && 
            selectedToken !== token0Info?.tokenSymbol && 
            selectedToken !== token1Info?.tokenSymbol && 
            nomaSpotPrice > 0) {
            const nomaBalance = parseFloat(formatEther(selectedTokenBalance));
            const nomaPrice = (1 / nomaSpotPrice) * monPrice;
            total += nomaBalance * nomaPrice;
        }
        
        return total;
    })() : 0;

    return (
        <Box w="100%">
            <Box 
                bg="rgba(26, 26, 26, 0.8)"
                backdropFilter="blur(10px)"
                borderRadius="lg" 
                p={4} 
                w="100%"
                border="1px solid rgba(255, 255, 255, 0.1)"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.3)"
            >
                <Text fontSize="lg" fontWeight="bold" color="white" mb={2}>Wallet</Text>
                <VStack align="stretch" gap="6px">
                    {/* MON Balance */}
                    <TokenBalanceCard 
                        symbol="MON"
                        balance={ethBalanceValue}
                        logo={monadLogo}
                        showWrapButton={deposit !== undefined}
                    />
                    
                    {/* Token0 Balance */}
                    {token0Info?.tokenSymbol && token0Info.tokenSymbol !== "WMON" && (
                        <TokenBalanceCard 
                            symbol={token0Info.tokenSymbol}
                            balance={token0Info.balance}
                            logo={placeholderLogoDark}
                        />
                    )}
                    
                    {/* WMON Balance - either from token0 or token1 */}
                    {((token0Info?.tokenSymbol === "WMON" && token0Info.balance) || 
                      (token1Info?.tokenSymbol === "WMON" && token1Info.balance)) && (
                        <TokenBalanceCard 
                            symbol="WMON"
                            balance={token0Info?.tokenSymbol === "WMON" ? token0Info.balance : token1Info?.balance}
                            logo={wmonLogo}
                            showUnwrapButton={withdraw !== undefined}
                        />
                    )}
                    
                    {/* Token1 Balance (if not WMON and not the selected token) */}
                    {token1Info?.tokenSymbol && 
                     token1Info.tokenSymbol !== "WMON" && 
                     token1Info.tokenSymbol !== selectedToken && (
                        <TokenBalanceCard 
                            symbol={token1Info.tokenSymbol}
                            balance={token1Info.balance}
                            logo={placeholderLogoDark}
                        />
                    )}
                    
                    {/* Selected Token Balance (for Exchange page) - only show if not already displayed */}
                    {selectedToken && 
                     selectedTokenBalance && 
                     selectedToken !== "MON" && 
                     selectedToken !== "WMON" && 
                     selectedToken !== token0Info?.tokenSymbol && 
                     selectedToken !== token1Info?.tokenSymbol && (
                        <TokenBalanceCard 
                            symbol={selectedToken}
                            balance={selectedTokenBalance}
                            logo={placeholderLogoDark}
                            isSelected={true}
                        />
                    )}
                    
                    {/* Total Portfolio Value */}
                    <Flex 
                        borderTop="1px solid rgba(255, 255, 255, 0.1)" 
                        p={2} 
                        mt={1}
                        justifyContent="space-between" 
                        alignItems="center"
                    >
                        <HStack w="100%">
                            <Box w='50%'><Text color="#888" fontSize="sm" fontWeight="600">Total Value</Text></Box>
                            <Box w='50%' textAlign={"right"}>
                            <Text color="#4ade80" fontWeight="bold" fontSize="lg">
                                ${formatUsdValue(totalValue)}
                            </Text>                                
                            </Box>
                        </HStack>
                    </Flex>
                </VStack>
            </Box>
        </Box>
    );
};

export default WalletSidebar;