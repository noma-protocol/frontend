import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    VStack,
    Box,
    HStack,
    Text,
    Button,
    Input,
    Spinner,
    Flex
} from '@chakra-ui/react';
import { formatEther, parseEther } from "viem";
import { commify } from '../utils';

interface StandaloneWrapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWrap: (amount: string) => void;
    isWrapping: boolean;
    bnbBalance?: any;
}

const StandaloneWrapModal: React.FC<StandaloneWrapModalProps> = ({
    isOpen,
    onClose,
    onWrap,
    isWrapping,
    bnbBalance
}) => {
    const [wrapAmount, setWrapAmount] = useState('');
    const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Create a div to render the modal into
        let root = document.getElementById('wrap-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'wrap-modal-root';
            document.body.appendChild(root);
        }
        setModalRoot(root);

        return () => {
            // Don't remove the root div on cleanup, reuse it
        };
    }, []);

    const handleAmountChange = (value: string) => {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = value.replace(/[^0-9.]/g, '');
        
        // Prevent multiple decimal points
        const parts = cleanedValue.split('.');
        if (parts.length > 2) {
            // Join all parts after the first decimal point
            const formattedValue = `${parts[0]}.${parts.slice(1).join('')}`;
            setWrapAmount(formattedValue);
        } else {
            setWrapAmount(cleanedValue);
        }
    };

    const handleUseMax = () => {
        if (bnbBalance) {
            const maxAmount = formatEther(bnbBalance);
            // Use the same validation as handleAmountChange
            handleAmountChange(maxAmount);
        }
    };

    const handleWrap = () => {
        if (wrapAmount && parseFloat(wrapAmount) > 0) {
            onWrap(wrapAmount);
        }
    };

    // Reset wrap amount when modal closes
    useEffect(() => {
        if (!isOpen) {
            setWrapAmount('');
        }
    }, [isOpen]);

    if (!modalRoot || !isOpen) return null;

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <Box
                position="fixed"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="rgba(0, 0, 0, 0.6)"
                backdropFilter="blur(4px)"
                zIndex="9998"
                onClick={onClose}
            />
            
            {/* Modal */}
            <Box
                position="fixed"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                bg="rgba(26, 26, 26, 0.95)"
                backdropFilter="blur(20px)"
                border="1px solid rgba(74, 222, 128, 0.2)"
                boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                borderRadius="lg"
                maxW="500px"
                w="90%"
                zIndex="9999"
                onClick={(e) => e.stopPropagation()}
            >
                <Box>
                    {/* Header */}
                    <Box borderBottom="1px solid rgba(255, 255, 255, 0.1)" p={6}>
                        <HStack justify="space-between" align="start">
                            <Box>
                                <Text as="h3" color="white" fontSize="xl" fontWeight="bold">
                                    Wrap MON
                                </Text>
                            </Box>
                            <Box>
                                <Button 
                                variant="ghost" 
                                size="sm" 
                                color="#888"
                                _hover={{ color: "white", bg: "rgba(255, 255, 255, 0.1)" }}
                                fontSize="xl"
                                w="32px"
                                h="32px"
                                borderRadius="full"
                                onClick={onClose}
                            >
                                ×
                            </Button>
                            </Box>
                        </HStack>
                    </Box>

                    {/* Body */}
                    <Box p={6}>
                        <VStack spacing={6} align="stretch">
                            {/* Amount Input Section */}
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
                                <Box 
                                    bg="rgba(0, 0, 0, 0.3)"
                                    borderRadius="12px"
                                    border="1px solid rgba(255, 255, 255, 0.1)"
                                    p={4}
                                    pb={3}
                                >
                                    <Input
                                        placeholder="0"
                                        onChange={(e) => handleAmountChange(e.target.value)}
                                        value={wrapAmount}
                                        h="48px" 
                                        bg="transparent"
                                        border="none"
                                        fontSize="2xl"
                                        fontWeight="600"
                                        color="white"
                                        _placeholder={{ color: "#666" }}
                                        _hover={{ bg: "transparent" }}
                                        _focus={{ 
                                            bg: "transparent", 
                                            boxShadow: "none",
                                            border: "none"
                                        }}
                                        p={0}
                                        textAlign="right"
                                    />
                                    <HStack justify="space-between" mt={2}>
                                        <Box>
                                            <Text color="#666" fontSize="sm">MON</Text>
                                        </Box>
                                        {bnbBalance && (
                                            <Box>
                                                <HStack spacing={2}>
                                                    <Box>
                                                        <Text color="#666" fontSize="xs">
                                                            Balance: {commify(formatEther(bnbBalance), 4)}
                                                        </Text>
                                                    </Box>
                                                    <Box>
                                                        <Button
                                                    onClick={handleUseMax}
                                                    size="xs"
                                                    variant="ghost"
                                                    color="#4ade80"
                                                    fontSize="xs"
                                                    h="20px"
                                                    px={2}
                                                    _hover={{ bg: "rgba(74, 222, 128, 0.1)" }}
                                                >
                                                    MAX
                                                </Button>
                                                    </Box>
                                                </HStack>
                                            </Box>
                                        )}
                                    </HStack>
                                </Box>
                            </Box>

                            {/* Transaction Details */}
                            <Box>
                                <VStack 
                                    spacing={3} 
                                    p={4} 
                                    bg="rgba(0, 0, 0, 0.2)" 
                                    borderRadius="lg"
                                    border="1px solid rgba(255, 255, 255, 0.05)"
                                >
                                    <Flex justify="space-between" align="center" w="100%">
                                        <Box>
                                            <Text color="#666" fontSize="sm">You will receive</Text>
                                        </Box>
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

                            {/* Action Button */}
                            <Button 
                                w="100%"
                                h="48px"
                                onClick={handleWrap}
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
                                isDisabled={!wrapAmount || parseFloat(wrapAmount) <= 0 || isWrapping}
                            >
                                {isWrapping ? <Spinner size="sm" /> : "Wrap MON"}
                            </Button>
                        </VStack>
                    </Box>
                </Box>
            </Box>
        </>,
        modalRoot
    );
};

export default StandaloneWrapModal;