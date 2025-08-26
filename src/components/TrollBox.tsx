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
import UserProfileModal from './UserProfileModal';
import EmojiPicker from 'emoji-picker-react';

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
  // console.log(`TrollBox instance ${instanceId.current} created`);
  
  const { address, isConnected } = useAccount();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedUser, setSelectedUser] = useState<{ username: string; address: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEmojiPickerExpanded, setShowEmojiPickerExpanded] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  
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

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-picker-react') && !target.closest('[aria-label="Select emoji"]')) {
        setShowEmojiPicker(false);
        setShowEmojiPickerExpanded(false);
      }
    };

    if (showEmojiPicker || showEmojiPickerExpanded) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmojiPicker, showEmojiPickerExpanded]);

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
  
  const handleUsernameClick = (username: string, address?: string) => {
    if (address) {
      setSelectedUser({ username, address });
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    setShowEmojiPickerExpanded(false);
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
                bg="linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)"
                color="white"
                fontSize="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(!isCollapsed);
                }}
                _hover={{ 
                  bg: 'linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
                _active={{
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                }}
                px={2}
                minW="24px"
                h="24px"
                borderRadius="md"
                border="1px solid rgba(255, 255, 255, 0.1)"
                transition="all 0.2s"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? '+' : '−'}
              </Button>
              {connected ? (
                <Button
                  size="xs"
                  bg="linear-gradient(135deg, #ff6b6b 0%, #e53e3e 100%)"
                  color="white"
                  fontSize="xs"
                  fontWeight="600"
                  onClick={(e) => {
                    e.stopPropagation();
                    disconnect();
                  }}
                  _hover={{ 
                    bg: "linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)",
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
                  }}
                  _active={{
                    transform: 'translateY(0)',
                    boxShadow: '0 1px 4px rgba(255, 107, 107, 0.2)'
                  }}
                  h="24px"
                  w="85px"
                  borderRadius="md"
                  transition="all 0.2s"
                  boxShadow="0 1px 4px rgba(255, 107, 107, 0.2)"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="xs"
                  bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                  color="black"
                  fontSize="xs"
                  fontWeight="600"
                  onClick={(e) => {
                    e.stopPropagation();
                    reconnect();
                  }}
                  _hover={{ 
                    bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                  }}
                  _active={{
                    transform: 'translateY(0)',
                    boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                  }}
                  h="24px"
                  w="85px"
                  borderRadius="md"
                  transition="all 0.2s"
                  boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
                >
                  Connect
                </Button>
              )}
              {!isCollapsed && (
                <Button
                  size="xs"
                  bg="linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)"
                  color="white"
                  fontSize="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  _hover={{ 
                    bg: 'linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                  _active={{
                    transform: 'translateY(0)',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
                  }}
                  px={2}
                  minW="24px"
                  h="24px"
                  borderRadius="md"
                  border="1px solid rgba(255, 255, 255, 0.1)"
                  transition="all 0.2s"
                  title="Expand"
                >
                  ⤢
                </Button>
              )}
            </HStack>
        </HStack>
        
        {/* Second row: Connection status and stats */}
        <HStack justify="space-between" onClick={(e) => e.stopPropagation()}>
              <Box>
            <HStack gap={2}>
                <Box>
                {connected ? (
                  <Box w="6px" h="6px" borderRadius="full" bg="#4ade80" title="Connected" />
                ) : (
                  <Box w="6px" h="6px" borderRadius="full" bg="#ff6b6b" title="Disconnected" />
                )}
                </Box>
                <Box>
                <Text color="#888" fontSize="xs">
                  {connected ? 'Connected' : 'Disconnected'}
                </Text>                
                </Box>
            </HStack>                
              </Box>
                <Box>
                {connected && (
                  <Text color="#888" fontSize="xs">
                    {userCount} users • {messages.length} messages
                  </Text>
                )}                  
                </Box>
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
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => handleUsernameClick(msg.username, msg.address)}
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
          <HStack position="relative">
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
            <Box position="relative">
              <Button
                ref={emojiButtonRef}
                aria-label="Select emoji"
                size="sm"
                bg="#2a2a2a"
                _hover={{ bg: '#3a3a3a' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                px={2}
                minW="auto"
              >
                😊
              </Button>
              {showEmojiPicker && (
                <Box
                  position="fixed"
                  bottom="auto"
                  left="auto"
                  zIndex={10000}
                  boxShadow="0 4px 12px rgba(0, 0, 0, 0.4)"
                  borderRadius="md"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    transform: 'translateY(-100%) translateY(-8px)',
                    maxHeight: 'calc(100vh - 100px)',
                    overflow: 'auto'
                  }}
                  ref={(el) => {
                    if (el && emojiButtonRef.current) {
                      const buttonRect = emojiButtonRef.current.getBoundingClientRect();
                      const pickerWidth = 300;
                      const pickerHeight = 350;
                      
                      // Calculate position
                      let left = buttonRect.left + (buttonRect.width / 2) - (pickerWidth / 2);
                      let top = buttonRect.top - pickerHeight - 8;
                      
                      // Adjust if going off screen
                      if (left < 10) left = 10;
                      if (left + pickerWidth > window.innerWidth - 10) {
                        left = window.innerWidth - pickerWidth - 10;
                      }
                      if (top < 10) {
                        // Show below if not enough space above
                        top = buttonRect.bottom + 8;
                      }
                      
                      el.style.left = `${left}px`;
                      el.style.top = `${top}px`;
                    }
                  }}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    height={350}
                    width={300}
                  />
                </Box>
              )}
            </Box>
            <Box>
              <Button
                size="sm"
                bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                color="black"
                fontWeight="600"
                onClick={handleSendMessage}
                isDisabled={!newMessage.trim()}
                _hover={{ 
                  bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                }}
                _active={{
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                }}
                _disabled={{ 
                  bg: "#2a2a2a", 
                  color: "#666",
                  cursor: "not-allowed",
                  transform: 'none',
                  boxShadow: 'none'
                }}
                leftIcon={<FiSend />}
                px={4}
                borderRadius="md"
                transition="all 0.2s"
                boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
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
                bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                color="black"
                fontWeight="600"
                onClick={reconnect}
                _hover={{ 
                  bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                }}
                _active={{
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                }}
                px={4}
                borderRadius="md"
                transition="all 0.2s"
                boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
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
                    bg="linear-gradient(135deg, #ff6b6b 0%, #e53e3e 100%)"
                    color="white"
                    fontSize="sm"
                    fontWeight="600"
                    onClick={disconnect}
                    _hover={{ 
                      bg: "linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)",
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
                    }}
                    _active={{
                      transform: 'translateY(0)',
                      boxShadow: '0 1px 4px rgba(255, 107, 107, 0.2)'
                    }}
                    w="120px"
                    borderRadius="md"
                    transition="all 0.2s"
                    boxShadow="0 1px 4px rgba(255, 107, 107, 0.2)"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                    color="black"
                    fontSize="sm"
                    fontWeight="600"
                    onClick={reconnect}
                    _hover={{ 
                      bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                    }}
                    _active={{
                      transform: 'translateY(0)',
                      boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                    }}
                    w="120px"
                    borderRadius="md"
                    transition="all 0.2s"
                    boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
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
              <Box>
              <HStack gap={2}>
                <Box>
                {connected ? (
                  <Box w="8px" h="8px" borderRadius="full" bg="#4ade80" title="Connected" />
                ) : (
                  <Box w="8px" h="8px" borderRadius="full" bg="#ff6b6b" title="Disconnected" />
                )}
                </Box>
                <Box>
                <Text color="#888" fontSize="sm">
                  {connected ? 'Connected' : 'Disconnected'}
                </Text>                  
                </Box>
              </HStack>
              </Box>
                <Box>
              {connected && (
                <Text color="#888" fontSize="sm">
                  {userCount} users • {messages.length} messages
                </Text>
              )}
                </Box>

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
                      cursor="pointer"
                      _hover={{ textDecoration: "underline" }}
                      onClick={() => handleUsernameClick(msg.username, msg.address)}
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
                  <Box>
                    <Text color="#888" fontSize="xs" minW="fit-content">Username:</Text>
                  </Box>
                  <Box>
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
                  </Box>
                  <Box>
                    {canChangeUsername ? (
                      <Button
                        size="sm"
                        h="32px"
                        bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                        color="black"
                        fontWeight="600"
                        onClick={handleChangeUsername}
                        isDisabled={!username.trim() || username === serverUsername || !isUsernameValid(username)}
                        _hover={{ 
                          bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                        }}
                        _active={{
                          transform: 'translateY(0)',
                          boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                        }}
                        _disabled={{ 
                          bg: "#2a2a2a", 
                          color: "#666",
                          cursor: "not-allowed",
                          transform: 'none',
                          boxShadow: 'none'
                        }}
                        px={4}
                        borderRadius="md"
                        transition="all 0.2s"
                        boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
                      >
                        Set
                      </Button>
                    ) : (
                      <Text color="#666" fontSize="xs">
                        {cooldownRemaining > 0 ? `${Math.ceil(cooldownRemaining / (60 * 60 * 1000))}h cooldown` : 'Locked'}
                      </Text>
                    )}
                  </Box>
                  {username.trim() && username !== serverUsername && !isUsernameValid(username) && canChangeUsername && (
                    <Box>
                      <Text color="#ff6b6b" fontSize="xs" whiteSpace="nowrap">
                        3-20 chars, a-z, 0-9, -, _
                      </Text>
                    </Box>
                  )}
                </HStack>
                <HStack position="relative">
                  <Box flex="1">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      bg="#2a2a2a"
                      border="none"
                      color="white"
                      h="44px"
                      w="100%"
                      _placeholder={{ color: '#666' }}
                      _hover={{ bg: '#3a3a3a' }}
                      _focus={{ bg: '#3a3a3a', outline: 'none' }}
                    />
                  </Box>
                  <Box position="relative">
                    <Button
                      aria-label="Select emoji"
                      size="md"
                      h="44px"
                      bg="#2a2a2a"
                      fontSize="20px"
                      _hover={{ bg: '#3a3a3a' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPickerExpanded(!showEmojiPickerExpanded);
                      }}
                      px={3}
                      minW="auto"
                    >
                      😊
                    </Button>
                    {showEmojiPickerExpanded && (
                      <Box
                        position="absolute"
                        bottom="100%"
                        right="0"
                        mb={2}
                        zIndex={1000}
                        boxShadow="0 4px 12px rgba(0, 0, 0, 0.4)"
                        borderRadius="md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          theme="dark"
                          height={400}
                          width={350}
                        />
                      </Box>
                    )}
                  </Box>
                  <Box>
                    <Button
                      bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                      color="black"
                      fontWeight="600"
                      onClick={handleSendMessage}
                      isDisabled={!newMessage.trim()}
                      _hover={{ 
                        bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                      }}
                      _active={{
                        transform: 'translateY(0)',
                        boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                      }}
                      _disabled={{ 
                        bg: "#2a2a2a", 
                        color: "#666",
                        cursor: "not-allowed",
                        transform: 'none',
                        boxShadow: 'none'
                      }}
                      leftIcon={<FiSend />}
                      px={6}
                      borderRadius="md"
                      transition="all 0.2s"
                      boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
                    >
                      Send
                    </Button>
                  </Box>
                </HStack>
              </VStack>
            ) : (
              <VStack gap={3}>
                <Text color="#888" textAlign="center" fontSize="sm">
                  {error || (!connected ? 'Not connected to chat server' : 'Authenticating...')}
                </Text>
                {!connected && (
                  <Button
                    bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                    color="black"
                    fontWeight="600"
                    onClick={reconnect}
                    _hover={{ 
                      bg: "linear-gradient(135deg, #3fd873 0%, #1cb350 100%)",
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(74, 222, 128, 0.3)'
                    }}
                    _active={{
                      transform: 'translateY(0)',
                      boxShadow: '0 1px 4px rgba(74, 222, 128, 0.2)'
                    }}
                    px={6}
                    borderRadius="md"
                    transition="all 0.2s"
                    boxShadow="0 1px 4px rgba(74, 222, 128, 0.2)"
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

  return (
    <>
      {isExpanded ? ExpandedView : CollapsedView}
      {selectedUser && (
        <UserProfileModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          username={selectedUser.username}
          address={selectedUser.address}
        />
      )}
    </>
  );
};

export default TrollBox;