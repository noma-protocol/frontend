import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HStack, Box, Button, Spinner, Text, VStack, Flex } from "@chakra-ui/react";
import { commifyDecimals } from '../utils';

interface StandaloneRollModalProps {
    isOpen: boolean;
    onClose: () => void;
    isRolling: boolean;
    isLoading: boolean;
    isTokenInfoLoading: boolean;
    ltv: number;
    duration: number;
    loanData: any;
    rollLoanAmount: number;
    token1Info: any;
    handleClickRoll: () => void;
    getDaysLeft: (expires: string) => number;
    calculateExpiryDate: (daysLeft: number) => string;
}

const StandaloneRollModal: React.FC<StandaloneRollModalProps> = ({
    isOpen,
    onClose,
    isRolling,
    isLoading,
    isTokenInfoLoading,
    ltv,
    duration,
    loanData,
    rollLoanAmount,
    token1Info,
    handleClickRoll,
    getDaysLeft,
    calculateExpiryDate
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
                border="1px solid rgba(138, 43, 226, 0.2)"
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
                                <Box w="4px" h="24px" bg="#8a2be2" borderRadius="full" />
                                <Box>
                                    <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                        Roll Loan
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
                        {/* Loan Extension Details */}
                        <Box>
                            <Text color="#888" fontSize="sm" mb={3} fontWeight="600">
                                EXTENSION DETAILS
                            </Text>
                            <Box
                                bg="rgba(255, 255, 255, 0.02)"
                                borderRadius="lg"
                                border="1px solid rgba(255, 255, 255, 0.1)"
                                p={4}
                            >
                                <VStack align="stretch" spacing={3}>
                                    <Box>
                                        <Flex justify="space-between" align="center">
                                            <Box>
                                                <Text color="#888" fontSize="sm">New Duration</Text>
                                            </Box>
                                            <Box>
                                                <Text color="white" fontSize="sm" fontWeight="bold">
                                                    {duration / 86400} days
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Box>
                                    <Box>
                                        <Flex justify="space-between" align="center">
                                            <Box>
                                                <Text color="#888" fontSize="sm">New Expiry Date</Text>
                                            </Box>
                                            <Box>
                                                <Text color="white" fontSize="sm" fontWeight="bold">
                                                    {calculateExpiryDate(getDaysLeft(`${loanData?.expires}`))}
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Box>
                                </VStack>
                            </Box>
                        </Box>

                        {/* Fee Preview */}
                        <Box
                            bg="rgba(138, 43, 226, 0.05)"
                            border="1px solid rgba(138, 43, 226, 0.2)"
                            borderRadius="lg"
                            p={4}
                        >
                            <Text color="#8a2be2" fontSize="xs" fontWeight="600" mb={3}>
                                TRANSACTION PREVIEW
                            </Text>
                            <VStack align="stretch" spacing={3}>
                                <Box>
                                    <Flex justify="space-between" align="center">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Loan Amount</Text>
                                        </Box>
                                        <Box>
                                            <Flex align="center" gap={3}>
                                                <Box>
                                                    <Text color="white" fontSize="sm" fontWeight="bold">
                                                        {commifyDecimals(rollLoanAmount, 4)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm" ml="auto">
                                                        {isTokenInfoLoading ? <Spinner size="sm" /> : token1Info?.tokenSymbol}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Box>
                                    </Flex>
                                </Box>
                                <Box borderTop="1px solid rgba(255, 255, 255, 0.05)" pt={3}>
                                    <Flex justify="space-between" align="center">
                                        <Box>
                                            <Text color="#888" fontSize="sm">Extension Fee</Text>
                                        </Box>
                                        <Box>
                                            <Flex align="center" gap={3}>
                                                <Box>
                                                    <Text color="#8a2be2" fontSize="sm" fontWeight="bold">
                                                        {commifyDecimals((rollLoanAmount * 0.057 / 100) * (duration / 86400), 4)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text color="#888" fontSize="sm" ml="auto">
                                                        {isTokenInfoLoading ? <Spinner size="sm" /> : token1Info?.tokenSymbol}
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
                                h="48px"
                                onClick={onClose}
                                bg="transparent"
                                borderColor="rgba(255, 255, 255, 0.2)"
                                color="white"
                                _hover={{
                                    bg: "rgba(255, 255, 255, 0.05)",
                                    borderColor: "rgba(255, 255, 255, 0.3)"
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                flex={1}
                                h="48px"
                                onClick={() => {
                                    handleClickRoll();
                                    onClose();
                                }}
                                bg="linear-gradient(135deg, #8a2be2 0%, #6b21a8 100%)"
                                color="white"
                                fontWeight="bold"
                                _hover={{
                                    bg: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                                    transform: "translateY(-1px)",
                                    boxShadow: "0 4px 12px rgba(138, 43, 226, 0.3)"
                                }}
                                _active={{
                                    transform: "translateY(0)"
                                }}
                                disabled={isRolling || isLoading || isTokenInfoLoading || ltv <= 1}
                                _disabled={{
                                    opacity: 0.6,
                                    cursor: "not-allowed"
                                }}
                            >
                                {isRolling ? <Spinner size="sm" /> : "Extend Loan"}
                            </Button>
                        </HStack>
                    </VStack>
                </Box>
            </Box>
        </>,
        modalRoot
    );
};

export default StandaloneRollModal;