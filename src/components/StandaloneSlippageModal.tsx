import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    VStack,
    Box,
    HStack,
    Text,
    Button,
    Input,
    Flex
} from '@chakra-ui/react';

interface StandaloneSlippageModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSlippage: string;
    onSetSlippage: (slippage: string) => void;
}

const StandaloneSlippageModal: React.FC<StandaloneSlippageModalProps> = ({
    isOpen,
    onClose,
    currentSlippage,
    onSetSlippage
}) => {
    const [slippageInput, setSlippageInput] = useState(currentSlippage);
    const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Create a div to render the modal into
        let root = document.getElementById('slippage-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'slippage-modal-root';
            document.body.appendChild(root);
        }
        setModalRoot(root);

        return () => {
            // Don't remove the root div on cleanup, reuse it
        };
    }, []);

    // Update local state when modal opens with current slippage
    useEffect(() => {
        if (isOpen) {
            setSlippageInput(currentSlippage);
        }
    }, [isOpen, currentSlippage]);

    const handleSlippageChange = (value: string) => {
        // Allow typing any value while user is typing
        setSlippageInput(value);
    };

    const validateSlippage = (value: string): string => {
        // Remove any non-numeric characters except decimal point
        const cleanedValue = value.replace(/[^\d.]/g, '');
        const numValue = parseFloat(cleanedValue);
        
        if (cleanedValue === '' || isNaN(numValue)) {
            return '0.5'; // Default to 0.5%
        } else if (numValue > 100) {
            return '100';
        } else if (numValue < 0) {
            return '0';
        } else {
            return cleanedValue;
        }
    };

    const handleConfirm = () => {
        const validatedValue = validateSlippage(slippageInput);
        onSetSlippage(validatedValue);
        onClose();
    };

    const presetValues = ['0.1', '0.5', '1', '5', '10', '25'];

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
                bg="#1a1a1a"
                border="1px solid #2a2a2a"
                borderRadius="xl"
                p={4}
                minW="275px"
                maxW="343px"
                zIndex="9999"
                onClick={(e) => e.stopPropagation()}
            >
                <VStack spacing={4} align="stretch">
                    {/* Header */}
                    <Flex justify="space-between" align="center">
                        <Text fontSize="xl" fontWeight="bold" color="white" ml={2}>
                            Slippage Tolerance
                        </Text>
                        <Button
                            size="sm"
                            variant="ghost"
                            color="white"
                            _hover={{ bg: '#2a2a2a' }}
                            onClick={onClose}
                        >
                            ✕
                        </Button>
                    </Flex>

                    {/* Description */}
                    <Text fontSize="sm" color="#888">
                        Your transaction will revert if the price changes unfavorably by more than this percentage.
                    </Text>

                    {/* Input */}
                    <Box>
                        <Flex align="center" gap={2}>
                            <Input
                                value={slippageInput}
                                onChange={(e) => handleSlippageChange(e.target.value)}
                                placeholder="0.5"
                                bg="#2a2a2a"
                                border="1px solid #444"
                                color="white"
                                _placeholder={{ color: "#666" }}
                                _focus={{ borderColor: "#4ade80" }}
                                _hover={{ borderColor: "#3a3a3a" }}
                                size="lg"
                                type="text"
                                autoFocus
                            />
                            <Text color="white" fontSize="2xl" mt={0}>%</Text>
                        </Flex>
                    </Box>

                    {/* Preset Buttons */}
                    <HStack spacing={2}>
                        {presetValues.map((value) => (
                            <Button
                                key={value}
                                flex="1"
                                size="sm"
                                h="32px"
                                bg={slippageInput === value ? "#4ade80" : "#2a2a2a"}
                                color={slippageInput === value ? "black" : "white"}
                                onClick={() => setSlippageInput(value)}
                                _hover={{ 
                                    bg: slippageInput === value ? "#4ade80" : "#3a3a3a",
                                    transform: "translateY(-1px)"
                                }}
                            >
                                {value} 
                                
                            </Button>
                        ))}
                    </HStack>

                    {/* Warning for high slippage */}
                    {parseFloat(slippageInput) > 5 && (
                        <Box
                            bg={parseFloat(slippageInput) > 50 ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)"}
                            border="1px solid #ef4444"
                            borderRadius="md"
                            p={3}
                        >
                            <Text fontSize="sm" color="#ef4444">
                                {parseFloat(slippageInput) > 50 
                                    ? "⚠️ Extreme slippage tolerance! You may lose most of your funds."
                                    : "⚠️ High slippage tolerance. Your transaction may be frontrun."
                                }
                            </Text>
                        </Box>
                    )}

                    {/* Action Buttons */}
                    <HStack spacing={3} pt={2}>
                        <Button
                            flex="1"
                            variant="outline"
                            color="white"
                            borderColor="#3a3a3a"
                            _hover={{ bg: '#2a2a2a' }}
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            flex="1"
                            bg="#4ade80"
                            color="black"
                            _hover={{ bg: '#22c55e' }}
                            onClick={handleConfirm}
                        >
                            Confirm
                        </Button>
                    </HStack>
                </VStack>
            </Box>
        </>,
        modalRoot
    );
};

export default StandaloneSlippageModal;