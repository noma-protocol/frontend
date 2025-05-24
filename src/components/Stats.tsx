import { Box, Button, Flex, Text, chakra } from '@chakra-ui/react';
import { StatLabel, StatRoot, StatValueText } from "./ui/stat"
import { Slider } from "./ui/slider"

import { isMobile } from "react-device-detect";
  
  interface StatsCardProps {
    title: string;
    stat: string;
  }

  function StatsCard(props: StatsCardProps) {
    const { title, stat } = props;
    return (
      // <Stat
      //   p={'2vw'}
      //   shadow={'xl'}
      //   border={'4px solid'}
      //   rounded={'lg'}
      //   backgroundColor={'rgba(0,0,0,0.5)'}>
      //     <StatLabel color={'white'} fontWeight={'medium'}>
      //       {title}
      //     </StatLabel>
      //     <Box as="p" color="white" fontSize="2xl" fontWeight="medium">
      //       {stat}
      //     </Box>
      // </Stat>
    <StatRoot border={'3px solid'} p={'2vw'} shadow={'xl'}  >
    <StatLabel color={'#54ff36'} fontWeight={'medium'} fontSize={"lg"}>{title}</StatLabel>
    <StatValueText
      rounded={'lg'}
      backgroundColor={'rgba(0,0,0,0.5)'}
      color="white" fontSize="md" fontWeight="medium"
      lineHeight={"22px"}
      // formatOptions={{ style: "currency", currency: "USD" }}
    >{stat}</StatValueText>
  </StatRoot>      
    );
  }

  export default function Stats() {
    return (
        <>
          <Box
            w="100vw"
            h="200vh"
            minH="30vh"
            bg="gray.800"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            textAlign={isMobile? "center" : "left"}
            position={"absolute"}
            left={0}
            right={0}
            height={isMobile? 480 : 300}
            p={4}
            backgroundColor={"#161616"}
            backgroundSize={"100%"}
          >
          <Flex direction="column" align="left" >
              <br />
              <chakra.h2 fontSize={isMobile ? "2xl" : "4xl"} mt={isMobile ? 120 : 60} >
                Enroll in the <Text color={'lightgreen'} as={'span'}>bootstrap</Text> event
              </chakra.h2>
                <Box
                  textAlign={"left"}
                  w={isMobile? 340 : 900}
                >
                  <Text fontSize={isMobile ? "small" : "medium"} align={"left"}>                 
                    Read our <a href="https://medium.com/@nomaprotocol/bootstrap-event-49c1ad496ab6" target="_new"><b style={{fontSize:"16px"}}>
                    Bootstrap event announcement</b></a> and subscribe to the whitelist now. 
                    {isMobile ? "":<br />}Join our Discord server and follow the instructions to participate!
                  </Text>
                </Box>
                <Flex
                  direction={isMobile ? "column" : "row"}
                  gap={4}
                  w={isMobile ? "full" : "auto"}
                >
                  <a href="https://discord.gg/nomaprotocol" target="_blank" >
                  <Button 
                    p={15} 
                    minW={100} 
                    fontWeight={600} 
                    background={"black"} 
                    color={"lightgreen"} 
                    mb={isMobile ? 120 : 60} 
                    onClick={()=>gaEventTracker('join_discord')} 
                    h={50}
                    mt={10}
                    border={"1px solid gray"}
                    >
                      Get whitelisted
                    </Button>
                  <br /> 
                  <br />
                </a>
              </Flex>
            </Flex>
          </Box>
          <Flex mt={isMobile ? "125%" : "35%"}  ml={isMobile? 0 : "15%"} >
              <chakra.h2
                textAlign={'center'}
                py={10}
                mx={'auto'}>
                Protocol design<br/> 
                that transcends limitations
              </chakra.h2>
          </Flex>
          <Flex 
            direction={isMobile? "column" : "row"}
            maxW={isMobile ? "" : "50%" }
            mx={'auto'} 
            p={5} 
            // px={{ 
            //     base: 2, 
            //     sm: 12, 
            //     md: 17 
            // }}
            ml={isMobile? 0 : "30%"}
            textJustify={"left"}
          >
            <StatsCard
              title={'Oracle Free'} 
              stat={"Noma's value tracks BNB regardless of its price and it's free from oracle dependencies. "}/>&nbsp;&nbsp;
            <StatsCard 
              title={'Capital Efficient'} 
              stat={"Noma's loans are emitted 1:1 with the collateral's IMV, yielding 100% capital efficiency without liquidations."}/>&nbsp;&nbsp;
            <StatsCard 
              title={"Up Only"} 
              stat={"Designed to increase the IMV by accruing profits generated from trading directly to the liquidity."}/>
        </Flex>          
        </>
    );
  }