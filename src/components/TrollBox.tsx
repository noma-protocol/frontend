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
import { FiSend, FiMaximize2, FiMinimize2, FiMessageSquare, FiX, FiChevronDown, FiImage, FiYoutube, FiCornerUpRight } from 'react-icons/fi';
import { useAccount } from 'wagmi';
import { useTrollbox } from '../hooks/useTrollbox';
import UserProfileModal from './UserProfileModal';
import EmojiPicker from 'emoji-picker-react';
import GifPicker from './GifPicker';
import { toaster } from '../components/ui/toaster';

// Image component with fallback
const ImageWithFallback: React.FC<{
  src: string;
  alt: string;
  maxSize: string;
  onLoad?: () => void;
}> = ({ src, alt, maxSize, onLoad }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <Text color="#ff6b6b" fontSize="xs" fontStyle="italic">
        [Failed to load image]
      </Text>
    );
  }
  
  return (
    <Box display="inline-block" my={1}>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: maxSize,
          maxHeight: maxSize,
          borderRadius: '8px',
          display: 'inline-block',
          verticalAlign: 'middle'
        }}
        onLoad={onLoad}
        onError={(e) => {
          console.error('Image failed to load:', {
            url: src.substring(0, 200),
            error: e,
            fullUrl: src
          });
          setHasError(true);
        }}
      />
    </Box>
  );
};

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  clientId: string;
  address?: string;
  replyTo?: {
    id: string;
    username: string;
    content: string;
  };
  isTradeAlert?: boolean;
  isCommand?: boolean;
  commandType?: string;
}

let instanceCounter = 0;

