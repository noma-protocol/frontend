import React from 'react';
import { Box, HStack, Text, Image, VStack } from '@chakra-ui/react';
import { commify, commifyDecimals, formatNumberPrecise } from '../utils';
import placeholderLogo from "../assets/images/question.svg";
import bnbLogo from "../assets/images/bnb.png";

const PresaleDetails = ({
  balance,
  initialPrice,
  contributions,
  tokenSymbol,
  contributionAmount,
  tokensPurchased,
  // We no longer need `isMobile` since we use responsive props below
}) => {
  // Helper to decide whether to show “Contributed” vs “Contributing”
  const contribLabel = contributions > 0 ? "Contributed" : "Contributing";
  // Helper to decide what to render on the “You get / Balance” line
  const youGetLabel = contributions > 0 ? "Balance" : "You get";

  return (
    <Box
      bg="#222831"
      border="1px solid white"
      borderRadius="10px"
      p={{ base: 4, md: 8 }}
    >
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        {/* ───────────── Row 1: “Balance” ───────────── */}
        <HStack
          spacing={{ base: 2, md: 4 }}
          wrap="wrap"
          align="center"
        >
          {/* Label */}
          <Box w={{ base: "80px", md: "150px" }}>
            <Text fontSize={{ base: "11px", md: "14px" }}>Balance</Text>
          </Box>

          {/* Value + Icon + Unit */}
          <HStack spacing={1} flex="1" wrap="wrap" align="center">
            <Text
              color="#f3b500"
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              {Number(balance.data?.formatted) > 1000 ? ">" : ""}
              {commify(
                Number(balance.data?.formatted) > 1000
                  ? 1000
                  : Number(balance.data?.formatted).toFixed(4)
              )}
            </Text>
            <Image
              src={bnbLogo}
              h={{ base: 4, md: 5 }}
              alt="BNB logo"
            />
            <Text
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              BNB
            </Text>
          </HStack>
        </HStack>

        {/* ───────────── Row 2: “Token price” ───────────── */}
        <HStack
          spacing={{ base: 2, md: 4 }}
          wrap="wrap"
          align="center"
        >
          <Box w={{ base: "80px", md: "150px" }}>
            <Text fontSize={{ base: "11px", md: "14px" }}>
              Token price
            </Text>
          </Box>

          <HStack spacing={1} flex="1" wrap="wrap" align="center">
            <Text
              color="#f3b500"
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              {commifyDecimals(initialPrice, 6)}
            </Text>
            <Image
              src={bnbLogo}
              h={{ base: 4, md: 5 }}
              alt="BNB logo"
            />
            <Text
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              BNB
            </Text>
          </HStack>
        </HStack>

        {/* ───────────── Row 3: “Contributed / Contributing” ───────────── */}
        <HStack
          spacing={{ base: 2, md: 4 }}
          wrap="wrap"
          align="center"
        >
          <Box w={{ base: "100px", md: "155px" }}>
            <Text fontSize={{ base: "11px", md: "14px" }}>
              {contribLabel}
            </Text>
          </Box>

          <HStack spacing={1} flex="1" wrap="wrap" align="center">
            <Text
              color="#f3b500"
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              {contributions > 0
                ? contributions
                : isNaN(contributionAmount)
                ? 0
                : commifyDecimals(contributionAmount, 6)}
            </Text>
            <Image
              src={bnbLogo}
              h={{ base: 4, md: 5 }}
              alt="BNB logo"
            />
            <Text
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              BNB
            </Text>
          </HStack>
        </HStack>

        {/* ───────────── Row 4: “You get / Balance” ───────────── */}
        <HStack
          spacing={{ base: 2, md: 4 }}
          wrap="wrap"
          align="center"
        >
          <Box w={{ base: "100px", md: "175px" }}>
            <Text fontSize={{ base: "11px", md: "14px" }}>
              {youGetLabel}
            </Text>
          </Box>

          <HStack spacing={2} flex="1" wrap="wrap" align="center">
            <Text
              color="#f3b500"
              fontWeight="bold"
              fontSize={{ base: "12px", md: "14px" }}
            >
              {formatNumberPrecise(tokensPurchased, 2)}
            </Text>
            <Image
              src={placeholderLogo}
              h={{ base: 3, md: 4 }}
              alt={`${tokenSymbol} logo`}
            />
            <Text
              fontWeight="bold"
              fontSize={{ base: "10px", md: "12px" }}
            >
              {tokenSymbol}
            </Text>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
};

export default PresaleDetails;
