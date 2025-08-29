import React from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Heading,
  SimpleGrid,
  Badge,
} from '@chakra-ui/react';
import { getTokens, exportTokensAsJSON } from '../utils/tokenStorage';
import { formatEther } from 'ethers/lib/utils';
import { commify } from '../utils';

const SavedTokens: React.FC = () => {
  const tokens = getTokens();

  const handleExport = () => {
    exportTokensAsJSON();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'failed': return 'red';
      default: return 'yellow';
    }
  };

  return (
    <Box w="100%" p={4}>
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between">
          <Heading size="md" color="white">Saved Token Deployments</Heading>
          {tokens.length > 0 && (
            <Button
              size="sm"
              colorScheme="green"
              onClick={handleExport}
            >
              Export as JSON
            </Button>
          )}
        </HStack>

        {tokens.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="#888">No tokens deployed yet</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {tokens.map((token) => (
              <Box
                key={token.id}
                bg="#1a1a1a"
                p={4}
                borderRadius="lg"
                border="1px solid #2a2a2a"
                _hover={{ borderColor: "#3a3a3a" }}
              >
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text color="white" fontWeight="bold">{token.tokenSymbol}</Text>
                    <Badge colorScheme={getStatusColor(token.status)}>
                      {token.status}
                    </Badge>
                  </HStack>
                  
                  <Text color="#888" fontSize="sm">{token.tokenName}</Text>
                  
                  <Box>
                    <Text color="#666" fontSize="xs">Supply</Text>
                    <Text color="white" fontSize="sm">{commify(token.tokenSupply, 0)}</Text>
                  </Box>
                  
                  <Box>
                    <Text color="#666" fontSize="xs">Floor Price</Text>
                    <Text color="white" fontSize="sm">{token.floorPrice} MON</Text>
                  </Box>
                  
                  <Box>
                    <Text color="#666" fontSize="xs">Deployed</Text>
                    <Text color="white" fontSize="xs">
                      {new Date(token.timestamp).toLocaleString()}
                    </Text>
                  </Box>
                  
                  {token.transactionHash && (
                    <Box>
                      <Text color="#666" fontSize="xs">Tx Hash</Text>
                      <Text color="#4ade80" fontSize="xs" isTruncated>
                        {token.transactionHash}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Box>
  );
};

export default SavedTokens;