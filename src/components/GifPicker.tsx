import React, { useState, useEffect } from 'react';
import {
  Box,
  Input,
  SimpleGrid,
  Image,
  Spinner,
  Text,
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react';
import { FiSearch, FiImage, FiSmile } from 'react-icons/fi';

interface GifPickerProps {
  onSelectGif: (url: string) => void;
  onClose?: () => void;
}

// Popular sticker packs - using emojis as placeholders
const STICKER_PACKS = {
  reactions: [
    { id: 'thumbsup', emoji: '👍', name: 'Thumbs Up' },
    { id: 'heart', emoji: '❤️', name: 'Heart' },
    { id: 'laughing', emoji: '😂', name: 'Laughing' },
    { id: 'fire', emoji: '🔥', name: 'Fire' },
    { id: 'clap', emoji: '👏', name: 'Clapping' },
    { id: 'mindblown', emoji: '🤯', name: 'Mind Blown' },
    { id: 'eyes', emoji: '👀', name: 'Eyes' },
    { id: 'rocket', emoji: '🚀', name: 'Rocket' },
    { id: 'cry', emoji: '😭', name: 'Crying' },
    { id: 'party', emoji: '🎉', name: 'Party' },
    { id: 'thinking', emoji: '🤔', name: 'Thinking' },
    { id: 'skull', emoji: '💀', name: 'Dead' },
  ],
  crypto: [
    { id: 'btc', emoji: '₿', name: 'Bitcoin' },
    { id: 'eth', emoji: 'Ξ', name: 'Ethereum' },
    { id: 'moon', emoji: '🌙', name: 'To the Moon' },
    { id: 'diamond', emoji: '💎', name: 'Diamond Hands' },
    { id: 'bear', emoji: '🐻', name: 'Bear Market' },
    { id: 'bull', emoji: '🐂', name: 'Bull Market' },
    { id: 'money', emoji: '💰', name: 'Money Bag' },
    { id: 'chart', emoji: '📈', name: 'Chart Up' },
    { id: 'chartdown', emoji: '📉', name: 'Chart Down' },
    { id: 'whale', emoji: '🐋', name: 'Whale' },
    { id: 'ape', emoji: '🦍', name: 'Ape' },
    { id: 'hands', emoji: '🙌', name: 'Paper Hands' },
  ],
};

const GifPicker: React.FC<GifPickerProps> = ({ onSelectGif, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'gifs' | 'stickers'>('gifs');

  // Using Giphy API (public beta key for testing)
  const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // Public beta key
  
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          query
        )}&limit=20&rating=pg-13`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchGifs(searchTerm);
      } else {
        // Show trending GIFs when no search term
        searchGifs('trending meme');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleStickerSelect = (sticker: any) => {
    if (sticker.emoji) {
      // For emoji stickers, just pass the emoji directly without markdown
      onSelectGif(sticker.emoji);
    } else if (sticker.url) {
      // For image stickers, pass the URL to be wrapped in markdown by TrollBox
      onSelectGif(sticker.url);
    }
  };

  const handleGifSelect = (gif: any) => {
    const gifUrl = gif.images?.fixed_height?.url || gif.images?.original?.url;
    if (gifUrl) {
      onSelectGif(gifUrl);
    }
  };

  return (
    <Box
      className="gif-picker-container"
      bg="#1a1a1a"
      borderRadius="lg"
      border="1px solid #2a2a2a"
      w="400px"
      h="500px"
      display="flex"
      flexDirection="column"
    >
      {/* Tab buttons */}
      <HStack p={2} borderBottom="1px solid #2a2a2a" spacing={2}>
        <Button
          size="sm"
          flex={1}
          variant={activeTab === 'gifs' ? 'solid' : 'ghost'}
          colorScheme={activeTab === 'gifs' ? 'green' : undefined}
          onClick={() => setActiveTab('gifs')}
          leftIcon={<FiImage />}
        >
          GIFs
        </Button>
        <Button
          size="sm"
          flex={1}
          variant={activeTab === 'stickers' ? 'solid' : 'ghost'}
          colorScheme={activeTab === 'stickers' ? 'green' : undefined}
          onClick={() => setActiveTab('stickers')}
          leftIcon={<FiSmile />}
        >
          Stickers
        </Button>
      </HStack>

      {/* Content */}
      {activeTab === 'gifs' ? (
        <VStack h="100%" spacing={0} overflow="hidden">
          {/* Search Input */}
          <Box p={3} w="100%" borderBottom="1px solid #2a2a2a">
            <HStack>
              <Box flex="1" position="relative">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search GIFs..."
                  bg="#2a2a2a"
                  border="none"
                  color="white"
                  pr={10}
                  _placeholder={{ color: '#666' }}
                  _hover={{ bg: '#3a3a3a' }}
                  _focus={{ bg: '#3a3a3a', outline: 'none' }}
                />
                <Box
                  position="absolute"
                  right={3}
                  top="50%"
                  transform="translateY(-50%)"
                  color="#666"
                >
                  <FiSearch />
                </Box>
              </Box>
            </HStack>
          </Box>

          {/* GIF Grid */}
          <Box flex="1" overflowY="auto" p={3}>
            {loading ? (
              <Box textAlign="center" py={10}>
                <Spinner size="lg" color="#4ade80" />
              </Box>
            ) : gifs.length > 0 ? (
              <SimpleGrid columns={2} gap={2}>
                {gifs.map((gif) => (
                  <Box
                    key={gif.id}
                    cursor="pointer"
                    borderRadius="md"
                    overflow="hidden"
                    border="2px solid transparent"
                    _hover={{ borderColor: '#4ade80' }}
                    onClick={() => handleGifSelect(gif)}
                  >
                    <Image
                      src={gif.images?.fixed_height?.url || gif.images?.original?.url}
                      alt={gif.title}
                      w="100%"
                      h="150px"
                      objectFit="cover"
                    />
                  </Box>
                ))}
              </SimpleGrid>
            ) : (
              <Text color="#666" textAlign="center" py={10}>
                {searchTerm ? 'No GIFs found' : 'Start typing to search GIFs'}
              </Text>
            )}
          </Box>
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4} p={3} h="100%" overflowY="auto">
          {/* Reaction Stickers */}
          <Box>
            <Text color="#888" fontSize="sm" mb={2} fontWeight="600">
              Reactions
            </Text>
            <SimpleGrid columns={4} gap={2}>
              {STICKER_PACKS.reactions.map((sticker) => (
                <Button
                  key={sticker.id}
                  onClick={() => handleStickerSelect(sticker)}
                  bg="#2a2a2a"
                  _hover={{ bg: '#3a3a3a', borderColor: '#4ade80' }}
                  border="1px solid transparent"
                  h="60px"
                  fontSize="2xl"
                  title={sticker.name}
                >
                  {sticker.emoji}
                </Button>
              ))}
            </SimpleGrid>
          </Box>

          {/* Crypto Stickers */}
          <Box>
            <Text color="#888" fontSize="sm" mb={2} fontWeight="600">
              Crypto
            </Text>
            <SimpleGrid columns={4} gap={2}>
              {STICKER_PACKS.crypto.map((sticker) => (
                <Button
                  key={sticker.id}
                  onClick={() => handleStickerSelect(sticker)}
                  bg="#2a2a2a"
                  _hover={{ bg: '#3a3a3a', borderColor: '#4ade80' }}
                  border="1px solid transparent"
                  h="60px"
                  fontSize="2xl"
                  title={sticker.name}
                >
                  {sticker.emoji}
                </Button>
              ))}
            </SimpleGrid>
          </Box>
        </VStack>
      )}

      {/* Close button */}
      {onClose && (
        <Box p={3} borderTop="1px solid #2a2a2a">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            color="white"
            _hover={{ bg: '#2a2a2a' }}
            w="100%"
          >
            Close
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default GifPicker;