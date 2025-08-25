import React, { useState } from 'react';
import {  VStack, HStack, Box, Button, Spinner, Text } from "@chakra-ui/react";
import { formatNumberPrecise, commifyDecimals, commify } from '../utils';
import { formatEther, parseEther } from "viem";

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

import {
    NumberInputRoot,
    NumberInputLabel,
    NumberInputField,
  } from "../components/ui/number-input";

const LoanAddCollateral = ({  
    size,
    token0Symbol, 
    extraCollateral, 
    handleSetCollateral, 
    handleSetExtraCollateral,
    isMobile, 
    ltv, 
    setIsAdding, 
    isLoading, 
    setIsLoading, 
    isTokenInfoLoading, 
    isAdding, 
    handleClickAdd,
    token0Balance, 
    ...props
}) => {
    
    const _handleSetCollateral = (e) => {
        const value = e.target.value;
        if (isNaN(value) || value == "" || Number(value) > 100000000)  {
            console.error("Invalid input: Not a valid number");
            return
        } 

        handleSetCollateral(value);
        handleSetExtraCollateral(value);
    }

    const displayCollateral = extraCollateral >= 1000000 ? formatNumberPrecise(extraCollateral, 5) : commify(extraCollateral, 4);

    const handleUseMax = () => {
        if (token0Balance) {
            handleSetCollateral(formatEther(token0Balance));
            handleSetExtraCollateral(formatEther(token0Balance));
        }
    };

    return (
        <Box w="100%" textAlign="center" display="flex" alignItems="center" justifyContent="center">
            <DrawerRoot w="100%">
            <DrawerTrigger asChild>
            <Button 
                h={size == "lg" ? "38px" : "32px"}
                disabled={isTokenInfoLoading}
                w="100%"
                bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                backdropFilter="blur(10px)"
                color="black"
                borderRadius="md"
                border="1px solid rgba(74, 222, 128, 0.3)"
                boxShadow="0 4px 12px rgba(74, 222, 128, 0.2)"
                fontWeight="600"
                fontSize={size == "lg" ? "sm" : "xs"}
                _hover={{
                    bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 16px rgba(74, 222, 128, 0.25)"
                }}
                _active={{
                    transform: "translateY(0)",
                    boxShadow: "0 2px 8px rgba(74, 222, 128, 0.2)"
                }}
                _disabled={{
                    opacity: 0.6,
                    cursor: "not-allowed"
                }}
            >
            {isAdding ? <Spinner size="sm" /> : "Add"}
            </Button>
            </DrawerTrigger>
            <DrawerBackdrop backdropFilter="blur(4px)" bg="rgba(0, 0, 0, 0.6)" />
            <DrawerContent 
                bg="rgba(26, 26, 26, 0.95)"
                backdropFilter="blur(20px)"
                borderLeft="1px solid rgba(74, 222, 128, 0.2)"
                boxShadow="-10px 0 30px rgba(0, 0, 0, 0.5)"
            >
                <Box>
                <DrawerHeader 
                    borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                    p={6}
                >
                    <HStack justify="space-between" align="center">
                        <HStack gap={3}>
                            <Box 
                                w="4px" 
                                h="24px" 
                                bg="#4ade80" 
                                borderRadius="full"
                            />
                            <DrawerTitle>
                                <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                    Add Collateral
                                </Text>
                            </DrawerTitle>
                        </HStack>
                        <DrawerCloseTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsAdding(false)}
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
                    </HStack>
                </DrawerHeader>
                <DrawerBody p={6}>
                    {/* <Input
                        placeholder="Amount to roll"
                        // onChange={(e) => setWrapAmount(e.target.value)}
                        w="80%"
                    /> */}        
                <VStack spacing={6} align="stretch">
                    {/* Amount Input Section */}
                    <Box>
                        <Text color="#888" fontSize="sm" mb={3} fontWeight="600">
                            COLLATERAL AMOUNT
                        </Text>
                        <Box 
                            bg="rgba(255, 255, 255, 0.02)"
                            borderRadius="lg"
                            border="1px solid rgba(255, 255, 255, 0.1)"
                            p={4}
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
                                    fontSize="xl"
                                    fontWeight="bold"
                                    _placeholder={{ color: "#666" }}
                                    _focus={{ outline: "none" }}
                                />
                            </NumberInputRoot>
                            <HStack justify="space-between" mt={3}>
                                <Text color="#666" fontSize="sm">
                                    Balance: {token0Balance ? formatEther(token0Balance).slice(0, 10) : "0"} {token0Symbol}
                                </Text>
                                <Text 
                                    color="#4ade80" 
                                    fontSize="sm" 
                                    cursor="pointer" 
                                    onClick={handleUseMax}
                                    _hover={{ textDecoration: "underline" }}
                                    fontWeight="600"
                                >
                                    Use Max
                                </Text>
                            </HStack>
                        </Box>
                    </Box>

                    {/* Preview Section */}
                    <Box 
                        bg="rgba(74, 222, 128, 0.05)"
                        border="1px solid rgba(74, 222, 128, 0.2)"
                        borderRadius="lg"
                        p={4}
                    >
                        <Text color="#4ade80" fontSize="xs" fontWeight="600" mb={3}>
                            TRANSACTION PREVIEW
                        </Text>
                        <VStack align="stretch" spacing={2}>
                            <HStack justify="space-between">
                                <Text color="#888" fontSize="sm">You're Adding</Text>
                                <HStack>
                                    <Text color="white" fontSize="sm" fontWeight="bold">
                                        {displayCollateral}
                                    </Text>
                                    <Text color="#888" fontSize="sm">
                                        {isLoading ? <Spinner size="sm" /> : token0Symbol}
                                    </Text>
                                </HStack>
                            </HStack>
                            <HStack justify="space-between">
                                <Text color="#888" fontSize="sm">New LTV</Text>
                                <Text color="#4ade80" fontSize="sm" fontWeight="bold">
                                    {ltv ? `${((ltv + parseFloat(extraCollateral || 0)) * 100).toFixed(2)}%` : "N/A"}
                                </Text>
                            </HStack>
                        </VStack>
                    </Box>

                    {/* Action Buttons */}
                    <HStack spacing={3} pt={4}>
                        <DrawerActionTrigger asChild>
                            <Button 
                                variant="outline"
                                flex="1"
                                h="48px"
                                onClick={() => setIsAdding(false)}
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
                        <Button 
                            flex="1"
                            h="48px"
                            onClick={handleClickAdd}
                            bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                            color="black"
                            fontWeight="bold"
                            _hover={{ 
                                bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                                transform: "translateY(-1px)",
                                boxShadow: "0 4px 12px rgba(74, 222, 128, 0.3)"
                            }}
                            _active={{
                                transform: "translateY(0)"
                            }}
                            isDisabled={!extraCollateral || parseFloat(extraCollateral) <= 0}
                        >
                            {isAdding ? <Spinner size="sm" /> : "Add Collateral"}
                        </Button>
                    </HStack>
                </VStack>                                
                </DrawerBody>
                </Box>
                {/* <DrawerFooter>
                </DrawerFooter> */}
            </DrawerContent>
            </DrawerRoot>
        </Box>
    )

}

export default LoanAddCollateral;