import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Flex,
  Portal,
  Badge,
} from '@chakra-ui/react';
import { FiSend, FiMaximize2, FiMinimize2, FiMessageSquare } from 'react-icons/fi';
import { useAccount } from 'wagmi';

interface Message {
  id: string;
  address: string;
  text: string;
  timestamp: Date;
}

const TrollBox: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    // Only scroll if user is already near the bottom
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom && messages.length > 2) {
          scrollToBottom();
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);

  // Add initial messages after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          id: '1',
          address: '0x1234...5678',
          text: 'Welcome to the troll box! 🚀',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          id: '2',
          address: '0xabcd...efgh',
          text: 'NOMA to the moon! 🌙',
          timestamp: new Date(Date.now() - 3 * 60 * 1000),
        },
      ]);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    const message: Message = {
      id: Date.now().toString(),
      address: address || '',
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Simulate receiving messages
    if (Math.random() > 0.7) {
      setTimeout(() => {
        const randomMessages = [
          'LFG! 🔥',
          'When lambo? 🏎️',
          'Diamond hands! 💎🙌',
          'This is the way!',
          'WAGMI! 🚀',
        ];
        const randomAddress = `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;
        const randomMessage: Message = {
          id: (Date.now() + 1).toString(),
          address: randomAddress,
          text: randomMessages[Math.floor(Math.random() * randomMessages.length)],
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, randomMessage]);
        if (!isExpanded) {
          setUnreadCount(prev => prev + 1);
        }
      }, 2000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Collapsed view
  const CollapsedView = (
    <Box
      bg="#1a1a1a"
      borderRadius="lg"
      position="relative"
      transition="all 0.2s"
      h="300px"
      maxH="300px"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        justify="space-between"
        p={3}
        borderBottom="1px solid #2a2a2a"
        cursor="pointer"
        onClick={() => setIsExpanded(true)}
        _hover={{ bg: '#2a2a2a' }}
      >
        <HStack>
          <Box> <FiMessageSquare size={20} color="#4ade80" /></Box>
          <Box><Text color="white" fontWeight="bold">Troll Box</Text></Box>
        </HStack>
        <HStack>
          {unreadCount > 0 && (
            <Badge colorScheme="green" borderRadius="full" px={2}>
              {unreadCount}
            </Badge>
          )}
          <IconButton
            aria-label="Expand"
            icon={<FiMaximize2 />}
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: '#3a3a3a' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
          />
        </HStack>
      </HStack>
      
      {/* Messages */}
      <VStack
        flex="1"
        overflowY="auto"
        overflowX="hidden"
        p={3}
        gap={2}
        align="stretch"
        position="relative"
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            bg: '#0a0a0a',
          },
          '&::-webkit-scrollbar-thumb': {
            bg: '#3a3a3a',
            borderRadius: '2px',
          },
        }}
      >
        {messages.slice(-3).map((msg) => (
          <Box key={msg.id} mb={1}>
            <Box
              bg="#2a2a2a"
              p={2}
              borderRadius="sm"
              borderLeft="2px solid #4ade80"
            >
              <Text color="white" fontSize="xs" noOfLines={1}>
                {msg.text}
              </Text>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input */}
      <Box p={3} borderTop="1px solid #2a2a2a">
        {isConnected ? (
          <HStack>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type message..."
              bg="#2a2a2a"
              border="none"
              color="white"
              h="36px"
              _placeholder={{ color: '#666' }}
              _hover={{ bg: '#3a3a3a' }}
              _focus={{ bg: '#3a3a3a', outline: 'none' }}
            />
            <Button
              size="sm"
              bg="#4ade80"
              color="black"
              fontWeight="600"
              onClick={handleSendMessage}
              isDisabled={!newMessage.trim()}
              _hover={{ bg: "#22c55e" }}
              _disabled={{ 
                bg: "#2a2a2a", 
                color: "#666",
                cursor: "not-allowed" 
              }}
              leftIcon={<FiSend />}
              px={4}
            >
              Send
            </Button>
          </HStack>
        ) : (
          <Text color="#888" textAlign="center" fontSize="xs">
            Connect wallet to chat
          </Text>
        )}
      </Box>
    </Box>
  );

  // Expanded modal view
  const ExpandedView = (
    <Portal>
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.8)"
        zIndex={1000}
        onClick={() => setIsExpanded(false)}
      >
        <Flex
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w="60vw"
          h="70vh"
          minW="600px"
          minH="500px"
          maxW="900px"
          maxH="700px"
          bg="#1a1a1a"
          borderRadius="xl"
          overflow="hidden"
          onClick={(e) => e.stopPropagation()}
          flexDirection="column"
          border="1px solid #2a2a2a"
          boxShadow="0 20px 40px rgba(0, 0, 0, 0.5)"
        >
          {/* Header */}
          <HStack
            justify="space-between"
            p={4}
            borderBottom="1px solid #2a2a2a"
            bg="#0a0a0a"
          >
            <HStack>
              <Box> <FiMessageSquare size={20} color="#4ade80" /> </Box>
              <Box>
              <Text color="white" fontWeight="bold" fontSize="lg">
                Troll Box
              </Text>
              </Box>
              <Box>
              <Text color="#888" fontSize="sm">
                ({messages.length} messages)
              </Text>
              </Box>
            </HStack>
            <IconButton
              aria-label="Minimize"
              icon={<FiMinimize2 />}
              size="sm"
              variant="ghost"
              color="white"
              onClick={() => setIsExpanded(false)}
              _hover={{ bg: '#2a2a2a' }}
            />
          </HStack>

          {/* Messages */}
          <VStack
            flex="1"
            overflowY="auto"
            p={4}
            gap={3}
            align="stretch"
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                bg: '#0a0a0a',
              },
              '&::-webkit-scrollbar-thumb': {
                bg: '#3a3a3a',
                borderRadius: '2px',
              },
            }}
          >
            {messages.map((msg) => (
              <Box key={msg.id}>
                <Box
                  bg="#2a2a2a"
                  p={3}
                  borderRadius="md"
                  borderLeft="2px solid #4ade80"
                >
                  <Text color="white" fontSize="sm">
                    {msg.text}
                  </Text>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </VStack>

          {/* Input */}
          <Box p={4} borderTop="1px solid #2a2a2a" bg="#0a0a0a">
            {isConnected ? (
              <HStack>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  bg="#2a2a2a"
                  border="none"
                  color="white"
                  h="44px"
                  _placeholder={{ color: '#666' }}
                  _hover={{ bg: '#3a3a3a' }}
                  _focus={{ bg: '#3a3a3a', outline: 'none' }}
                />
                <Button
                  bg="#4ade80"
                  color="black"
                  fontWeight="600"
                  onClick={handleSendMessage}
                  isDisabled={!newMessage.trim()}
                  _hover={{ bg: "#22c55e" }}
                  _disabled={{ 
                    bg: "#2a2a2a", 
                    color: "#666",
                    cursor: "not-allowed" 
                  }}
                  leftIcon={<FiSend />}
                  px={6}
                >
                  Send
                </Button>
              </HStack>
            ) : (
              <Text color="#888" textAlign="center" fontSize="sm">
                Connect your wallet to chat
              </Text>
            )}
          </Box>
        </Flex>
      </Box>
    </Portal>
  );

  return isExpanded ? ExpandedView : CollapsedView;
};

export default TrollBox;