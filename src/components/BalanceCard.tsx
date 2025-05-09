import React, { useState } from 'react';
import {
    VStack,
    Box,
    SimpleGrid,
    HStack,
    Heading,
    Image,
    Text,
    Button,
    Flex, 
    Input,
    Spinner,
    Link
} from '@chakra-ui/react'; // Chakra UI components
import {
    DrawerRoot,
    DrawerTrigger,
    DrawerBackdrop,
    DrawerContent,
    DrawerCloseTrigger,
    DrawerHeader,
    DrawerTitle,
    DrawerBody,
    DrawerFooter,
    DrawerActionTrigger,
} from '../components/ui/drawer'; // Ark UI Drawer components
import { ethers } from 'ethers';
import { commify, commifyDecimals } from '../utils';
import ethLogo from '../assets/images/weth.svg';
import bnbLogo from '../assets/images/bnb-logo.png';
import monadLogo from '../assets/images/monad.png';
import oksLogo from '../assets/images/logo_dark.png';
import placeHolder from '../assets/images/question.svg';
import nomaLogo from '../assets/images/noma_logo_transparent.png';

import { isMobile } from "react-device-detect";

const { formatEther } = ethers.utils;

const BalanceCard: React.FC = ({ 
    ethBalance, 
    token0Symbol, 
    token0Balance, 
    token1Symbol, 
    token1Balance,
    deposit, 
    withdraw, 
    isLoading, 
    isWrapping,
    isUnwrapping,
    setIsWrapping,
    setIsUnwrapping,
    setIsLoading, 
    isTokenInfoLoading,
    wrapAmount,
    setWrapAmount, 
    vaultAddress,
    page,
    stakingContract,
    ...props 
}) => {
    // const [wrapAmount, setWrapAmount] = useState('');
    const [actionType, setActionType] = useState(''); // 'wrap' or 'unwrap'

    ethBalance = formatEther(`${ethBalance}`);
    const oversizeEth = ethBalance > 1_000_000;
    const oversizeToken0 = token0Balance > 1_000_000;
    const oversizeToken1 = token1Balance > 1_000_000;

    const withBg = page == "exchange" ? true : false;

    // if (oversize) {
    //     ethBalance = 999999.9999;
    // }

    const handleAction = () => {

        if (wrapAmount == '' || wrapAmount == '0') return;
        if (actionType === 'wrap') {
            setIsWrapping(true);
            // setWrapAmount(wrapAmount);
            deposit(); // Pass the amount to the deposit function
        } else if (actionType === 'unwrap') {
            setIsUnwrapping(true);
            // setWrapAmount(wrapAmount);
            withdraw(); // Pass the amount to the withdraw function
        }
    };

    const handleClickBorrow = () => {
        const borrowLink = `/borrow?v=${vaultAddress}`;
        window.location.href = borrowLink
    }

    const handleClickStake = () => {
        const stakeLink = `/stake?v=${vaultAddress}`;
        window.location.href = stakeLink
    }

    let marginLeft = 0;
    let marginTop = 0;

    if (isMobile) {
        if (page == "borrow") {
            marginLeft = "-70px";
            marginTop = 0;
        } else {
            marginLeft = -2;
        }
    } else if (withBg) {
        marginLeft = 20;
    }
    else {
        marginLeft = 5;
    }

    return (
        <Box 
            w={isMobile?"40vh":"450px"} 
            ml={marginLeft} 
            border={withBg ?"none" : "1px solid white"} 
            borderColor="gray" 
            pt={4} 
            pl={2} 
            pr={2} 
            pb={2} 
            mt={marginTop}
            {...props} 
            h={"280px"}
            borderRadius={10} 
            backgroundColor={withBg? "none" : "#222831"}
        >
            <Box pl={2}>
                <Text fontWeight={"bold"} color="#a67c00">Wallet</Text>
            </Box>
            <SimpleGrid columns={3} p={2}>
                <Box color="white" background={"#bf9b30"} pl={2} > 
                    Asset
                </Box>
                <Box color="white" background={"#bf9b30"}>
                    Balance
                </Box>
                <Box color="white" background={"#bf9b30"}>
                    Actions
                </Box>
                <Box h={'30px'} mt={2} p={2}>
                    <HStack><Box><Image src={monadLogo} w="25px"></Image></Box><Box>MON</Box></HStack>
                </Box>
                <Box h={'30px'} mt={2}  p={2} fontSize={isMobile?"12px": oversizeEth?"13px":"13px"}>
                    {commify(ethBalance)}
                </Box>
                <Box h={'40px'} mt={2} ml={2}>
                <DrawerRoot>
                    <DrawerTrigger asChild>
                        <Button 
                            disabled={isWrapping}
                            border={ "1px solid" }
                            borderColor={actionType === 'wrap' ? "#a67c00" : "gray"}
                            variant="outline" 
                            h="30px" 
                            mt={1} 
                            ml={2} 
                            w={isMobile?"80px":"100px"} 
                            onClick={() => setActionType('wrap')}
                        >
                            {isWrapping ? 
                            <Spinner size="sm" /> : 
                            <Text fontSize={isMobile?"12px":"13px"}>Wrap</Text>}
                        </Button>
                    </DrawerTrigger>
                    <DrawerBackdrop />
                    <DrawerContent>
                        <Box mt="80%" ml={5}>
                        <DrawerHeader>
                            <DrawerTitle>
                                <Text as="h3" color="#bf9b30">Wrap MON</Text>
                            </DrawerTitle>
                            <DrawerCloseTrigger asChild mt="82%" mr={5}>
                                <Button variant="ghost" size="sm">×</Button>
                            </DrawerCloseTrigger>
                        </DrawerHeader>
                        <DrawerBody>
                            <Input
                                placeholder="Enter amount to wrap"
                                onChange={(e) => setWrapAmount(e.target.value)}
                                w="80%"
                            />
                        <Box mt={10}>
                        <DrawerActionTrigger asChild>
                                <Button variant="outline" onClick={() => setWrapAmount('0')}  w="120px">
                                    Cancel
                                </Button>
                            </DrawerActionTrigger>
                            <Button colorScheme="blue" onClick={handleAction}  w="120px" ml={2}>
                                {isWrapping ? <Spinner size="sm" /> : "Confirm"}
                            </Button>                                
                        </Box>                                
                        </DrawerBody>
                        </Box>
                        {/* <DrawerFooter>
                        </DrawerFooter> */}
                    </DrawerContent>
                </DrawerRoot>
                </Box>
                <Box h={'40px'} mt={1} p={2} >
                    {isTokenInfoLoading ? 
                    <Spinner size="sm" ml={2} /> : 
                    <HStack><Box><Image src={monadLogo} w="25px"></Image></Box><Box>{token1Symbol}</Box></HStack>
                    }
                </Box>
                <Box h={'40px'} mt={2} p={2} fontSize={isMobile?"12px":oversizeToken1?"13px":"13px"}>
                    {commify(formatEther(`${token1Balance || 0}`))}
                </Box>
                <Box h={'40px'} mt={2} ml={2}>
                    <DrawerRoot>
                        <DrawerTrigger asChild>
                            <Button 
                                border={ "1px solid" }
                                borderColor={actionType === 'unwrap' ? "#a67c00" : "gray"}
                                disabled={isUnwrapping || token1Balance == 0} 
                                variant="outline" 
                                h="30px" 
                                mt={1} 
                                ml={2} 
                                w={isMobile?"80px":"100px"} 
                                onClick={() => setActionType('unwrap')}
                            >
                                {isUnwrapping ? <Spinner size="sm" /> : <Text fontSize={isMobile?"12px": "13px"}>Unwrap</Text>}
                            </Button>
                        </DrawerTrigger>
                        <DrawerBackdrop />
                        <DrawerContent>
                            <Box mt="80%" ml={5}>
                            <DrawerHeader>
                                <DrawerTitle>
                                    <Text as="h3" color="#bf9b30">Unwrap WBNB</Text>
                                </DrawerTitle>
                                <DrawerCloseTrigger asChild mt="82%" mr={5}>
                                    <Button variant="ghost" size="sm">×</Button>
                                </DrawerCloseTrigger>
                            </DrawerHeader>
                            <DrawerBody>
                                <Input
                                    placeholder="Enter amount to unwrap"
                                    onChange={(e) => setWrapAmount(e.target.value)}
                                    w="80%"
                                />
                            <Box mt={10}>
                            <DrawerActionTrigger asChild>
                                    <Button variant="outline" onClick={() => setWrapAmount('0')}  w="120px">
                                        Cancel
                                    </Button>
                                </DrawerActionTrigger>
                                <Button colorScheme="blue" onClick={handleAction} w="120px" ml={2}>
                                    {isUnwrapping ? <Spinner size="sm" /> : "Confirm"}
                                </Button>                                
                            </Box>                                
                            </DrawerBody>
                            </Box>
                            {/* <DrawerFooter>
                            </DrawerFooter> */}
                        </DrawerContent>
                    </DrawerRoot>
                </Box>
                <Box 
                // h={'40px'} 
                 mt={2} 
                // p={2}
                // border="1px solid"
                >
                    {isTokenInfoLoading ? 
                    <Spinner size="sm"  ml={4}  /> : 
                    <HStack>
                        <Box 
                            // mt={isMobile ? -5 : -3} 
                            // ml={isMobile ? -2 : -2}
                            >
                            <Image 
                                // mt={-2}
                                ml={2}
                                src={token0Symbol == "OKS" ? oksLogo : placeHolder} 
                                w={token0Symbol == "OKS" ? "45px" : "25px"}
                            />
                        </Box>
                        <Box 
                            // mt={isMobile ? -5 : -3}
                            // mt={-2} 
                            // ml={-2}
                            // ml={2}
                        >
                            {token0Symbol}
                        </Box>
                        </HStack>
                    }
                </Box>
                <Box 
                    // border="1px solid"
                    // h={'40px'} 
                    // mt={isMobile ? "-2px" : 0}
                    mt={2}
                    p={2} 
                    fontSize={isMobile?"12px":oversizeToken0?"13px":"13px"}
                >
                    {commify(formatEther(`${token0Balance || 0}`))}
                </Box>
                <Box h={'40px'} mt={2} ml={4}>
                    {page != "borrow" ?
                    <VStack ml={-8}>
                        <Box>                    
                            <Button 
                                variant="outline" 
                                h="30px" 
                                mt={1} 
                                ml={isMobile?4:2}
                                w={isMobile?"80px":"100px"} 
                                disabled={token0Balance == 0}
                                onClick={handleClickBorrow}
                                fontSize={isMobile?"12px": oversizeEth?"13px":"13px"}
                            >
                                Borrow
                            </Button>
                    </Box>
                        <Box ml={"2px"} mt={1}>
                        <Button 
                            variant="outline" 
                            h="30px" 
                            mt={1} 
                            ml={isMobile?4:2}
                            w={isMobile?"80px":"100px"}  
                            disabled={token0Balance == 0}
                            onClick={handleClickStake}
                            fontSize={isMobile?"12px": oversizeEth?"13px":"13px"}
                        >
                            Stake
                        </Button>
                        </Box>
                    </VStack>
                    
                    : <></>}
                </Box>                
            </SimpleGrid>
        </Box>
    );
}

export default BalanceCard;