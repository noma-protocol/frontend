import React, { useState, useEffect } from 'react';
import { commify, commifyDecimals, commifyPatched, tickToPrice } from "../utils.tsx";
import {ethers} from 'ethers';
import {
  Container,
  VStack,
  Box,
  SimpleGrid,
  Heading,
  Text,
  Table,
  Spinner
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
        {/* Chart Section */}
        <Box mb={8}>
          {/* <Heading size="md" color="white" mb={4}>
            Liquidity Distribution
          </Heading> */}
          <Box   p={6} borderRadius="lg">
            <Chart positions={data} isMobile={isMobile} />
          </Box>
        </Box>

        {/* Table Section */}
        <Box>
          <Heading as="h4" color="white" mb={4}>
            Details
          </Heading>
          <Box overflowX="auto">
            <Table.Root variant="simple" maxWidth="100%" bg="#2a2a2a" borderRadius="lg" overflow="hidden">
              <Table.Header bg="#1a1a1a">
                <Table.Row>
                  <Table.ColumnHeader p={4}></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric p={4}><Text color="#4ade80" fontWeight="bold">Floor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric p={4}><Text color="#4ade80" fontWeight="bold">Anchor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric p={4}><Text color="#4ade80" fontWeight="bold">Discovery</Text></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body color="white">
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={4}><Text color="#4ade80" fontWeight="600">Reserves (WMON)</Text></Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Floor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Anchor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Discovery"]?.amount1 || 0))}</Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={4}><Text color="#4ade80" fontWeight="600">Reserves ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Floor"]?.amount0), 2)}</Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Anchor"]?.amount0), 2)}</Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Discovery"]?.amount0 || 0), 2)}</Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={4}><Text color="#4ade80" fontWeight="600">Capacity ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(data["Floor"]?.amount1 || 0) / formatEther(imvPrice || 1) || 0)}</Table.Cell>
                  <Table.Cell isNumeric p={4}>{commify(formatEther(capacity?.anchor || 0))}</Table.Cell>
                  <Table.Cell isNumeric p={4}>{"n/a"}</Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={4}><Text color="#4ade80" fontWeight="600">Tick Lower</Text></Table.Cell>
                  <Table.Cell isNumeric p={4}>
                    <Text fontSize="sm">{commifyPatched(tickToPrice(data["Floor"]?.lowerTick)[0])}</Text>
                    <Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Floor"]?.lowerTick || 0)[0] * priceUSD)})</Text>
                    <Text fontSize="xs" color="#666">Tick: {Number(data["Floor"]?.lowerTick)}</Text>
                  </Table.Cell>
                  <Table.Cell isNumeric p={4}>
                    <Text fontSize="sm">{commifyPatched(tickToPrice(data["Anchor"]?.lowerTick))}</Text>
                    <Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Anchor"]?.lowerTick || 0)[0] * priceUSD)})</Text>
                    <Text fontSize="xs" color="#666">Tick: {Number(data["Anchor"]?.lowerTick)}</Text>
                  </Table.Cell>
                  <Table.Cell isNumeric p={4}>
                    <Text fontSize="sm">{commifyPatched(tickToPrice(data["Discovery"]?.lowerTick))}</Text>
                    <Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Discovery"]?.lowerTick || 0)[0] * priceUSD)})</Text>
                    <Text fontSize="xs" color="#666">Tick: {Number(data["Discovery"]?.lowerTick)}</Text>
                  </Table.Cell>
                </Table.Row>
                <Table.Row _hover={{ bg: "#3a3a3a" }}>
                  <Table.Cell p={4}><Text color="#4ade80" fontWeight="600">Tick Upper</Text></Table.Cell>
                  <Table.Cell isNumeric p={4}>
                    <Text fontSize="sm">{commifyPatched(tickToPrice(data["Floor"]?.upperTick))}</Text>
                    <Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Floor"]?.upperTick || 0)[0] * priceUSD)})</Text>
                    <Text fontSize="xs" color="#666">Tick: {Number(data["Floor"]?.upperTick)}</Text>
                  </Table.Cell>
                  <Table.Cell isNumeric p={4}>
                    <Text fontSize="sm">{commifyPatched(tickToPrice(data["Anchor"]?.upperTick))}</Text>
                    <Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Anchor"]?.upperTick || 0)[0] * priceUSD)})</Text>
                    <Text fontSize="xs" color="#666">Tick: {Number(data["Anchor"]?.upperTick)}</Text>
                  </Table.Cell>
                  <Table.Cell isNumeric p={4}>
                    <Text fontSize="sm">{commifyPatched(tickToPrice(data["Discovery"]?.upperTick))}</Text>
                    <Text fontSize="xs" color="#888">(${commify(tickToPrice(data["Discovery"]?.upperTick || 0)[0] * priceUSD)})</Text>
                    <Text fontSize="xs" color="#666">Tick: {Number(data["Discovery"]?.upperTick)}</Text>
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