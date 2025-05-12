import React from 'react';
import { Center, Heading, Text, Box } from "@chakra-ui/react";

/**
 * Component that displays a message asking users to rotate their device to portrait mode
 */
const RotateDeviceMessage: React.FC = () => {
  return (
    <Center 
      height="100vh" 
      flexDirection="column" 
      color="white" 
      textAlign="center"
      p={6}
    >
      <Heading as="h2" size="lg" mb={4}>Please Rotate Your Device</Heading>
      <Text fontSize="md" mb={6}>This application is optimized for portrait mode on mobile devices.</Text>
      <Box 
        transform="rotate(90deg)" 
        fontSize="4xl"
        animation="pulse 2s infinite"
        sx={{
          "@keyframes pulse": {
            "0%": { opacity: 0.5 },
            "50%": { opacity: 1 },
            "100%": { opacity: 0.5 }
          }
        }}
      >
        📱
      </Box>
    </Center>
  );
};

export default RotateDeviceMessage;