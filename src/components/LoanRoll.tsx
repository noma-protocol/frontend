import React, { useState } from 'react';
import { HStack, Box, Button, Spinner, Text, VStack, Flex } from "@chakra-ui/react";
import { commifyDecimals } from '../utils';

import {
    DrawerRoot,
    DrawerTrigger,
    DrawerBackdrop,
    DrawerContent,
    DrawerCloseTrigger,
    DrawerHeader,
    DrawerTitle,
    DrawerBody,
    DrawerActionTrigger,
} from '../components/ui/drawer'; 

const LoanRoll = ({ 
    size,
    isRolling, 
    setIsRolling, 
    isLoading, 
    isTokenInfoLoading, 
    ltv,
    duration,
    loanData,
    rollLoanAmount,
    token1Info,
    handleClickRoll,
    getDaysLeft,
    calculateExpiryDate,
    ...props
}) => {

    return (
        <Box w="100%" textAlign="center" display="flex" alignItems="center" justifyContent="center">
            <DrawerRoot w="100%">
            <DrawerTrigger asChild>
            <Button 
                h={size == "lg" ? "38px" : "32px"}
                disabled={isRolling || isLoading || isTokenInfoLoading || ltv <= 1}
                w="100%"
                bg="rgba(255, 255, 255, 0.05)"
                backdropFilter="blur(10px)"
                color="white"
                borderRadius="md"
                border="1px solid rgba(255, 255, 255, 0.1)"
                boxShadow="0 2px 8px rgba(0, 0, 0, 0.1)"
                fontWeight="600"
                fontSize={size == "lg" ? "sm" : "xs"}
                _hover={{
                    bg: "rgba(74, 222, 128, 0.1)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(74, 222, 128, 0.15)",
                    borderColor: "rgba(74, 222, 128, 0.3)"
                }}
                _active={{
                    transform: "translateY(0)",
                    boxShadow: "0 2px 6px rgba(74, 222, 128, 0.1)"
                }}
                _disabled={{
                    opacity: 0.6,
                    cursor: "not-allowed"
                }}
            >
            <Box as="span">{isLoading ? <Spinner size="sm" /> : "Roll"}</Box>
            </Button>
            </DrawerTrigger>
            <DrawerBackdrop backdropFilter="blur(4px)" bg="rgba(0, 0, 0, 0.6)" />
            <DrawerContent 
                bg="rgba(26, 26, 26, 0.95)"
                backdropFilter="blur(20px)"
                borderLeft="1px solid rgba(138, 43, 226, 0.2)"
                boxShadow="-10px 0 30px rgba(0, 0, 0, 0.5)"
            >
                <Box>
                <DrawerHeader 
                    borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                    p={6}
                >
                    <HStack justify="space-between" align="center">
                        <Box>
                            <HStack gap={3}>
                                <Box 
                                    w="4px" 
                                    h="24px" 
                                    bg="#8a2be2" 
                                    borderRadius="full"
                                />
                                <Box>
                                    <DrawerTitle>
                                        <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                            Roll Loan
                                        </Text>
                                    </DrawerTitle>
                                </Box>
                            </HStack>
                        </Box>
                        <Box>
                            <DrawerCloseTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsRolling(false)}
                                color="#888"
                                _hover={{ color: "white", bg: "rgba(255, 255, 255, 0.1)" }}
                                fontSize="xl"
                                w="32px"
                                h="32px"
                                borderRadius="full"
                            >
                                ×
                            </Button>
                            </DrawerCloseTrigger>
                        </Box>
                    </HStack>
                </DrawerHeader>
                <DrawerBody p={6}>
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
                                                {isTokenInfoLoading ? <Spinner size="sm" />: token1Info?.tokenSymbol}
                                            </Text>
                                        </Box>
                                    </Flex>
                                </Box>
                            </Flex>
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
                        <Box flex="1">
                            <DrawerActionTrigger asChild>
                            <Button 
                                variant="outline"
                                flex="1"
                                h="48px"
                                onClick={() => setIsRolling(false)}
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
                            </DrawerActionTrigger>
                        </Box>
                        <Box flex="1">
                            <Button 
                            flex="1"
                            h="48px"
                            onClick={handleClickRoll}
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
                            isDisabled={isRolling || isLoading}
                        >
                            {isRolling ? <Spinner size="sm" /> : "Extend Loan"}
                            </Button>
                        </Box>
                    </HStack>
                </VStack>                              
                </DrawerBody>
                </Box>
            </DrawerContent>
            </DrawerRoot>
        </Box>
    )
}

export default LoanRoll;