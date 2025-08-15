import React from 'react';
import { Box, HStack, Text, Image } from '@chakra-ui/react';
import { commify, commifyDecimals, formatNumberPrecise } from '../utils';
import placeholderLogo from "../assets/images/question.svg";
import bnbLogo from "../assets/images/bnb.png";

const PresaleDetails = ({ isMobile, balance, initialPrice, contributions, tokenSymbol, contributionAmount, tokensPurchased, Logo }) => {
    return (
        <Box backgroundColor="#222831" p={8}  borderRadius={10} px={8} border="1px solid white">
            <HStack spacing={4}>
                <Box w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>Balance</Text>
                </Box>
                <Box w={isMobile ? "100px" : "150px"} 
                // ml={isMobile ? 0 : -2} 
                // border="1px solid white"
                >
                    <Text
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {Number(balance.data?.formatted).toFixed(4) > 1000 ? ">" : ""}
                        {commify(Number(balance.data?.formatted).toFixed(3) > 1000 ? 1000 : Number(balance.data?.formatted).toFixed(4))}
                    </Text>
                </Box>
                <Box 
                // border="1px solid white" 
                w={isMobile ? "50px" : "30px"} 
                // ml={isMobile ? 5 : -5}
                >
                    <Image h={5}  src={bnbLogo}  />
                </Box>
                <Box w="40px" 
                // border="1px solid white"
                >
                    <Text 
                    fontWeight="bold" 
                    // ml={isMobile ? -4 : -6}
                    fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}
                     >
                        {isMobile ? "" : <>&nbsp;</>}MON
                    </Text>
                </Box>
            </HStack>

            <HStack mt={3} spacing={4} >
                <Box 
                  w={isMobile ? "100px" : "150px"} 
                  // border="1px solid white"
                >
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>Token price</Text>
                </Box>
                <Box  w={isMobile ? "100px" : "150px"}
                  // border="1px solid white"
                >
                    <Text
                        // ml={isMobile ? -2 : 0}
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {commifyDecimals(initialPrice, 6)}
                    </Text>
                </Box>
                <Box  
                  w={isMobile ? "50px" : "30px"} 
                  // border="1px solid white"
                // ml={isMobile ? -7 : -5}
                >
                    <Image h={5} src={bnbLogo} />
                </Box>
                <Box 
                  w="40px" 
                  // border="1px solid white"
                >
                    <Text 
                        fontWeight="bold" 
                        fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}
                    >
                        {isMobile ? "" : <>&nbsp;</>}MON
                    </Text>
                </Box>
            </HStack>

            <HStack mt={3} spacing={4}>
                <Box 
                w={isMobile ? "100px" : "150px"} 
                // border="1px solid white"
                >
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>{contributions > 0 ? "Contributed" : "Contributing"}</Text>
                </Box>
                <Box w={isMobile ? "100px" : "150px"} 
                // border="1px solid white"
                >
                    <Text
                        //  ml={-2}
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}
                    >
                        {contributions > 0 ?  contributions : (isNaN(contributionAmount) ? 0 : commify(contributionAmount, 2))}
                    </Text>
                </Box>
                <Box 
                  w={isMobile ? "50px" : "30px"}
                  //  border="1px solid white"  
                  // ml={isMobile ? -4 :-6}
                >
                    <Image 
                    // ml={isMobile ? -3 : 0} 
                    h={5} src={bnbLogo}  
                    />
                </Box>
                <Box  
                  w="40px" 
                //  border="1px solid white"
                >
                    <Text 
                      fontWeight="bold" 
                      // ml={isMobile ? -4 : -2} 
                        fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}
                    >
                        {isMobile ? "" : <>&nbsp;</>}MON
                    </Text>
                </Box>
            </HStack>            

            <HStack mt={3} spacing={4} >
                <Box 
                w={isMobile ? "105px" : "150px"} 
                // border="1px solid white"
                >
                  <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>
                      {contributions > 0 ? "Balance" : "You get"}
                  </Text>
                </Box>
                <Box  
                w={isMobile ? "100px" : "150px"} 
                // border="1px solid white"
                >
                    <Text
                        // ml={isMobile ? "3px" : -1}
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}
                    >
                        {formatNumberPrecise(tokensPurchased, 2)}
                    </Text>
                </Box>
                <Box 
                ml={isMobile ? 0 : 1} 
                w={isMobile ? "50px" : "30px"} 
                // border="1px solid white"
                >
                    <Image ml={isMobile ? 3 : 0} h={4} src={placeholderLogo} />
                </Box>
                <Box w={ "50px"} >
                    <Text ml={isMobile ? 0 : -1}  fontWeight="bold" fontSize={isMobile ? "8px" : "10px"}>
                    &nbsp;{tokenSymbol}
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
};

export default PresaleDetails;