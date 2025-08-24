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
import { FiSend, FiMaximize2, FiMinimize2, FiMessageSquare, FiX, FiChevronDown } from 'react-icons/fi';
import { useAccount } from 'wagmi';
import { useTrollbox } from '../hooks/useTrollbox';

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  clientId: string;
  address?: string;
}

let instanceCounter = 0;

const TrollBox: React.FC = () => {
  const instanceId = useRef(++instanceCounter);
  console.log(`TrollBox instance ${instanceId.current} created`);
  
  const { address, isConnected } = useAccount();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use the WebSocket hook
  const { 
    messages, 
    connected, 
    authenticated,
    username: serverUsername,
    canChangeUsername,
    cooldownRemaining,
    userCount,
    sendMessage, 
    authenticate,
    changeUsername,
    disconnect,
    reconnect,
    error 
  } = useTrollbox();
  
  // Authenticate when connected and have address
  useEffect(() => {
    if (connected && address && !authenticated) {
      // Don't send username on initial auth - let user set it
      authenticate(address);
    }
  }, [connected, address, authenticated, authenticate]);
  
  // Update local username when server username changes
  useEffect(() => {
    if (serverUsername) {
      setUsername(serverUsername);
    }
  }, [serverUsername]);

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
    
    // Update unread count if not expanded and new messages arrived
    if (!isExpanded && messages.length > prevMessageCount) {
      setUnreadCount(prev => prev + (messages.length - prevMessageCount));
    }
    setPrevMessageCount(messages.length);
  }, [messages, isExpanded, prevMessageCount]);

  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
    }
  }, [isExpanded]);

  // Show connection status
  useEffect(() => {
    if (error) {
      console.error('Trollbox error:', error);
    }
  }, [error]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !connected || !authenticated) return;
    
    sendMessage(newMessage.trim(), username || 'Anonymous');
    setNewMessage('');
  };
  
  const handleChangeUsername = () => {
    const trimmed = username.trim();
    if (!trimmed || !canChangeUsername) return;
    
    // Client-side validation
    if (trimmed.length < 3 || trimmed.length > 20) {
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return;
    }
    
    changeUsername(trimmed);
  };
  
  const isUsernameValid = (name: string) => {
    const trimmed = name.trim();
    return trimmed.length >= 3 && 
           trimmed.length <= 20 && 
           /^[a-zA-Z0-9_-]+$/.test(trimmed);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Collapsed view
  const CollapsedView = (
    <Box
      bg="#1a1a1a"
      borderRadius="lg"
      position="relative"
      transition="all 0.2s"
      h={isCollapsed ? "auto" : "450px"}
      maxH={isCollapsed ? "auto" : "450px"}
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* Header */}
      <VStack
        p={3}
        borderBottom="1px solid #2a2a2a"
        cursor="pointer"
        onClick={() => setIsExpanded(true)}
        _hover={{ bg: '#2a2a2a' }}
        align="stretch"
        gap={2}
      >
        {/* First row: Title and buttons */}
        <HStack justify="space-between">
          <HStack>
            <Box> <FiMessageSquare size={20} color="#4ade80" /></Box>
            <Box><Text color="white" fontWeight="bold">Troll Box</Text></Box>
          </HStack>
            <HStack gap={1}>
              <Button
                size="xs"
                bg="#3a3a3a"
                color="white"
                fontSize="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                _hover={{ bg: '#4a4a4a' }}
                px={2}
                minW="24px"
                h="24px"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? '+' : '−'}
              </Button>
              {connected ? (
                <Button
                  size="xs"
                  bg="#ff6b6b"
                  color="white"
                  fontSize="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    disconnect();
                  }}
                  _hover={{ bg: "#e53e3e" }}
                  h="24px"
                  w="85px"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="xs"
                  bg="#4ade80"
                  color="black"
                  fontSize="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    reconnect();
                  }}
                  _hover={{ bg: "#22c55e" }}
                  h="24px"
                  w="85px"
                >
                  Connect
                </Button>
              )}
              {!isCollapsed && (
                <Button
                  size="xs"
                  bg="#3a3a3a"
                  color="white"
                  fontSize="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  _hover={{ bg: '#4a4a4a' }}
                  px={2}
                  minW="24px"
                  h="24px"
                  title="Expand"
                >
                  ⤢
                </Button>
              )}
            </HStack>
        </HStack>
        
        {/* Second row: Connection status and stats */}
        <HStack justify="space-between" onClick={(e) => e.stopPropagation()}>
          <HStack gap={2}>
            {connected ? (
              <Box w="6px" h="6px" borderRadius="full" bg="#4ade80" title="Connected" />
            ) : (
              <Box w="6px" h="6px" borderRadius="full" bg="#ff6b6b" title="Disconnected" />
            )}
            <Text color="#888" fontSize="xs">
              {connected ? 'Connected' : 'Disconnected'}
            </Text>
          </HStack>
          {connected && (
            <Text color="#888" fontSize="xs">
              {userCount} users • {messages.length} messages
            </Text>
          )}
        </HStack>
      </VStack>
      
      {!isCollapsed && (
        <>
          {/* Messages */}
          <Box
        flex="1"
        overflowY="auto"
        overflowX="hidden"
        p={2}
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
        {messages.length === 0 ? (
          <Text color="#666" fontSize="xs" textAlign="center">
            {connected ? 'No messages yet. Be the first!' : 'Connecting...'}
          </Text>
        ) : (
          messages.slice(-5).map((msg) => (
          <Box key={msg.id} mb={1}>
            <HStack gap={2} align="flex-start">
              <Box>
                <Text 
                  color="#4ade80" 
                  fontSize="xs" 
                  fontWeight="bold" 
                  minW="60px"
                  maxW="60px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title={msg.username}
                >
                  {msg.username}
                </Text>
              </Box>
              <Box flex="1">
                <Text color="white" fontSize="xs">
                  {msg.content}
                </Text>
              </Box>
              <Box>
                <Text color="#666" fontSize="xs" flexShrink={0}>
                  {formatTime(msg.timestamp)}
                </Text>
              </Box>
            </HStack>
          </Box>
        ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box p={3} borderTop="1px solid #2a2a2a">
        {connected && authenticated ? (
          <HStack>
            <Box flex="1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type message..."
                bg="#2a2a2a"
                border="none"
                color="white"
                h="36px"
                w="100%"
                _placeholder={{ color: '#666' }}
                _hover={{ bg: '#3a3a3a' }}
                _focus={{ bg: '#3a3a3a', outline: 'none' }}
              />
            </Box>
            <Box>
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
            </Box>
          </HStack>
        ) : (
          <VStack>
            <Text color="#888" textAlign="center" fontSize="xs">
              {error || (!connected ? 'Not connected to chat' : 'Authenticating...')}
            </Text>
            {!connected && (
              <Button
                size="sm"
                bg="#4ade80"
                color="black"
                fontWeight="600"
                onClick={reconnect}
                _hover={{ bg: "#22c55e" }}
                px={4}
              >
                Connect to Chat
              </Button>
            )}
          </VStack>
        )}
      </Box>
        </>
      )}
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
          h="80vh"
          minW="600px"
          minH="600px"
          maxW="900px"
          maxH="800px"
          bg="#1a1a1a"
          borderRadius="xl"
          overflow="hidden"
          onClick={(e) => e.stopPropagation()}
          flexDirection="column"
          border="1px solid #2a2a2a"
          boxShadow="0 20px 40px rgba(0, 0, 0, 0.5)"
        >
          {/* Header */}
          <VStack
            p={4}
            borderBottom="1px solid #2a2a2a"
            bg="#0a0a0a"
            align="stretch"
            gap={3}
          >
            {/* First row: Title and buttons */}
            <HStack justify="space-between">
              <HStack>
                <Box> <FiMessageSquare size={24} color="#4ade80" /> </Box>
                <Box>
                <Text color="white" fontWeight="bold" fontSize="lg">
                  Troll Box
                </Text>
                </Box>
              </HStack>
              <HStack gap={2}>
                {connected ? (
                  <Button
                    size="sm"
                    bg="#ff6b6b"
                    color="white"
                    fontSize="sm"
                    onClick={disconnect}
                    _hover={{ bg: "#e53e3e" }}
                    w="120px"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    bg="#4ade80"
                    color="black"
                    fontSize="sm"
                    onClick={reconnect}
                    _hover={{ bg: "#22c55e" }}
                    w="120px"
                  >
                    Connect
                  </Button>
                )}
                <IconButton
                  aria-label="Minimize"
                  icon={<FiMinimize2 />}
                  size="sm"
                  variant="ghost"
                  color="white"
                  onClick={() => setIsExpanded(false)}
                  _hover={{ bg: '#2a2a2a' }}
                  title="Minimize"
                />
              </HStack>
            </HStack>
            
            {/* Second row: Connection status and stats */}
            <HStack justify="space-between">
              <HStack gap={2}>
                {connected ? (
                  <Box w="8px" h="8px" borderRadius="full" bg="#4ade80" title="Connected" />
                ) : (
                  <Box w="8px" h="8px" borderRadius="full" bg="#ff6b6b" title="Disconnected" />
                )}
                <Text color="#888" fontSize="sm">
                  {connected ? 'Connected' : 'Disconnected'}
                </Text>
              </HStack>
              {connected && (
                <Text color="#888" fontSize="sm">
                  {userCount} users • {messages.length} messages
                </Text>
              )}
            </HStack>
          </VStack>

          {/* Messages */}
          <Box
            flex="1"
            overflowY="auto"
            p={3}
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
            {messages.length === 0 ? (
              <Flex flex="1" align="center" justify="center">
                <Text color="#666" fontSize="sm">
                  {connected ? 'No messages yet. Start the conversation!' : 'Connecting to chat server...'}
                </Text>
              </Flex>
            ) : (
              messages.map((msg) => (
              <Box key={msg.id} mb={2}>
                <HStack gap={3} align="flex-start">
                  <Box>
                    <Text 
                      color="#4ade80" 
                      fontSize="sm" 
                      fontWeight="bold" 
                      minW="80px"
                      maxW="80px"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      title={msg.username}
                    >
                      {msg.username}
                    </Text>
                  </Box>
                  <Box flex="1">
                    <Text color="white" fontSize="sm">
                      {msg.content}
                    </Text>
                  </Box>
                  <Box>
                    <Text color="#666" fontSize="xs" flexShrink={0}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box p={4} borderTop="1px solid #2a2a2a" bg="#0a0a0a">
            {connected && authenticated ? (
              <VStack gap={3} align="stretch">
                {/* Compact username section */}
                <HStack gap={2} align="center">
                  <Text color="#888" fontSize="xs" minW="fit-content">Username:</Text>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                    placeholder={serverUsername ? "Change username" : "Choose username"}
                    bg="#2a2a2a"
                    border="none"
                    color="white"
                    h="32px"
                    maxW="150px"
                    fontSize="sm"
                    isDisabled={!canChangeUsername}
                    _placeholder={{ color: '#666', fontSize: 'sm' }}
                    _hover={{ 
                      bg: canChangeUsername ? '#3a3a3a' : '#2a2a2a'
                    }}
                    _focus={{ 
                      bg: canChangeUsername ? '#3a3a3a' : '#2a2a2a', 
                      outline: 'none' 
                    }}
                  />                    
                  {canChangeUsername ? (
                    <Button
                      size="sm"
                      h="32px"
                      bg="#4ade80"
                      color="black"
                      fontWeight="600"
                      onClick={handleChangeUsername}
                      isDisabled={!username.trim() || username === serverUsername || !isUsernameValid(username)}
                      _hover={{ bg: '#22c55e' }}
                      _disabled={{ 
                        bg: "#2a2a2a", 
                        color: "#666",
                        cursor: "not-allowed" 
                      }}
                      px={4}
                    >
                      Set
                    </Button>
                  ) : (
                    <Text color="#666" fontSize="xs">
                      {cooldownRemaining > 0 ? `${Math.ceil(cooldownRemaining / (60 * 60 * 1000))}h cooldown` : 'Locked'}
                    </Text>
                  )}
                  {username.trim() && username !== serverUsername && !isUsernameValid(username) && canChangeUsername && (
                    <Text color="#ff6b6b" fontSize="xs" whiteSpace="nowrap">
                      3-20 chars, a-z, 0-9, -, _
                    </Text>
                  )}
                </HStack>
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
              </VStack>
            ) : (
              <VStack gap={3}>
                <Text color="#888" textAlign="center" fontSize="sm">
                  {error || (!connected ? 'Not connected to chat server' : 'Authenticating...')}
                </Text>
                {!connected && (
                  <Button
                    bg="#4ade80"
                    color="black"
                    fontWeight="600"
                    onClick={reconnect}
                    _hover={{ bg: "#22c55e" }}
                    px={6}
                  >
                    Connect to Chat
                  </Button>
                )}
              </VStack>
            )}
          </Box>
        </Flex>
      </Box>
    </Portal>
  );

  return isExpanded ? ExpandedView : CollapsedView;
};

export default TrollBox;