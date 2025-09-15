import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Box,
  useDisclosure,
  Image,
  Spinner,
  Heading
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogCloseTrigger,
} from './ui/dialog';
import { useAccount, useBalance, useContractWrite, useContractRead, useWaitForTransaction } from 'wagmi';
import { usePrivyWagmi } from '../hooks/usePrivyWagmi';
import { ethers } from 'ethers';
import { FaWallet, FaPaperPlane } from 'react-icons/fa';
import { toaster } from "./ui/toaster";
import { isMobile } from 'react-device-detect';
import ERC20_ABI from '../assets/ERC20.json';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenLogo?: string;
}

const TransferModal: React.FC<TransferModalProps> = ({ 
  isOpen, 
  onClose, 
  tokenAddress,
  tokenSymbol,
  tokenDecimals = 18,
  tokenLogo
}) => {
  const { address } = usePrivyWagmi();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [customTokenAddress, setCustomTokenAddress] = useState(tokenAddress || '');
  const [useCustomToken, setUseCustomToken] = useState(!tokenAddress);
  const [tokenInfo, setTokenInfo] = useState({
    symbol: tokenSymbol || '',
    decimals: tokenDecimals,
    name: '',
    balance: '0'
  });

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
  });

  // Get token balance
  const { data: tokenBalance } = useContractRead({
    address: (useCustomToken ? customTokenAddress : tokenAddress) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!(useCustomToken ? customTokenAddress : tokenAddress),
  });

  // Get token symbol
  const { data: tokenSymbolData } = useContractRead({
    address: (useCustomToken ? customTokenAddress : tokenAddress) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
    enabled: !!customTokenAddress && useCustomToken,
  });

  // Get token decimals
  const { data: tokenDecimalsData } = useContractRead({
    address: (useCustomToken ? customTokenAddress : tokenAddress) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    enabled: !!customTokenAddress && useCustomToken,
  });

  // Get token name
  const { data: tokenNameData } = useContractRead({
    address: (useCustomToken ? customTokenAddress : tokenAddress) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'name',
    enabled: !!customTokenAddress && useCustomToken,
  });

  // Transfer function
  const { 
    write: transfer, 
    data: transferData,
    isLoading: isTransferring,
    isError: transferError 
  } = useContractWrite({
    address: (useCustomToken ? customTokenAddress : tokenAddress) as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'transfer',
  });

  // Wait for transaction
  const { isLoading: isWaitingTx, isSuccess: isTxSuccess } = useWaitForTransaction({
    hash: transferData?.hash,
  });

  // Update token info when custom token data is fetched
  useEffect(() => {
    if (useCustomToken && customTokenAddress) {
      setTokenInfo({
        symbol: (tokenSymbolData as string) || '',
        decimals: (tokenDecimalsData as number) || 18,
        name: (tokenNameData as string) || '',
        balance: tokenBalance ? ethers.utils.formatUnits(tokenBalance as ethers.BigNumber, tokenDecimalsData as number || 18) : '0'
      });
    } else if (tokenAddress) {
      setTokenInfo({
        symbol: tokenSymbol || '',
        decimals: tokenDecimals,
        name: '',
        balance: tokenBalance ? ethers.utils.formatUnits(tokenBalance as ethers.BigNumber, tokenDecimals) : '0'
      });
    }
  }, [tokenSymbolData, tokenDecimalsData, tokenNameData, tokenBalance, useCustomToken, customTokenAddress, tokenAddress, tokenSymbol, tokenDecimals]);

  // Validate recipient address
  useEffect(() => {
    if (recipientAddress) {
      setIsValidAddress(ethers.utils.isAddress(recipientAddress));
    } else {
      setIsValidAddress(true);
    }
  }, [recipientAddress]);

  // Handle successful transaction
  useEffect(() => {
    if (isTxSuccess) {
      toaster.create({
        title: "Transfer Successful",
        description: `Successfully transferred ${amount} ${tokenInfo.symbol}`,
        status: "success",
        duration: 5000,
      });
      onClose();
      setAmount('');
      setRecipientAddress('');
    }
  }, [isTxSuccess, amount, tokenInfo.symbol, onClose]);

  const handleTransfer = () => {
    if (!recipientAddress || !amount || !isValidAddress) return;

    try {
      const amountInWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
      transfer({
        args: [recipientAddress, amountInWei],
      });
    } catch (error) {
      toaster.create({
        title: "Transfer Error",
        description: "Failed to initiate transfer",
        status: "error",
        duration: 5000,
      });
    }
  };

  const handleMaxClick = () => {
    setAmount(tokenInfo.balance);
  };

  const isTransferDisabled = !recipientAddress || !amount || !isValidAddress || 
    isTransferring || isWaitingTx || parseFloat(amount) > parseFloat(tokenInfo.balance) ||
    (useCustomToken && !customTokenAddress);

  return (
    <DialogRoot 
      open={isOpen} 
      onOpenChange={(e) => !e.open && onClose()}
    >
      <DialogBackdrop bg="rgba(0, 0, 0, 0.8)" />
      <DialogContent 
        bg="#1a1a1a" 
        border="1px solid #2a2a2a"
        borderRadius={isMobile ? "0" : "xl"}
        mx={isMobile ? 0 : 4}
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        maxW={isMobile ? "100%" : "500px"}
        w={isMobile ? "100%" : "90%"}
      >
        <DialogHeader borderBottom="1px solid #2a2a2a">
          <DialogTitle
            color="white"
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Box textAlign={"left"} alignContent={"left"}>
              <HStack ml={6}>
                <Box>
                  <FaPaperPlane color="#4ade80" style={{ width:"30px"}} />
                </Box>
                <Box ml={2}>
                  <Heading as="h4">
                      Transfer {useCustomToken ? 'Token' : tokenInfo.symbol}              
                  </Heading>                     
                </Box>
              </HStack>          
            </Box>
          </DialogTitle>
          <DialogCloseTrigger color="#888" />
        </DialogHeader>
        <DialogBody py={6} p={5}>
          <VStack spacing={4}>
            {/* Token Selection */}
            {useCustomToken && (
              <Box w="100%">
                <Text color="#888" fontSize="sm" mb={2}>Token Contract Address</Text>
                <Input
                  placeholder="0x..."
                  value={customTokenAddress}
                  onChange={(e) => setCustomTokenAddress(e.target.value)}
                  bg="#0a0a0a"
                  border="1px solid #2a2a2a"
                  color="white"
                  _hover={{ borderColor: "#3a3a3a" }}
                  _focus={{ borderColor: "#4ade80", boxShadow: "0 0 0 1px #4ade80" }}
                  h="48px"
                />
                {customTokenAddress && tokenInfo.symbol && (
                  <Box mt={2} p={3} bg="#0a0a0a" borderRadius="lg" border="1px solid #2a2a2a">
                    <HStack justify="space-between">
                      <Text color="#888" fontSize="sm">Token:</Text>
                      <Text color="white" fontSize="sm" fontWeight="600">{tokenInfo.symbol}</Text>
                    </HStack>
                    {tokenInfo.name && (
                      <HStack justify="space-between" mt={1}>
                        <Text color="#888" fontSize="sm">Name:</Text>
                        <Text color="white" fontSize="sm">{tokenInfo.name}</Text>
                      </HStack>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {/* Balance Display */}
            <Box w="100%" p={4} bg="#0a0a0a" borderRadius="lg" border="1px solid #2a2a2a">
              <HStack justify="space-between" align="center">
                  <HStack>
                  <Box>
                    {tokenLogo && !useCustomToken ? (
                      <Image src={tokenLogo} w="24px" h="24px" borderRadius="full" />
                    ) : (
                      <Box p={2} bg="#2a2a2a" borderRadius="full" mt={-5} ml={-1}>
                        <FaWallet color="#4ade80" size={12} />
                      </Box>
                    )}                    
                  </Box>
                    <Box ml={2}>
                    <VStack align="start" spacing={0}>
                      <Box><Text color="#888" fontSize="xs">Available Balance</Text></Box>
                      <Box>
                        <Text color="white" fontSize="lg" fontWeight="600">
                          {tokenInfo.balance} {tokenInfo.symbol}
                        </Text>                      
                      </Box>
                    </VStack>                      
                    </Box>
                </HStack>
              </HStack>
            </Box>

            {/* Recipient Address */}
            <Box w="100%">
              <Text color="#888" fontSize="sm" mb={2}>Recipient Address</Text>
              <Input
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                bg="#0a0a0a"
                border="1px solid #2a2a2a"
                borderColor={recipientAddress && !isValidAddress ? "red.500" : "#2a2a2a"}
                color="white"
                _hover={{ borderColor: recipientAddress && !isValidAddress ? "red.500" : "#3a3a3a" }}
                _focus={{ 
                  borderColor: recipientAddress && !isValidAddress ? "red.500" : "#4ade80", 
                  boxShadow: recipientAddress && !isValidAddress ? "0 0 0 1px red" : "0 0 0 1px #4ade80" 
                }}
                h="48px"
              />
              {recipientAddress && !isValidAddress && (
                <Text color="red.500" fontSize="xs" mt={1}>Invalid address</Text>
              )}
            </Box>

            {/* Amount */}
            <Box w="100%">
              <HStack justify="space-between" mb={2}>
                <Text color="#888" fontSize="sm">Amount</Text>
                <Button
                  size="xs"
                  variant="ghost"
                  color="#4ade80"
                  onClick={handleMaxClick}
                  _hover={{ bg: "#4ade8020" }}
                >
                  MAX
                </Button>
              </HStack>
              <Input
                placeholder="0.0"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                bg="#0a0a0a"
                border="1px solid #2a2a2a"
                color="white"
                _hover={{ borderColor: "#3a3a3a" }}
                _focus={{ borderColor: "#4ade80", boxShadow: "0 0 0 1px #4ade80" }}
                h="48px"
              />
              {amount && parseFloat(amount) > parseFloat(tokenInfo.balance) && (
                <Text color="red.500" fontSize="xs" mt={1}>Insufficient balance</Text>
              )}
            </Box>

            {/* Gas Fee Estimate */}
            <Box w="100%" p={3} bg="#0a0a0a" borderRadius="lg" border="1px solid #2a2a2a">
              <HStack justify="space-between">
                <Text color="#888" fontSize="sm">Network Fee</Text>
                <HStack>
                  <Text color="white" fontSize="sm">~{ethBalance ? ethers.utils.formatEther(ethBalance.value).slice(0, 8) : '0'} ETH</Text>
                </HStack>
              </HStack>
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter borderTop="1px solid #2a2a2a" mb={6} w="90%" ml={6}>
          <HStack w="100%" spacing={3}>
            <Button
              variant="outline"
              onClick={onClose}
              flex={1}
              h="48px"
              border="1px solid #3a3a3a"
              color="white"
              _hover={{ bg: "#2a2a2a" }}
              isDisabled={isTransferring || isWaitingTx}
            >
              Cancel
            </Button>
            <Button
              bg="#4ade80"
              color="black"
              onClick={handleTransfer}
              flex={1}
              h="48px"
              _hover={{ bg: "#22c55e" }}
              isDisabled={isTransferDisabled}
              isLoading={isTransferring || isWaitingTx}
              loadingText={isWaitingTx ? "Confirming..." : "Transferring..."}
              leftIcon={!isTransferring && !isWaitingTx ? <FaPaperPlane /> : undefined}
            >
              Transfer
            </Button>
          </HStack>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default TransferModal;