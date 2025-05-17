import React, { useState, useEffect } from 'react';
import { Flex, Badge, HStack, Box, Grid, GridItem, Button, Spinner, Text } from "@chakra-ui/react";
import { ethers } from 'ethers';
import { commify, formatNumberPrecise } from '../utils';
import { isMobile } from "react-device-detect";
import { Slider } from "../components/ui/slider";
import {
  NumberInputRoot,
  NumberInputLabel,
  NumberInputField,
} from "../components/ui/number-input";
import { Radio, RadioGroup } from "../components/ui/radio"

const { formatEther } = ethers.utils;

type TradeControlsCardProps = {
    ethBalance: number;
    token0Symbol: string;
    token0Balance: number;
    token1Symbol: string;
    token1Balance: number;
    deposit: () => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    isTokenInfoLoading: boolean;
    buyTokens: () => void;
    sellTokens: () => void;
    spotPrice: number;
    isLoadingBtnBuy: boolean;
    isLoadingExecuteTrade: boolean;
    setIsLoadingExecuteTrade: (isLoading: boolean) => void;
    setAmountToBuy: (amount: number) => void;
    setAmountToSell: (amount: number) => void;  
    refreshParams: () => void;
    useWeth: boolean;
    setUseWeth: (useWeth: boolean) => void;
};

