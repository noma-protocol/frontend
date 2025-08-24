import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Grid,
  Image,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  DialogBackdrop,
} from './ui/dialog';
import { FiUser, FiCalendar, FiStar, FiImage } from 'react-icons/fi';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  address: string;
}

interface UserProfile {
  firstConnected: string;
  reputation: number;
  nfts: Array<{
    id: string;
    name: string;
    image: string;
    collection: string;
  }>;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  address,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && address) {
      fetchUserProfile();
    }
  }, [isOpen, address]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      // Fetch user profile from server
      const response = await fetch(`http://localhost:9091/api/profile/${address}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        // Use placeholder data for now
        setProfile({
          firstConnected: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          reputation: Math.floor(Math.random() * 1000),
          nfts: generatePlaceholderNFTs(),
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Use placeholder data
      setProfile({
        firstConnected: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        reputation: Math.floor(Math.random() * 1000),
        nfts: generatePlaceholderNFTs(),
      });
    }
    setIsLoading(false);
  };

  const generatePlaceholderNFTs = () => {
    const collections = ['Oikos Genesis', 'Monad Punks', 'Troll Lords', 'DeFi Heroes'];
    const count = Math.floor(Math.random() * 8) + 1;
    return Array.from({ length: count }, (_, i) => ({
      id: `nft-${i}`,
      name: `NFT #${Math.floor(Math.random() * 9999)}`,
      image: `https://picsum.photos/200/200?random=${i}`,
      collection: collections[Math.floor(Math.random() * collections.length)],
    }));
  };

  const calculateAccountAge = (firstConnected: string) => {
    const now = new Date();
    const connected = new Date(firstConnected);
    const diffMs = now.getTime() - connected.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 800) return '#4ade80';
    if (reputation >= 500) return '#fbbf24';
    if (reputation >= 200) return '#fb923c';
    return '#ef4444';
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <DialogBackdrop bg="rgba(0, 0, 0, 0.8)" />
      <DialogContent 
        bg="#1a1a1a" 
        border="1px solid #2a2a2a"
        position="fixed"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="60vw"
        maxW="900px"
        minW="600px"
        maxH="80vh"
        borderRadius="xl"
        boxShadow="0 20px 40px rgba(0, 0, 0, 0.5)"
        overflow="hidden"
      >
        <DialogHeader color="white" borderBottom="1px solid #2a2a2a" bg="#0a0a0a" p={4}>
          <HStack>
            <FiUser size={20} />
            <Text fontSize="lg" fontWeight="bold">User Profile</Text>
          </HStack>
        </DialogHeader>
        <DialogCloseTrigger />
        
        <DialogBody p={6} overflowY="auto" maxH="calc(80vh - 100px)">
          {isLoading ? (
            <Flex justify="center" align="center" h="300px">
              <Spinner size="lg" color="#4ade80" />
            </Flex>
          ) : profile ? (
            <VStack align="stretch" gap={6}>
              {/* User Info */}
              <Box>
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Box>
                      <Text color="#4ade80" fontSize="xl" fontWeight="bold">
                        {username}
                      </Text>
                      <Text color="#666" fontSize="sm">
                        {formatAddress(address)}
                      </Text>
                    </Box>
                    <Badge
                      bg="#2a2a2a"
                      color={getReputationColor(profile.reputation)}
                      fontSize="lg"
                      px={3}
                      py={1}
                      borderRadius="md"
                    >
                      <HStack gap={1}>
                        <FiStar />
                        <Text>{profile.reputation}</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              <Box h="1px" bg="#2a2a2a" w="100%" />

              {/* Account Stats */}
              <Box>
                <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
                  Account Stats
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Box bg="#2a2a2a" p={4} borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <FiCalendar color="#4ade80" />
                      <Text color="#888" fontSize="sm">Account Age</Text>
                    </HStack>
                    <Text color="white" fontSize="lg" fontWeight="bold">
                      {calculateAccountAge(profile.firstConnected)}
                    </Text>
                  </Box>
                  <Box bg="#2a2a2a" p={4} borderRadius="md">
                    <HStack gap={2} mb={1}>
                      <FiImage color="#4ade80" />
                      <Text color="#888" fontSize="sm">NFTs Owned</Text>
                    </HStack>
                    <Text color="white" fontSize="lg" fontWeight="bold">
                      {profile.nfts.length}
                    </Text>
                  </Box>
                </Grid>
              </Box>

              <Box h="1px" bg="#2a2a2a" w="100%" />

              {/* NFT Collection */}
              <Box>
                <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
                  NFT Collection
                </Text>
                {profile.nfts.length > 0 ? (
                  <Grid templateColumns="repeat(4, 1fr)" gap={3}>
                    {profile.nfts.map((nft) => (
                      <Box
                        key={nft.id}
                        bg="#2a2a2a"
                        borderRadius="md"
                        overflow="hidden"
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{
                          transform: 'scale(1.05)',
                          boxShadow: '0 4px 12px rgba(74, 222, 128, 0.2)',
                        }}
                      >
                        <Image
                          src={nft.image}
                          alt={nft.name}
                          w="100%"
                          h="100px"
                          objectFit="cover"
                          fallback={
                            <Flex
                              w="100%"
                              h="100px"
                              bg="#3a3a3a"
                              align="center"
                              justify="center"
                            >
                              <FiImage size={24} color="#666" />
                            </Flex>
                          }
                        />
                        <Box p={2}>
                          <Text color="white" fontSize="xs" fontWeight="bold" noOfLines={1}>
                            {nft.name}
                          </Text>
                          <Text color="#666" fontSize="xs" noOfLines={1}>
                            {nft.collection}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </Grid>
                ) : (
                  <Box
                    bg="#2a2a2a"
                    p={8}
                    borderRadius="md"
                    textAlign="center"
                  >
                    <FiImage size={40} color="#666" style={{ margin: '0 auto 10px' }} />
                    <Text color="#666">No NFTs found</Text>
                  </Box>
                )}
              </Box>
            </VStack>
          ) : (
            <Text color="#666" textAlign="center">
              Failed to load profile
            </Text>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
};

export default UserProfileModal;