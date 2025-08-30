import React from 'react';
import { Button, Box, Spinner, Text } from '@chakra-ui/react';
import { useModal } from '../contexts/ModalContext';

interface UnwrapButtonProps {
    fontSize?: string;
    buttonSize?: string;
    size?: string;
}

const UnwrapButton: React.FC<UnwrapButtonProps> = ({ fontSize = "sm", buttonSize = "100%", size = "sm" }) => {
    const { openUnwrapModal, isUnwrapping } = useModal();

    return (
        <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
            <Box>
                <Button 
                    disabled={isUnwrapping}
                    border="1px solid"
                    borderColor="#4ade80"
                    variant={"outline"}
                    h={size == "lg" ? 6 : 4}
                    ml={size == "lg" ? 0 : 2}
                    mt={size == "lg" ? 0 : 1}
                    w={buttonSize}
                    onClick={openUnwrapModal}
                    color="white"
                    borderRadius={5}
                    _hover={{ bg: "#4ade80aa", borderColor: "#4ade80", color: "white" }}
                >
                    <Box as="span">{isUnwrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Unwrap</Text>}</Box>
                </Button>
            </Box>
        </Box>
    );
};

export default UnwrapButton;