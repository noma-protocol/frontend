import React, { useState } from 'react';
import {  HStack, Box, Button, Spinner, Text, VStack, Flex } from "@chakra-ui/react";
import { commify, commifyDecimals, } from '../utils';

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
import { formatEther, parseEther } from 'viem';

const LoanRepay = ({ size, token0Symbol, loanAmount, fullCollateral, repayAmount, setRepayAmount, handleClickRepayAmount, isMobile, imv, ltv, isLoading, isRepaying, setIsRepaying, ...props}) => {

    const collateral  = repayAmount == 0 ? formatEther(`${fullCollateral}`) : repayAmount / formatEther(`${imv}`);

    const _handleSetRepayAmount = (e) => {
        const value = e.target.value;
        if (isNaN(value) || value == "") return

        console.log(`${parseEther(`${Number(value)}`)} > ${loanAmount} is ${parseEther(`${Number(value)}`) > loanAmount}`)
        if (value == '' || parseEther(`${Number(value)}`) > loanAmount) return;

        setRepayAmount(value);
    }

    return (
    <Box w="100%" textAlign="center" display="flex" alignItems="center" justifyContent="center">
        <DrawerRoot w="100%">
        <DrawerTrigger asChild>
        <Button 
            h={size == "lg" ? "38px" : "32px"}
            disabled={isRepaying || isLoading}
            w="100%"
            bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            backdropFilter="blur(10px)"
            color="white"
            borderRadius="md"
            border="1px solid rgba(239, 68, 68, 0.3)"
            boxShadow="0 4px 12px rgba(239, 68, 68, 0.2)"
            fontWeight="600"
            fontSize={size == "lg" ? "sm" : "xs"}
            _hover={{
                bg: "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)",
                transform: "translateY(-1px)",
                boxShadow: "0 6px 16px rgba(239, 68, 68, 0.25)"
            }}
            _active={{
                transform: "translateY(0)",
                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.2)"
            }}
            _disabled={{
                opacity: 0.6,
                cursor: "not-allowed"
            }}
        >
        {isRepaying  ? <Spinner size="sm" /> : "Repay"}
        </Button>
        </DrawerTrigger>
        <DrawerBackdrop backdropFilter="blur(4px)" bg="rgba(0, 0, 0, 0.6)" />
        <DrawerContent 
            bg="rgba(26, 26, 26, 0.95)"
            backdropFilter="blur(20px)"
            borderLeft="1px solid rgba(239, 68, 68, 0.2)"
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
                            bg="#ef4444" 
                            borderRadius="full"
                        />
                        <DrawerTitle>
                            <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                Repay Loan
                            </Text>
                        </DrawerTitle>
                    </HStack>
                    <DrawerCloseTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsRepaying(false)}
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
                        REPAYMENT AMOUNT
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
                            max={999999999}
                            step={0.1}
                            onChange={_handleSetRepayAmount}
                            defaultValue='0'
                            targetValue={repayAmount}
                            customStep={0.1}
                        >
                            <NumberInputField 
                                h="48px" 
                                bg="transparent"
                                border="none"
                                color="white"
                                fontSize="xl"
                                fontWeight="bold"
                                placeholder="0.00"
                                _placeholder={{ color: "#666" }}
                                _focus={{ outline: "none" }}
                            />
                        </NumberInputRoot>
                        <Text color="#666" fontSize="xs" mt={3} fontStyle="italic">
                            Enter 0 to repay full loan
                        </Text>
                    </Box>
                </Box>

                {/* Preview Section */}
                <Box 
                    bg="rgba(239, 68, 68, 0.05)"
                    border="1px solid rgba(239, 68, 68, 0.2)"
                    borderRadius="lg"
                    p={4}
                >
                    <Text color="#ef4444" fontSize="xs" fontWeight="600" mb={3}>
                        TRANSACTION PREVIEW
                    </Text>
                    <VStack align="stretch" spacing={3}>
                        <Flex justify="space-between" align="center">
                            <Text color="#888" fontSize="sm">Repaying</Text>
                            <Flex align="center" gap={3}>
                                <Text color="white" fontSize="sm" fontWeight="bold">
                                    {repayAmount == 0 ? commify(formatEther(`${loanAmount}`), 4) : commify(`${repayAmount}`)}
                                </Text>
                                <Text color="#888" fontSize="sm" ml="auto">
                                    {isLoading ? <Spinner size="sm" /> : "WMON"}
                                </Text>
                            </Flex>
                        </Flex>
                        <Box borderTop="1px solid rgba(255, 255, 255, 0.05)" pt={3}>
                            <Flex justify="space-between" align="center">
                                <Text color="#888" fontSize="sm">Collateral to Withdraw</Text>
                                <Flex align="center" gap={3}>
                                    <Text color="#4ade80" fontSize="sm" fontWeight="bold">
                                        {commify(collateral)}
                                    </Text>
                                    <Text color="#888" fontSize="sm" ml="auto">
                                        {isLoading ? <Spinner size="sm" /> : token0Symbol}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Box>
                    </VStack>
                </Box>

                {/* Action Buttons */}
                <HStack spacing={3} pt={4}>
                    <DrawerActionTrigger asChild>
                        <Button 
                            variant="outline"
                            flex="1"
                            h="48px"
                            onClick={() => setIsRepaying(false)}
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
                        onClick={handleClickRepayAmount}
                        bg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        color="white"
                        fontWeight="bold"
                        _hover={{ 
                            bg: "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)",
                            transform: "translateY(-1px)",
                            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
                        }}
                        _active={{
                            transform: "translateY(0)"
                        }}
                    >
                        {isRepaying ? <Spinner size="sm" /> : "Repay Loan"}
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

export default LoanRepay;