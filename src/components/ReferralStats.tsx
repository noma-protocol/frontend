import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Button, Input, IconButton } from '@chakra-ui/react';
import { FiCopy, FiUsers, FiDollarSign, FiTrendingUp, FiShare2, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAccount } from 'wagmi';
import { generateReferralCode } from '../utils';
import { toaster } from './ui/toaster';
import { Tooltip } from './ui/tooltip';
import { isMobile } from "react-device-detect";
import { referralApi } from '../services/referralApi';

interface ReferralStatsProps {
  isExpanded?: boolean;
}

interface ReferralTrade {
  type: string;
  tokenName: string;
  tokenSymbol: string;
  volumeETH: string;
  volumeUSD: string;
  timestamp: number;
  txHash: string;
  referredAddress: string;
}

export const ReferralStats: React.FC<ReferralStatsProps> = ({ isExpanded = false }) => {
  const { address } = useAccount();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [referralStats, setReferralStats] = useState({
    totalReferred: 0,
    totalVolumeETH: 0,
    totalVolumeUSD: 0,
    estimatedCommission: 0,
    recentTrades: [] as ReferralTrade[]
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (address) {
      // Generate referral code
      const code = generateReferralCode(address);
      setReferralCode(code);
      
      // Generate referral link with only the code
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/?r=${code}`;
      setReferralLink(link);
      
      // Register the code with the backend
      referralApi.registerCode(code, address).catch(error => {
        console.error('Failed to register referral code:', error);
      });
      
      // Load referral stats from localStorage
      loadReferralStats();
    }
  }, [address]);

  const loadReferralStats = async () => {
    setIsLoading(true);
    try {
      // Fetch stats from API
      const stats = await referralApi.getReferralStats(address);
      
      // Estimate commission (assuming 1% referral fee)
      const commissionRate = 0.01;
      const estimatedCommission = stats.totalVolumeETH * commissionRate;
      
      // Get recent trades (last 5)
      const recentTrades = stats.trades
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map((trade: any) => ({
          type: trade.type,
          tokenName: trade.tokenName,
          tokenSymbol: trade.tokenSymbol,
          volumeETH: trade.volumeETH,
          volumeUSD: trade.volumeUSD,
          timestamp: trade.timestamp,
          txHash: trade.txHash,
          referredAddress: trade.userAddress
        }));
      
      setReferralStats({
        totalReferred: stats.totalReferred,
        totalVolumeETH: stats.totalVolumeETH,
        totalVolumeUSD: stats.totalVolumeUSD,
        estimatedCommission,
        recentTrades
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
      
      // Fallback to localStorage if API fails
      try {
        const tradesData = localStorage.getItem('noma_referral_trades');
        const allTrades = tradesData ? JSON.parse(tradesData) : [];
        
        const myReferralCode = address ? generateReferralCode(address) : '';
        const myReferralTrades = allTrades.filter((trade: any) => 
          trade.referralCode === myReferralCode
        );
        
        const uniqueAddresses = new Set(myReferralTrades.map((trade: any) => trade.userAddress));
        
        let totalVolumeETH = 0;
        let totalVolumeUSD = 0;
        
        myReferralTrades.forEach((trade: any) => {
          totalVolumeETH += parseFloat(trade.volumeETH || '0');
          totalVolumeUSD += parseFloat(trade.volumeUSD || '0');
        });
        
        const commissionRate = 0.01;
        const estimatedCommission = totalVolumeETH * commissionRate;
        
        const recentTrades = myReferralTrades
          .sort((a: any, b: any) => b.timestamp - a.timestamp)
          .slice(0, 5)
          .map((trade: any) => ({
            type: trade.type,
            tokenName: trade.tokenName,
            tokenSymbol: trade.tokenSymbol,
            volumeETH: trade.volumeETH,
            volumeUSD: trade.volumeUSD,
            timestamp: trade.timestamp,
            txHash: trade.txHash,
            referredAddress: trade.userAddress
          }));
        
        setReferralStats({
          totalReferred: uniqueAddresses.size,
          totalVolumeETH,
          totalVolumeUSD,
          estimatedCommission,
          recentTrades
        });
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toaster.create({
      title: `${label} copied!`,
      description: '',
      status: 'success',
      duration: 2000,
    });
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!address) {
    return (
      <Box
        bg="rgba(20, 20, 20, 0.8)"
        borderRadius="lg"
        border="1px solid rgba(255, 149, 0, 0.2)"
        p={4}
      >
        <Text color="#888" textAlign="center">
          Connect wallet to view referral stats
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg="rgba(20, 20, 20, 0.8)"
      borderRadius="lg"
      border="1px solid rgba(255, 149, 0, 0.2)"
      p={isExpanded ? 6 : 4}
      backdropFilter="blur(10px)"
    >
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack spacing={2}>
            <Box>
                <FiShare2 color="#ff9500" size={20} />              
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="white">
                Referral Program
              </Text>              
            </Box>
          </HStack>
          <Tooltip content={showDetails ? "Hide details" : "Show details"}>
            <IconButton
              aria-label="Toggle details"
              icon={showDetails ? <FiEyeOff /> : <FiEye />}
              size="sm"
              variant="ghost"
              color="#ff9500"
              onClick={() => setShowDetails(!showDetails)}
              _hover={{ bg: 'rgba(255, 149, 0, 0.1)' }}
            />
          </Tooltip>
        </HStack>

        {/* Referral Link Section */}
        <Box
          bg="rgba(255, 149, 0, 0.1)"
          borderRadius="md"
          p={3}
          border="1px solid rgba(255, 149, 0, 0.2)"
        >
          <Text fontSize="sm" color="#888" mb={2}>
            Your Referral Link
          </Text>
          <VStack alignItems={"left"} textAlign={"left"}>
            <Box>
              <HStack spacing={2}>
              <Box>
                <Input
                  h="30px"
                  w="15vw"
                  value={referralLink}
                  isReadOnly
                  bg="rgba(0, 0, 0, 0.3)"
                  border="1px solid rgba(255, 149, 0, 0.3)"
                  color="white"
                  fontSize="xs"
                  _hover={{ border: "1px solid rgba(255, 149, 0, 0.5)" }}
                  _focus={{ border: "1px solid #ff9500", boxShadow: "0 0 0 1px #ff9500" }}
                />      
              </Box>
              </HStack>
            </Box>
            <Box>
                <Button
                  size="xs"
                  variant="ghost"
                  color="#ff9500"
                  onClick={() => copyToClipboard(referralLink, 'Referral link')}
                  _hover={{ bg: 'rgba(255, 149, 0, 0.1)' }}
                >
                  Copy
                </Button>                   
            </Box>
            <Box>
              <VStack alignItems={"left"} textAlign={"left"}>
                <Box>
                  <HStack mt={2} spacing={4}>
                    <Text fontSize="xs" color="#888">
                      Referral Code: <Text as="span" color="#ff9500" fontFamily="monospace">{referralCode}</Text>
                    </Text>
                  </HStack>
                </Box>
                {/* <Box>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="#ff9500"
                    onClick={() => copyToClipboard(referralCode, 'Referral code')}
                    _hover={{ bg: 'rgba(255, 149, 0, 0.1)' }}
                  >
                    Copy Code
                  </Button>                  
                </Box> */}
              </VStack>
            </Box>

          </VStack>
 

        </Box>

        {/* Stats Grid */}
        <Box
          display="grid"
          gridTemplateColumns={isExpanded ? "repeat(4, 1fr)" : "repeat(2, 1fr)"}
          gap={3}
        >
          {/* Total Referred */}
          <Box
            bg="rgba(0, 0, 0, 0.3)"
            borderRadius="md"
            p={3}
            border="1px solid rgba(255, 149, 0, 0.1)"
            h={isMobile ? "auto" : "100px"}
          >
            <HStack spacing={2} mb={1}>
              <Box>
                  <FiUsers color="#ff9500" size={16} />                
              </Box>
              <Box>
                <Text fontSize="xs" color="#888">Users Referred</Text>
              </Box>
            </HStack>
            <VStack textAlign={"left"} alignItems={"left"}>
              <Box>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {referralStats.totalReferred}
                </Text>                
              </Box>
              <Box>
                
              </Box>
            </VStack>
          </Box>

          {/* Total Volume */}
          <Box
            bg="rgba(0, 0, 0, 0.3)"
            borderRadius="md"
            p={3}
            border="1px solid rgba(255, 149, 0, 0.1)"
            h={isMobile ? "auto" : "100px"}
          >
            <HStack spacing={2} mb={1}>
              <Box>
                  <FiTrendingUp color="#ff9500" size={16} />                
              </Box>
              <Box>
                <Text fontSize="xs" color="#888">Total Volume</Text>
              </Box>
            </HStack>
            <VStack alignItems={"left"} textAlign={"left"}>
              <Box>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  ${formatNumber(referralStats.totalVolumeUSD, 0)}
                </Text>             
              </Box>
              <Box>
                <Text fontSize="xs" color="#888">
                  {formatNumber(referralStats.totalVolumeETH, 4)} MON
                </Text>                   
              </Box>
            </VStack>
          </Box>

          {isExpanded && (
            <>
              {/* Estimated Commission */}
              <Box
                bg="rgba(0, 0, 0, 0.3)"
                borderRadius="md"
                p={3}
                border="1px solid rgba(255, 149, 0, 0.1)"
              >
                <HStack spacing={2} mb={1}>
                  <FiDollarSign color="#4ade80" size={16} />
                  <Text fontSize="xs" color="#888">Est. Commission</Text>
                </HStack>
                <Text fontSize="xl" fontWeight="bold" color="#4ade80">
                  {formatNumber(referralStats.estimatedCommission, 4)} MON
                </Text>
                <Text fontSize="xs" color="#888">
                  1% of volume
                </Text>
              </Box>

              {/* Commission Rate */}
              <Box
                bg="rgba(0, 0, 0, 0.3)"
                borderRadius="md"
                p={3}
                border="1px solid rgba(255, 149, 0, 0.1)"
              >
                <Text fontSize="xs" color="#888" mb={1}>Commission Rate</Text>
                <Text fontSize="xl" fontWeight="bold" color="#ff9500">
                  1%
                </Text>
                <Text fontSize="xs" color="#888">
                  Per trade
                </Text>
              </Box>
            </>
          )}
        </Box>

        {/* Recent Activity (only show when expanded or details shown) */}
        {(showDetails || isExpanded) && referralStats.recentTrades.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="bold" color="white" mb={2}>
              Recent Referral Activity
            </Text>
            <VStack spacing={2} align="stretch">
              {referralStats.recentTrades.map((trade, index) => (
                <Box
                  key={index}
                  bg="rgba(0, 0, 0, 0.3)"
                  borderRadius="md"
                  p={3}
                  border="1px solid rgba(255, 149, 0, 0.1)"
                  fontSize="sm"
                >
                  <HStack justify="space-between" mb={1}>
                    <HStack spacing={2}>
                      <Text color={trade.type === 'buy' ? '#4ade80' : '#ef4444'} fontWeight="bold">
                        {trade.type.toUpperCase()}
                      </Text>
                      <Text color="white">
                        {trade.tokenSymbol}
                      </Text>
                    </HStack>
                    <Text color="#888" fontSize="xs">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="#888" fontSize="xs">
                      From: {formatAddress(trade.referredAddress)}
                    </Text>
                    <Text color="white" fontSize="xs">
                      ${formatNumber(parseFloat(trade.volumeUSD), 2)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Info Text */}
        <Box
          bg="rgba(255, 149, 0, 0.05)"
          borderRadius="md"
          p={3}
          border="1px dashed rgba(255, 149, 0, 0.2)"
        >
          <Text fontSize="xs" color="#888">
            Earn vNOMA on all trades made by users who sign up using your referral link. 
            Share your link to start earning!
          </Text>
        </Box>
      </VStack>
    </Box>
  );
};