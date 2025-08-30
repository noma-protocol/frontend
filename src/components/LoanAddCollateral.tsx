import React, { useState } from 'react';
import {  VStack, HStack, Box, Button, Spinner, Text, Flex, Grid } from "@chakra-ui/react";
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

    const displayCollateral = extraCollateral ? (extraCollateral >= 1000000 ? formatNumberPrecise(extraCollateral, 5) : commify(extraCollateral, 4)) : "0";

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
            <Box as="span">{isAdding ? <Spinner size="sm" /> : "Add"}</Box>
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
                    <HStack justify="space-between" align="start">
                        <Box>
                            <HStack gap={1}>
                                <Box>
                                    <DrawerTitle>
                                        <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                            Add Collateral
                                        </Text>
                                    </DrawerTitle>
                                </Box>
                            </HStack>                            
                        </Box>
                        <Box>
                            <DrawerCloseTrigger asChild >
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
                        </Box>
                    </HStack>
                </DrawerHeader>
                <DrawerBody p={6}>     
                <VStack spacing={6} align="stretch">
                    {/* Amount Input Section */}
                    <Box>
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
                        </Box>
                        <HStack>
                            <Box>
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
                                        <Box><Text color="#666" fontSize="xs">Balance:</Text></Box>
                                        <Box>
                                            <Text color="#999" fontSize="xs">
                                                {token0Balance ? commify(formatEther(token0Balance), 3) : "0"}
                                            </Text>                                        
                                        </Box>
                                    </Flex>
                                </Box>
                                <Box>
                                    <Text color="#666" fontSize="xs">{token0Symbol}</Text>
                                </Box>
                                <Box>
                                    <Button
                                    size="xs"
                                    variant="unstyled"
                                    color="#4ade80"
                                    onClick={handleUseMax}
                                    fontSize="xs"
                                    fontWeight="600"
                                    _hover={{ color: "#3fd873" }}
                                    h="auto"
                                    minW="auto"
                                    p={0}
                                >
                                    Use Max
                                </Button>
                                </Box>
                            </Grid>
                            </Box>                            
                        </Box>
                        </HStack>

                    </Box>

                    {/* Preview Section */}
                    <Box 
                        bg="transparent"
                        border="1px solid rgba(74, 222, 128, 0.3)"
                        borderRadius="12px"
                        p={4}
                    >
                        <Text 
                            color="#4ade80" 
                            fontSize="xs" 
                            fontWeight="600" 
                            mb={4} 
                            letterSpacing="0.1em"
                            textTransform="uppercase"
                        >
                            Transaction Preview
                        </Text>
                        <VStack align="stretch" spacing={3}>
                            <Flex justify="space-between" align="center">
                                <Box>
                                    <Text color="#666" fontSize="sm">Adding</Text>
                                </Box>
                                <Box>
                                    <Text color="white" fontSize="sm">
                                        <Text as="span" fontWeight="600">{displayCollateral}</Text>
                                        {" "}
                                        <Text as="span" color="#666">{token0Symbol}</Text>
                                    </Text>                                    
                                </Box>
                            </Flex>
                            
                            <Flex justify="space-between" align="center">
                                <Box>
                                    <Text color="#666" fontSize="sm">New LTV</Text>
                                </Box>
                                <Box>
                                    <Text color="#4ade80" fontSize="lg" fontWeight="600">
                                        {ltv ? `${(ltv * 100).toFixed(2)}%` : "100.00%"}
                                    </Text>                                    
                                </Box>
                            </Flex>
                        </VStack>
                    </Box>

                    {/* Action Buttons */}
                    <HStack spacing={3} mt="auto">
                        <Box>
                            <DrawerActionTrigger asChild>
                                <Button 
                                variant="outline"
                                flex="1"
                                h="48px"
                                onClick={() => setIsAdding(false)}
                                bg="transparent"
                                borderColor="rgba(255, 255, 255, 0.2)"
                                color="white"
                                fontSize="sm"
                                fontWeight="500"
                                _hover={{ 
                                    bg: "rgba(255, 255, 255, 0.05)",
                                    borderColor: "rgba(255, 255, 255, 0.3)"
                                }}
                            >
                                Cancel
                            </Button>
                            </DrawerActionTrigger>
                        </Box>
                        <Box>
                            <Button 
                            flex="1"
                            h="48px"
                            onClick={handleClickAdd}
                            bg="#4ade80"
                            color="black"
                            fontSize="sm"
                            fontWeight="600"
                            _hover={{ 
                                bg: "#3fd873"
                            }}
                            _active={{
                                bg: "#22c55e"
                            }}
                            isDisabled={!extraCollateral || parseFloat(extraCollateral) <= 0}
                        >
                            {isAdding ? <Spinner size="sm" /> : "Add Collateral"}
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

export default LoanAddCollateral;