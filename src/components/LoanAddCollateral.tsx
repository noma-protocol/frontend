import React, { useState } from 'react';
import {  HStack, Box, Button, Spinner, Text } from "@chakra-ui/react";
import { commifyDecimals, } from '../utils';

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

const LoadAddCollateral = ({  extraCollateral, handleSetCollateral, isMobile, ltv, setIsAdding, isLoading, isAdding, handleClickAdd, ...props}) => {

    return (
    <>
        <DrawerRoot >
        <DrawerTrigger asChild>
        <Button 
            variant={"outline"}
            h={8}
            // onClick={() => setIsAdding(true)}
            disabled={isAdding || isLoading}
            w={"120px"}
            border="1px solid"
        >
        {isAdding ? <Spinner size="sm" /> : "Add"}
        </Button>
        </DrawerTrigger>
        <DrawerBackdrop />
        <DrawerContent>
            <Box mt="80%" ml={5}>
            <DrawerHeader>
                <DrawerTitle>
                    <Text as="h3" color="#a67c00">Add Collateral</Text>
                </DrawerTitle>
                <DrawerCloseTrigger asChild mt="82%" mr={5} setIsRolling={setIsAdding}>
                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>×</Button>
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
                        onChange={handleSetCollateral}
                        ml={isMobile ? 0 : 1.5}
                        marginRight={"5px"}
                    >
                        <NumberInputLabel h={"38px"} w={{ base: "", lg: "auto" }} />
                        <NumberInputField h={"38px"} w={{ base: "", lg: "200px" }} />
                    </NumberInputRoot>
                    </Box>
                </HStack>
                {/* <HStack>
                    <Box>Loan Fees:</Box>
                    <Box><Text color="white">{commifyDecimals(rollLoanAmount * 0.00027 * getDaysLeft(`${loanData?.expires}`), 4)} {isTokenInfoLoading ? <Spinner size="sm" />: token1Info.tokenSymbol}</Text></Box>
                </HStack> */}
            </Box>  
            <Box mt={10}>
            <DrawerActionTrigger asChild>
                    <Button variant="outline"  w="120px" onClick={() => setIsAdding(false)}>
                        Cancel
                    </Button>
                </DrawerActionTrigger>
                <Button colorScheme="blue" onClick={handleClickAdd} w="120px">
                    {isAdding ? <Spinner size="sm" /> : "Confirm"}
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

export default LoadAddCollateral;