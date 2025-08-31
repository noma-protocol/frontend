import React, { useState, useEffect } from 'react';
import { commify, commifyDecimals, commifyPatched, tickToPrice } from "../utils.tsx";
import {ethers} from 'ethers';
import {
  Container,
  VStack,
  Box,
  SimpleGrid,
  Grid,
  GridItem,
  Heading,
  Text,
  Table,
  Spinner,
  HStack
} from "@chakra-ui/react";
import { isMobile } from "react-device-detect";
import Chart from './Chart';
import SlideControls from "./SlideControls.tsx";

const { formatEther, formatUnits, parseEther } = ethers.utils;

const LiquidityChart = ({ isConnected, data, tokenName, tokenSymbol, priceUSD, spotPrice, imvPrice, circulatingSupply, liquidityRatio, capacity, accumulatedFees, underlyingBalances}) => {

return (
    <>
    {typeof data["Floor"] !== "undefined" && typeof data["Anchor"] !== "undefined" ? (
      <Box>
        {/* Two column layout with 30/70 split */}
        <Grid templateColumns={isMobile ? "1fr" : "2fr 3fr"} gap={2} mb={2} >
          {/* Left column - Stats in 2x2 grid */}
          <GridItem>
            <SimpleGrid columns={2} gap={2}>
            <Box bg="#2a2a2a" p={4} borderRadius="lg">
              <Text color="#888" fontSize="xs" mb={0}>Spot Price</Text>
              <Text color="white" fontSize="lg" fontWeight="bold">
                ${commifyDecimals(spotPrice * parseFloat(priceUSD), 6)}
              </Text>
              <Text color="#4ade80" fontSize="xs">
                {commifyDecimals(spotPrice, 8)} MON
              </Text>
            </Box>
            
            <Box bg="#2a2a2a" p={4} borderRadius="lg">
              <Text color="#888" fontSize="xs" mb={0}>Liquidity Ratio</Text>
              <Text color="white" fontSize="lg" fontWeight="bold">
                {commifyDecimals(formatEther(liquidityRatio), 2)}
              </Text>
              <Text color="#4ade80" fontSize="xs">
                Protocol Health
              </Text>
            </Box>
            
            <Box bg="#2a2a2a" p={4} borderRadius="lg">
              <Text color="#888" fontSize="xs" mb={0}>Circulating Supply</Text>
              <Text color="white" fontSize="lg" fontWeight="bold">
                {commify(formatEther(circulatingSupply), 0)}
              </Text>
              <Text color="#4ade80" fontSize="xs">
                {tokenSymbol || 'Tokens'}
              </Text>
            </Box>
            
            <Box bg="#2a2a2a" p={4} borderRadius="lg">
              <Text color="#888" fontSize="xs" mb={0}>IMV Price</Text>
              <Text color="white" fontSize="lg" fontWeight="bold">
                ${commifyDecimals(formatEther(imvPrice || 0) * parseFloat(priceUSD), 6)}
              </Text>
              <Text color="#4ade80" fontSize="xs">
                Floor Protection
              </Text>
            </Box>
            </SimpleGrid>
          </GridItem>
          
          {/* Right column - Chart */}
          <GridItem>
            <Box borderRadius="lg">
              <Chart positions={data} isMobile={isMobile} spotPrice={spotPrice} />
            </Box>
          </GridItem>
        </Grid>

        {/* Table Section */}
        <Box>
          <Heading as="h4" color="white" mb={1}>
            Details
          </Heading>
          <Box overflowX="auto">
            <Table.Root variant="simple" maxWidth="100%" bg="#2a2a2a" borderRadius="lg" overflow="hidden">
              <Table.Header bg="#1a1a1a">
                <Table.Row>
                  <Table.ColumnHeader p={2}></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric p={2}><Text color="#4ade80" fontWeight="bold">Floor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric p={2}><Text color="#4ade80" fontWeight="bold">Anchor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric p={2}><Text color="#4ade80" fontWeight="bold">Discovery</Text></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body color="white">
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={2}><Text color="#4ade80" fontWeight="600">Reserves (WMON)</Text></Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Floor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Anchor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Discovery"]?.amount1 || 0))}</Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={2}><Text color="#4ade80" fontWeight="600">Reserves ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Floor"]?.amount0), 2)}</Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Anchor"]?.amount0), 2)}</Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Discovery"]?.amount0 || 0), 2)}</Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={2}><Text color="#4ade80" fontWeight="600">Capacity ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(data["Floor"]?.amount1 || 0) / formatEther(imvPrice || 1) || 0)}</Table.Cell>
                  <Table.Cell isNumeric p={2}>{commify(formatEther(capacity?.anchor || 0))}</Table.Cell>
                  <Table.Cell isNumeric p={2}>{"n/a"}</Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={2}><Text color="#4ade80" fontWeight="600">Tick Lower</Text></Table.Cell>
                  <Table.Cell isNumeric p={2}>
                    <HStack>
                        <Box><Text fontSize="sm">{commifyPatched(tickToPrice(data["Floor"]?.lowerTick)[0])}</Text></Box>
                        <Box><Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Floor"]?.lowerTick || 0)[0] * priceUSD)})</Text></Box>
                        <Box><Text fontSize="xs" color="#666">Tick: {Number(data["Floor"]?.lowerTick)}</Text></Box>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell isNumeric p={2}>
                    <HStack>
                      <Box><Text fontSize="sm">{commifyPatched(tickToPrice(data["Anchor"]?.lowerTick))}</Text></Box>
                    <Box><Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Anchor"]?.lowerTick || 0)[0] * priceUSD)})</Text></Box>
                    <Box><Text fontSize="xs" color="#666">Tick: {Number(data["Anchor"]?.lowerTick)}</Text></Box>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell isNumeric p={2}>
                    <HStack>
                      <Box><Text fontSize="sm">{commifyPatched(tickToPrice(data["Discovery"]?.lowerTick))}</Text></Box>
                      <Box><Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Discovery"]?.lowerTick || 0)[0] * priceUSD)})</Text></Box>
                      <Box> <Text fontSize="xs" color="#666">Tick: {Number(data["Discovery"]?.lowerTick)}</Text></Box>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={2}><Text color="#4ade80" fontWeight="600">Tick Upper</Text></Table.Cell>
                  <Table.Cell isNumeric p={2}>
                  <HStack>
                    <Box><Text fontSize="sm">{commifyPatched(tickToPrice(data["Floor"]?.upperTick))}</Text></Box>
                    <Box><Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Floor"]?.upperTick || 0)[0] * priceUSD)})</Text></Box>
                    <Box><Text fontSize="xs" color="#666">Tick: {Number(data["Floor"]?.upperTick)}</Text></Box>
                  </HStack>
                  </Table.Cell>
                  <Table.Cell isNumeric p={2}>
                    <HStack>
                   <Box> <Text fontSize="sm">{commifyPatched(tickToPrice(data["Anchor"]?.upperTick))}</Text></Box>
                    <Box><Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Anchor"]?.upperTick || 0)[0] * priceUSD)})</Text></Box>
                    <Box><Text fontSize="xs" color="#666">Tick: {Number(data["Anchor"]?.upperTick)}</Text></Box>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell isNumeric p={2}>
                    <HStack>
                      <Box><Text fontSize="sm">{commifyPatched(tickToPrice(data["Discovery"]?.upperTick))}</Text></Box>
                    <Box><Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Discovery"]?.upperTick || 0)[0] * priceUSD)})</Text></Box>
                    <Box><Text fontSize="xs" color="#666">Tick: {Number(data["Discovery"]?.upperTick)}</Text></Box>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      </Box>
    ) : (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" color="#4ade80" thickness="4px" />
        <Text color="#888" mt={4}>Loading liquidity data...</Text>
      </Box>
    )}
  </>
)

}

export default LiquidityChart;