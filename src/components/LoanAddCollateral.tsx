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

const LoadAddCollateral = ({  
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
        <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
            <Box mt={-1}>
            <DrawerRoot >
            <DrawerTrigger asChild>
            <Button 
                variant={"outline"}
                h={size == "lg" ? 8 : 6}
                ml={size == "lg" ? 0 : 2}
                mt={size == "lg" ? 0 : 2}
                // onClick={() => setIsLoading(true)}
                disabled={isTokenInfoLoading}
                w={size == "lg" ? "90px" : "80px"}
                border="1px solid #f3f7c6"
                borderRadius={5}
                _hover={{ bg: "#4ade80aa", borderColor: "#4ade80", color: "white" }}
            >
            {isAdding ? <Spinner size="sm" /> : <Text fontSize={"xs"} color={"#f3f7c6"}>Add </Text>}
            </Button>
            </DrawerTrigger>
            <DrawerBackdrop />
            <DrawerContent >
                <Box mt="80%" ml={5}>
                <DrawerHeader>
                    <DrawerTitle>
                        <Text as="h3" color="#4ade80">Add Collateral</Text>
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
                            max={9999999}
                            step={0.1}
                            onChange={_handleSetCollateral}
                            ml={isMobile ? 0 : 1.5}
                            marginRight={"5px"}
                            targetValue={extraCollateral}
                            customStep={0.1}
                            value={extraCollateral}
                        >
                            <NumberInputLabel h={"38px"} w={{ base: "", lg: "auto" }} />
                            <NumberInputField h={"38px"} w={{ base: "", lg: "200px" }} />
                        </NumberInputRoot>
                        </Box>
                    </HStack>
                    <VStack textAlign="left" alignItems="left" spacing={1} mt={2}>
                    <Text ml={2} fontSize="sm" cursor="pointer" onClick={handleUseMax}>
                        Use max
                    </Text>
                    </VStack>
                </Box>
                <Box>
                    <VStack border="1px solid #4ade80" borderRadius="md" p={3} mt={5} spacing={2} w="80%" alignItems="flex-start">
                    <Box>
                        <Text color="#4ade80" fontSize="sm">Adding:</Text>
                    </Box>
                    <Box>
                        <Text color="#f3f7c6" ml={2} fontSize="sm">{displayCollateral} {isLoading ? <Spinner size="sm" /> : token0Symbol}</Text>
                    </Box>                

                    </VStack>
                </Box>
                <Box mt={10}>
                <DrawerActionTrigger asChild>
                        <Button variant="outline"  w="120px" onClick={() => setIsAdding(false)}>
                            Cancel
                        </Button>
                    </DrawerActionTrigger>
                    <Button colorScheme="blue" onClick={handleClickAdd} w="120px" ml={2}>
                        {isAdding ? <Spinner size="sm" /> : "Confirm"}
                    </Button>                                
                </Box>                                
                </DrawerBody>
                </Box>
                {/* <DrawerFooter>
                </DrawerFooter> */}
            </DrawerContent>
            </DrawerRoot>
            </Box>
        </Box>
    )

}

export default LoadAddCollateral;