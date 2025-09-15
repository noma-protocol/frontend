import React from 'react';
import { Box, VStack, Text, Button, Icon } from "@chakra-ui/react";
import { usePrivy } from '@privy-io/react-auth';
import { FaWallet } from "react-icons/fa";

const WalletNotConnected: React.FC = () => {
    const { login, ready } = usePrivy();

    const handleConnect = () => {
        login();
    };

    return (
        <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="center" 
            minH="100vh" 
            bg="#0a0a0a"
            position="relative"
            overflow="hidden"
        >
            {/* Background effects */}
            <Box
                position="absolute"
                top="20%"
                left="10%"
                w="300px"
                h="300px"
                bg="rgba(74, 222, 128, 0.1)"
                borderRadius="full"
                filter="blur(100px)"
                pointerEvents="none"
            />
            <Box
                position="absolute"
                bottom="20%"
                right="10%"
                w="400px"
                h="400px"
                bg="rgba(138, 43, 226, 0.1)"
                borderRadius="full"
                filter="blur(120px)"
                pointerEvents="none"
            />
            
            <VStack 
                spacing={8} 
                bg="rgba(26, 26, 26, 0.6)"
                backdropFilter="blur(20px)"
                p={12}
                borderRadius="2xl"
                border="1px solid rgba(255, 255, 255, 0.1)"
                boxShadow="0 20px 40px rgba(0, 0, 0, 0.5)"
                maxW="500px"
                w="90%"
                textAlign="center"
            >
                {/* Wallet Icon */}
                <Box
                    w="100px"
                    h="100px"
                    bg="rgba(74, 222, 128, 0.1)"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    border="2px solid rgba(74, 222, 128, 0.2)"
                    position="relative"
                >
                    <Icon 
                        as={FaWallet} 
                        boxSize="40px" 
                        color="#4ade80"
                    />
                    <Box
                        position="absolute"
                        inset={0}
                        borderRadius="full"
                        border="2px solid #4ade80"
                        opacity={0.3}
                    />
                </Box>
                
                {/* Title */}
                <VStack spacing={3}>
                    <Text 
                        fontSize="3xl" 
                        fontWeight="bold" 
                        color="white"
                        bgGradient="linear(to-r, #4ade80, #22c55e)"
                        bgClip="text"
                    >
                        Wallet Not Connected
                    </Text>
                    <Text 
                        color="#888" 
                        fontSize="lg"
                        maxW="400px"
                    >
                        Connect your wallet to access all features and start trading on Noma
                    </Text>
                </VStack>
                
                {/* Connect Button */}
                <Button
                    size="lg"
                    bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                    color="black"
                    px={8}
                    py={6}
                    fontSize="lg"
                    fontWeight="bold"
                    borderRadius="xl"
                    boxShadow="0 4px 20px rgba(74, 222, 128, 0.3)"
                    _hover={{
                        bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 30px rgba(74, 222, 128, 0.4)"
                    }}
                    _active={{
                        transform: "translateY(0)",
                        boxShadow: "0 2px 15px rgba(74, 222, 128, 0.3)"
                    }}
                    onClick={handleConnect}
                    isDisabled={!ready}
                >
                    Connect Wallet
                </Button>
                
                {/* Additional Info */}
                <Text color="#666" fontSize="sm" mt={2}>
                    By connecting your wallet, you agree to our Terms of Service
                </Text>
            </VStack>
            
        </Box>
    );
};

export default WalletNotConnected;