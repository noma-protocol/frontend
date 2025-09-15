import React from 'react';
import { Box, VStack, Text, Button, Heading } from '@chakra-ui/react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { usePrivyWagmi } from '../hooks/usePrivyWagmi';

const PrivyTest: React.FC = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { address, isConnected } = usePrivyWagmi();

  return (
    <Box p={8} bg="#0a0a0a" minH="100vh" color="white">
      <VStack spacing={6} maxW="600px" mx="auto">
        <Heading>Privy Integration Test</Heading>
        
        <Box p={4} bg="#1a1a1a" borderRadius="lg" w="full">
          <Text fontWeight="bold" mb={2}>Privy Status:</Text>
          <Text>Ready: {ready ? 'Yes' : 'No'}</Text>
          <Text>Authenticated: {authenticated ? 'Yes' : 'No'}</Text>
          <Text>User: {user?.id || 'None'}</Text>
        </Box>

        <Box p={4} bg="#1a1a1a" borderRadius="lg" w="full">
          <Text fontWeight="bold" mb={2}>Wallet Status:</Text>
          <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
          <Text>Address: {address || 'None'}</Text>
          <Text>Wallets: {wallets.length}</Text>
          {wallets.map((wallet, i) => (
            <Text key={i} fontSize="sm">
              - {wallet.walletClientType}: {wallet.address}
            </Text>
          ))}
        </Box>

        <Box p={4} bg="#1a1a1a" borderRadius="lg" w="full">
          <Text fontWeight="bold" mb={2}>Auth Methods:</Text>
          {user?.linkedAccounts?.map((account, i) => (
            <Text key={i} fontSize="sm">
              - {account.type}: {account.address || account.email || 'Linked'}
            </Text>
          ))}
        </Box>

        <Button
          onClick={() => authenticated ? logout() : login()}
          bg="#4ade80"
          color="black"
          _hover={{ bg: "#22c55e" }}
          isDisabled={!ready}
        >
          {authenticated ? 'Logout' : 'Login'}
        </Button>
      </VStack>
    </Box>
  );
};

export default PrivyTest;