import React from 'react';
import { Button, Box, Spinner, Text } from '@chakra-ui/react';
import { useModal } from '../contexts/ModalContext';

interface WrapButtonProps {
    fontSize?: string;
    buttonSize?: string;
    size?: string;
}

const WrapButton: React.FC<WrapButtonProps> = ({ fontSize = "sm", buttonSize = "100%", size = "sm" }) => {
    const { openWrapModal, isWrapping } = useModal();

    return (
        <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
            <Box>
                <Button 
                    disabled={isWrapping}
                    border="1px solid"
                    borderColor="#4ade80"
                    variant={"outline"}
                    h={size == "lg" ? 6 : 4}
                    ml={size == "lg" ? 0 : 2}
                    mt={size == "lg" ? 0 : 2}
                    w={buttonSize}
                    onClick={openWrapModal}
                    color="white"
                    borderRadius={5}
                    _hover={{ bg: "#4ade80aa", borderColor: "#4ade80", color: "white" }}
                >
                    <Box as="span">{isWrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Wrap</Text>}</Box>
                </Button>
            </Box>
        </Box>
    );
};

export default WrapButton;