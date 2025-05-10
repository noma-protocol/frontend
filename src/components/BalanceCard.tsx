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
import monadLogo from '../assets/images/monad.png';
import oksLogo from '../assets/images/logo_dark.png';
import placeHolder from '../assets/images/question.svg';

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
    const cardWidth = useBreakpointValue({ 
        base: "95%", 
        sm: "95%",
        md: "400px", 
        lg: "450px" 
    });
    
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

    return (
        <Box 
            w={page == "borrow" ? "380px" : cardWidth}   
            mx="auto"
            border={withBg ? "none" : "1px solid white"} 
            borderColor="gray" 
            p={4}
            {...props} 
            h={{ base: "auto", md: "280px" }}
            minH="auto"
            borderRadius={10} 
            backgroundColor={withBg ? "none" : "#222831"}
        >
            <Text fontWeight="bold" fontSize={isMobile ? "13px" : "14px"} color="#a67c00" mb={2}>Wallet</Text>
            
            <SimpleGrid columns={3} spacing={2}>
                {/* Header Row */}
                <Box color="white" background="#a67c00"  pl={3}>
                    <Text>Asset</Text>
                </Box>
                <Box  color="white" background="#a67c00" textAlign="left">
                    Balance
                </Box>
                <Box color="white" background="#a67c00" textAlign="center">
                    Actions
                </Box>
                
                {/* MON Row */}
                <Box p={2} height="42px" display="flex" alignItems="center">
                    <HStack spacing={2}>
                        <Image src={monadLogo} w="25px" alt="MON" />
                        <Text mt={"-2px"} ml={2}>MON</Text>
                    </HStack>
                </Box>
                <Box p={2} fontSize={fontSize} textAlign="left" height="42px" display="flex" alignItems="left" justifyContent="left">
                    <Text fontSize={fontSize}  h={"30px"}>{commify(formattedEthBalance)}</Text>
                </Box>
                <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
                    <DrawerRoot>
                        <DrawerTrigger asChild>
                            <Button 
                                disabled={isWrapping}
                                border="1px solid"
                                borderColor={actionType === 'wrap' ? "#a67c00" : "gray"}
                                variant="outline" 
                                h="25px"
                                w={buttonSize}
                                onClick={() => setActionType('wrap')}
                            >
                                <Box minH="20px" minW="60px" display="flex" alignItems="center" justifyContent="center">
                                    {isWrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Wrap</Text>}
                                </Box>
                            </Button>
                        </DrawerTrigger>
                        <DrawerBackdrop />
                        <DrawerContent>
                            <Box p={4} mt={{ base: "50%", md: "80%" }}>
                                <DrawerHeader>
                                    <DrawerTitle>
                                        <Text as="h3" color="#bf9b30">Wrap MON</Text>
                                    </DrawerTitle>
                                    <DrawerCloseTrigger asChild>
                                        <Button variant="ghost" size="sm" position="absolute" top={2} right={2}>×</Button>
                                    </DrawerCloseTrigger>
                                </DrawerHeader>
                                <DrawerBody>
                                    <Input
                                        placeholder="Enter amount to wrap"
                                        onChange={(e) => setWrapAmount(e.target.value)}
                                        w="100%"
                                        mb={4}
                                    />
                                    <HStack mt={4} spacing={3} justifyContent="center">
                                        <DrawerActionTrigger asChild>
                                            <Button variant="outline" onClick={() => setWrapAmount('0')}>
                                                <Box minH="20px" display="flex" alignItems="center" justifyContent="center">
                                                    Cancel
                                                </Box>
                                            </Button>
                                        </DrawerActionTrigger>
                                        <Button colorScheme="blue" onClick={handleAction}>
                                            <Box minH="20px" display="flex" alignItems="center" justifyContent="center">
                                                {isWrapping ? <Spinner size="sm" /> : "Confirm"}
                                            </Box>
                                        </Button>
                                    </HStack>
                                </DrawerBody>
                            </Box>
                        </DrawerContent>
                    </DrawerRoot>
                </Box>
                
                {/* WMON Row */}
                <Box p={2} height="42px" display="flex" alignItems="center">
                    {isTokenInfoLoading && !isRefreshingTokenInfo ?
                        <Spinner size="sm" ml={"3px"} /> :
                        <HStack spacing={2}>
                            <Image src={monadLogo} w="25px" alt={token1Symbol || 'Token'} />
                            <Text ml={2} mt={"-2px"}>{token1Symbol || <Spinner size="sm" />}</Text>
                        </HStack>
                    }
                </Box>
                <Box p={2} fontSize={fontSize} textAlign="left" height="42px" display="flex" alignItems="left" justifyContent="left">
                    {commify(formatEther(`${token1Balance || 0}`))}
                </Box>
                <Box p={2} textAlign="center" height="42px" display="flex" alignItems="center" justifyContent="center">
                    <DrawerRoot>
                        <DrawerTrigger asChild>
                            <Button 
                                border="1px solid"
                                borderColor={actionType === 'unwrap' ? "#a67c00" : "gray"}
                                disabled={isUnwrapping || token1Balance == 0} 
                                variant="outline" 
                                h="25px"
                                w={buttonSize}
                                mt={-2}
                                onClick={() => setActionType('unwrap')}
                            >
                                <Box minH="20px" minW="60px" display="flex" alignItems="center" justifyContent="center">
                                    {isUnwrapping ? <Spinner size="sm" /> : <Text fontSize={fontSize}>Unwrap</Text>}
                                </Box>
                            </Button>
                        </DrawerTrigger>
                        <DrawerBackdrop />
                        <DrawerContent>
                            <Box p={4} mt={{ base: "50%", md: "80%" }}>
                                <DrawerHeader>
                                    <DrawerTitle>
                                        <Text as="h3" color="#bf9b30">Unwrap {token1Symbol}</Text>
                                    </DrawerTitle>
                                    <DrawerCloseTrigger asChild>
                                        <Button variant="ghost" size="sm" position="absolute" top={2} right={2}>×</Button>
                                    </DrawerCloseTrigger>
                                </DrawerHeader>
                                <DrawerBody>
                                    <Input
                                        placeholder="Enter amount to unwrap"
                                        onChange={(e) => setWrapAmount(e.target.value)}
                                        w="100%"
                                        mb={4}
                                    />
                                    <HStack mt={4} spacing={3} justifyContent="center">
                                        <DrawerActionTrigger asChild>
                                            <Button variant="outline" onClick={() => setWrapAmount('0')}>
                                                <Box minH="20px" display="flex" alignItems="center" justifyContent="center">
                                                    Cancel
                                                </Box>
                                            </Button>
                                        </DrawerActionTrigger>
                                        <Button colorScheme="blue" onClick={handleAction}>
                                            <Box minH="20px" display="flex" alignItems="center" justifyContent="center">
                                                {isUnwrapping ? <Spinner size="sm" /> : "Confirm"}
                                            </Box>
                                        </Button>
                                    </HStack>
                                </DrawerBody>
                            </Box>
                        </DrawerContent>
                    </DrawerRoot>
                </Box>
                
                {/* Token Row */}
                <Box p={2}  display="flex" alignItems="center" mt={-8}>
                    {isTokenInfoLoading && !isRefreshingTokenInfo ?
                        <Spinner size="sm" ml={"3px"} /> :
                        <HStack spacing={2} >
                            <Box >
                             <Image
                                src={token0Symbol == "OKS" ? oksLogo : placeHolder}
                                w={token0Symbol == "OKS" ? "35px" : "25px"}
                                alt={token0Symbol || 'Token'}
                                
                            />
                            </Box>
                            <Box>
                               <Text>&nbsp;{token0Symbol || <Spinner size="sm" />}</Text>
                            </Box>
                        </HStack>
                    }
                </Box>
                <Box p={2} fontSize={fontSize} textAlign="left" height="70px" display="flex" alignItems="left" justifyContent="left">
                    {commify(formatEther(`${token0Balance || 0}`))}
                </Box>
                <Box p={2} textAlign="center" height="70px" display="flex" alignItems="center" justifyContent="center">
                    {page != "borrow" ?
                        <VStack spacing={2} align="center">
                            <Button 
                                variant="outline" 
                                h="25px"
                                w={buttonSize}
                                disabled={token0Balance == 0}
                                onClick={handleClickBorrow}
                                fontSize={fontSize}
                                mt={-2}
                                mb={1}
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