const TrollBox: React.FC = () => {
  const instanceId = useRef(++instanceCounter);
  // console.log(`TrollBox instance ${instanceId.current} created`);
  
  const { address, isConnected } = useAccount();
  const [prevAddress, setPrevAddress] = useState<string | undefined>(undefined);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const collapsedInputRef = useRef<HTMLInputElement>(null);
  const expandedInputRef = useRef<HTMLInputElement>(null);
  const [selectedUser, setSelectedUser] = useState<{ username: string; address: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEmojiPickerExpanded, setShowEmojiPickerExpanded] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showGifPickerExpanded, setShowGifPickerExpanded] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string>('');
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<string[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [showYouTubeVideos, setShowYouTubeVideos] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  
  // Admin addresses
  const ADMIN_ADDRESSES = ['0xcC91EB5D1AB2D577a64ACD71F0AA9C5cAf35D111'];
  const isAdmin = address && ADMIN_ADDRESSES.includes(address);
  
  // Use the WebSocket hook with autoConnect=false
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
    connect,
    disconnect,
    reconnect,
    clearAuth,
    error 
  } = useTrollbox('wss://trollbox-ws.noma.money', false);
  
  // Add authentication timeout
  useEffect(() => {
    let authTimeout: NodeJS.Timeout;
    
    if (isAuthenticating) {
      authTimeout = setTimeout(() => {
        setIsAuthenticating(false);
        setAuthAttempts(prev => prev + 1);
        setError('Authentication timed out. Please try again.');
      }, 30000); // 30 second timeout
    }
    
    return () => {
      if (authTimeout) clearTimeout(authTimeout);
    };
  }, [isAuthenticating]);

  // Authenticate when connected and have address
  useEffect(() => {
    // Check if wallet address changed or disconnected
    if (prevAddress && prevAddress !== address) {
      // User switched accounts or disconnected wallet
      disconnect();
      
      // Clear auth from localStorage for the previous address
      const authData = localStorage.getItem('trollbox_auth');
      if (authData) {
        try {
          const authMap = JSON.parse(authData);
          delete authMap[prevAddress.toLowerCase()];
          localStorage.setItem('trollbox_auth', JSON.stringify(authMap));
        } catch (e) {}
      }
    }
    
    setPrevAddress(address);
    
    if (connected && address && !authenticated && !isAuthenticating) {
      // Don't send username on initial auth - let user set it
      setIsAuthenticating(true);
      authenticate(address)
        .then(() => {
          setAuthAttempts(0); // Reset attempts on success
        })
        .catch(err => {
          console.error('Authentication failed:', err);
          setAuthAttempts(prev => {
            const newAttempts = prev + 1;
            // Clear auth cache after 3 failed attempts
            if (newAttempts >= 3 && address) {
              clearAuth(address);
            }
            return newAttempts;
          });
        })
        .finally(() => {
          setIsAuthenticating(false);
        });
    }
  }, [connected, address, authenticated, authenticate, disconnect, prevAddress, isAuthenticating]);
  
  // Update local username when server username changes
  useEffect(() => {
    if (serverUsername) {
      setUsername(serverUsername);
    }
  }, [serverUsername]);

  // Check for mentions in new messages
  useEffect(() => {
    if (!serverUsername || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    // Avoid processing the same message twice
    if (lastMessage.id === lastProcessedMessageId) return;
    
    // Don't notify for own messages
    if (lastMessage.username === serverUsername) return;
    
    // Check if current user is mentioned
    const mentionPattern = new RegExp(`@${serverUsername}\\b`, 'gi');
    if (mentionPattern.test(lastMessage.content)) {
      toaster.create({
        title: `${lastMessage.username} mentioned you`,
        description: lastMessage.content.length > 50 
          ? lastMessage.content.substring(0, 50) + '...' 
          : lastMessage.content,
        duration: 5000,
      });
    }
    
    setLastProcessedMessageId(lastMessage.id);
  }, [messages, serverUsername, lastProcessedMessageId]);
  
  // Add global paste event listener for better paste support
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Check if the paste event is happening in one of our input fields
      const activeElement = document.activeElement;
      if (!activeElement) return;
      
      // Check if it's one of our input elements
      const isOurInput = 
        (collapsedInputRef.current && activeElement === collapsedInputRef.current) ||
        (expandedInputRef.current && activeElement === expandedInputRef.current);
      
      if (isOurInput) {
        console.log('Global paste event detected in our input');
        // The handlePaste function should already be called by the onPaste prop
        // This is just for debugging
      }
    };
    
    document.addEventListener('paste', handleGlobalPaste);
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        // Try direct scroll first
        container.scrollTop = container.scrollHeight;
      }
      // Then use scrollIntoView as backup
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Check if messages contain media that needs loading
  const messagesContainMedia = (msgs: Message[]) => {
    return msgs.some(msg => {
      const content = msg.content;
      // Check for images/GIFs
      const hasImages = /!\[([^\]]*)\]\(([^)]+)\)/.test(content);
      // Check for YouTube videos
      const hasYouTube = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.test(content);
      return hasImages || hasYouTube;
    });
  };

  // Smart scroll that waits for content to load
  const smartScrollToBottom = (forceWait: boolean = false) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    const hasMedia = messagesContainMedia(messages);
    const waitTime = forceWait || hasMedia ? 500 : 100; // Wait longer for media
    
    setContentLoading(true);
    loadingTimeoutRef.current = setTimeout(() => {
      scrollToBottom();
      setContentLoading(false);
    }, waitTime);
  };

  useEffect(() => {
    // For expanded view, use smart scrolling when new messages arrive
    if (isExpanded && messages.length > 0) {
      smartScrollToBottom();
    } else if (!isExpanded && messagesEndRef.current) {
      // For collapsed view, only scroll if user is already near the bottom
      const container = messagesEndRef.current.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom && messages.length > 2) {
          setTimeout(() => {
            scrollToBottom();
          }, 50);
        }
      }
    }
    
    // Update unread count if not expanded and new messages arrived
    if (!isExpanded && messages.length > prevMessageCount) {
      setUnreadCount(prev => prev + (messages.length - prevMessageCount));
    }
    setPrevMessageCount(messages.length);
  }, [messages, isExpanded]);

  useEffect(() => {
    if (isExpanded) {
      setUnreadCount(0);
      // Smart scroll when expanded view opens
      smartScrollToBottom(true); // Force wait for initial load
    }
    
    return () => {
      // Cleanup timeout on unmount or when collapsing
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isExpanded]);

  // Close emoji/gif pickers and user suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-picker-react') && !target.closest('[aria-label="Select emoji"]')) {
        setShowEmojiPicker(false);
        setShowEmojiPickerExpanded(false);
      }
      if (!target.closest('[aria-label="Select GIF"]') && !target.closest('.gif-picker-container')) {
        setShowGifPicker(false);
        setShowGifPickerExpanded(false);
      }
      if (!target.closest('.user-suggestions') && !target.closest('input')) {
        setShowUserSuggestions(false);
      }
    };

    if (showEmojiPicker || showEmojiPickerExpanded || showGifPicker || showGifPickerExpanded || showUserSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEmojiPicker, showEmojiPickerExpanded, showGifPicker, showGifPickerExpanded, showUserSuggestions]);

  // Show connection status
  useEffect(() => {
    if (error) {
      console.error('Trollbox error:', error);
    }
  }, [error]);

  // Process slash commands
  const processSlashCommand = (command: string): boolean => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case '/help':
        // Only show help in expanded view
        if (isExpanded) {
          setShowHelp(true);
          // Hide help after 5 seconds
          setTimeout(() => setShowHelp(false), 5000);
          return true;
        }
        // In collapsed view, don't process the command
        return false;
        
      case '/slap':
        if (parts.length < 2) {
          setError('Usage: /slap <username>');
          return true;
        }
        const targetUser = parts.slice(1).join(' ');
        const slapMessage = `*** ${username || 'Anonymous'} slapped ${targetUser} with a large trout ***`;
        
        // Send the command to server, it should broadcast the formatted message to all users
        // For now, send it as a regular message but with the formatted content
        sendMessage(
          slapMessage,
          username || 'Anonymous',
          undefined
        );
        return true;
        
      case '/kick':
        // Admin only command
        if (!isAdmin) {
          setError('Only admins can use this command');
          return true;
        }
        
        if (parts.length < 2) {
          setError('Usage: /kick <username>');
          return true;
        }
        
        const kickTarget = parts.slice(1).join(' ');
        const kickMessage = `*** Admin ${username || 'Anonymous'} has kicked ${kickTarget} from the chat ***`;
        
        // Send kick command - the server should handle the actual kicking
        sendMessage(
          kickMessage,
          username || 'Anonymous',
          undefined
        );
        return true;
        
      // Add more commands here in the future
      // case '/hug':
      // case '/dance':
      // case '/wave':
      // case '/highfive':
        
      default:
        return false; // Not a recognized command
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !connected || !authenticated) return;
    
    const messageContent = newMessage.trim();
    
    // Check if it's a slash command
    if (messageContent.startsWith('/')) {
      const handled = processSlashCommand(messageContent);
      if (handled) {
        setNewMessage('');
        setReplyingTo(null);
        return;
      }
      // If not handled, send as regular message
    }
    
    // Pass reply data if replying
    sendMessage(
      messageContent, 
      username || 'Anonymous',
      replyingTo ? {
        id: replyingTo.id,
        username: replyingTo.username,
        content: replyingTo.content
      } : undefined
    );
    
    setNewMessage('');
    setReplyingTo(null); // Clear reply after sending
  };
  
  const handleReply = (message: Message) => {
    console.log('Reply clicked for message:', message);
    setReplyingTo(message);
    // Add @username to input
    setNewMessage(`@${message.username} `);
    // Focus appropriate input
    if (isExpanded && expandedInputRef.current) {
      expandedInputRef.current.focus();
    } else if (!isExpanded && collapsedInputRef.current) {
      collapsedInputRef.current.focus();
    }
  };
  
  const cancelReply = () => {
    setReplyingTo(null);
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

  // Handle paste event for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    console.log('=== Paste event triggered ===');
    console.log('Event type:', e.type);
    console.log('Target:', e.target);
    console.log('CurrentTarget:', e.currentTarget);
    
    if (!e.clipboardData) {
      console.log('No clipboard data available');
      return;
    }
    
    console.log('ClipboardData types:', Array.from(e.clipboardData.types));
    console.log('ClipboardData files:', e.clipboardData.files.length);
    console.log('ClipboardData items:', e.clipboardData.items?.length || 0);
    
    // Method 1: Check files (most reliable for images)
    if (e.clipboardData.files.length > 0) {
      console.log('Checking files...');
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const file = e.clipboardData.files[i];
        console.log(`File ${i}: type=${file.type}, name=${file.name}, size=${file.size}`);
        
        if (file.type.startsWith('image/')) {
          console.log('Image file found!');
          e.preventDefault();
          await processImageFile(file);
          return;
        }
      }
    }
    
    // Method 2: Check items
    const items = e.clipboardData.items;
    if (items) {
      console.log('Checking items...');
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Item ${i}: type=${item.type}, kind=${item.kind}`);
        
        if (item.type.indexOf('image') !== -1) {
          console.log('Image item found!');
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) {
            console.log('Failed to get file from item');
            continue;
          }
          await processImageFile(blob);
          return;
        }
      }
    }
    
    console.log('No images found in clipboard');
  };
  
  // Process image file helper
  const processImageFile = async (file: File | Blob) => {
    setIsUploadingImage(true);
    
    try {
      const MAX_DATA_URL_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_DATA_URL_SIZE) {
        toaster.create({
          title: 'Image too large',
          description: 'Please paste an image smaller than 2MB',
          duration: 3000,
        });
        setIsUploadingImage(false);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        const imageMarkdown = `![image](${base64data})`;
        setNewMessage(prev => prev + (prev ? ' ' : '') + imageMarkdown + ' ');
        
        toaster.create({
          title: 'Image added',
          description: 'Image has been added to your message',
          duration: 2000,
        });
        
        setIsUploadingImage(false);
      };
      
      reader.onerror = () => {
        console.error('FileReader error:', reader.error);
        toaster.create({
          title: 'Failed to read image',
          duration: 3000,
        });
        setIsUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      toaster.create({
        title: 'Failed to process image',
        duration: 3000,
      });
      setIsUploadingImage(false);
    }
  };

  const handleGifSelect = (gifUrlOrEmoji: string) => {
    // Check if it's an emoji (single character or emoji sequence)
    const isEmoji = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}₿Ξ]+$/u.test(gifUrlOrEmoji);
    
    if (isEmoji) {
      // For emojis, add them directly
      setNewMessage(prev => prev + (prev ? ' ' : '') + gifUrlOrEmoji + ' ');
    } else {
      // For GIF URLs, wrap in markdown syntax
      setNewMessage(prev => prev + (prev ? ' ' : '') + `![gif](${gifUrlOrEmoji})` + ' ');
    }
    setShowGifPicker(false);
    setShowGifPickerExpanded(false);
  };

  // Handle input change for @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Check if user is typing a mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex >= 0 && lastAtIndex === value.length - 1) {
      // User just typed @
      setMentionStartIndex(lastAtIndex);
      const uniqueUsernames = [...new Set(messages.map(m => m.username))];
      setUserSuggestions(uniqueUsernames);
      setShowUserSuggestions(true);
    } else if (mentionStartIndex >= 0 && lastAtIndex >= mentionStartIndex) {
      // User is continuing to type after @
      const searchTerm = value.substring(mentionStartIndex + 1);
      const uniqueUsernames = [...new Set(messages.map(m => m.username))];
      const filtered = uniqueUsernames.filter(u => 
        u.toLowerCase().startsWith(searchTerm.toLowerCase())
      );
      setUserSuggestions(filtered);
      setShowUserSuggestions(filtered.length > 0);
    } else {
      // No active mention
      setShowUserSuggestions(false);
      setMentionStartIndex(-1);
    }
  };

  // Handle selecting a user from suggestions
  const handleSelectUserSuggestion = (username: string) => {
    if (mentionStartIndex >= 0) {
      const beforeMention = newMessage.substring(0, mentionStartIndex);
      const afterMention = newMessage.substring(mentionStartIndex);
      const currentSearch = afterMention.substring(1); // Remove @
      
      // Replace the @search with @username
      setNewMessage(beforeMention + '@' + username + ' ');
      setShowUserSuggestions(false);
      setMentionStartIndex(-1);
    }
  };

  // Function to extract YouTube video ID from various URL formats
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
      /youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Function to parse text and highlight @mentions and YouTube links
  const parseTextWithMentions = (text: string, showVideos: boolean = true, showYouTube: boolean = true): React.ReactNode => {
    // First check for YouTube URLs
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[^\s]*)?/g;
    const mentionRegex = /@(\w+)/g;
    
    // Find all matches first
    const allMatches: Array<{type: 'youtube' | 'mention', match: RegExpExecArray}> = [];
    
    let match;
    youtubeRegex.lastIndex = 0;
    while ((match = youtubeRegex.exec(text)) !== null) {
      allMatches.push({ type: 'youtube', match: { ...match } as RegExpExecArray });
    }
    
    mentionRegex.lastIndex = 0;
    while ((match = mentionRegex.exec(text)) !== null) {
      allMatches.push({ type: 'mention', match: { ...match } as RegExpExecArray });
    }
    
    // Sort by index
    allMatches.sort((a, b) => a.match.index! - b.match.index!);
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    for (const item of allMatches) {
      const match = item.match;
      
      // Add text before the match
      if (match.index! > lastIndex) {
        parts.push(text.substring(lastIndex, match.index!));
      }
      
      if (item.type === 'youtube') {
        const videoId = extractYouTubeVideoId(match[0]);
        if (videoId && showVideos && showYouTube) {
          parts.push(
            <Box key={match.index} my={2} width="100%" maxW="300px">
              <Box
                as="iframe"
                width="100%"
                height="168px"
                src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                borderRadius="md"
                bg="#000"
                border="1px solid #333"
                onLoad={() => {
                  if (isExpanded) {
                    scrollToBottom('auto');
                  }
                }}
              />
              <Text 
                fontSize="xs" 
                color="#666" 
                mt={1}
                cursor="pointer"
                _hover={{ color: "#888", textDecoration: "underline" }}
                onClick={() => window.open(match[0], '_blank')}
              >
                {match[0]}
              </Text>
            </Box>
          );
        } else if (videoId && !showVideos) {
          // Show indicator in collapsed view
          parts.push(
            <Text
              key={match.index}
              as="span"
              color="#ff0000"
              fontSize="xs"
              fontStyle="italic"
              mx={1}
            >
              [YouTube Video]
            </Text>
          );
        } else {
          parts.push(match[0]);
        }
      } else if (item.type === 'mention') {
        const mentionedUser = match[1];
        const isCurrentUser = mentionedUser.toLowerCase() === serverUsername?.toLowerCase();
        
        parts.push(
          <Text
            key={match.index}
            as="span"
            color={isCurrentUser ? "#fbbf24" : "#4ade80"}
            fontWeight="bold"
            bg={isCurrentUser ? "rgba(251, 191, 36, 0.1)" : "transparent"}
            px={isCurrentUser ? 1 : 0}
            borderRadius="sm"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={() => {
              const userMessage = messages.find(m => m.username.toLowerCase() === mentionedUser.toLowerCase());
              if (userMessage?.address) {
                handleUsernameClick(mentionedUser, userMessage.address);
              }
            }}
          >
            @{mentionedUser}
          </Text>
        );
      }
      
      lastIndex = match.index! + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Function to render message content with GIFs and images
  const renderMessageContent = (content: string, showImages: boolean = true) => {
    // Check if content contains markdown image syntax ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      // Add text before the image (with mention and YouTube parsing)
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        if (textBefore) {
          parts.push(<span key={`text-${lastIndex}`}>{parseTextWithMentions(textBefore, showImages, showYouTubeVideos)}</span>);
        }
      }
      
      // Add the image or indicator based on showImages parameter
      const altText = match[1];
      const imageUrl = match[2];
      
      if (!showImages) {
        // Show indicator instead of actual image in collapsed view
        if (altText === 'gif') {
          parts.push(
            <Text 
              key={match.index}
              as="span"
              color="#4ade80"
              fontSize="xs"
              fontStyle="italic"
              mx={1}
            >
              [GIF]
            </Text>
          );
        } else if (altText === 'sticker') {
          parts.push(
            <Text 
              key={match.index}
              as="span"
              color="#4ade80"
              fontSize="xs"
              fontStyle="italic"
              mx={1}
            >
              [Sticker]
            </Text>
          );
        } else {
          parts.push(
            <Text 
              key={match.index}
              as="span"
              color="#4ade80"
              fontSize="xs"
              fontStyle="italic"
              mx={1}
            >
              [Image]
            </Text>
          );
        }
      } else {
        // Show actual images in expanded view
        const isGifOrSticker = altText === 'gif' || altText === 'sticker';
        const maxSize = isGifOrSticker ? '200px' : '300px';
        
        // Log for debugging
        // console.log('Rendering image:', { altText, urlLength: imageUrl.length, urlStart: imageUrl.substring(0, 50) });
        
        // Check if it's a data URL and potentially very long
        const isDataUrl = imageUrl.startsWith('data:');
        if (isDataUrl && imageUrl.length > 1000000) { // 1MB limit for data URLs in chat
          parts.push(
            <Text key={`img-${match.index}`} color="#ff6b6b" fontSize="xs" fontStyle="italic">
              [Image too large to display]
            </Text>
          );
        } else {
          // Create a unique key for the image
          const imgKey = `img-${match.index}`;
          
          parts.push(
            <ImageWithFallback
              key={imgKey}
              src={imageUrl}
              alt={altText || 'image'}
              maxSize={maxSize}
              onLoad={() => {
                if (isExpanded) {
                  scrollToBottom('auto');
                }
              }}
            />
          );
        }
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text (with mention and YouTube parsing)
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      if (remainingText) {
        parts.push(<span key={`text-end`}>{parseTextWithMentions(remainingText, showImages, showYouTubeVideos)}</span>);
      }
    }
    
    // If no parts were created, parse the entire content for mentions and YouTube
    if (parts.length === 0) {
      return parseTextWithMentions(content, showImages, showYouTubeVideos);
    }
    
    return <>{parts}</>;
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
      {/* Help Overlay */}
      {showHelp && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.85)"
          backdropFilter="blur(8px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={100}
          borderRadius="lg"
          onClick={() => setShowHelp(false)}
        >
          <Box
            bg="rgba(26, 26, 26, 0.98)"
            border="2px solid #ff9500"
            borderRadius="md"
            p={5}
            maxW="350px"
            onClick={(e) => e.stopPropagation()}
            boxShadow="0 8px 32px rgba(255, 149, 0, 0.2)"
          >
            <VStack align="start" gap={3}>
              <Text fontSize="md" color="#ff9500" fontWeight="bold">
                ⚡ Available Commands
              </Text>
              <VStack align="start" gap={2} pl={2}>
                <HStack>
                  <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/slap</Text></Box>
                  <Box><Text fontSize="sm" color="white">&lt;user&gt; - Slap someone!</Text></Box>
                </HStack>
                <HStack>
                  <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/help</Text></Box>
                  <Box><Text fontSize="sm" color="white">- Show this help</Text></Box>
                </HStack>
                {isAdmin && (
                  <>
                    <HStack>
                      <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/kick</Text></Box>
                      <Box><Text fontSize="sm" color="white">&lt;user&gt; - Kick a user (Admin)</Text></Box>
                    </HStack>
                    <HStack>
                      <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/clearauth</Text></Box>
                      <Box><Text fontSize="sm" color="white">[user] - Clear auth (Admin)</Text></Box>
                    </HStack>
                  </>
                )}
              </VStack>
              <Text fontSize="xs" color="#666" fontStyle="italic" pt={1}>
                More commands coming soon...
              </Text>
              <Text fontSize="xs" color="#888" pt={2} textAlign="center" w="100%">
                Click anywhere to close
              </Text>
            </VStack>
          </Box>
        </Box>
      )}
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
          <Box 
            key={msg.id} 
            mb={1}
            bg={msg.isTradeAlert ? 'rgba(74, 222, 128, 0.05)' : 'transparent'}
            borderRadius="md"
            p={msg.isTradeAlert ? 1 : 0}
            borderLeft={msg.isTradeAlert ? '2px solid #4ade80' : 'none'}
          >
            <HStack gap={2} align="flex-start" w="100%">
              <Text 
                color={msg.isTradeAlert ? '#ffcc00' : ((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? '#ff9500' : '#4ade80'}
                fontSize="xs" 
                fontWeight="bold" 
                minW="60px"
                maxW="60px"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                title={msg.username}
                cursor={msg.isTradeAlert || ((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? 'default' : 'pointer'}
                _hover={msg.isTradeAlert || ((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? {} : { textDecoration: "underline" }}
                onClick={() => !msg.isTradeAlert && !((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) && handleUsernameClick(msg.username, msg.address)}
                flexShrink={0}
              >
                {msg.isTradeAlert ? 'System' : (msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication'))) ? 'System' : msg.username}
              </Text>
              <Box flex="1" minW="0">
                {msg.replyTo && (
                  <Box 
                    mb={0.5} 
                    p={1} 
                    bg="rgba(74, 222, 128, 0.05)" 
                    borderRadius="md" 
                    borderLeft="2px solid #4ade80"
                    fontSize="xs"
                  >
                    <HStack gap={1} align="center">
                      <FiCornerUpRight size={10} color="#4ade80" />
                      <Text fontSize="xs" color="#4ade80" fontWeight="500">
                        @{msg.replyTo.username}
                      </Text>
                      <Text fontSize="xs" color="#888" noOfLines={1}>
                        {msg.replyTo.content.length > 30 
                          ? msg.replyTo.content.substring(0, 30) + '...' 
                          : msg.replyTo.content}
                      </Text>
                    </HStack>
                  </Box>
                )}
                <Box 
                  color={((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? '#ff9500' : 'white'} 
                  fontSize="xs"
                  fontWeight={((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? 'bold' : 'normal'}
                >
                  {renderMessageContent(msg.content, false)}
                </Box>
              </Box>
              <HStack gap={1} flexShrink={0} alignSelf="flex-start">
                {/* Reply button - show for all regular messages */}
                {!msg.isTradeAlert && (
                  <IconButton
                    aria-label="Reply"
                    icon={<FiCornerUpRight />}
                    size="xs"
                    variant="ghost"
                    color="#888"
                    h="20px"
                    minW="20px"
                    opacity={0.7}
                    transition="all 0.2s"
                    cursor="pointer"
                    _hover={{ 
                      color: '#4ade80', 
                      bg: 'rgba(74, 222, 128, 0.2)',
                      opacity: 1,
                      transform: 'scale(1.1)' 
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReply(msg);
                    }}
                  />
                )}
                <Text color="#666" fontSize="xs" flexShrink={0} minW="35px" textAlign="right">
                  {formatTime(msg.timestamp)}
                </Text>
              </HStack>
            </HStack>
          </Box>
        ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box p={3} borderTop="1px solid #2a2a2a">
        {connected && authenticated ? (
          <VStack align="stretch" gap={2}>
            {replyingTo && (
              <Box 
                p={2} 
                bg="rgba(74, 222, 128, 0.1)" 
                borderRadius="md" 
                borderLeft="3px solid #4ade80"
                fontSize="xs"
                mb={2}
                boxShadow="0 2px 8px rgba(74, 222, 128, 0.1)"
              >
                <HStack justify="space-between">
                  <HStack gap={1}>
                    <FiCornerUpRight size={10} color="#4ade80" />
                    <Text fontSize="xs" color="#4ade80">
                      @{replyingTo.username}
                    </Text>
                    <Text fontSize="xs" color="#888" noOfLines={1} flex="1">
                      {replyingTo.content.length > 40 
                        ? replyingTo.content.substring(0, 40) + '...' 
                        : replyingTo.content}
                    </Text>
                  </HStack>
                  <Box cursor="pointer" onClick={cancelReply}>
                    <FiX size={12} color="#666" />
                  </Box>
                </HStack>
              </Box>
            )}
            {/* Help moved to overlay */}
            <VStack spacing={2} align="stretch">
              {isUploadingImage && (
                <Text fontSize="xs" color="#4ade80" position="absolute" top="-20px" left="0">
                  Uploading image...
                </Text>
              )}
              {/* Top row: emoji, gif, clipboard buttons */}
              <HStack justify="flex-start" spacing={2}>
                {/* Manual paste button for testing */}
                <Button
                  aria-label="Paste image"
                  size="sm"
                  bg="#2a2a2a"
                  _hover={{ bg: '#3a3a3a' }}
                  onClick={async () => {
                    try {
                      console.log('Manual paste button clicked');
                      const text = await navigator.clipboard.readText();
                      console.log('Text from clipboard:', text.substring(0, 100));
                      
                      // Try to read clipboard items
                      if (navigator.clipboard.read) {
                        const items = await navigator.clipboard.read();
                        console.log('Clipboard items:', items.length);
                        
                        for (const item of items) {
                          console.log('Item types:', item.types);
                          for (const type of item.types) {
                            if (type.startsWith('image/')) {
                              const blob = await item.getType(type);
                              await processImageFile(blob);
                              return;
                            }
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Clipboard access error:', err);
                      toaster.create({
                        title: 'Clipboard access denied',
                        description: 'Please use Ctrl+V to paste images',
                        duration: 3000,
                      });
                    }
                  }}
                  px={2}
                  minW="auto"
                  title="Click to paste image from clipboard"
                >
                  📋
                </Button>
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
                <Box position="relative">
                  <Button
                    ref={gifButtonRef}
                    aria-label="Select GIF"
                    size="sm"
                    bg="#2a2a2a"
                    _hover={{ bg: '#3a3a3a' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGifPicker(!showGifPicker);
                    }}
                    px={2}
                    minW="auto"
                  >
                    <FiImage />
                  </Button>
                  {showGifPicker && (
                    <Box
                      position="fixed"
                      bottom="auto"
                      left="auto"
                      zIndex={10000}
                      boxShadow="0 4px 12px rgba(0, 0, 0, 0.4)"
                      borderRadius="md"
                      onClick={(e) => e.stopPropagation()}
                      ref={(el) => {
                        if (el && gifButtonRef.current) {
                          const buttonRect = gifButtonRef.current.getBoundingClientRect();
                          const pickerWidth = 400;
                          const pickerHeight = 500;
                          
                          let left = buttonRect.left + (buttonRect.width / 2) - (pickerWidth / 2);
                          let top = buttonRect.top - pickerHeight - 8;
                          
                          if (left < 10) left = 10;
                          if (left + pickerWidth > window.innerWidth - 10) {
                            left = window.innerWidth - pickerWidth - 10;
                          }
                          if (top < 10) {
                            top = buttonRect.bottom + 8;
                          }
                          
                          el.style.left = `${left}px`;
                          el.style.top = `${top}px`;
                        }
                      }}
                    >
                      <GifPicker onSelectGif={handleGifSelect} onClose={() => setShowGifPicker(false)} />
                    </Box>
                  )}
                </Box>
              </HStack>
              {/* Bottom row: input and send button */}
              <HStack spacing={2} position="relative">
                <Box flex="1" position="relative">
                  <Box
                    onPaste={(e: any) => handlePaste(e)}
                    w="100%"
                  >
                    <Input
                      ref={collapsedInputRef}
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      onPaste={handlePaste}
                      placeholder="Type a message..."
                      bg="#2a2a2a"
                      border="none"
                      color="white"
                      h="36px"
                      w="100%"
                      _placeholder={{ color: '#666' }}
                      _hover={{ bg: '#3a3a3a' }}
                      _focus={{ bg: '#3a3a3a', outline: 'none' }}
                      disabled={isUploadingImage}
                    />
                  </Box>
                  {showUserSuggestions && userSuggestions.length > 0 && (
                    <Box
                      className="user-suggestions"
                      position="absolute"
                      bottom="100%"
                      left="0"
                      right="0"
                      mb={1}
                      bg="#2a2a2a"
                      borderRadius="md"
                      border="1px solid #3a3a3a"
                      maxH="150px"
                      overflowY="auto"
                      zIndex={1000}
                      boxShadow="0 -4px 12px rgba(0, 0, 0, 0.3)"
                    >
                      {userSuggestions.map((username) => (
                        <Box
                          key={username}
                          px={3}
                          py={2}
                          cursor="pointer"
                          _hover={{ bg: '#3a3a3a' }}
                          onClick={() => handleSelectUserSuggestion(username)}
                        >
                          <Text color="white" fontSize="sm">
                            @{username}
                          </Text>
                        </Box>
                      ))}
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
            </VStack>
          </VStack>
        ) : (
          <VStack gap={2}>
            <Text color="#888" textAlign="center" fontSize="xs">
              {authStatus || error || (!connected ? 'Not connected to chat' : isAuthenticating ? 'Authenticating...' : authAttempts > 0 ? 'Authentication failed. Retrying...' : 'Waiting for authentication...')}
            </Text>
            {connected && !authenticated && !isAuthenticating && address && (
              <Button
                size="sm"
                bg="linear-gradient(135deg, #ff9500 0%, #ff7700 100%)"
                color="white"
                fontWeight="600"
                isLoading={isAuthenticating}
                loadingText="Authenticating..."
                onClick={() => {
                  setAuthStatus('Starting authentication...');
                  setIsAuthenticating(true);
                  authenticate(address)
                    .then(() => {
                      // Don't show success here - auth hook will update when server confirms
                      setAuthStatus('');
                      setAuthAttempts(0);
                    })
                    .catch(err => {
                      const errorMsg = err?.message || 'Authentication failed';
                      setAuthStatus(`Error: ${errorMsg}`);
                      setAuthAttempts(prev => prev + 1);
                      setTimeout(() => setAuthStatus(''), 5000);
                    })
                    .finally(() => {
                      setIsAuthenticating(false);
                    });
                }}
                _hover={{ 
                  bg: "linear-gradient(135deg, #ff8400 0%, #ff6600 100%)",
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(255, 149, 0, 0.3)'
                }}
                _active={{
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 4px rgba(255, 149, 0, 0.2)'
                }}
                px={4}
                h="32px"
                borderRadius="md"
                transition="all 0.2s"
                leftIcon={<FiMessageSquare />}
              >
                Tap to Authenticate
              </Button>
            )}
            {!connected && (
              <Button
                size="sm"
                bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                color="black"
                fontWeight="600"
                onClick={connect}
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
        {/* Help Overlay for Expanded View */}
        {showHelp && (
          <Box
            position="fixed"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            bg="rgba(26, 26, 26, 0.98)"
            border="2px solid #ff9500"
            borderRadius="md"
            p={6}
            w="600px"
            zIndex={2000}
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(false);
            }}
            boxShadow="0 8px 32px rgba(255, 149, 0, 0.3)"
          >
            <VStack align="start" gap={3} w="100%">
              <Text fontSize="lg" color="#ff9500" fontWeight="bold">
                ⚡ Available Commands
              </Text>
              <VStack align="start" gap={2} pl={0} w="100%">
                <HStack>
                  <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/slap</Text></Box>
                  <Box><Text fontSize="sm" color="white">&lt;user&gt; - Slap someone!</Text></Box>
                </HStack>
                <HStack>
                  <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/help</Text></Box>
                  <Box><Text fontSize="sm" color="white">- Show this help</Text></Box>
                </HStack>
                {isAdmin && (
                  <>
                    <HStack>
                      <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/kick</Text></Box>
                      <Box><Text fontSize="sm" color="white">&lt;user&gt; - Kick a user (Admin)</Text></Box>
                    </HStack>
                    <HStack>
                      <Box w="100px"><Text fontSize="sm" color="#ff9500" fontFamily="monospace">/clearauth</Text></Box>
                      <Box><Text fontSize="sm" color="white">[user] - Clear auth (Admin)</Text></Box>
                    </HStack>
                  </>
                )}
              </VStack>
              <Text fontSize="sm" color="#666" fontStyle="italic" pt={1}>
                More commands coming soon...
              </Text>
              <Text fontSize="sm" color="#888" pt={2} textAlign="center" w="100%">
                Click anywhere to close
              </Text>
            </VStack>
          </Box>
        )}
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
                <Button
                  aria-label="Toggle YouTube videos"
                  size="sm"
                  p={2}
                  minW="auto"
                  bg={showYouTubeVideos ? "#ff0000" : "transparent"}
                  border={showYouTubeVideos ? "none" : "1px solid #333"}
                  onClick={() => setShowYouTubeVideos(!showYouTubeVideos)}
                  _hover={{ 
                    bg: showYouTubeVideos ? "#cc0000" : '#2a2a2a',
                  }}
                  title={showYouTubeVideos ? "Hide YouTube videos" : "Show YouTube videos"}
                >
                  <FiYoutube size={16} color={showYouTubeVideos ? "white" : "#888"} />
                </Button>
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
                <Button
                  aria-label="Minimize"
                  size="sm"
                  p={2}
                  minW="auto"
                  bg="transparent"
                  border="1px solid #333"
                  onClick={() => setIsExpanded(false)}
                  _hover={{ bg: '#2a2a2a' }}
                  title="Minimize"
                >
                  <FiMinimize2 size={16} color="white" />
                </Button>
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
              <Box 
                key={msg.id} 
                mb={2}
                bg={msg.isTradeAlert ? 'rgba(74, 222, 128, 0.05)' : 'transparent'}
                borderRadius="md"
                p={msg.isTradeAlert ? 2 : 0}
                borderLeft={msg.isTradeAlert ? '3px solid #4ade80' : 'none'}
              >
                <HStack gap={3} align="flex-start" w="100%">
                  <Text 
                    color={msg.isTradeAlert ? '#ffcc00' : ((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? '#ff9500' : '#4ade80'}
                    fontSize="sm" 
                    fontWeight="bold" 
                    minW="80px"
                    maxW="80px"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    title={msg.username}
                    cursor={msg.isTradeAlert || ((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? 'default' : 'pointer'}
                    _hover={msg.isTradeAlert || ((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? {} : { textDecoration: "underline" }}
                    onClick={() => !msg.isTradeAlert && !((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) && handleUsernameClick(msg.username, msg.address)}
                    flexShrink={0}
                  >
                    {msg.isTradeAlert ? 'System' : (msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication'))) ? 'System' : msg.username}
                  </Text>
                  <Box flex="1" minW="0">
                    {msg.replyTo && (
                      <Box 
                        mb={1} 
                        p={2} 
                        bg="rgba(74, 222, 128, 0.05)" 
                        borderRadius="md" 
                        borderLeft="2px solid #4ade80"
                      >
                        <HStack gap={1} align="center">
                          <FiCornerUpRight size={12} color="#4ade80" />
                          <Text fontSize="xs" color="#4ade80" fontWeight="500">
                            @{msg.replyTo.username}
                          </Text>
                          <Text fontSize="xs" color="#888" noOfLines={1}>
                            {msg.replyTo.content.length > 50 
                              ? msg.replyTo.content.substring(0, 50) + '...' 
                              : msg.replyTo.content}
                          </Text>
                        </HStack>
                      </Box>
                    )}
                    <Box 
                      color={((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? '#ff9500' : 'white'} 
                      fontSize="sm"
                      fontWeight={((msg.content.includes('***') && (msg.content.includes('slapped') || msg.content.includes('has kicked') || msg.content.includes('cleared authentication')))) ? 'bold' : 'normal'}
                    >
                      {renderMessageContent(msg.content, true)}
                    </Box>
                  </Box>
                  <HStack gap={1} flexShrink={0} alignSelf="flex-start">
                    {/* Reply button - show for all regular messages */}
                    {!msg.isTradeAlert && (
                      <IconButton
                        aria-label="Reply"
                        icon={<FiCornerUpRight />}
                        size="xs"
                        variant="ghost"
                        color="#888"
                        opacity={0.7}
                        transition="all 0.2s"
                        cursor="pointer"
                        _hover={{ 
                          color: '#4ade80', 
                          bg: 'rgba(74, 222, 128, 0.2)',
                          opacity: 1,
                          transform: 'scale(1.1)' 
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReply(msg);
                        }}
                      />
                    )}
                    <Text color="#666" fontSize="xs" flexShrink={0} minW="45px" textAlign="right">
                      {formatTime(msg.timestamp)}
                    </Text>
                  </HStack>
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
                {/* Help moved to overlay */}
                {replyingTo && (
                  <Box 
                    p={3} 
                    bg="rgba(74, 222, 128, 0.1)" 
                    borderRadius="md" 
                    borderLeft="3px solid #4ade80"
                    mb={3}
                    boxShadow="0 2px 8px rgba(74, 222, 128, 0.1)"
                  >
                    <HStack justify="space-between">
                      <HStack gap={1}>
                        <FiCornerUpRight size={14} color="#4ade80" />
                        <Text fontSize="sm" color="#4ade80">
                          Replying to @{replyingTo.username}
                        </Text>
                        <Text fontSize="sm" color="#888" noOfLines={1} flex="1">
                          {replyingTo.content.length > 80 
                            ? replyingTo.content.substring(0, 80) + '...' 
                            : replyingTo.content}
                        </Text>
                      </HStack>
                      <IconButton
                        aria-label="Cancel reply"
                        icon={<FiX />}
                        size="xs"
                        variant="ghost"
                        color="#666"
                        _hover={{ color: '#ff6b6b' }}
                        onClick={cancelReply}
                      />
                    </HStack>
                  </Box>
                )}
                <HStack position="relative">
                  {isUploadingImage && (
                    <Text fontSize="sm" color="#4ade80" position="absolute" top="-24px" left="0">
                      Uploading image...
                    </Text>
                  )}
                  <Box flex="1" position="relative">
                    <Box
                      onPaste={(e: any) => handlePaste(e)}
                      w="100%"
                    >
                      <Input
                        ref={expandedInputRef}
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        onPaste={handlePaste}
                        placeholder="Type your message or /help for commands..."
                        bg="#2a2a2a"
                        border="none"
                        color="white"
                        h="44px"
                        w="100%"
                        _placeholder={{ color: '#666' }}
                        _hover={{ bg: '#3a3a3a' }}
                        _focus={{ bg: '#3a3a3a', outline: 'none' }}
                        disabled={isUploadingImage}
                      />
                    </Box>
                    {showUserSuggestions && userSuggestions.length > 0 && (
                      <Box
                        className="user-suggestions"
                        position="absolute"
                        bottom="100%"
                        left="0"
                        right="0"
                        mb={1}
                        bg="#2a2a2a"
                        borderRadius="md"
                        border="1px solid #3a3a3a"
                        maxH="200px"
                        overflowY="auto"
                        zIndex={1000}
                        boxShadow="0 -4px 12px rgba(0, 0, 0, 0.3)"
                      >
                        {userSuggestions.map((username) => (
                          <Box
                            key={username}
                            px={4}
                            py={2}
                            cursor="pointer"
                            _hover={{ bg: '#3a3a3a' }}
                            onClick={() => handleSelectUserSuggestion(username)}
                          >
                            <Text color="white" fontSize="sm">
                              @{username}
                            </Text>
                          </Box>
                        ))}
                      </Box>
                    )}
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
                  <Box position="relative">
                    <Button
                      aria-label="Select GIF"
                      size="md"
                      h="44px"
                      bg="#2a2a2a"
                      _hover={{ bg: '#3a3a3a' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGifPickerExpanded(!showGifPickerExpanded);
                      }}
                      px={3}
                      minW="auto"
                    >
                      <FiImage size={20} />
                    </Button>
                    {showGifPickerExpanded && (
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
                        <GifPicker onSelectGif={handleGifSelect} onClose={() => setShowGifPickerExpanded(false)} />
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
                  {error || (!connected ? 'Not connected to chat server' : isAuthenticating ? 'Authenticating...' : authAttempts > 0 ? 'Authentication failed. Retrying...' : 'Waiting for authentication...')}
                </Text>
                {connected && !authenticated && !isAuthenticating && address && (
                  <Button
                    bg="linear-gradient(135deg, #ff9500 0%, #ff7700 100%)"
                    color="white"
                    fontWeight="600"
                    onClick={() => {
                      setIsAuthenticating(true);
                      authenticate(address)
                        .then(() => {
                          setAuthAttempts(0);
                        })
                        .catch(err => {
                          console.error('Manual auth failed:', err);
                          setAuthAttempts(prev => prev + 1);
                        })
                        .finally(() => {
                          setIsAuthenticating(false);
                        });
                    }}
                    _hover={{ 
                      bg: "linear-gradient(135deg, #ff8400 0%, #ff6600 100%)",
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(255, 149, 0, 0.3)'
                    }}
                    _active={{
                      transform: 'translateY(0)',
                      boxShadow: '0 1px 4px rgba(255, 149, 0, 0.2)'
                    }}
                    px={6}
                    borderRadius="md"
                    transition="all 0.2s"
                    leftIcon={<FiMessageSquare />}
                  >
                    Tap to Authenticate
                  </Button>
                )}
                {!connected && (
                  <Button
                    bg="linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                    color="black"
                    fontWeight="600"
                    onClick={connect}
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