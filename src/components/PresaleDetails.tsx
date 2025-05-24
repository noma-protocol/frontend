import React from 'react';
import { Box, HStack, Text, Image } from '@chakra-ui/react';
import { commify, commifyDecimals } from '../utils';
import placeholderLogo from "../assets/images/question.svg";
import bnbLogo from "../assets/images/bnb.png";

const PresaleDetails = ({ isMobile, balance, initialPrice, contributions, tokenSymbol, contributionAmount, tokensPurchased, Logo }) => {
    return (
        <Box backgroundColor="#222831" border="1px solid white" p={8}  borderRadius={10} px={8}>
            <HStack spacing={4}>
                <Box w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>Balance</Text>
                </Box>
                <Box w={"110px"}>
                    <Text
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {Number(balance.data?.formatted).toFixed(4) > 1000 ? ">" : ""}&nbsp;
                        {commify(Number(balance.data?.formatted).toFixed(3) > 1000 ? 1000 : Number(balance.data?.formatted).toFixed(4))}
                    </Text>
                </Box>
                <Box w="auto" >
                    <Image h={5} src={bnbLogo}  />
                </Box>
                <Box w="auto">
                    <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                        {isMobile ? "" : <>&nbsp;</>}BNB
                    </Text>
                </Box>
            </HStack>

            <HStack mt={3} spacing={4} >
                <Box w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>Token price</Text>
                </Box>
                <Box   w={"110px"} >
                    <Text
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {commifyDecimals(initialPrice, 6)}
                    </Text>
                </Box>
                <Box w="auto">
                    <Image h={5} src={bnbLogo} />
                </Box>
                <Box w="auto">
                    <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                        {isMobile ? "" : <>&nbsp;</>}BNB
                    </Text>
                </Box>
            </HStack>

            <HStack mt={3} spacing={4}>
                <Box w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>{contributions > 0 ? "Contributed" : "Contributing"}</Text>
                </Box>
                <Box w={"110px"} >
                    <Text
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {contributions > 0 ?  contributions : (isNaN(contributionAmount) ? 0 : contributionAmount)}
                    </Text>
                </Box>
                <Box w="auto">
                    <Image h={5} src={bnbLogo}  />
                </Box>
                <Box w="auto">
                    <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                        {isMobile ? "" : <>&nbsp;</>}BNB
                    </Text>
                </Box>
            </HStack>            

            <HStack mt={3} spacing={4}>
                <Box  w={isMobile ? "100px" : "150px"}>
                    <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>
                        {contributions > 0 ? "Balance" : "You get"}
                    </Text>
                </Box>
                <Box  w={"115px"} >
                    <Text
                        color="#f3b500"
                        fontWeight="bold"
                        fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                    >
                        {commify(tokensPurchased)}
                    </Text>
                </Box>
                <Box w="auto" >
                    <Image h={4} src={placeholderLogo} />
                </Box>
                <Box w="auto">
                    <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                    &nbsp;{tokenSymbol}
                    </Text>
                </Box>
            </HStack>
        </Box>
    );
};

export default PresaleDetails;