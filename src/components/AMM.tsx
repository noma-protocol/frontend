import React, { useContext } from "react";
import { Box, Flex, Image, Stack, Heading, Text, Button } from "@chakra-ui/react"
import { LanguageContext, LanguageContextType } from "../core/LanguageProvider";
import { isMobile } from "react-device-detect";

const AMM: React.FC = () => {
const ctx = useContext<LanguageContextType>(LanguageContext);

function AMM({ title, desc, ...rest }) {
    return (
      <Box p={5} shadow='md' borderWidth='1px' {...rest}>
        <Heading fontSize='xl'>{title}</Heading>
        <Text mt={4}>{desc}</Text>
      </Box>
    )
  }

return (
    <Box 
      // as="section" 
      className="content-area" 
      display={"inline-block"} 
      p={ isMobile ? '8vh' : '10vh' } 
      my={20}
      ml={isMobile ? 0: "15%"}
    >
      <Box className="container">
        <Box className="row align-items-center justify-content-center" >
          <Flex direction={{ base: "column", md: "row" }} align="center" justify="center" width="full">
            <Box className="col-md">
              <Stack spacing={4}>
                <Text
                  textTransform={'uppercase'}
                  color={'#1ad000'}
                  fontWeight={600}
                  fontSize={'lg'}
                  p={2}
                  alignSelf={'flex-start'}
                  rounded={'md'}>
                  Built on top of
                </Text>
                <Heading alignSelf={'flex-start'}>Uniswap V3</Heading>
                <Text color={'white'} fontSize={'md'}>
                  By leveraging the immutability and power of concentrated liquidity automated market makers (CLMM), the protocol will generate fees from Uniswap V3 positions forever.
                </Text>
                <a href="https://noma-protocol.github.io/" onClick={()=>gaEventTracker('read_more')} target="_blank">
                  <Button 
                    maxW={"150px"}
                    minW={100} 
                    p={15}
                    background={"black"}
                    color={"#1ad000"}
                    fontWeight={600} 
                    border={"1px solid gray"}
                    >
                      Read More
                  </Button>
                </a>
              </Stack>

            </Box>  
            <Box width={ isMobile ? '0' : '50%' } textAlign={"center"}>
                <Image 
                    // maxW={'50%'}
                  objectFit={'cover'}
                  w={isMobile ? "100%" : "90%"}
                    src={"https://raw.githubusercontent.com/noma-protocol/assets/main/donut.png"}
                    visibility={ isMobile ? 'hidden' : 'initial' }
                />
            </Box>
          </Flex>         
        </Box>
      </Box>
    </Box>
  )
}

export default AMM;