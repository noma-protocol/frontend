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

interface StandaloneUnwrapModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUnwrap: (amount: string) => void;
    isUnwrapping: boolean;
    wethBalance?: any;
}

const StandaloneUnwrapModal: React.FC<StandaloneUnwrapModalProps> = ({
    isOpen,
    onClose,
    onUnwrap,
    isUnwrapping,
    wethBalance
}) => {
    const [wrapAmount, setWrapAmount] = useState('');
    const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Create a div to render the modal into
        let root = document.getElementById('unwrap-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'unwrap-modal-root';
            document.body.appendChild(root);
        }
        setModalRoot(root);

        return () => {
            // Don't remove the root div on cleanup, reuse it
        };
    }, []);

    const handleUseMax = () => {
        if (wethBalance) {
            setWrapAmount(formatEther(wethBalance));
        }
    };

    const handleUnwrap = () => {
        if (wrapAmount && parseFloat(wrapAmount) > 0) {
            onUnwrap(wrapAmount);
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
                                    Unwrap WMON
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
                                    Amount to Unwrap
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
                                        onChange={(e) => setWrapAmount(e.target.value)}
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
                                            <Text color="#666" fontSize="sm">WMON</Text>
                                        </Box>
                                        {wethBalance && (
                                            <Box>
                                                <HStack spacing={2}>
                                                    <Box>
                                                        <Text color="#666" fontSize="xs">
                                                            Balance: {commify(formatEther(wethBalance), 4)}
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
                                                <Text as="span" color="#666">MON</Text>
                                            </Text>
                                        </Box>
                                    </Flex>
                                </VStack>
                            </Box>

                            {/* Action Button */}
                            <Button 
                                w="100%"
                                h="48px"
                                onClick={handleUnwrap}
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
                                isDisabled={!wrapAmount || parseFloat(wrapAmount) <= 0 || isUnwrapping}
                            >
                                {isUnwrapping ? <Spinner size="sm" /> : "Unwrap WMON"}
                            </Button>
                        </VStack>
                    </Box>
                </Box>
            </Box>
        </>,
        modalRoot
    );
};

export default StandaloneUnwrapModal;