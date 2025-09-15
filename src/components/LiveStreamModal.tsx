import React, { useState } from 'react';
import {
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Box,
  Spinner,
} from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogTitle,
} from '../components/ui/dialog';
import { Field } from '../components/ui/field';
import { toaster } from '../components/ui/toaster';
import { Checkbox } from '../components/ui/checkbox';
import LiveKitStream from './LiveKitStream';
import { 
  getMockStreamToken, 
  LIVEKIT_CONFIG,
  type StreamConfig 
} from '../services/livekitService';

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultInfo: any; // Vault information
  userAddress: string;
}

const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  vaultInfo,
  userAddress,
}) => {
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTikTokEnabled, setIsTikTokEnabled] = useState(false);
  const [tiktokStreamKey, setTiktokStreamKey] = useState('');
  const [streamToken, setStreamToken] = useState('');
  const [roomName, setRoomName] = useState('');

  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      toaster.create({
        title: 'Title Required',
        description: 'Please enter a title for your stream',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Prepare stream configuration
      const streamConfig: StreamConfig = {
        title: streamTitle,
        description: streamDescription,
        vaultAddress: vaultInfo.vault || vaultInfo.vaultAddress,
        enableTikTok: isTikTokEnabled,
        tiktokStreamKey: isTikTokEnabled ? tiktokStreamKey : undefined,
        enableAudio: isAudioEnabled,
        enableVideo: isVideoEnabled,
      };

      console.log('Starting stream with config:', {
        ...streamConfig,
        tiktokStreamKey: streamConfig.tiktokStreamKey ? '***hidden***' : undefined,
      });

      // Get stream token from backend (using mock for now)
      const tokenResponse = await getMockStreamToken(userAddress, streamConfig);
      
      setStreamToken(tokenResponse.token);
      setRoomName(tokenResponse.roomName);
      setIsStreaming(true);
      
      toaster.create({
        title: 'Stream Initialized',
        description: 'Connecting to streaming server...',
        type: 'success',
        duration: 3000,
      });

      // Log RTMP URLs if available
      if (tokenResponse.rtmpUrls) {
        console.log('RTMP URLs:', tokenResponse.rtmpUrls);
      }
      
    } catch (error) {
      console.error('Stream error:', error);
      toaster.create({
        title: 'Failed to Start Stream',
        description: error instanceof Error ? error.message : 'Failed to initialize stream',
        type: 'error',
        duration: 5000,
      });
      setIsLoading(false);
    }
  };

  const handleStopStream = () => {
    // The LiveKitStream component will handle the actual disconnection
    setIsStreaming(false);
    setStreamToken('');
    setRoomName('');
    setStreamTitle('');
    setStreamDescription('');
    
    toaster.create({
      title: 'Stream Ended',
      description: 'Your live stream has been stopped',
      type: 'info',
      duration: 3000,
    });
    
    onClose();
  };

  return (
    <Box>
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="lg">
      <DialogContent bg="#1a1a1a" color="white" backdrop={true}>
        <DialogHeader>
          <DialogTitle fontSize={"md"}>
            Live Stream for {vaultInfo?.tokenSymbol || 'Token'}
          </DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        
        <DialogBody>
          <VStack spacing={4}>
            {!isStreaming ? (
              <>
                <Box 
                  bg="#2a2a2a" 
                  borderRadius="md" 
                  p={4} 
                  borderLeft="4px solid #3182ce"
                >
                  <HStack spacing={3} align="center">
                    <Box color="#3182ce" flexShrink={0}>
                      <i className="fa-solid fa-circle-info"></i>
                    </Box>
                    <Box>
                      <Text color="#a0aec0" fontSize="sm">
                        Start a live stream to engage with your community and discuss your token launch.
                      </Text>
                    </Box>
                  </HStack>
                </Box>

                <Field label="Stream Title" required>
                  <Input
                    placeholder="Enter stream title"
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    bg="#2a2a2a"
                    border="1px solid #3a3a3a"
                    _hover={{ borderColor: '#4a4a4a' }}
                    _focus={{ borderColor: '#4ade80', boxShadow: 'none' }}
                  />
                </Field>

                <Field label="Stream Description">
                  <Input
                    placeholder="Enter stream description (optional)"
                    value={streamDescription}
                    onChange={(e) => setStreamDescription(e.target.value)}
                    bg="#2a2a2a"
                    border="1px solid #3a3a3a"
                    _hover={{ borderColor: '#4a4a4a' }}
                    _focus={{ borderColor: '#4ade80', boxShadow: 'none' }}
                  />
                </Field>

                <HStack spacing={6} width="100%">
                  <Box>
                  <Checkbox
                    checked={isAudioEnabled}
                    onCheckedChange={(e) => setIsAudioEnabled(!!e.checked)}
                  >
                    Enable Audio
                  </Checkbox>                    
                  </Box>
                  <Box>
                    <Checkbox
                      checked={isVideoEnabled}
                      onCheckedChange={(e) => setIsVideoEnabled(!!e.checked)}
                    >
                      Enable Video
                    </Checkbox>                  
                  </Box>
                </HStack>

                {/* TikTok Integration Section */}
                <Box 
                  width="100%" 
                  p={4} 
                  bg="#2a2a2a" 
                  borderRadius="md" 
                  border="1px solid #3a3a3a"
                >
                  <VStack spacing={3} align="stretch">
                    <Checkbox
                      checked={isTikTokEnabled}
                      onCheckedChange={(e) => setIsTikTokEnabled(!!e.checked)}
                    >
                      <HStack spacing={2}>
                        <Box>
                          <i className="fa-brands fa-tiktok" style={{ fontSize: '18px', color: '#ff0050' }}></i>
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="600">Stream to TikTok Live</Text>
                        </Box>
                      </HStack>
                    </Checkbox>
                    
                    {isTikTokEnabled && (
                      <Box>
                        <Field 
                          label="TikTok Stream Key" 
                          helperText="Get this from TikTok Live Studio"
                        >
                          <Box>
                          <Input
                            placeholder="Enter your TikTok stream key"
                            value={tiktokStreamKey}
                            onChange={(e) => setTiktokStreamKey(e.target.value)}
                            bg="#1a1a1a"
                            border="1px solid #3a3a3a"
                            _hover={{ borderColor: '#4a4a4a' }}
                            _focus={{ borderColor: '#ff0050', boxShadow: 'none' }}
                            type="password"
                          />                          
                          </Box>
                        </Field>                        
                      </Box>
                    )}
                  </VStack>
                </Box>
              </>
            ) : (
              <VStack spacing={4} width="100%">
                {/* LiveKit Stream Component */}
                <LiveKitStream
                  token={streamToken}
                  roomName={roomName}
                  serverUrl={LIVEKIT_CONFIG.serverUrl}
                  isAudioEnabled={isAudioEnabled}
                  isVideoEnabled={isVideoEnabled}
                  onStreamEnd={handleStopStream}
                />
                
                <VStack align="stretch" width="100%" spacing={2}>
                  <HStack spacing={2}>
                    <Box>
                      <Text fontWeight="600">Stream Title:</Text>
                    </Box>
                    <Box flex={1}>
                      <Text>{streamTitle}</Text>
                    </Box>
                  </HStack>
                  
                  {isTikTokEnabled && (
                    <HStack spacing={2}>
                      <Box flexShrink={0}>
                        <i className="fa-brands fa-tiktok" style={{ fontSize: '16px', color: '#ff0050' }}></i>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="#ff0050">Streaming to TikTok Live</Text>
                      </Box>
                    </HStack>
                  )}
                  
                  {streamDescription && (
                    <HStack spacing={2} align="flex-start">
                      <Box flexShrink={0}>
                        <Text fontWeight="600">Description:</Text>
                      </Box>
                      <Box flex={1}>
                        <Text>{streamDescription}</Text>
                      </Box>
                    </HStack>
                  )}
                </VStack>
              </VStack>
            )}
          </VStack>
        </DialogBody>

        <DialogFooter>
          {!isStreaming && (
            <HStack spacing={3}>
              <Button
                variant="ghost"
                onClick={onClose}
                _hover={{ bg: '#2a2a2a' }}
              >
                Cancel
              </Button>
              <Button
                bg="#4ade80"
                color="black"
                onClick={handleStartStream}
                isLoading={isLoading}
                loadingText="Starting..."
                _hover={{ bg: '#22c55e' }}
              >
                Start Stream
              </Button>
            </HStack>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>      
    </Box>
  );
};

export default LiveStreamModal;