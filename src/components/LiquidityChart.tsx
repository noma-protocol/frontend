
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
  Table
} from "@chakra-ui/react";
import { isMobile } from "react-device-detect";
import Chart from './Chart';
import SlideControls from "./SlideControls.tsx";

const { formatEther, formatUnits, parseEther } = ethers.utils;

const LiquidityChart = ({ isConnected, data, tokenName, tokenSymbol, spotPrice, circulatingSupply, liquidityRatio, capacity, accumulatedFees, underlyingBalances}) => {

return (
    <>
    {typeof data["Floor"] !== "undefined" && typeof data["Anchor"] !== "undefined" ? (
      <Box as="section" className="main-section" mt={-20}>
        {/* <SimpleGrid maxWidth={"60%"} ml="20%" columns={8}>
          {isConnected ? <SlideControls isConnected /> : <></>}
        </SimpleGrid>*/}
        <SimpleGrid maxWidth={isMobile ? "40%" : "30%"} ml={isMobile ? "50vw" : "40vw"} columns={2} rows={3} p={2} mt={isMobile ? "-6vh" : "-100px"}  >
          <Box w="120px" textAlign="left"><Text color="#a67c00" fontSize={isMobile?"xs":"14px"}>Circulating</Text></Box>
          <Box w="auto" textAlign="right"><Text color="#a67c00" fontSize={isMobile?"xs":"14px"}>{isMobile ? "L.R." : "Liquidity Ratio"}</Text></Box>
          <Box w="auto" textAlign={isMobile ? "right" : "left"} fontSize={isMobile?"xs":"14px"}>
            <label>{commify(Number(formatEther(circulatingSupply)).toFixed(6))}</label>
            {/* <Text mt={-2} fontSize={"small"}>(NOMA)</Text> */}
          </Box>
          <Box w="auto" textAlign="right" fontSize={isMobile?"xs":"14px"}>
            <label>{commifyPatched(formatEther(liquidityRatio), 2)}</label>
          </Box>

          <Box w="auto" textAlign="left" mt={2}>
              <Text color="#a67c00" fontSize={isMobile?"xs":"14px"}>Spot</Text>
              <Box mt={-6} fontSize={isMobile?"xs":"14px"}>
              <label>{commifyPatched(formatEther(spotPrice))}</label>
              <Text mt={isMobile ? 0 : -2} fontSize={"small"} fontSize={isMobile?"8px":"14px"}>(WMON/{tokenSymbol})</Text>
              </Box>
            </Box>
        </SimpleGrid>
        {/* <center> */}
          <Box ml={isMobile ? "25px" : 0}><Chart positions={data} isMobile={isMobile} /></Box>
          {!isMobile ? (
            <Box pl={5} ml={"5%"}>
            <Table.Root style={{ marginTop: "20px" }} variant="simple" maxWidth={"80%"} backgroundColor="#222831" borderRadius={"md"} >
              <Table.Header>
                <Table.Row style={{marginLeft:"120px"}}>
                  <Table.ColumnHeader></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric><Text color="#a67c00">Floor</Text> </Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric><Text color="#a67c00">Anchor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric><Text color="#a67c00">Discovery</Text></Table.ColumnHeader>
                  {/* <Table.ColumnHeader isNumeric>Unused</Table.ColumnHeader> */}
                  {/* <Table.ColumnHeader isNumeric>Total</Table.ColumnHeader> */}
                  {/* <Table.ColumnHeader isNumeric>Fees</Table.ColumnHeader> */}
                </Table.Row>
              </Table.Header>
              <Table.Body style={{ color: "ivory" }}>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00">&nbsp;&nbsp;&nbsp;Reserves (WMON)</Text></Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Floor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Anchor"]?.amount1))}</Table.Cell>
                  {/* <Table.Cell isNumeric>{commify(formatEther(data["Discovery"]?.amount1))}</Table.Cell>
                  <Table.Cell>{commify(formatEther(underlyingBalances.token1))}</Table.Cell> */}
                  {/* <Table.Cell isNumeric>
                    {commify(
                      formatEther(
                        data["Floor"]?.amount1 +
                          data["Anchor"]?.amount1 +
                          data["Discovery"]?.amount1 +
                          underlyingBalances?.token1
                      )
                    )}
                  </Table.Cell> */}
                  <Table.Cell isNumeric>{commify(formatEther(accumulatedFees[1]))}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00">&nbsp;&nbsp;&nbsp;Reserves ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Floor"]?.amount0), 2)}</Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Anchor"]?.amount0), 2)}</Table.Cell>
                   <Table.Cell isNumeric>{commify(formatEther(data["Discovery"]?.amount0), 2)}</Table.Cell>
                  {/*<Table.Cell>{commify(formatEther(underlyingBalances?.token0))}</Table.Cell> */}
                  {/* <Table.Cell isNumeric>
                    {commify(
                      formatEther(
                        data["Floor"]?.amount0 +
                          data["Anchor"]?.amount0 +
                          data["Discovery"]?.amount0 +
                          underlyingBalances?.token0
                      )
                    )}
                  </Table.Cell> */}
                  {/* <Table.Cell isNumeric>{commify(formatEther(accumulatedFees[0]))}</Table.Cell> */}
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00">&nbsp;&nbsp;&nbsp;Capacity ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(capacity?.floor))}</Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(capacity?.anchor))}</Table.Cell>
                  <Table.Cell isNumeric>{"n/a"}</Table.Cell>
                  {/* <Table.Cell isNumeric>{"n/a"}</Table.Cell> */}
                  <Table.Cell></Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00">&nbsp;&nbsp;&nbsp;Tick Lower</Text></Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Floor"]?.lowerTick)[0])}
                    <Text color="gray" fontSize="13px">
                      ({Number(data["Floor"]?.lowerTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Anchor"]?.lowerTick))}
                    <Text color="gray" fontSize="13px">
                      ({Number(data["Anchor"]?.lowerTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Discovery"]?.lowerTick))}
                    <Text color="gray" fontSize="13px">
                      ({Number(data["Discovery"]?.lowerTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell></Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00">&nbsp;&nbsp;&nbsp;Tick Upper</Text></Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Floor"]?.upperTick))}
                    <Text color="gray" fontSize="13px">
                      ({Number(data["Floor"]?.upperTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Anchor"]?.upperTick))}
                    <Text color="gray" fontSize="13px">
                      ({Number(data["Anchor"]?.upperTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Discovery"]?.upperTick))}
                    <Text color="gray" fontSize="13px">
                      ({Number(data["Discovery"]?.upperTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell></Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
            </Box>
          ) : (
            <Box pl={25}>
              <Table.Root style={{ marginTop: "20px" }} variant="simple" ml={"-5px"} maxWidth={"130px"} fontSize={"xs"} backgroundColor="#393E46"  borderRadius={"md"}>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric><Text color="#a67c00" fontSize="xs">Floor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric><Text color="#a67c00" fontSize="xs">Anchor</Text></Table.ColumnHeader>
                  <Table.ColumnHeader isNumeric><Text color="#a67c00" fontSize="xs">Discovery</Text></Table.ColumnHeader>
                  {/* <Table.ColumnHeader isNumeric>Unused</Table.ColumnHeader> */}
                  {/* <Table.ColumnHeader isNumeric>Total</Table.ColumnHeader> */}
                  {/* <Table.ColumnHeader isNumeric>Fees</Table.ColumnHeader> */}
                </Table.Row>
              </Table.Header>
              <Table.Body style={{ color: "ivory" }}>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00" fontSize="xs">Reserves (WMON)</Text></Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Floor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Anchor"]?.amount1))}</Table.Cell>
                  <Table.Cell isNumeric>{commify(formatEther(data["Discovery"]?.amount1))}</Table.Cell>
                  {/* <Table.Cell>{commify(formatEther(underlyingBalances.token1))}</Table.Cell> */}
                  {/* <Table.Cell isNumeric>
                    {commify(
                      formatEther(
                        data["Floor"]?.amount1 +
                          data["Anchor"]?.amount1 +
                          data["Discovery"]?.amount1 +
                          underlyingBalances?.token1
                      )
                    )}
                  </Table.Cell> */}
                  {/* <Table.Cell isNumeric>{commify(formatEther(accumulatedFees[1]))}</Table.Cell> */}
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00" fontSize="xs">Reserves ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell  fontSize="xs" isNumeric>{commify(formatEther(data["Floor"]?.amount0), 2)}</Table.Cell>
                  <Table.Cell fontSize="xs"  isNumeric>{commify(formatEther(data["Anchor"]?.amount0), 2)}</Table.Cell>
                   <Table.Cell fontSize="xs" isNumeric>{commify(formatEther(data["Discovery"]?.amount0), 2)}</Table.Cell>
                  {/* <Table.Cell>{commify(formatEther(underlyingBalances?.token0))}</Table.Cell> */}
                  {/* <Table.Cell isNumeric>
                    {commify(
                      formatEther(
                        data["Floor"]?.amount0 +
                          data["Anchor"]?.amount0 +
                          data["Discovery"]?.amount0 +
                          underlyingBalances?.token0
                      )
                    )}
                  </Table.Cell> */}
                  {/* <Table.Cell isNumeric>{commify(formatEther(accumulatedFees[0]))}</Table.Cell> */}
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00" fontSize="xs">Capacity ({tokenSymbol})</Text></Table.Cell>
                  <Table.Cell  fontSize="xs" isNumeric>{commify(formatEther(capacity?.floor))}</Table.Cell>
                  <Table.Cell  fontSize="xs" isNumeric>{commify(formatEther(capacity?.anchor))}</Table.Cell>
                  <Table.Cell  fontSize="xs" isNumeric>{"n/a"}</Table.Cell>
                  {/* <Table.Cell isNumeric>{"n/a"}</Table.Cell> */}
                  <Table.Cell></Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00" fontSize="xs">Tick Lower</Text></Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Floor"]?.lowerTick)[0])}
                    <Text color="gray" fontSize="xs">
                      ({Number(data["Floor"]?.lowerTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Anchor"]?.lowerTick))}
                    <Text color="gray" fontSize="xs">
                      ({Number(data["Anchor"]?.lowerTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Discovery"]?.lowerTick))}
                    <Text color="gray" fontSize="xs">
                      ({Number(data["Discovery"]?.lowerTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell></Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell><Text color="#a67c00" fontSize="xs">Tick Upper</Text></Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Floor"]?.upperTick))}
                    <Text color="gray" fontSize="xs">
                      ({Number(data["Floor"]?.upperTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Anchor"]?.upperTick))}
                    <Text color="gray" fontSize="xs">
                      ({Number(data["Anchor"]?.upperTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell isNumeric>
                    {commifyPatched(tickToPrice(data["Discovery"]?.upperTick))}
                    <Text color="gray" fontSize="xs">
                      ({Number(data["Discovery"]?.upperTick)})
                    </Text>
                  </Table.Cell>
                  <Table.Cell></Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
            </Box>
          )}
        {/* </center> */}
      </Box>
    ) : (
      <></>
    )}
  </>
)

}

export default LiquidityChart;