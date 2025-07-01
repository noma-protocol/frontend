import React, { useState, useEffect } from 'react';
import {
    VStack,
    Box,
    SimpleGrid,
    HStack,
    Image,
    Text,
    Button,
    Input,
    Spinner,
    useBreakpointValue
} from '@chakra-ui/react';
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
import { ethers } from 'ethers';
import { formatEther, parseEther } from "viem";

 

//declare types of props
type WrapProps = {
    isWrapping: boolean;
    setIsWrapping: (isWrapping: boolean) => void;
    handleAction: () => void;
    actionType: string;
    setActionType: (actionType: string) => void;
    wrapAmount: string;
    setWrapAmount: (wrapAmount: string) => void;
    buttonSize?: string;
};

const Wrap = ({
    wrapAmount,
    isWrapping,
    // setIsWrapping,
    handleAction,
    actionType,
    setActionType,
    // wrapAmount,
    setWrapAmount,
    fontSize,
    buttonSize,
    bnbBalance,
    size = "sm"
}) => {

    const handleUseMax = () => {
        if (bnbBalance) {
            setWrapAmount(formatEther(bnbBalance));
        }
    };

    return (
        <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
            <Box>
            <DrawerRoot >
                <DrawerTrigger asChild>
                    <Button 
                        disabled={isWrapping}
                        border="1px solid"
                        borderColor={actionType === 'wrap' ? "#4ade80" : "gray"}
                        variant={"outline"}
                        h={size == "lg" ? 8 : 6}
                        ml={size == "lg" ? 0 : 2}
                        mt={size == "lg" ? 0 : 2}
                        w={buttonSize}
                        onClick={() => setActionType('wrap')}
                        color="white"
                        borderRadius={5}
                        _hover={{ bg: "#4ade80aa", borderColor: "#4ade80", color: "white" }}
                    >
                        {/* <Box minH="20px" minW="60px" display="flex" alignItems="center" justifyContent="center"> */}
                            {isWrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Wrap</Text>}
                        {/* </Box> */}
                    </Button>
                </DrawerTrigger>
                <DrawerBackdrop />
                <DrawerContent>
                    <Box  mt="80%" ml={5} >
                        <DrawerHeader>
                            <DrawerTitle>
                                <Text as="h3" color="#4ade80">Wrap BNB</Text>
                            </DrawerTitle>
                            <DrawerCloseTrigger asChild mt="82%" mr={5}>
                                <Button variant="ghost" size="sm" >×</Button>
                            </DrawerCloseTrigger>
                        </DrawerHeader>
                        <DrawerBody>
                            <Input
                                placeholder="Enter amount to wrap"
                                onChange={(e) => setWrapAmount(e.target.value)}
                                value={wrapAmount}
                                w="90%"
                                mb={4}
                            />
                            <VStack textAlign="left" alignItems="left" spacing={1} mt={2}>
                            <Text ml={2} fontSize="sm" cursor="pointer" onClick={handleUseMax}>
                                Use max
                            </Text>
                            </VStack>

                            <HStack mt={4} spacing={3} justifyContent="left" ml={2} w="90%">
                                <DrawerActionTrigger asChild>
                                    <Button  w="45%" colorScheme="blue" onClick={() => setWrapAmount('0')} border="1px solid gray" color="black" backgroundColor={"#dadada"} _hover={{ bg: "#f44336", borderColor: "#f44336", color: "white" }}>
                                        <Box minH="20px" display="flex" alignItems="center" justifyContent="center" color="black">
                                            Cancel
                                        </Box>
                                    </Button>
                                </DrawerActionTrigger>
                                <Button  w="45%" variant="outline" onClick={handleAction} border="1px solid gray" _hover={{ bg: "#4CAF50", borderColor: "#4CAF50", color: "white" }}>
                                    <Box minH="20px" display="flex" alignItems="center" justifyContent="center" color="white">
                                        {isWrapping ? <Spinner size="sm" /> : "Confirm"}
                                    </Box>
                                </Button>
                            </HStack>
                        </DrawerBody>
                    </Box>
                </DrawerContent>
            </DrawerRoot>
            </Box>
        </Box>
    );
};

export default Wrap;