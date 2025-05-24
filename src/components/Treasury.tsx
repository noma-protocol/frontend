import React, { useContext } from "react";
import { Box, Flex, Image, Stack, Heading, Text, List, ListItem, Button } from "@chakra-ui/react"
import { LanguageContext, LanguageContextType } from "../core/LanguageProvider";
import { isMobile } from "react-device-detect";

const Treasury: React.FC = () => {
const ctx = useContext<LanguageContextType>(LanguageContext);

return (
    <Box 
      as="section" 
      className="content-area" 
      display={"inline-block"} 
      p={ isMobile ? '8vh' : '10vh' } 
      my={20}
    >
      <Box className="container">
        <Box className="row align-items-center justify-content-center" >
          <Flex direction={{ base: "column", md: "row" }} align="center" justify="center" width="full" ml={isMobile ? 0: "15%"}>
            <Box className="col-md">
                {/* <StackedCards /> */}
                <Stack spacing={4}>
            <Text
              textTransform={'uppercase'}
              color={'#1ad000'}
              fontWeight={600}
              fontSize={'lg'}
              p={2}
              alignSelf={'flex-start'}
              rounded={'md'}>
              Noma offers
            </Text>
            <Heading alignSelf={'flex-start'}>Peace of mind</Heading>
            <Text color={'white'} fontSize={'md'}>
              Noma ensures that the solvency invariant <br /><label style={{fontSize:"22px", fontStyle:"italic", margin:"15px"}}>liquidity capacity {">"} circulating supply</label> <br /> is maintained every time the liquidity is rebalanced. 
             <br /> <br />Through this mechanism the protocol is able to buy back the whole circulating supply at any moment, guaranteeing a minimum value for its token price.           </Text>
            <a href="https://noma-protocol.github.io/" target="_blank">
              <Button 
                maxW={"150px"} 
                p={15}
                background={"black"}
                color={"#1ad000"}
                fontWeight={600} 
                h={50}
                border={"1px solid gray"}
                >
                  Read More
              </Button>
            </a>
          </Stack>
            </Box>  
            <Box width={ isMobile ? '0' : '45%' } textAlign={"center"}>
                <Image 
                    // maxW={'50%'}
                  objectFit={'cover'}
                  w={isMobile ? "100%" : "90%"}
                  src={"https://raw.githubusercontent.com/noma-protocol/assets/main/flat/noma-flat-01.png"}
                  visibility={ isMobile ? 'hidden' : 'initial' }
                />
            </Box>
          </Flex>         
        </Box>
      </Box>
    </Box>
  )
}

export default Treasury;