import React, { useState } from 'react';
import {  HStack, Box, Button, Spinner, Text, VStack } from "@chakra-ui/react";
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
    <>
        <DrawerRoot >
        <DrawerTrigger asChild>
        <Button 
            variant={"outline"}
            h={size == "lg" ? 8 : 6}
            ml={size == "lg" ? 0 : 2}
            mt={size == "lg" ? 0 : 2}
            // onClick={() => setIsRepaying(true)}
            disabled={isRepaying || isLoading}
            w={size == "lg" ? "90px" : "80px"}
            border="1px solid #f3f7c6"
            borderRadius={5}
        >
        {isRepaying  ? <Spinner size="sm" /> : <Text fontSize={"xs"} color={"#f3f7c6"}>Repay</Text>}
        </Button>
        </DrawerTrigger>
        <DrawerBackdrop />
        <DrawerContent>
            <Box mt="80%" ml={5}>
            <DrawerHeader>
                <DrawerTitle>
                    <Text as="h3" color="#a67c00">Repay loan</Text>
                </DrawerTitle>
                <DrawerCloseTrigger asChild mt="82%" mr={5} setIsRolling={setIsRepaying}>
                    <Button variant="ghost" size="sm" onClick={() => setIsRepaying(false)}>×</Button>
                </DrawerCloseTrigger>
            </DrawerHeader>
            <DrawerBody>
                {/* <Input
                    placeholder="Amount to roll"
                    // onChange={(e) => setWrapAmount(e.target.value)}
                    w="80%"
                /> */}        
            <Box >
                <HStack>
                    <Box w="auto">
                    <NumberInputRoot
                        isMobile={isMobile}
                        min={0}
                        max={999999999}
                        step={0.1}
                        onChange={_handleSetRepayAmount}
                        ml={isMobile ? 0 : 1.5}
                        marginRight={"5px"}
                        defaultValue='0'
                        targetValue={repayAmount}
                        setValue={setRepayAmount}
                        customStep={0.1}
                    >
                        <NumberInputLabel h={"38px"} w={{ base: "", lg: "auto" }} />
                        <NumberInputField h={"38px"} w={{ base: "", lg: "200px" }} />
                    </NumberInputRoot>
                    <Text color="white" ml={2} fontSize="sm">
                         <i>{"0 to repay full loan"}</i>
                    </Text>
                    </Box>
                </HStack>
                <VStack border="1px solid #a67c00" borderRadius="md" p={3} mt={5} spacing={2} w="80%" alignItems="flex-start">
                <Box>
                    <Text color="#a67c00" fontSize="sm">Repaying:</Text>
                </Box>
                <Box>
                    <Text color="#f3f7c6" ml={2} fontSize="sm">{repayAmount == 0 ? commify(formatEther(`${loanAmount}`), 4) : commify(`${repayAmount}`)} {isLoading ? <Spinner size="sm" /> : "WBNB"}</Text>
                </Box>                
                <Box>
                    <Text color="#a67c00" fontSize="sm">Withdrawing:</Text>
                </Box>
                <Box>
                    <Text color="#f3f7c6" ml={2} fontSize="sm">{commify(collateral)} {isLoading ? <Spinner size="sm" /> : token0Symbol}</Text>
                </Box>
                </VStack>
                {/* <HStack>
                    <Box>Loan Fees:</Box>
                    <Box><Text color="white">{commifyDecimals(rollLoanAmount * 0.00027 * getDaysLeft(`${loanData?.expires}`), 4)} {isTokenInfoLoading ? <Spinner size="sm" />: token1Info.tokenSymbol}</Text></Box>
                </HStack> */}
            </Box>  
            <Box mt={10}>
            <DrawerActionTrigger asChild>
                    <Button variant="outline"  w="120px" onClick={() => setIsRepaying(false)}>
                        Cancel
                    </Button>
                </DrawerActionTrigger>
                <Button colorScheme="blue" onClick={handleClickRepayAmount} w="120px" ml={2}>
                     {isRepaying ? <Spinner size="sm" /> : "Confirm"} 
                </Button>                                
            </Box>                                
            </DrawerBody>
            </Box>
            {/* <DrawerFooter>
            </DrawerFooter> */}
        </DrawerContent>
        </DrawerRoot>
    </>
    )

}

export default LoanRepay;