const TradeControlsCard: React.FC<TradeControlsCardProps> = ({
    ethBalance,
    token0Symbol,
    token1Symbol,
    token0Balance,
    token1Balance,
    deposit,
    isLoading,
    setIsLoading,
    isTokenInfoLoading,
    buyTokens,
    sellTokens,
    spotPrice,
    isLoadingExecuteTrade,
    setIsLoadingExecuteTrade,
    amountToBuy,
    amountToSell,
    setAmountToBuy,
    setAmountToSell,
    refreshParams,
    useWeth,
    setUseWeth,
    tradeMode,
    setTradeMode,
    quoteMax,
    ...props
}) => {

  // console.log(`Token0Balance = ${token0Balance} | Token1Balance = ${token1Balance}`);
  // Format the MON balance (and avoid oversize values)
  let formattedEthBalance = formatEther(`${ethBalance}`);
  if (Number(formattedEthBalance) > 1_000_000) {
    formattedEthBalance = commify(999999.9999);
  }

  // Trade mode state: BUY or SELL (0 or 1)
  // Determine slider max based on trade mode
  // const amountToSell = formatEther(`${token0Balance || 0}`) * formatEther(`${spotPrice || 0}`);
  // console.log(`Amount to sell ${amountToSell}`);

  const sliderMax = tradeMode === "BUY" ? (useWeth == 1 ? Number(formatEther(`${token1Balance || 0}`)) : Number(formatEther(`${ethBalance || 0}`))) :Number(formatEther(`${token0Balance || 0}`));
  
//   console.log(`SliderMax = ${token0Balance}`);
  // Set an initial contribution value
  const initialContribution = (sliderMax / 10);
  const [contributionAmount, setContributionAmount] = useState<number>(initialContribution);
  // Slider change handler – only update if token info is loaded.

  const handleSliderChange = (e) => {
     if (isTokenInfoLoading) return; // Prevent updates if still loading

    //  console.log(`Slider value changed to ${e}`);
     let newValue = parseFloat(e);
     if (newValue > sliderMax) newValue = sliderMax;

    //  console.log(`Trade mode ${tradeMode} | New Value ${newValue}`);
     setContributionAmount(newValue);

     if (tradeMode === "BUY") setAmountToBuy(newValue);
     if (tradeMode === "SELL") {
      // console.log(`Update value`);
      setAmountToSell(newValue);
     }

     refreshParams();
  };

  const handleTradeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTokenInfoLoading) return;
    if (e.target.value === "")  return; // Prevent NaN values
    let newValue = parseFloat(e.target.value);

    // if (newValue > sliderMax) newValue = sliderMax;

    // setContributionAmount(newValue);

    // console.log(`Trade mode is ${tradeMode} | New Value ${newValue}`);
    if (tradeMode === "BUY") {
      // console.log(`set amount to buy ${newValue}`);
      setAmountToBuy(newValue);
    } else if (tradeMode === "SELL") {
      // console.log(`set amount to sell ${newValue}`);
      setAmountToSell(newValue);
    }
 
    refreshParams();
  }

  const handleExecuteTrade = () => {
    setIsLoadingExecuteTrade(true);
    setIsLoading(true);

    if (tradeMode === "BUY") {
      buyTokens();
    } else {
      sellTokens();
    }
  }

  const handleSetTradeAsset = (e) => {
    const useWethValue = e.value === "1"; // Convert to boolean
    setUseWeth(useWethValue);
    // console.log(`Set useWeth to ${useWethValue}`);
  }

  return (
    <Box
      w={isMobile ? "380px" : "560px"}
      pt={8}
      {...props}
      h={isMobile ? "420px" : "300px"}
      border="1px solid ivory"
      backgroundColor={"#222831"}
      borderRadius={5}
      mt={isMobile ? 4 : -4}
      // px={isMobile ? -1 : "-100px"}
      py={isMobile ? 4 : 4}
      ml={isMobile ?-2 : 0}
    >
      <Grid
        h="250px"
        templateRows="repeat(4, 1fr)"
        templateColumns="repeat(2, 1fr)"
        gap={4}
        mb={20}
        pb={10}
        ml={isMobile ? 0 : -4}
      >
        {/* <GridItem colSpan={2} h="10px" mt={-5}  >

        </GridItem> */}
        {/* Numeric Input */}
        <GridItem>
          <Text fontWeight={"bold"} ml={isMobile?5:10} fontSize={isMobile ? "xs" : "sm"} color="#a67c00">
                Trade Amount
            </Text>
          <NumberInputRoot
            isMobile={isMobile}
            marginRight="22px"
            max={sliderMax}
            min={0.001}
            ml={isMobile ? 5 : 10}
            type="price"
            setTokenSupply={() => {}}
            onChange={handleTradeAmountChange}
            // Only pass a numeric value when not loading.
            value={`${tradeMode === "BUY" ? amountToBuy : amountToSell}`}
            // targetValue={`${contributionAmount}`}
            // formatOptions={{
            //     style: "currency",
            //     currency: (tradeMode === "BUY" ? (token1Symbol == "WBNB" ? "MON" : token1Symbol || "MON") : "TOK"),
            //     currencySign: "accounting",
            //   }}
            w={isMobile ? "330px" : "220px"}
            disabled={isTokenInfoLoading || tradeMode == "BUY" ? token0Balance == 0 : token1Balance == 0}
          >
            <NumberInputLabel h="40px" w={{ base: "", lg: "auto" }} />
            <NumberInputField
              h="40px"
              w={{ base: "", lg: "200px" }}
                // When loading, leave the value empty and show a placeholder.
                // value={!isTokenInfoLoading ? contributionAmount : ""}
                // value={contributionAmount}
                // onChange={handleInputChange}
                // placeholder={isTokenInfoLoading ? "..." : ""}
                // disabled={isTokenInfoLoading}
            />
          </NumberInputRoot>
          {isMobile && (
            <>
            <Text ml={7} fontSize="xs" color="#a67c00" >Slide to select</Text>
            <Slider
              mt={2}
              // ml={isMobile ? 5 : 10}
              ml={8}
              variant="outline"
              w={"85%"}
              // Scale the contributionAmount for the slider
              defaultValue={[1]} 
              value={[contributionAmount * 100]} // Scale by 100 for 2 decimal places
              onValueChange={(e) => {
                  const scaledValue = e.value[0] / 100; // Convert back to decimal
                  handleSliderChange(scaledValue); // Pass the decimal value to the handler
              }}
              max={sliderMax * 100} // Scale the max value as well
              colorPalette="yellow"
              thumbAlignment="center"
              min={[1]} // Set minimum value based on token balance
              disabled={isTokenInfoLoading} // Disable slider while token info is loading
              />
              </>  
                )}
            {/* {isMobile && (
              <Button
              ml={isMobile ? 5 : 14}
              mt={2}
              variant="subtle"
              backgroundColor="#00412b"
              w={"100px"}
              onClick={() => {
                setIsLoadingExecuteTrade(true);
                setIsLoading(true);
                buyTokens();
              }}
              mr={1}
              disabled={isLoadingExecuteTrade || isTokenInfoLoading || tradeMode == "SELL"}
              border="1px solid #001a11"
            >
              {isLoadingExecuteTrade ? <Spinner size="sm" /> : "Buy"}
            </Button>
            )}    */}
          {/* {isMobile && (
          <Button
            mt={2}
            variant="subtle"
            backgroundColor={"#FF153F"}
            w={"100px"}
            onClick={() => {
                setIsLoadingBtnSell(true);
                setIsLoading(true);
                sellTokens();
            }}
            disabled={isLoadingExecuteTrade || isTokenInfoLoading || tradeMode == "BUY" || token0Balance == 0}
            border="1px solid #CC1032"
          >
            {isLoadingBtnSell ? <Spinner size="sm" /> : "Sell"}
          </Button>
          )}                          */}
        </GridItem>

        {/* Display current trade mode */}
        <GridItem colSpan={isMobile ? 2 : 1} ml={isMobile ? 2 : 6}>
        <Text pb={2} ml={isMobile ? 4 : 0} color="#a67c00" fontSize={isMobile ? "xs" : "sm"}><b>Controls</b></Text>

          {/* <Flex direction={isMobile? "row" : "column"} align="center" justify="center"> */}
        <RadioGroup 
          id="tradeMode"
          value={tradeMode} 
          onValueChange={(e) => setTradeMode(e.value)} 
          ml={5}
        >
          <Box position="relative" border="1px solid" borderColor={tradeMode =="BUY" ? "#00412b" : "#FF153F"} px={12} w={isMobile ?"320px":"230px"} h="35px" ml={isMobile? -1: -5} mt={-5} borderRadius={5}>
          {/* Top-Left Square Badge */}
          <Badge 
            position="absolute" 
            top="0" 
            left="0" 
            bg={tradeMode =="BUY" ? "#00412b" : "#FF153F"}  
            color="white" 
            px={2} 
            py={1} 
            fontSize="xs" 
            borderRight="2px solid" 
            borderBottom="2px solid" 
            borderColor={tradeMode =="BUY" ? "green" : "#BF4040"}
            borderRadius="0" // No rounded corners
            fontSize="9px"
            w={isMobile ? "80px" : "auto"}
            h="10px"
            
          > 

            {isMobile ? "Trade Type" : "Type"}
          </Badge>
          <HStack gap="4" mt={1} ml={isMobile ? "60px" : 4}>
            
                <Box>
                  <Radio value="BUY"></Radio>
                </Box>
                <Box ml={isMobile ? 0 : -2}>
                  <Text fontSize="13px">BUY</Text>
                </Box>&nbsp;
                <Box ml={isMobile ? 4 : -1}>
                  <Radio value="SELL"></Radio>
                </Box>
                <Box ml={isMobile ? 0 : -2}>
                  <Text fontSize="13px">SELL</Text>
                </Box>
              </HStack>  
        </Box>
        
        </RadioGroup>
        <HStack>
          
        <RadioGroup 
          id="useWeth"
          value={`${useWeth}`} 
          onValueChange={(e) => setUseWeth(e.value)} 
          fontSize="11px"
          w="4px"
          // mt={-2}
        >
        <Box border="1px solid #a67c00" px={12} w={isMobile ? "320px" : "230px"} h="38px" borderRadius={5} mt={4} ml={isMobile ? 4 : 0}>
          {/* Top-Left Square Badge */}
          <Badge 
            position="absolute" 
            top="4"
            ml={isMobile ? 4 : 0}
            left="1px" 
            bg={"#a67c00"}  
            color="white" 
            px={2} 
            py={1} 
            fontSize="xs" 
            borderRight="2px solid" 
            borderBottom="2px solid" 
            borderColor="#bf9b30"
            borderRadius="0" // No rounded corners
            fontSize="9px"
            w={isMobile ? "80px" : "auto"}
            h="10px"
            
          >
            Asset
          </Badge>
          <HStack gap="4" mt={2} ml={isMobile ? "60px" : 4}>
            <Box>
              <Radio value={"1"} defaultChecked={useWeth == true} ></Radio>
            </Box>
            <Box ml={isMobile ? 0 : -2}> 
              <Text fontSize="13px">WMON</Text>
            </Box>&nbsp;
            <Box  ml={isMobile ? 3 : -2}>
              <Radio value={"0"} defaultChecked={useWeth == false}></Radio>
            </Box>
            <Box ml={isMobile ? 0 : "-5px"}> 
              <Text fontSize="13px">MON</Text>
            </Box>
          </HStack> 
          </Box>
         
        </RadioGroup>
        </HStack>
        {/* </Flex> */}
          {isMobile && (
            <Button
                ml={isMobile ? 6 : 5}
                mt={6}
                variant="subtle"
                backgroundColor={"#bf9b30"}
                w={isMobile ? "315px" : "210px"}
                onClick={() => {
                  handleExecuteTrade();
                }}
                disabled={isLoadingExecuteTrade || isTokenInfoLoading || tradeMode === "BUY" ? amountToBuy <= 0 : amountToSell <= 0}
                border="1px solid #a67c00"
              >
                {isLoadingExecuteTrade ? <Spinner size="sm" /> : <Text fontSize="sm">Execute</Text>}
            </Button>
              )}
      </GridItem>

        {/* Slider */}
        <GridItem colSpan={2} mt={5} ml={5}>
          <HStack>
            <Box w="60%" mt={-2}>
            {!isMobile && (
              <>
            <Text ml={5} fontSize="xs" color="#a67c00" >Slide to select</Text>
            <Slider
              mt={2}
              // ml={isMobile ? 5 : 10}
              ml={8}
              variant="outline"
              w={"80%"}
              // Scale the contributionAmount for the slider
              value={[contributionAmount * 100]} // Scale by 100 for 2 decimal places
              onValueChange={(e) => {
                  const scaledValue = e.value[0] / 100; // Convert back to decimal
                  handleSliderChange(scaledValue); // Pass the decimal value to the handler
              }}
              min={[1]}
              max={sliderMax * 100} // Scale the max value as well
              colorPalette="yellow"
              thumbAlignment="center"
              disabled={isTokenInfoLoading} // Disable slider while token info is loading
              />
              </>
                )}
            </Box>
            <Box>
              {!isMobile && (
                <Button
                    ml={5}
                    mt={2}
                    variant="subtle"
                    backgroundColor={"#bf9b30"}
                    w={isMobile ? "140px" : "160px"}
                    onClick={() => {
                      handleExecuteTrade();
                    }}
                    disabled={isLoadingExecuteTrade || isLoading  }
                    border="1px solid #a67c00"
                  >
                    {isLoadingExecuteTrade ? <Spinner size="sm" /> : "Execute"}
                </Button>
                )}

            </Box>
          </HStack>
        </GridItem>

        {/* Trade Mode Buttons */}
        <GridItem ml={5}>
            {/* {!isMobile && (
              <Button
              ml={isMobile ? 5 : 14}
              mt={2}
              variant="subtle"
              backgroundColor="#00412b"
              w={isMobile ? "140px" : "160px"}
              onClick={() => {
                setIsLoadingBtnBuy(true);
                setIsLoading(true);
                buyTokens();
              }}
              disabled={isLoadingExecuteTrade || isTokenInfoLoading || tradeMode == "SELL"}
              border="1px solid #001a11"
            >
              {isLoadingBtnBuy ? <Spinner size="sm" /> : "Buy"}
            </Button>
            )} */}
        </GridItem>
        <GridItem ml={5}>
          {/* {!isMobile && (
          <Button
            mt={2}
            variant="subtle"
            backgroundColor={"#FF153F"}
            w={isMobile ? "140px" : "160px"}
            onClick={() => {
                setIsLoadingBtnSell(true);
                setIsLoading(true);
                sellTokens();
            }}
            disabled={isLoadingBtnSell || isLoadingBtnBuy || isTokenInfoLoading || tradeMode == "BUY" || token0Balance == 0}
            border="1px solid #CC1032"
          >
            {isLoadingBtnSell ? <Spinner size="sm" /> : "Sell"}
          </Button>
          )} */}
        </GridItem>
      </Grid>
    </Box>
  );
};

export default TradeControlsCard;
