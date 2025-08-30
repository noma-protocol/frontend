import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { VStack, HStack, Box, Button, Spinner, Text, Flex, Grid } from "@chakra-ui/react";
import { formatNumberPrecise, commifyDecimals, commify } from '../utils';
import { formatEther, parseEther } from "viem";
import {
    NumberInputRoot,
    NumberInputLabel,
    NumberInputField,
} from "../components/ui/number-input";

interface StandaloneAddCollateralModalProps {
    isOpen: boolean;
    onClose: () => void;
    token0Symbol: string;
    extraCollateral: number;
    handleSetCollateral: (value: string) => void;
    handleSetExtraCollateral: (value: string) => void;
    isMobile: boolean;
    ltv: number;
    isLoading: boolean;
    isTokenInfoLoading: boolean;
    isAdding: boolean;
    handleClickAdd: () => void;
    token0Balance: bigint | null;
}

const StandaloneAddCollateralModal: React.FC<StandaloneAddCollateralModalProps> = ({
    isOpen,
    onClose,
    token0Symbol,
    extraCollateral,
    handleSetCollateral,
    handleSetExtraCollateral,
    isMobile,
    ltv,
    isLoading,
    isTokenInfoLoading,
    isAdding,
    handleClickAdd,
    token0Balance
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

    const handleAmountChange = (value: string) => {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = value.replace(/[^0-9.]/g, '');
        
        // Prevent multiple decimal points
        const parts = cleanedValue.split('.');
        if (parts.length > 2) {
            // Join all parts after the first decimal point
            const formattedValue = `${parts[0]}.${parts.slice(1).join('')}`;
            handleSetCollateral(formattedValue);
            handleSetExtraCollateral(formattedValue);
        } else {
            handleSetCollateral(cleanedValue);
            handleSetExtraCollateral(cleanedValue);
        }
    };

    const handleUseMax = () => {
        if (token0Balance) {
            const maxAmount = formatEther(token0Balance);
            // Use the same validation as handleAmountChange
            handleAmountChange(maxAmount);
        }
    };

    const _handleSetCollateral = (e: any) => {
        const value = e.target.value;
        if (isNaN(value) || value == "" || Number(value) > 100000000) {
            console.error("Invalid input: Not a valid number");
            return;
        }
        handleAmountChange(value);
    };

    const displayCollateral = extraCollateral ? (extraCollateral >= 1000000 ? formatNumberPrecise(extraCollateral, 5) : commify(extraCollateral, 4)) : "0";

    // Reset amount when modal closes
    useEffect(() => {
        if (!isOpen) {
            handleSetCollateral('0');
            handleSetExtraCollateral('0');
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
                border="1px solid rgba(74, 222, 128, 0.2)"
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
                                <Box w="4px" h="24px" bg="#4ade80" borderRadius="full" />
                                <Box>
                                    <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                        Add Collateral
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
                            <Text
                                color="#666"
                                fontSize="xs"
                                mb={3}
                                fontWeight="600"
                                letterSpacing="0.1em"
                                textTransform="uppercase"
                            >
                                Collateral Amount
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
                                    max={9999999}
                                    step={0.1}
                                    onChange={_handleSetCollateral}
                                    targetValue={extraCollateral}
                                    customStep={0.1}
                                    value={extraCollateral}
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

                                <Grid templateColumns="1fr auto auto" gap={2} mt={3} alignItems="center">
                                    <Box>
                                        <Flex gap={1} align="center">
                                            <Box>
                                                <Text color="#666" fontSize="xs">Balance:</Text>
                                            </Box>
                                            <Box>
                                                <Text color="#999" fontSize="xs">
                                                    {token0Balance ? commify(formatEther(token0Balance), 3) : "0"}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text color="#888" fontSize="xs">
                                                    {token0Symbol || "TOKEN"}
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Box>
                                    <Box>
                                        <Button
                                            onClick={handleUseMax}
                                            size="xs"
                                            variant="ghost"
                                            color="#4ade80"
                                            fontSize="xs"
                                            h="20px"
                                            px={2}
                                            _hover={{ bg: "rgba(74, 222, 128, 0.1)" }}
                                        >
                                            MAX
                                        </Button>
                                    </Box>

                                </Grid>
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
                            <VStack
                                spacing={3}
                                p={4}
                                bg="rgba(0, 0, 0, 0.2)"
                                borderRadius="lg"
                                border="1px solid rgba(255, 255, 255, 0.05)"
                            >
                                <Box w="100%">
                                    <Flex justify="space-between" align="center" w="100%">
                                        <Box>
                                            <Text color="#666" fontSize="sm">Adding Collateral</Text>
                                        </Box>
                                        <Box>
                                            <Text color="white" fontSize="sm">
                                                <Text as="span" fontWeight="600">{displayCollateral}</Text>
                                                {" "}
                                                <Text as="span" color="#888">{token0Symbol}</Text>
                                            </Text>
                                        </Box>
                                    </Flex>
                                </Box>
                                <Box  w="100%">
                                    <Flex justify="space-between" align="center" w="100%">
                                        <Box>
                                            <Text color="#666" fontSize="sm">New LTV</Text>
                                        </Box>
                                        <Box>
                                            <Text color="#4ade80" fontSize="sm" fontWeight="600">
                                                {ltv ? `${ltv.toFixed(2)}%` : "0.00%"}
                                            </Text>
                                        </Box>
                                    </Flex>
                                </Box>
                            </VStack>
                        </Box>

                        {/* Action Button */}
                        <Button
                            onClick={handleClickAdd}
                            disabled={isTokenInfoLoading || !extraCollateral || Number(extraCollateral) === 0}
                            bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                            color="black"
                            size="lg"
                            h="48px"
                            fontWeight="600"
                            borderRadius="md"
                            boxShadow="0 4px 12px rgba(74, 222, 128, 0.3)"
                            _hover={{
                                bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                                transform: "translateY(-1px)",
                                boxShadow: "0 6px 16px rgba(74, 222, 128, 0.4)"
                            }}
                            _active={{
                                transform: "translateY(0)",
                                boxShadow: "0 2px 8px rgba(74, 222, 128, 0.3)"
                            }}
                            _disabled={{
                                opacity: 0.6,
                                cursor: "not-allowed"
                            }}
                        >
                            {isAdding ? <Spinner size="sm" /> : "Add Collateral"}
                        </Button>
                    </VStack>
                </Box>
            </Box>
        </>,
        modalRoot
    );
};

export default StandaloneAddCollateralModal;