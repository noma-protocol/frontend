import React, { useState, useEffect } from 'react';
import { Flex, Badge, HStack, Box, Grid, GridItem, Button, Spinner, Text, VStack } from "@chakra-ui/react";
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
import CustomRadio from "../components/ui/CustomRadio";

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
  // Format the BNB balance (and avoid oversize values)
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
  const initialContribution = 1 // (sliderMax / 10);
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

    // Handle empty input
    if (e.target.value === "") {
      if (tradeMode === "BUY") {
        setAmountToBuy(0);
      } else {
        setAmountToSell(0);
      }
      return;
    }

    // Remove any leading zeros before a non-zero digit
    const cleanedValue = e.target.value.replace(/^0+(?=\d)/, '');

    // Parse the cleaned value
    let newValue = parseFloat(cleanedValue);

    if (isNaN(newValue)) return;

    // Update the corresponding state
    if (tradeMode === "BUY") {
      setAmountToBuy(newValue);
    } else if (tradeMode === "SELL") {
      setAmountToSell(newValue);
    }

    // Update the contribution amount for the slider
    setContributionAmount(newValue);

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



  // Calculate slider marks with percentage labels
  // This ensures marks are always in sync with the current sliderMax
  const marks = React.useMemo(() => {
    // If still loading, use empty labels for first mark
    if (isTokenInfoLoading) {
      return [
        { value: 0, label: "" },
        { value: sliderMax / 2, label: "50%" },
        { value: sliderMax, label: "100%" }
      ];
    }

    // Calculate evenly spaced values
    const quarter = sliderMax / 4;
    const half = sliderMax / 2;
    const threeQuarters = (sliderMax * 3) / 4;

    // When data is loaded, show percentage labels
    return [
      { value: 0, label: "0%" },
      { value: half, label: "50%" },
      { value: sliderMax, label: "100%" }
    ];
  }, [isTokenInfoLoading, sliderMax]);

  return (
    <Box
      w={isMobile ? "98%" : "560px"}
      pt={8}
      {...props}
      h={isMobile ? "420px" : "300px"}
      border="1px solid ivory"
      backgroundColor={"#222831"}
      borderRadius={5}
      mt={isMobile ? 4 : -4}
      // px={isMobile ? -1 : "-100px"}
      py={isMobile ? 4 : 4}
      // ml={isMobile ?-2 : 0}
    >
      <Grid
        h="250px"
        templateRows="repeat(4, 1fr)"
        templateColumns="repeat(1, 1fr)"
        gap={4}
        mb={20}
        pb={10}
        ml={isMobile ? 0 : -4}
      >
        {/* <GridItem colSpan={2} h="10px" mt={-5}  >

        </GridItem> */}
        {/* Numeric Input */}
        <GridItem 
         w="100%" 
        //  ml={5}
        >
          <Text fontWeight={"bold"} ml={isMobile?5:10} fontSize={isMobile ? "xs" : "sm"} color="#a67c00">
                Trade Amount
            </Text>
          <NumberInputRoot
            isMobile={isMobile}
            marginRight="22px"
            max={sliderMax}
            min={0}
            ml={isMobile ? 7 : 10}
            type="price"
            setTokenSupply={() => {}}
            onChange={handleTradeAmountChange}
            value={tradeMode === "BUY"
              ? (amountToBuy === 0 ? "" : String(amountToBuy))
              : (amountToSell === 0 ? "" : String(amountToSell))
            }
            mt={-2}
            w={isMobile ? "90%" : "220px"}
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
                ml={10}
                variant="outline"
                w={"82%"}
                defaultValue={[1]}
                value={[contributionAmount]} // Direct token value
                onValueChange={(e) => {
                    // Use actual value directly
                    handleSliderChange(e.value[0]);
                }}
                max={sliderMax} // Use actual token maximum
                colorPalette="yellow"
                thumbAlignment="center"
                disabled={isTokenInfoLoading}
                marks={marks}
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
        <GridItem 
          w="90%" 
          colSpan={isMobile ? 2 : 1} 
          ml={isMobile ? 2 : 6}
         >
        <VStack w="100%" alignItems={"left"} px={5} mt={isMobile ? 4 : 0}>
          <Box><Text pb={2} ml={isMobile ? 0 : -4} color="#a67c00" fontSize={isMobile ? "xs" : "sm"}><b>Controls</b></Text></Box>
         <Box>
        <RadioGroup 
          id="tradeMode"
          value={tradeMode} 
          onValueChange={(e) => setTradeMode(e.value)} 
        >
        <Box 
          position="relative" 
          border="1px solid" 
          borderColor={tradeMode =="BUY" ? "#00412b" : "#FF153F"} 
          borderLeft={0}
          borderRight={0}
          borderBottom={0}
          borderTopRadius={0}
          px={12} 
          w={isMobile ?"70vw":"100%"} 
          h="35px" 
          ml={isMobile? 0: -5} 
          // mt={-5} 
          borderRadius={0}
          mt={-2}
        >
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
            w={isMobile ? "25%" : "auto"}
            h="10px"
            
          > 

            {isMobile ? "Trade Type" : "Type"}
          </Badge>
            <HStack gap="4" mt={3} ml={isMobile ? "70px" : 4}>
              <CustomRadio
                tradeMode={tradeMode}
                value="BUY"
                name="tradeModeBuy"
                isChecked={tradeMode == "BUY"}
                onChange={() => setTradeMode("BUY")}
              >
                <b>BUY</b>
              </CustomRadio>
              <CustomRadio
                tradeMode={tradeMode}
                value="SELL"
                name="tradeModeSell"
                isChecked={tradeMode == "SELL"}
                onChange={() => setTradeMode("SELL")}
              >
                <b>SELL</b>
              </CustomRadio>
            </HStack> 
        </Box>
        
        </RadioGroup>          
         </Box>

        <Box w="100%" mt={2} mb={isMobile ? 0 : 4}>
          <HStack>
            
          <RadioGroup
            id="useWeth"
            value={useWeth ? "1" : "0"}
            onValueChange={(e) => {
              console.log("Radio value changed:", e.value);
              setUseWeth(e.value === "1");
            }}
            fontSize="11px"
          >
          <Box
            position="relative"
            border="1px solid"
            borderColor={"#a67c00"}
            px={12}
            w={isMobile ?"70vw":"100%"}
            h="35px"
            ml={isMobile? 0: -5}
            borderLeft={0}
            borderRight={0}
            borderBottom={0}
            borderTopRadius={0}
          >
          <Badge
            position="absolute"
            top="0"
            left="0"
            bg={"#a67c00"}
            color="white"
            px={2}
            py={1}
            fontSize="xs"
            borderRight="2px solid"
            borderBottom="2px solid"
            borderColor={"#bf9b30"}
            borderRadius="0"
            fontSize="9px"
            w={isMobile ? "25%" : "auto"}
            h="10px"
          >
            Asset
          </Badge>
            <HStack gap="4" mt={3} ml={isMobile ? "70px" : 4}>
              <CustomRadio
                value="1"
                name="useWeth"
                isChecked={useWeth === true}
                onChange={() => setUseWeth(true)}
              >
                <b>WBNB</b>
              </CustomRadio>
              <CustomRadio
                value="0"
                name="useWeth"
                isChecked={useWeth === false}
                onChange={() => setUseWeth(false)}
              >
                <b>BNB</b>
              </CustomRadio>
            </HStack>
            </Box>
          </RadioGroup>
          </HStack>            
          </Box>        
        </VStack>

          {/* <Flex direction={isMobile? "row" : "column"} align="center" justify="center"> */}

        {/* </Flex> */}
          {isMobile && (
            <Button
              ml={isMobile ? 5 : 7}
              mt={6}
              variant="outline"
              // backgroundColor={"#bf9b30"}
              w={isMobile ? "90%" : "210px"}
              onClick={() => {
                handleExecuteTrade();
              }}
              h={"30px"}
              disabled={isLoadingExecuteTrade || isTokenInfoLoading || tradeMode === "BUY" ? amountToBuy <= 0 : amountToSell <= 0}
              border="1px solid ivory"
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
              ml={8}
              variant="outline"
              w={"80%"}
              value={[contributionAmount]} // Direct token value
              onValueChange={(e) => {
                  // Use actual value directly
                  handleSliderChange(e.value[0]);
              }}
              min={0}
              max={sliderMax} // Use actual token maximum
              colorPalette="yellow"
              thumbAlignment="center"
              disabled={isTokenInfoLoading}
              marks={marks}
              />
              </>
                )}
            </Box>
            <Box>
              {!isMobile && (
                <Button
                    ml={4}
                    mt={2}
                    variant="outline"
                    // backgroundColor={"#bf9b30"}
                    w={isMobile ? "140px" : "160px"}
                    onClick={() => {
                      handleExecuteTrade();
                    }}
                    disabled={isLoadingExecuteTrade || isLoading  }
                    border="1px solid #a67c00"
                  >
                    {isLoadingExecuteTrade ? <Spinner size="sm" /> : <Text fontSize="sm" color="#a67c00">Execute</Text>}
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
