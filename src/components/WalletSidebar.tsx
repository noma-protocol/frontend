import React from 'react';
import { Box, Text, VStack, HStack, Flex, Image } from "@chakra-ui/react";
import { formatEther } from 'viem';
import { commify } from '../utils';
import monadLogo from '../assets/images/monad.png';
import wmonLogo from '../assets/images/monad.png';
import placeholderLogoDark from '../assets/images/question_white.svg';

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
}

const WalletSidebar: React.FC<WalletSidebarProps> = ({
    ethBalance,
    token0Info,
    token1Info,
    selectedToken,
    selectedTokenBalance,
    address
}) => {
    const ethBalanceValue = typeof ethBalance === 'string' ? BigInt(ethBalance) : ethBalance;
    const monPrice = 50; // Hardcoded for now, could be passed as prop

    const TokenBalanceCard = ({ 
        symbol, 
        balance, 
        logo, 
        isSelected = false 
    }: { 
        symbol: string; 
        balance: bigint | undefined; 
        logo: string;
        isSelected?: boolean;
    }) => {
        const balanceValue = balance ? parseFloat(formatEther(balance)) : 0;
        const usdValue = symbol === 'MON' || symbol === 'WMON' ? balanceValue * monPrice : 0;

        return (
            <Box 
                display="grid"
                gridTemplateColumns="24px 50px 1fr 120px"
                gap="8px"
                alignItems="start"
                bg="rgba(255, 255, 255, 0.03)"
                borderRadius="md"
                p="6px 12px"
                border={`1px solid ${isSelected ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`}
                transition="all 0.2s"
                _hover={{
                    bg: "rgba(255, 255, 255, 0.05)",
                    borderColor: "rgba(255, 255, 255, 0.12)"
                }}
            >
            
                {/* Icon */}
                <Box 
                    w="24px" 
                    h="24px"
                    bg="rgba(74, 222, 128, 0.1)"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mb="15px"
                >
                    <Image
                        src={logo}
                        alt={symbol}
                        w="16px"
                        h="16px"
                        mt={1}
                    />
                </Box>
                
                {/* Symbol */}
                <Box mt={1}>
                    <Text color="white" fontSize="sm" fontWeight="600">{symbol}</Text>
                </Box>
                
                {/* Spacer */}
                <Box />
                
                {/* Amounts */}
                <Box textAlign="right" mt={1}>
                    <Text color="white" fontWeight="bold" fontSize="sm" lineHeight="1.2">
                        {commify(balanceValue, 4)}
                    </Text>
                    <Text color="#4ade80" fontSize="xs" lineHeight="1.2">
                        ≈ ${commify(usdValue, 2)}
                    </Text>
                </Box>
            </Box>
        );
    };

    const totalValue = address ? (
        parseFloat(formatEther(ethBalanceValue)) * monPrice + 
        (token1Info?.tokenSymbol === "WMON" ? parseFloat(formatEther(token1Info.balance || BigInt(0))) * monPrice : 0)
    ) : 0;

    return (
        <Box w="300px">
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
                    />
                    
                    {/* Token0 Balance */}
                    {token0Info?.tokenSymbol && (
                        <TokenBalanceCard 
                            symbol={token0Info.tokenSymbol}
                            balance={token0Info.balance}
                            logo={placeholderLogoDark}
                        />
                    )}
                    
                    {/* Token1 Balance */}
                    {token1Info?.tokenSymbol && (
                        <TokenBalanceCard 
                            symbol={token1Info.tokenSymbol}
                            balance={token1Info.balance}
                            logo={token1Info.tokenSymbol === "WMON" ? wmonLogo : placeholderLogoDark}
                        />
                    )}
                    
                    {/* Selected Token Balance (for Exchange page) */}
                    {selectedToken && selectedTokenBalance && (
                        <TokenBalanceCard 
                            symbol={selectedToken}
                            balance={selectedTokenBalance}
                            logo={selectedToken === "WMON" ? wmonLogo : placeholderLogoDark}
                            isSelected={true}
                        />
                    )}
                    
                    {/* Total Portfolio Value */}
                    <Flex 
                        borderTop="1px solid rgba(255, 255, 255, 0.1)" 
                        pt={2} 
                        mt={1}
                        justifyContent="space-between" 
                        alignItems="center"
                    >
                        <HStack>
                            <Box><Text color="#888" fontSize="sm" fontWeight="600">Total Value</Text></Box>
                            <Box ml={5}>
                            <Text color="#4ade80" fontWeight="bold" fontSize="lg">
                                ${commify(totalValue, 2)}
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