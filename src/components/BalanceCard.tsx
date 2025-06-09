import React, { useState, useEffect } from 'react';
import {
    VStack,
    Box,
    SimpleGrid,
    HStack,
    Image,
    Text,
    Button,
    Input,
    Spinner,
    useBreakpointValue
} from '@chakra-ui/react';
import {
    DrawerRoot,
    DrawerTrigger,
    DrawerBackdrop,
    DrawerContent,
    DrawerCloseTrigger,
    DrawerHeader,
    DrawerTitle,
    DrawerBody,
    DrawerActionTrigger,
} from '../components/ui/drawer';
import { ethers } from 'ethers';
import { commify } from '../utils';
// import monadLogo from '../assets/images/monad.png';
import bnbLogo from '../assets/images/bnb.png';
import oksLogo from '../assets/images/logo_dark.png';
import placeHolder from '../assets/images/question.svg';
import Wrap from './Wrap'; // Assuming Wrap component is in the same directory
import Unwrap from './Unwrap';

const { formatEther } = ethers.utils;

const BalanceCard = ({
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
    isRefreshingTokenInfo = false, // New prop with default value
    wrapAmount,
    setWrapAmount,
    vaultAddress,
    page,
    stakingContract,
    ...props
}) => {
    const [actionType, setActionType] = useState('');
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

    // Use Chakra UI's responsive utilities
    const isMobile = useBreakpointValue({ base: true, md: false });
    const buttonSize = useBreakpointValue({ base: "80px", md: "100px" });
    const fontSize = useBreakpointValue({ base: "12px", md: "13px" });
    
    // Listen for window resize events
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Format values
    const formattedEthBalance = formatEther(`${ethBalance}`);

    const withBg = page === "exchange";

    const handleAction = () => {
        if (wrapAmount === '' || wrapAmount === '0') return;
        
        if (actionType === 'wrap') {
            setIsWrapping(true);
            deposit();
        } else if (actionType === 'unwrap') {
            setIsUnwrapping(true);
            withdraw();
        }
    };

    const handleClickBorrow = () => {
        window.location.href = `/borrow?v=${vaultAddress}`;
    }

    const handleClickStake = () => {
        window.location.href = `/stake?v=${vaultAddress}`;
    }

    let cardWidth = "94"; // Default width
    let marginLeft = isMobile ? -3 : 10;
    let marginTop = 0;
    
    if (page === "exchange") {
        cardWidth = isMobile ? "98%" : "auto";
        marginLeft = isMobile ? 0 : marginLeft;  
        marginTop = isMobile ? 0 : 5; 
    } else if (page === "borrow") {
        if (isMobile) {
            marginLeft = -6;
            cardWidth = "90%"; // Adjusted for mobile
        } else {
            cardWidth = "60%"; 
        }
    } else if (page === "stake") {
        cardWidth = isMobile ? "90%" : "60%"; 
        if (isMobile) {
            marginLeft = -4;
        }
    }

     return (
        <Box 
            w={cardWidth}   
            mx="auto"
            ml={marginLeft}
            border={"1px solid white"} 
            borderColor="ivory" 
            px={3} 
            py={2}
            {...props} 
            h={{ base: "auto", md: "280px" }}
            minH="auto"
            borderRadius={5} 
            backgroundColor={"#222831"}
            mt={marginTop}
        >
            <Text fontWeight="bold" fontSize={isMobile ? "xs" : "14px"} color="#a67c00" mb={2}>Wallet</Text>
            
            <SimpleGrid columns={3} w="auto">
                {/* Header Row */}
                <Box color="white" background="#a67c00"  pl={3}>
                    <Text  fontSize="xs">Asset</Text>
                </Box>
                <Box  color="white" background="#a67c00" textAlign="left" ml={-2} >
                    <Text  fontSize="xs">Balance</Text> 
                </Box>
                
                <Box color="white" background="#a67c00" textAlign="center"> 
                    <Text  fontSize="xs">Actions</Text>
                </Box>
                
                {/* BNB Row */}
                <Box p={2} height="42px" display="flex" alignItems="center" w="70px">
                    <HStack spacing={2}>
                        <Image src={bnbLogo} w="40px" alt="BNB" ml={-2} />
                        <Text fontSize="xs" mt={"-2px"} fontWeight={"bold"} ml={2}>BNB</Text>
                    </HStack>
                </Box>
                <Box ml={-2} bgColor={"#18181b"} px={2} borderRadius={5}  mt={3} h="20px" w={isMobile ? "100px" : "130px"} fontSize={fontSize} textAlign="left" display="flex" alignItems="left" justifyContent="left">
                    <Text fontSize={fontSize} color="white"  h={"20px"}>{commify(formattedEthBalance)}</Text>
                </Box>
                <Wrap 
                    wrapAmount={wrapAmount}
                    isWrapping={isWrapping}
                    setWrapAmount={setWrapAmount}
                    handleAction={handleAction}
                    setActionType={setActionType}
                    actionType={actionType}
                    fontSize={fontSize}
                    buttonSize={buttonSize}
                    bnbBalance={ethBalance}
                />
                
                {/* WBNB Row */}
                <Box p={2} height="42px" display="flex" alignItems="center">
                    {isTokenInfoLoading && !isRefreshingTokenInfo ?
                        <Spinner size="sm" ml={"3px"} /> :
                        <HStack spacing={2}>
                            <Image src={bnbLogo} w="40px" alt={token1Symbol || 'Token'} ml={-2} />
                            <Text fontSize="xs" fontWeight={"bold"} ml={2} mt={"-2px"}>{token1Symbol || <Spinner size="sm" />}</Text>
                        </HStack>
                    }
                </Box>
                <Box  ml={-2} bgColor={"#18181b"} w={isMobile ? "100px" : "130px"}  color="gray.800"  px={2} borderRadius={5}  mt={3} fontSize={fontSize} textAlign="left" height="20px" display="flex" alignItems="left" justifyContent="left">
                    <Text color="white" fontSize="xs">{commify(formatEther(`${token1Balance || 0}`))}</Text>
                </Box>
                
                <Unwrap
                    wrapAmount={wrapAmount}
                    isUnwrapping={isUnwrapping}
                    setWrapAmount={setWrapAmount}
                    handleAction={handleAction}
                    setActionType={setActionType}
                    actionType={actionType}
                    fontSize={fontSize}
                    buttonSize={buttonSize}
                    token1Balance={token1Balance}
                />

                {/* Token Row */}
                <Box p={2}  display="flex" alignItems="center" mt={-10}>
                    {isTokenInfoLoading && !isRefreshingTokenInfo ?
                        <Spinner size="sm" ml={"3px"} /> :
                        <HStack spacing={2} >
                            <Box >
                             <Image
                                src={token0Symbol == "OKS" ? oksLogo : placeHolder}
                                w={token0Symbol == "OKS" ? "55px" : "25px"}
                                ml={token0Symbol == "OKS" ? "-10px" : 0}
                                alt={token0Symbol || 'Token'}
                                
                            />
                            </Box>
                            <Box ml={2}>
                               <Text fontWeight="bold" ml={token0Symbol == "OKS" ? "-20px" : 0} fontSize="xs">&nbsp;{token0Symbol || <Spinner size="sm" />}</Text>
                            </Box>
                        </HStack>
                    }
                </Box>
                <Box ml={-2} bgColor={"#18181b"} w={isMobile ? "100px" : "130px"}  color="gray.800" px={2} borderRadius={5} mt={2} fontSize={fontSize} textAlign="left" height="20px" display="flex" alignItems="left" justifyContent="left">
                    <Text fontSize="xs" color="white">{commify(formatEther(`${token0Balance || 0}`))}</Text>
                </Box>
                <Box p={2} textAlign="center" height="70px" display="flex" alignItems="center" justifyContent="center"  mt={2}>
                    {page == "exchange" ?
                        <VStack spacing={2} align="center">
                            <Button 
                                variant="outline" 
                                h="25px"
                                w={buttonSize}
                                disabled={token0Balance == 0}
                                onClick={handleClickBorrow}
                                fontSize={fontSize}
                                mt={-2}
                                ml={2}
                                mb={1}
                                borderColor={withBg ? "gray" : "none"}
                                color="white"
                                borderRadius={5}
                                _hover={{ bg: "#a67c00aa", borderColor: "#a67c00", color: "white" }}
                            >
                                <Box minH="20px" minW="60px" display="flex" alignItems="center" justifyContent="center">
                                    Borrow
                                </Box>
                            </Button>
                            <Button 
                                variant="outline" 
                                h="25px"
                                w={buttonSize}
                                disabled={token0Balance == 0}
                                onClick={handleClickStake}
                                fontSize={fontSize}
                                ml={2}
                                mt={0}
                                borderColor={withBg ? "gray" : "none"}
                                color="white"
                                borderRadius={5}
                                _hover={{ bg: "#a67c00aa", borderColor: "#a67c00", color: "white" }}
                            >
                                <Box minH="20px" minW="60px" display="flex" alignItems="center" justifyContent="center">
                                    Stake
                                </Box>
                            </Button>
                        </VStack>
                    : <></>}
                </Box>                
            </SimpleGrid>
        </Box>
    );
}

export default BalanceCard;