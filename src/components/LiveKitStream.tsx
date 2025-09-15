import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, HStack, Text, Button, Spinner } from '@chakra-ui/react';
import { toaster } from './ui/toaster';

interface LiveKitStreamProps {
  token: string;
  roomName: string;
  serverUrl: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onStreamEnd?: () => void;
}

// Mock LiveKit implementation for now
// In production, this would use @livekit/components-react
const LiveKitStream: React.FC<LiveKitStreamProps> = ({
  token,
  roomName,
  serverUrl,
  isAudioEnabled,
  isVideoEnabled,
  onStreamEnd,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const initializeStream = async () => {
      try {
        // Request camera and microphone permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false,
          audio: isAudioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } : false
        });

        setLocalStream(stream);
        
        // Attach stream to video element
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
        }

        // Simulate connection to LiveKit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsConnecting(false);
        setIsConnected(true);
        
        // Start duration counter
        const startTime = Date.now();
        intervalId = setInterval(() => {
          setStreamDuration(Math.floor((Date.now() - startTime) / 1000));
          // Simulate viewer count changes
          setViewerCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
        }, 1000);

        toaster.create({
          title: 'Stream Connected',
          description: 'You are now live!',
          type: 'success',
          duration: 3000,
        });

      } catch (error) {
        console.error('Error initializing stream:', error);
        setIsConnecting(false);
        
        toaster.create({
          title: 'Stream Error',
          description: error instanceof Error ? error.message : 'Failed to access camera/microphone',
          type: 'error',
          duration: 5000,
        });
      }
    };

    initializeStream();

    // Cleanup
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAudioEnabled, isVideoEnabled]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setIsConnected(false);
    if (onStreamEnd) {
      onStreamEnd();
    }
  };

  if (isConnecting) {
    return (
      <VStack spacing={4} py={8}>
        <Spinner size="lg" color="#4ade80" thickness="3px" />
        <Text color="#888">Connecting to stream...</Text>
        <Text fontSize="sm" color="#666">Room: {roomName}</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} width="100%">
      {/* Video Preview */}
      <Box
        width="100%"
        position="relative"
        bg="#0a0a0a"
        borderRadius="md"
        overflow="hidden"
        border="1px solid #2a2a2a"
      >
        {isVideoEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Box
            height="300px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <VStack spacing={2}>
              <Box color="#4ade80">
                <i className="fa-solid fa-microphone" style={{ fontSize: '48px' }}></i>
              </Box>
              <Text color="#888">Audio Only Stream</Text>
            </VStack>
          </Box>
        )}
        
        {/* Live Indicator */}
        <Box
          position="absolute"
          top={4}
          left={4}
          bg="rgba(239, 68, 68, 0.9)"
          px={3}
          py={1}
          borderRadius="md"
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Box
            width="8px"
            height="8px"
            borderRadius="full"
            bg="#fff"
            animation="pulse 2s infinite"
          />
          <Text color="white" fontSize="sm" fontWeight="600">
            LIVE
          </Text>
        </Box>

        {/* Stream Stats */}
        <HStack
          position="absolute"
          top={4}
          right={4}
          spacing={3}
          bg="rgba(0, 0, 0, 0.7)"
          px={3}
          py={1}
          borderRadius="md"
        >
          <HStack spacing={1}>
            <i className="fa-solid fa-eye" style={{ fontSize: '12px', color: '#888' }}></i>
            <Text color="white" fontSize="sm">{viewerCount}</Text>
          </HStack>
          <HStack spacing={1}>
            <i className="fa-solid fa-clock" style={{ fontSize: '12px', color: '#888' }}></i>
            <Text color="white" fontSize="sm">{formatDuration(streamDuration)}</Text>
          </HStack>
        </HStack>
      </Box>

      {/* Stream Controls */}
      <HStack spacing={4}>
        <Button
          size="sm"
          variant="ghost"
          color={isAudioEnabled ? '#4ade80' : '#ef4444'}
          onClick={() => {
            if (localStream) {
              const audioTrack = localStream.getAudioTracks()[0];
              if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
              }
            }
          }}
        >
          <i className={`fa-solid fa-${isAudioEnabled ? 'microphone' : 'microphone-slash'}`}></i>
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          color={isVideoEnabled ? '#4ade80' : '#ef4444'}
          onClick={() => {
            if (localStream) {
              const videoTrack = localStream.getVideoTracks()[0];
              if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
              }
            }
          }}
          isDisabled={!isVideoEnabled}
        >
          <i className={`fa-solid fa-${isVideoEnabled ? 'video' : 'video-slash'}`}></i>
        </Button>

        <Button
          size="sm"
          bg="#ef4444"
          color="white"
          onClick={handleEndStream}
          _hover={{ bg: '#dc2626' }}
          px={6}
        >
          End Stream
        </Button>
      </HStack>

      {/* Stream Info */}
      <Box
        width="100%"
        p={3}
        bg="#2a2a2a"
        borderRadius="md"
        fontSize="xs"
      >
        <VStack align="stretch" spacing={1}>
          <HStack justify="space-between">
            <Text color="#888">Server:</Text>
            <Text color="#a0aec0">{serverUrl}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="#888">Room:</Text>
            <Text color="#a0aec0">{roomName}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text color="#888">Status:</Text>
            <Text color="#4ade80">Connected</Text>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  );
};

export default LiveKitStream;