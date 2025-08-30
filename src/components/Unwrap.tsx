import React, { useState, useEffect, memo } from 'react';
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
    DialogRoot,
    DialogTrigger,
    DialogBackdrop,
    DialogContent,
    DialogCloseTrigger,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
} from '../components/ui/dialog';
import { ethers } from 'ethers';
import { formatEther, parseEther } from "viem";
import { commify } from '../utils';

//declare types of props
type UnwrapProps = {
    isUnwrapping: boolean;
    setIsUnwrapping?: (isUnwrapping: boolean) => void;
    handleAction: () => void;
    actionType: string;
    setActionType: (actionType: string) => void;
    wrapAmount: string;
    setWrapAmount: (wrapAmount: string) => void;
    buttonSize?: string;
    fontSize?: string;
    token1Balance?: any;
    size?: string;
    isOpen?: boolean;
    setIsOpen?: (isOpen: boolean) => void;
};

const Unwrap = ({
    isUnwrapping,
    // setIsWrapping,
    handleAction,
    actionType,
    setActionType,
    wrapAmount,
    setWrapAmount,
    fontSize,
    buttonSize,
    token1Balance,
    size="sm",
    isOpen: controlledIsOpen,
    setIsOpen: controlledSetIsOpen
}) => {
    // Use controlled state if provided, otherwise use local state
    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
    const setIsOpen = controlledSetIsOpen || setLocalIsOpen;

    const handleUseMax = () => {
        if (token1Balance) {
            setWrapAmount(formatEther(token1Balance));
        }
    };

    return (
        <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
            <Box>
            <DialogRoot 
                open={isOpen} 
                onOpenChange={(e) => setIsOpen(e.open)}
                placement="center"
                size="md"
            >
                <DialogTrigger asChild>
                    <Button 
                        disabled={isUnwrapping}
                        border="1px solid"
                        borderColor={actionType === 'unwrap' ? "#4ade80" : "gray"}
                        variant={"outline"}
                        h={size == "lg" ? 6: 4}
                        ml={size == "lg" ? 0 : 2}
                        mt={size == "lg" ? 0 : 1}
                        w={buttonSize}
                        onClick={() => {
                            setActionType('unwrap');
                            setIsOpen(true);
                        }}
                        color="white"
                        borderRadius={5}
                        _hover={{ bg: "#4ade80aa", borderColor: "#4ade80", color: "white" }}
                    >
                        <Box minH="20px" minW="60px" display="flex" alignItems="center" justifyContent="center">
                            {isUnwrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Unwrap</Text>}
                        </Box>
                    </Button>
                </DialogTrigger>
                <DialogBackdrop backdropFilter="blur(4px)" bg="rgba(0, 0, 0, 0.6)" />
                <DialogContent 
                    bg="rgba(26, 26, 26, 0.95)"
                    backdropFilter="blur(20px)"
                    border="1px solid rgba(74, 222, 128, 0.2)"
                    boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                    maxW="500px"
                    mx="auto"
                >
                    <Box>
                        <DialogHeader 
                            borderBottom="1px solid rgba(255, 255, 255, 0.1)"
                            p={6}
                        >
                            <HStack justify="space-between" align="start">
                                <Box>
                                    <HStack gap={1}>
                                        <DialogTitle>
                                            <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                                Unwrap WMON
                                            </Text>
                                        </DialogTitle>
                                    </HStack>
                                </Box>
                                <Box>
                                    <DialogCloseTrigger asChild>
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
                                    </DialogCloseTrigger>
                                </Box>
                            </HStack>
                        </DialogHeader>
                        <DialogBody p={6}>
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
                                            Amount to Unwrap
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
                                                        {token1Balance ? commify(formatEther(token1Balance), 3) : "0"}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                            <Text color="#666" fontSize="xs">WMON</Text>
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
                                                    <Text as="span" color="#666">MON</Text>
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </VStack>
                                </Box>

                                {/* Action Buttons */}
                                <Box mt="auto">
                                    <Button 
                                        w="100%"
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
                                        {isUnwrapping ? <Spinner size="sm" /> : "Unwrap WMON"}
                                    </Button>
                                </Box>
                            </VStack>
                        </DialogBody>
                    </Box>
                </DialogContent>
            </DialogRoot>
            </Box>
        </Box>
    );
};

export default memo(Unwrap);