import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HStack, Box, Button, Spinner, Text, VStack, Flex } from "@chakra-ui/react";
import { commify, commifyDecimals } from '../utils';
import {
    NumberInputRoot,
    NumberInputLabel,
    NumberInputField,
} from "../components/ui/number-input";
import { formatEther, parseEther } from 'viem';

interface StandaloneRepayModalProps {
    isOpen: boolean;
    onClose: () => void;
    token0Symbol: string;
    loanAmount: bigint;
    fullCollateral: bigint;
    repayAmount: string;
    setRepayAmount: (value: string) => void;
    handleClickRepayAmount: () => void;
    isMobile: boolean;
    imv: bigint;
    ltv: number;
    isLoading: boolean;
    isRepaying: boolean;
}

const StandaloneRepayModal: React.FC<StandaloneRepayModalProps> = ({
    isOpen,
    onClose,
    token0Symbol,
    loanAmount,
    fullCollateral,
    repayAmount,
    setRepayAmount,
    handleClickRepayAmount,
    isMobile,
    imv,
    ltv,
    isLoading,
    isRepaying
}) => {
    const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        let root = document.getElementById('standalone-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'standalone-modal-root';
            document.body.appendChild(root);
        }
        setModalRoot(root);
        return () => {
            // Don't remove the root div on cleanup, reuse it
        };
    }, []);

    const collateral = repayAmount == "0" || repayAmount == "" ? formatEther(`${fullCollateral}`) : 
        Number(repayAmount) / Number(formatEther(`${imv}`));

    const _handleSetRepayAmount = (e: any) => {
        const value = e.target.value;
        if (isNaN(value) || value == "") return;

        console.log(`${parseEther(`${Number(value)}`)} > ${loanAmount} is ${parseEther(`${Number(value)}`) > loanAmount}`);
        if (value == '' || parseEther(`${Number(value)}`) > loanAmount) return;

        setRepayAmount(value);
    };

    const handleUseMax = () => {
        const maxAmount = formatEther(loanAmount);
        setRepayAmount(maxAmount);
    };

    // Reset amount when modal closes
    useEffect(() => {
        if (!isOpen) {
            setRepayAmount('0');
        }
    }, [isOpen]);

    if (!modalRoot || !isOpen) return null;

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <Box
                position="fixed"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="rgba(0, 0, 0, 0.6)"
                backdropFilter="blur(4px)"
                zIndex="1000"
                onClick={onClose}
            />
            
            {/* Modal */}
            <Box
                position="fixed"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                bg="rgba(26, 26, 26, 0.95)"
                backdropFilter="blur(20px)"
                border="1px solid rgba(239, 68, 68, 0.2)"
                borderRadius="lg"
                boxShadow="0 20px 40px rgba(0, 0, 0, 0.5)"
                zIndex="1001"
                w={{ base: "90%", md: "480px" }}
                maxW="480px"
                maxH="90vh"
                overflow="hidden"
            >
                {/* Header */}
                <Box borderBottom="1px solid rgba(255, 255, 255, 0.1)" p={6}>
                    <HStack justify="space-between" align="center">
                        <Box>
                            <HStack gap={3}>
                                <Box w="4px" h="24px" bg="#ef4444" borderRadius="full" />
                                <Box>
                                    <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                        Repay Loan
                                    </Text>
                                </Box>
                            </HStack>
                        </Box>
                        <Box>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                color="#888"
                                _hover={{ color: "white", bg: "rgba(255, 255, 255, 0.1)" }}
                                fontSize="xl"
                                w="32px"
                                h="32px"
                                borderRadius="full"
                            >
                                ×
                            </Button>
                        </Box>
                    </HStack>
                </Box>

                {/* Body */}
                <Box p={6} overflowY="auto" maxH="calc(90vh - 200px)">
                    <VStack spacing={6} align="stretch">
                        {/* Amount Input Section */}
                        <Box>
                            <Text color="#888" fontSize="sm" mb={3} fontWeight="600">
                                REPAY AMOUNT
                            </Text>
                            <Box
                                bg="rgba(0, 0, 0, 0.3)"
                                borderRadius="12px"
                                border="1px solid rgba(255, 255, 255, 0.1)"
                                p={4}
                                pb={3}
                            >
                                <NumberInputRoot
                                    isMobile={isMobile}
                                    min={0}
                                    max={Number(formatEther(loanAmount))}
                                    step={0.1}
                                    onChange={_handleSetRepayAmount}
                                    targetValue={Number(repayAmount)}
                                    customStep={0.1}
                                    value={Number(repayAmount)}
                                >
                                    <NumberInputField
                                        h="48px"
                                        bg="transparent"
                                        border="none"
                                        color="white"
                                        fontSize="3xl"
                                        fontWeight="600"
                                        textAlign="center"
                                        placeholder="0"
                                        _placeholder={{ color: "#444" }}
                                        _focus={{ outline: "none" }}
                                        p={0}
                                    />
                                </NumberInputRoot>

                                <Box mt={3}>
                                    <Flex justify="space-between" align="center">
                                        <Box>
                                            <Text color="#666" fontSize="xs">
                                                Max: {commify(formatEther(loanAmount), 4)} WMON
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Button
                                                onClick={handleUseMax}
                                                size="xs"
                                                variant="ghost"
                                                color="#ef4444"
                                                fontSize="xs"
                                                h="20px"
                                                px={2}
                                                _hover={{ bg: "rgba(239, 68, 68, 0.1)" }}
                                            >
                                                MAX
                                            </Button>
                                        </Box>
                                    </Flex>
                                </Box>
                            </Box>
                        </Box>

                        {/* Transaction Preview */}
                        <Box>
                            <Text
                                color="#666"
                                fontSize="xs"
                                mb={3}
                                fontWeight="600"
                                letterSpacing="0.1em"
                                textTransform="uppercase"
                            >
                                Transaction Preview
                            </Text>
                            <VStack align="stretch" spacing={3}>
                                <Box>
                                    <Flex justify="space-between" align="center">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Repaying</Text>
                                        </Box>
                                        <Box>
                                            <Flex align="center" gap={3}>
                                                <Box>
                                                    <Text color="white" fontSize="sm" fontWeight="bold">
                                                        {repayAmount == "0" || repayAmount == "" ? 
                                                            commify(formatEther(`${loanAmount}`), 4) : 
                                                            commify(`${repayAmount}`)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm" ml="auto">
                                                        {isLoading ? <Spinner size="sm" /> : "WMON"}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Box>
                                    </Flex>
                                </Box>

                                <Box>
                                    <Flex justify="space-between" align="center">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Collateral to Withdraw</Text>
                                        </Box>
                                        <Box>
                                            <Flex align="center" gap={3}>
                                                <Box>
                                                    <Text color="#4ade80" fontSize="sm" fontWeight="bold">
                                                        {commify(collateral)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm" ml="auto">
                                                        {isLoading ? <Spinner size="sm" /> : token0Symbol}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Box>
                                    </Flex>
                                </Box>
                            </VStack>
                        </Box>

                        {/* Action Buttons */}
                        <HStack spacing={3} pt={4}>
                            <Button
                                variant="outline"
                                flex={1}
                                size="lg"
                                h="48px"
                                onClick={onClose}
                                borderColor="rgba(255, 255, 255, 0.2)"
                                color="rgba(255, 255, 255, 0.7)"
                                _hover={{
                                    bg: "rgba(255, 255, 255, 0.05)",
                                    borderColor: "rgba(255, 255, 255, 0.3)"
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                flex={1}
                                size="lg"
                                h="48px"
                                onClick={() => {
                                    handleClickRepayAmount();
                                    onClose();
                                }}
                                disabled={isRepaying || isLoading || !repayAmount || Number(repayAmount) === 0}
                                bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                                color="white"
                                fontWeight="600"
                                boxShadow="0 4px 12px rgba(239, 68, 68, 0.3)"
                                _hover={{
                                    bg: "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)",
                                    transform: "translateY(-1px)",
                                    boxShadow: "0 6px 16px rgba(239, 68, 68, 0.4)"
                                }}
                                _active={{
                                    transform: "translateY(0)",
                                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)"
                                }}
                                _disabled={{
                                    opacity: 0.6,
                                    cursor: "not-allowed"
                                }}
                            >
                                {isRepaying ? <Spinner size="sm" /> : "Repay Loan"}
                            </Button>
                        </HStack>
                    </VStack>
                </Box>
            </Box>
        </>,
        modalRoot
    );
};

export default StandaloneRepayModal;