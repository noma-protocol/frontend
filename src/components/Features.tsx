import {
    Flex,
    Heading,
    Text,
    Stack,
    useColorModeValue,
    Box,
    Image
  } from '@chakra-ui/react';
  import { isMobile } from "react-device-detect";
  
  export default function Features() {
    return (
      <Box 
      as="section" 
      className="content-area" 
      display={"inline-block"} 
      p={ isMobile ? '8vh' : '10vh' } 
      my={20}
      >
        <Flex align={'center'} justify={'center'}>
          <Stack spacing={4}>
            <Text
              textTransform={'uppercase'}
              color={'blue.400'}
              fontWeight={600}
              fontSize={'sm'}
              bg={useColorModeValue('blue.50', 'blue.900')}
              p={2}
              alignSelf={'flex-start'}
              rounded={'md'}>
              Our Story
            </Text>
            <Heading alignSelf={'flex-start'}>Beyond the Horizon: Explore the Unknown</Heading>
            <Text color={'gray.500'} fontSize={'lg'}>
              Tap into the psychedelic realms of decentralized liquidity management, where you'll find the keys to unlocking new opportunities and possibilities. So embrace the madness, and let the journey begin.
            </Text>
          </Stack>
          <Stack width={isMobile ? '0' : ''}>
            <Image
              rounded={'md'}
              alt={'feature image'}
              src={'https://raw.githubusercontent.com/noma-protocol/assets/main/flat/noma-flat-01.png'}
              objectFit={'cover'}
              w={isMobile ? "100%" : "90%"}
            />
          </Stack>
        </Flex>
      </Box>
    );
  }