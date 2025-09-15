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
    SimpleGrid,
    VStack,
} from "@chakra-ui/react";

import { ethers } from 'ethers';
import { commify, formatNumberPrecise } from '../utils';
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import { usePrivyWagmi } from '../hooks/usePrivyWagmi';
// import bnbLogo from "../assets/images/bnb.png";
import monadLogo from "../assets/images/monad.png";
// import oksLogo from "../assets/images/logo.svg";
import nomaLogo from "../assets/images/noma.png";

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
    isMobile,
    isLoading
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
    const bidRate = (bidQuote && amountToBuy && amountToBuy !== 0) ? bidQuote / amountToBuy : 0;   // e.g. 1.00420996 MON/TOK
    const askRate = (askQuote && amountToSell && amountToSell !== 0) ? askQuote / amountToSell : 0;   // e.g. 0.956       MON/TOK

    // 2) Mid-price:
    const midRate = (bidRate && askRate) ? (bidRate + askRate) / 2 : 0;     // ~1.000605

    // 3) Absolute spread in MON/TOK:
    const absSpread = (bidRate && askRate) ? askRate - bidRate : 0;        // negative if bid>ask

    // 4) Percent spread relative to mid-price:
    const spreadPct = (midRate && midRate !== 0) ? (Math.abs(absSpread) / midRate) * 100 : 0;  // ~0.72

    // 5) Log everything:
    // console.log("Trade Mode:",       tradeMode);
    // console.log("Amount to Buy:",    amountToBuy);
    // console.log("Amount to Sell:",   amountToSell);
    // console.log("Bid Price (MON/TOK):", bidRate.toFixed(6));
    // console.log("Ask Price (MON/TOK):", askRate.toFixed(6));
    // console.log("Mid Price:",           midRate.toFixed(6));
    // console.log("Spread (MON/TOK):",    absSpread.toFixed(6));
    // console.log("Spread (%):",          spreadPct.toFixed(2));

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
    const firstContent = tradeMode == "BUY" ? "Spending" : "Receiving";
    const secondContent = tradeMode == "BUY" ? "Receiving" : "Spending";

    return (
        <Box 
            mt={isMobile ? 4 : -12} 
            w={isMobile ? "98%" : "100%"}
            border="1px solid ivory"
            backgroundColor={"#222831"}
            borderRadius={5}
            px={isMobile ? 1 : 2}  
            py={2}    
            h={isMobile ? "150px" : "300px"}  
            // ml={isMobile ? 1 : 0}
        >
        <SimpleGrid columns={1} p={2} w="90%">
            {/* ─── Column 1 ─────────────────────────────────────────────────────── */}
            <Box>
            {/* 
                Remove w="50%" here. 
                By virtue of being the first child of `SimpleGrid columns={2}`, 
                this Box already spans half the gray container.
            */}
            
            {/* 
                Make the <Text> fill 100% of its parent (no extra w="50%").
                If you omit a width, block <Text> defaults to 100%.
            */}
            <Text
                fontWeight="bold"
                fontSize={isMobile ? "xs" : "sm"}
                color="#4ade80"
                w="100%"                 // ensure the red border spans whole column
                ml={isMobile ? 2 : 0}
            >
                Trade Info
            </Text>

            {/* 
                This Box now also spans the full column.
                Remove w="80%"; if you want 80% of the column, set w="80%", 
                but note that 80% is still relative to the column’s width, 
                not the screen.
            */}

            <Box mt={-2} w="100%" ml={isMobile ? 5 : 0}>
                {isMobile ? (
                    <>
                    <VStack mt={5} ml={2}>
                        <HStack h="30px">
                            <Box w="90px" textAlign={"left"} ><Text fontSize={"xs"} color="#4ade80">{firstContent}</Text></Box>
                            <Box w="120px"><Text fontSize={"13px"} >{tradeMode == "BUY" ?  formatNumberPrecise(amountToBuy, 4) : formatNumberPrecise(amountToSell, 4) }</Text></Box>
                            <Box  w="40px" fontSize={"13px"}>{tradeMode == "BUY" ? (useWeth == 1 ? token1Info.tokenSymbol : "MON"): token0Info.tokenSymbol} </Box>
                            <Box h="auto" >
                                <Image w="25px" src={tradeMode == "BUY" ? monadLogo : nomaLogo } alt="Token Logo" />
                            </Box>
                        </HStack>
                        <HStack h="30px">
                            <Box w="90px" textAlign={"left"} ><Text fontSize={"xs"} color="#4ade80">{secondContent}</Text></Box>
                            <Box w="120px" ><Text fontSize={"13px"}>{tradeMode == "BUY" ?
                                (bidRate && bidRate !== 0 ? formatNumberPrecise(amountToBuy / bidRate, 4) : "0") :
                                (askRate ? formatNumberPrecise(amountToSell * askRate, 4) : "0")}</Text></Box>
                            <Box  w="40px" fontSize={"13px"}>{tradeMode == "BUY" ? token0Info.tokenSymbol : (useWeth == 1 ? token1Info.tokenSymbol : useWeth == 0 ? "MON" : "WMON")} </Box>
                            <Box h="auto" >
                                <Image w="25px" src={tradeMode == "BUY" ? nomaLogo : monadLogo } alt="Token Logo" />
                            </Box>
                        </HStack>                        
                    </VStack>
                    </>
                ) :
                    // <SimpleGrid columns={2} w="250px"   >
                    //     <Box  w="250px" border="1px solid yellow" >
                    //         <Text fontSize={"13px"} color="#4ade80" >Spending</Text>
                    //     </Box>
                    //     <Box w="350px" border="1px solid white">
                    //         <Text fontSize={"13px"}>&nbsp;{tradeMode == "BUY" ? formatNumberPrecise(amountToBuy) : formatNumberPrecise(amountToSell) }</Text>
                    //     </Box>
                    //     <Box fontSize={"13px"} textAlign={"right"}>
                    //         {tradeMode == "BUY" ? (useWeth == 1 ? token1Info.tokenSymbol : "MON"): token0Info.tokenSymbol} 
                    //     </Box>
                    //     {/* <Box w="110px" >
                    //         <Text fontSize={"13px"} color="#4ade80">Receiving</Text>
                    //     </Box>
                    //     <Box>
                    //         <Text fontSize={"13px"}>&nbsp;{tradeMode == "BUY" ? formatNumberPrecise(amountToBuy / bidRate) : formatNumberPrecise(amountToSell * askRate)}</Text>
                    //     </Box>
                    //     <Box fontSize={"13px"} textAlign={"right"}>
                    //         {tradeMode == "BUY" ? token0Info.tokenSymbol : (useWeth == 1 ? token1Info.tokenSymbol : useWeth == 0 ? "MON" : "WMON")} 
                    //     </Box> */}

                    // </SimpleGrid>             
                    <Grid
                        h="200px"
                        w="100%"
                        templateRows="repeat(4, 1fr)"
                        templateColumns="repeat(3, 1fr)"
                        gap={4}
                        mb={20}
                        pb={10}
                    >     
                    <GridItem colSpan={3} ml={2}>
                        <HStack h="30px">
                            <Box w="140px">                                
                                <Text fontSize={"sm"} color="#4ade80" >Spending&nbsp;</Text>
                            </Box>
                            <Box w="230px" bgColor={"#18181b"}   borderRadius={5} px={2} >
                                <Text color="white" fontWeight={"bold"}  fontSize={"sm"}>&nbsp;{tradeMode == "BUY" ? formatNumberPrecise(amountToBuy) : formatNumberPrecise(amountToSell) }</Text>
                            </Box>
                            <Box fontSize={"sm"} ml={2} textAlign={"left"} w="110px"  alignItems={"left"} alignContent={"left"} fontWeight={"bold"}>
                                {tradeMode == "BUY" ? (useWeth == 1 ? token1Info.tokenSymbol : "MON"): token0Info.tokenSymbol} 
                            </Box>
                            <Box h="auto">
                                <Image w="35px" src={tradeMode == "BUY" ? monadLogo : nomaLogo } alt="Token Logo" />
                            </Box>
                        </HStack>
                    </GridItem>
                    <GridItem colSpan={3} mt={-1} ml={2}>
                        <HStack h="30px">
                            <Box  w="140px">                                
                                <Text fontSize={"sm"} color="#4ade80">Receiving</Text>
                            </Box>
                            <Box w="230px"  bgColor={"#18181b"}  color="white" fontWeight={"bold"} borderRadius={5} px={2} >
                                <Text fontSize={"sm"} color="white" fontWeight={"bold"} >&nbsp;{tradeMode == "BUY" ?
                                    (bidRate && bidRate !== 0 ? formatNumberPrecise(amountToBuy / bidRate) : "0") :
                                    (askRate ? formatNumberPrecise(amountToSell * askRate) : "0")}</Text>
                            </Box>
                            <Box fontSize={"sm"} ml={2} textAlign={"left"}  w="110px" alignItems={"left"} alignContent={"left"} fontWeight={"bold"}>
                                {isLoading ? <Spinner size="sm" /> : tradeMode == "BUY" ? token0Info.tokenSymbol : (useWeth == 1 ? token1Info.tokenSymbol : useWeth == 0 ? "MON" : "WMON")} 
                            </Box>
                            <Box h="auto" >
                                <Image w="35px" src={tradeMode == "BUY" ? nomaLogo : monadLogo } alt="Token Logo" />
                            </Box>
                        </HStack>
                    </GridItem>
                    </Grid>  
        }

            </Box>
            </Box>

            {/* ─── Column 2 (e.g. your drawer/edit button) ─────────────────────────── */}
            <Box>
            <DrawerRoot >
            <DrawerTrigger asChild>
            <Box > 
            {/* <Button variant="outline" h="30px" ml={isMobile ? "-140px" : 8} mt={isMobile ? "115px" : "60px"} fontSize={isMobile?"12px": "11px"} w="100px">
                {isRolling ? <Spinner size="sm" /> : "Edit"}
            </Button> */}
            <br /><br /><br />
            </Box>
            </DrawerTrigger>
            <DrawerBackdrop />
            <DrawerContent>
                <Box mt="80%" ml={5} >
                <DrawerHeader>
                    <DrawerTitle>
                        <Grid templateColumns="repeat(2, 1fr)" templateRows={5} gap={4} mt={-8}>
                            <GridItem colSpan={2}>
                            <Text as="h4" color="#4ade80">Set slippage</Text>
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
                    <DrawerCloseTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => null} mt="82%" mr={5}>×</Button>
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
        </SimpleGrid>

            {/* <Box mt={4}>
            <DrawerRoot >
            <DrawerTrigger asChild>
            <Box ml={8} mt={5}> 
            <Button mt={isMobile ? "25vw" : 0} ml={isMobile ? "-40vw" : 0} variant="outline" h="30px" fontSize={isMobile?"12px": "11px"} w="100px">
                {isRolling ? <Spinner size="sm" /> : "Edit"}
            </Button>
            <br /><br /><br />
            </Box>
            </DrawerTrigger>
            <DrawerBackdrop />
            <DrawerContent>
                <Box mt="80%" ml={5} >
                <DrawerHeader>
                    <DrawerTitle>
                        <Grid templateColumns="repeat(2, 1fr)" templateRows={5} gap={4} mt={-8}>
                            <GridItem colSpan={2}>
                            <Text as="h4" color="#4ade80">Set slippage</Text>
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
                    <DrawerCloseTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => null} mt="82%" mr={5}>×</Button>
                    </DrawerCloseTrigger>
                </DrawerHeader>
                <DrawerBody>
        
                </DrawerBody>
                </Box>
            </DrawerContent>
            </DrawerRoot>                         
            </Box> */}
        </Box>
    );
    }

export default TradeSimulationCard;



