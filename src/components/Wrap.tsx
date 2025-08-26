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
    useBreakpointValue,
    Flex,
    Grid
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
import { commify } from '../utils';

 

//declare types of props
type WrapProps = {
    isWrapping: boolean;
    setIsWrapping?: (isWrapping: boolean) => void;
    handleAction: () => void;
    actionType: string;
    setActionType: (actionType: string) => void;
    wrapAmount: string;
    setWrapAmount: (wrapAmount: string) => void;
    buttonSize?: string;
    fontSize?: string;
    bnbBalance?: any;
    size?: string;
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
            <DrawerRoot>
                <DrawerTrigger asChild>
                    <Button 
                        disabled={isWrapping}
                        border="1px solid"
                        borderColor={actionType === 'wrap' ? "#4ade80" : "gray"}
                        variant={"outline"}
                        h={size == "lg" ? 6 : 4}
                        ml={size == "lg" ? 0 : 2}
                        mt={size == "lg" ? 0 : 2}
                        w={buttonSize}
                        onClick={() => setActionType('wrap')}
                        color="white"
                        borderRadius={5}
                        _hover={{ bg: "#4ade80aa", borderColor: "#4ade80", color: "white" }}
                    >
                        <Box as="span">{isWrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Wrap</Text>}</Box>
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
                                        <DrawerTitle>
                                            <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                                Wrap MON
                                            </Text>
                                        </DrawerTitle>
                                    </HStack>
                                </Box>
                                <Box>
                                    <DrawerCloseTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
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
                                            Amount to Wrap
                                        </Text>
                                    </Box>
                                    <Box 
                                        bg="rgba(0, 0, 0, 0.3)"
                                        borderRadius="12px"
                                        border="1px solid rgba(255, 255, 255, 0.1)"
                                        p={4}
                                        pb={3}
                                    >
                                        <Input
                                            placeholder="0"
                                            onChange={(e) => setWrapAmount(e.target.value)}
                                            value={wrapAmount}
                                            h="48px" 
                                            bg="transparent"
                                            border="none"
                                            color="white"
                                            fontSize="3xl"
                                            fontWeight="600"
                                            textAlign="center"
                                            _placeholder={{ color: "#444" }}
                                            _focus={{ outline: "none" }}
                                            p={0}
                                        />
                                        
                                        <Grid templateColumns="1fr auto auto" gap={2} mt={3} alignItems="center">
                                            <Flex gap={1} align="center">
                                                <Box><Text color="#666" fontSize="xs">Balance:</Text></Box>
                                                <Box>
                                                    <Text color="#999" fontSize="xs">
                                                        {bnbBalance ? commify(formatEther(bnbBalance), 3) : "0"}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                            <Text color="#666" fontSize="xs">MON</Text>
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
                                        </Grid>
                                    </Box>
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
                                            <Box><Text color="#666" fontSize="sm">You will receive</Text></Box>
                                            <Box>
                                                <Text color="white" fontSize="sm">
                                                    <Text as="span" fontWeight="600">{wrapAmount || "0"}</Text>
                                                    {" "}
                                                    <Text as="span" color="#666">WMON</Text>
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </VStack>
                                </Box>

                                {/* Action Buttons */}
                                <HStack spacing={3} mt="auto">
                                    <DrawerActionTrigger asChild>
                                        <Button 
                                            variant="outline"
                                            flex="1"
                                            h="48px"
                                            onClick={() => setWrapAmount('0')}
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
                                    <Button 
                                        flex="1"
                                        h="48px"
                                        onClick={handleAction}
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
                                        isDisabled={!wrapAmount || parseFloat(wrapAmount) <= 0}
                                    >
                                        {isWrapping ? <Spinner size="sm" /> : "Wrap MON"}
                                    </Button>
                                </HStack>
                            </VStack>
                        </DrawerBody>
                    </Box>
                </DrawerContent>
            </DrawerRoot>
            </Box>
        </Box>
    );
};

export default Wrap;