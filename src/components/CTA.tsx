import { Box, Flex, Stack, Heading, Text, Button, HStack } from "@chakra-ui/react"
import { isMobile } from "react-device-detect";

const CTA: React.FC = () => {

return (
    <Box 
      as="section" 
      className="content-area" 
      display={"inline-block"} 
      // p={ isMobile ? '8vh' : '10vh' } 
      my={20}
      ml={isMobile ? "5%": "15%"}
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
                    Upcoming Presale
                  </Text>
                  <Heading alignSelf={'flex-start'}>Enroll in the bootstrap event</Heading>
                  <Text color={'white'} fontSize={'md'} w={isMobile?"280px" : '800px'}>
                    Innovative protocol design and trustless distribution mechanism form a synergy to ensure Noma has a fair distribution from the get go. Do not miss the upcoming bootstrap event. {isMobile? "": <br />} Join our community and get all updates.
                  </Text>
                </Stack>
                <HStack pt={"3vh"} >
                  <a href="https://nomaprotocol.medium.com/bootstrap-event-49c1ad496ab6" onClick={()=>gaEventTracker('read_announcement')} target="_blank">
                    <Button 
                      p={15} minW={100} 
                      fontWeight={600} 
                      background={"black"} 
                      color={"lightgreen"} 
                      h={70} 
                      border={"1px solid gray"}
                      >
                        Read our <br />announcement
                    </Button>
                  </a>
                  <a href="https://discord.gg/nomaprotocol" onClick={()=>gaEventTracker('join_community')} target="_blank">
                    <Button
                      p={15} 
                      minW={100}
                      maxW={"15vh"} 
                      fontWeight={600} 
                      background={"black"} 
                      color={"#1ad000"}
                      h={70}
                      border={"1px solid gray"}>
                      Join our <br />Community
                    </Button>
                  </a>
                </HStack>
            </Box> 
          </Flex>         
        </Box>
      </Box>
    </Box>
  )
}

export default CTA;