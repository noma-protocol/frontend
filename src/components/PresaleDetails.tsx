import React from 'react';
import { Box, HStack, Text, Image } from '@chakra-ui/react';
import { commify, commifyDecimals, formatNumberPrecise } from '../utils';
import placeholderLogo from "../assets/images/question.svg";
import bnbLogo from "../assets/images/bnb.png";

const PresaleDetails = ({ isMobile, balance, initialPrice, contributions, tokenSymbol, contributionAmount, tokensPurchased, Logo }) => {
    return (
        <Box backgroundColor="#222831" border="1px solid white" p={8}  borderRadius={10} px={8}>
            <HStack spacing={4}>
                <Box w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>Balance</Text>
                </Box>
                <Box w={"160px"}>
                    <Text
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {Number(balance.data?.formatted).toFixed(4) > 1000 ? ">" : ""}&nbsp;
                        {commify(Number(balance.data?.formatted).toFixed(3) > 1000 ? 1000 : Number(balance.data?.formatted).toFixed(4))}
                    </Text>
                </Box>
                <Box w={isMobile ? "30px" : "30px"} >
                    <Image h={5} ml={isMobile ? -7 : -5} src={bnbLogo}  />
                </Box>
                <Box w="auto">
                    <Text fontWeight="bold" ml={isMobile ? -8 : -6} fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                        {isMobile ? "" : <>&nbsp;</>}BNB
                    </Text>
                </Box>
            </HStack>

            <HStack mt={3} spacing={4} >
                <Box w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>Token price</Text>
                </Box>
                <Box  w={"160px"} >
                    <Text
                        ml={isMobile ? -2 : 0}
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {commifyDecimals(initialPrice, 6)}
                    </Text>
                </Box>
                <Box w="auto" ml={isMobile ? -7 : -5}>
                    <Image h={5} src={bnbLogo} />
                </Box>
                <Box w="auto" >
                    <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                        {isMobile ? "" : <>&nbsp;</>}BNB
                    </Text>
                </Box>
            </HStack>

            <HStack mt={3} spacing={4}>
                <Box w={isMobile ? "100px" : "155px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>{contributions > 0 ? "Contributed" : "Contributing"}</Text>
                </Box>
                <Box w={"160px"} >
                    <Text
                         ml={-2}
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {contributions > 0 ?  contributions : (isNaN(contributionAmount) ? 0 : commifyDecimals(contributionAmount, 6))}
                    </Text>
                </Box>
                <Box w={isMobile ? "30px" : "auto"} ml={isMobile ? -4 :-6}>
                    <Image ml={isMobile ? -3 : 0} h={5} src={bnbLogo}  />
                </Box>
                <Box w="auto">
                    <Text fontWeight="bold" ml={isMobile ? -4 : -2} fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                        {isMobile ? "" : <>&nbsp;&nbsp;</>}BNB
                    </Text>
                </Box>
            </HStack>            

            <HStack mt={3} spacing={4}>
                <Box  w={isMobile ? "150px" : "175px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>
                        {contributions > 0 ? "Balance" : "You get"}
                    </Text>
                </Box>
                <Box  w={"185px"} >
                    <Text
                        ml={isMobile ? 1 : -1}
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {formatNumberPrecise(tokensPurchased, 2)}
                    </Text>
                </Box>
                <Box w={"30px" } >
                    <Image ml={isMobile ? 9 : -4} h={4} src={placeholderLogo} />
                </Box>
                <Box w={ "75px"} ml={isMobile ? 5 : -4}>
                    <Text fontWeight="bold" fontSize={isMobile ? "8px" : "10px"}>
                    &nbsp;{tokenSymbol}
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
};

export default PresaleDetails;