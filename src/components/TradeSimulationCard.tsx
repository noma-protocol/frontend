import React, {useState, useEffect} from 'react';
import {
    Box,
    Button,
    HStack,
    Grid,
    GridItem,
    Spinner,
    Text,
    Flex,
    Image,
    Input,
    Stat,
} from "@chakra-ui/react";

import { ethers } from 'ethers';
import { commify } from '../utils';
import { useAccount, useContractRead, useContractWrite } from "wagmi";

import {  DrawerRoot, DrawerTrigger, DrawerContent, DrawerCloseTrigger, DrawerBackdrop, DrawerHeader, DrawerBody, DrawerActionTrigger, DrawerTitle } from "./ui/drawer";
const { formatEther, parseEther } = ethers.utils;

const TradeSimulationCard: React.FC<TradeSimulationCardProps> = ({
    setQuote,
    ethBalance,
    amountToBuy,
    amountToSell,
    setTxAmount,
    tradeMode,
    swapPath,
    quoterAddress,
    token0Info,
    token1Info,
    quoterAbi,
    useWeth,
    setSlippage,
    slippage,
    isMobile
}: TradeSimulationCardProps) => {
    const isRolling = false;

    // console.log({ swapPath })
    // const [dummyQuoteBid, setDummyQuoteBid] = useState(0);
    // const [dummyQuoteAsk, setDummyQuoteAsk] = useState(0);

    // --- Fetch Quotes ---
    const { data: _bidQuote } = useContractRead({
        address: quoterAddress,
        abi: quoterAbi,
        functionName: "quoteExactOutput", // Get amount of tokenA needed for 1 tokenB
        args: [swapPath, parseEther(`${amountToBuy}`)],
        watch: true, // Re-fetch data when dependencies change
    });

    const { data: _askQuote } = useContractRead({
        address: quoterAddress,
        abi: quoterAbi,
        functionName: "quoteExactInput", // Get amount of tokenB for 1 tokenA
        args: [swapPath, parseEther(`${amountToSell}`)],
        watch: true,
    });

    // Compute prices and spread
    const bidQuote = _bidQuote ? parseFloat(formatEther(_bidQuote[0])) : null;
    const askQuote = _askQuote ? parseFloat(formatEther(_askQuote[0])) : null;

    // 1) Compute per-token rates:
    const bidRate = bidQuote  / amountToBuy;   // e.g. 1.00420996 BNB/TOK
    const askRate = askQuote / amountToSell;   // e.g. 0.997       BNB/TOK

    // 2) Mid-price:
    const midRate = (bidRate + askRate) / 2;     // ~1.000605

    // 3) Absolute spread in BNB/TOK:
    const absSpread = askRate - bidRate;        // negative if bid>ask

    // 4) Percent spread relative to mid-price:
    const spreadPct = (Math.abs(absSpread) / midRate) * 100;  // ~0.72

    // 5) Log everything:
    console.log("Trade Mode:",       tradeMode);
    console.log("Amount to Buy:",    amountToBuy);
    console.log("Amount to Sell:",   amountToSell);
    console.log("Bid Price (BNB/TOK):", bidRate.toFixed(6));
    console.log("Ask Price (BNB/TOK):", askRate.toFixed(6));
    console.log("Mid Price:",           midRate.toFixed(6));
    console.log("Spread (BNB/TOK):",    absSpread.toFixed(6));
    console.log("Spread (%):",          spreadPct.toFixed(2));

    // console.log(`Dummy Quote Bid: ${quoteBid}`);
    // console.log(`Dummy Quote Ask: ${quoteAsk}`);

    // console.log({ amountToBuy });
    // console.log({ amountToSell });

    const {
        data: quote
      } = useContractRead({
        address: quoterAddress,
        abi: quoterAbi,
        functionName: tradeMode == "BUY" ? "quoteExactOutput" : "quoteExactInput",
        args: [swapPath, tradeMode == "BUY" ? parseEther(`${amountToBuy}`) : parseEther(`${amountToSell}`)]
      });
    
    //   console.log(formatEther(`${quote[0] || 0}`));

      let realQuote = 0;
      if (typeof quote === "Array") {
        setQuote(formatEther(`${quote[0] || 0}`));

        const realQuote = formatEther(`${!isNaN(quote[0]) ? quote[0] : 0 || 0}`) //tradeMode == "BUY" ? formatEther(`${quote || 0}`) : (amountToSell / formatEther(`${quote || 0}`) * amountToSell);
        // tradeMode == "BUY" ? setTxAmount(formatEther(`${!isNaN(quote[0]) ? quote[0] : 0 || 0}`)) : setTxAmount((`${realQuote || 0}`));
      }

    //   console.log(`Quote is ${formatEther(`${quote || 0}`)}`);
    //   console.log(`${amountToSell} / ${formatEther(`${quote || 0}`)} * ${amountToSell} = ${realQuote}`);

    return (
        <Box>
            <HStack>
                <Box  w="160px"><Text  ml={8}>Spending:</Text></Box>
                <Box><Text fontSize={"13px"} ml={8}>{tradeMode == "BUY" ? commify(amountToBuy) : commify(amountToSell) }</Text></Box>
                <Box fontSize={"13px"}>{tradeMode == "BUY" ? (useWeth == 1 ? token1Info.tokenSymbol : "BNB"): token0Info.tokenSymbol} </Box>
            </HStack>
            <HStack>
                <Box  w="160px"><Text fontSize={"13px"} ml={8}>Receiving:</Text></Box>
                <Box><Text fontSize={"13px"} ml={8}>{tradeMode == "BUY" ? commify(amountToBuy / bidRate) : commify(amountToSell * askRate)}</Text></Box>
                <Box fontSize={"13px"}>{tradeMode == "BUY" ? token0Info.tokenSymbol : (useWeth == 1 ? token1Info.tokenSymbol : "BNB")} </Box>
            </HStack>
            <HStack>
                <Box w="160px"><Text fontSize={"13px"} ml={8}>Max Slippage:</Text></Box>
                <Box><Text fontSize={"13px"} ml={8}>{slippage}%</Text></Box>
            </HStack>
            <HStack>
                <Box w="160px"><Text fontSize={"13px"} ml={8}>Spread:</Text></Box>
                <Box><Text fontSize={"13px"} ml={8}>{commify(spreadPct, 2)}%</Text></Box>
            </HStack>
            <DrawerRoot >
            <DrawerTrigger asChild>
            <Box ml={8} mt={5}> 
            <Button variant="outline" h="30px" fontSize={isMobile?"12px": "11px"}>
                {isRolling ? <Spinner size="sm" /> : "Edit"}
            </Button>
            </Box>
            </DrawerTrigger>
            <DrawerBackdrop />
            <DrawerContent>
                <Box mt="80%" ml={5} >
                <DrawerHeader>
                    <DrawerTitle>
                        <Grid templateColumns="repeat(2, 1fr)" templateRows={5} gap={4} mt={-8}>
                            <GridItem colSpan={2}>
                            <Text as="h4" color="#bf9b30">Set slippage</Text>
                            </GridItem>
                            <GridItem colSpan={2}>
                            <Stat.Root>
                                <Stat.Label fontSize="sm" mt={12}>Enter your tolerance</Stat.Label>
                                <Input
                                    placeholder="Slippage"
                                    value={slippage}
                                    onChange={(e) => setSlippage(e.target.value)}
                                    w="60%"
                                    fontSize={"sm"}
                                    h="30px"
                                    mt={-5}
                                />
                            </Stat.Root>
                            </GridItem>

                            <GridItem colSpan={2}>
                            <HStack>
                            <Box>
                            <Button fontSize={"sm"} variant="outline" size="sm" onClick={() => null}>Cancel</Button>
                            </Box>
                            <Box>
                            <Button fontSize={"sm"} variant="outline" size="sm" onClick={() => null}>Confirm</Button>
                            </Box>
                        </HStack>
                        </GridItem>
                        <GridItem colSpan={2}>
                        <Stat.Root mt={-18}>
                            <Stat.Label fontSize="sm" mt={12}>Recommended value 5%</Stat.Label>
                        </Stat.Root>
                        </GridItem>
                        </Grid>
                    </DrawerTitle>
                    <DrawerCloseTrigger asChild mt="82%" mr={5} setIsRolling={() => null}>
                        <Button variant="ghost" size="sm" onClick={() => null}>×</Button>
                    </DrawerCloseTrigger>
                </DrawerHeader>
                <DrawerBody>
                    {/* <Input
                        placeholder="Amount to roll"
                        // onChange={(e) => setWrapAmount(e.target.value)}
                        w="80%"
                    /> */}
        
                </DrawerBody>
                </Box>
                {/* <DrawerFooter>
                </DrawerFooter> */}
            </DrawerContent>
            </DrawerRoot>            
            
        </Box>
    );
    }

export default TradeSimulationCard;



