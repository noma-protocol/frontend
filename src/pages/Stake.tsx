import React, { useState, useEffect } from 'react';
import { Input, Image, Flex, Container, Heading, HStack, Box, Grid, GridItem, Button, Spinner, Text, createListCollection, SimpleGrid, NumberInput, VStack } from "@chakra-ui/react";
import { ethers } from 'ethers';
import { isMobile } from "react-device-detect";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';
import { Toaster, toaster } from "../components/ui/toaster";
import { useSearchParams } from "react-router-dom"; // Import useSearchParams
import BalanceCard from '../components/BalanceCard';
import ethLogo from '../assets/images/weth.svg';
import placeholderLogo from '../assets/images/question.svg';
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import { formatNumberPrecise, commify, commifyDecimals, getDaysLeft, calculateExpiryDate, getContractAddress } from '../utils';
import {
    NumberInputRoot,
    NumberInputLabel,
    NumberInputField,
  } from "../components/ui/number-input";
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
import { ro } from '@faker-js/faker';
import addresses from "../assets/deployment.json";
import config from '../config'; 

const { formatEther, parseEther, isAddress } = ethers.utils;
const { JsonRpcProvider } = ethers.providers;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  "https://testnet-rpc.monad.xyz"
);

const IWETHArtifact = await import(`../assets/IWETH.json`);
const IWETHAbi = IWETHArtifact.abi;

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

const StakingContractArtifact = await import(`../assets/Staking.json`);
const StakingContractAbi = StakingContractArtifact.abi;

const GonsTokenArtifact = await import(`../assets/GonsToken.json`);
const GonsTokenAbi = GonsTokenArtifact.abi;

// NomaFactory contract address
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
const modelHelperAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "ModelHelper");

const Stake = () => {
    const { address, isConnected } = useAccount();
    const [searchParams] = useSearchParams();
    const screenOrientation = useScreenOrientation();
    const isLandscape = screenOrientation.includes("landscape");

    const vaultAddress = searchParams.get("v") || ""; // Fallback to empty string

    const [isLoading, setIsLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isStaking, setIsStaking] = useState(false);
    const [isUnstaking, setIsUnstaking] = useState(false);

    const [stakeAmount, setStakeAmount] = useState("0");

    const [isTokenInfoLoading, setIsTokenInfoLoading] = useState(true);
    const [isWrapping, setIsWrapping] = useState(false);
    const [isUnwrapping, setIsUnwrapping] = useState(false);

    const [token0Info, setToken0Info] = useState({});
    const [token1Info, setToken1Info] = useState({});

    const [ethBalance, setEthBalance] = useState("0");
    const [wrapAmount, setWrapAmount] = useState("0");

    const [token0, setToken0] = useState("");
    const [token1, setToken1] = useState("");

    const [vaultDescription, setVaultDescription] = useState({});

    // Reference to track if component is mounted
    const isMounted = React.useRef(true);

    const {
        data: stakedBalance
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "stakedBalance",
        args: [address],
        watch: true,
    });

    const {
        data: sNomaToken
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "sOKS",
        watch: true,
    });

    const {
        data: sNomaBalance
    } = useContractRead({
        address: sNomaToken,
        abi: ERC20Abi,
        functionName: "balanceOf",
        args: [address],
        watch: true,
    });
    
    const {
        data: sNomaTotalSupply
    } = useContractRead({
        address: sNomaToken,
        abi: ERC20Abi,
        functionName: "totalSupply",
        watch: true,
    });

    const {
        data: totalStaked
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "totalStaked",
        watch: true
    });


    const {
        data: totalRewards
    } = useContractRead({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "totalRewards",
        watch: true
    });

    // const {
    //     data: rebaseIndex
    // } = useContractRead({
    //     address: sNomaToken,
    //     abi: GonsTokenAbi,
    //     functionName: "rebaseIndex",
    //     watch: true
    // });

    let APR_30_DAYS = (((formatEther(`${sNomaTotalSupply || 0}`) ) - formatEther(`${sNomaBalance || 0}`)) / formatEther(`${totalStaked || 0}`) ) * (365 / 30) * 100;
    APR_30_DAYS = isNaN(APR_30_DAYS) ? 0 : APR_30_DAYS;

    // console.log(`${formatEther(`${sNomaTotalSupply || 0}`) }`);
    // console.log(`${formatEther(`${totalRewards || 0}`)}`);
    // console.log({sNomaBalance});
    // console.log(`${formatEther(`${rebaseIndex || 0}` )}`);

    // Initialize isMounted.current to true
    useEffect(() => {
        isMounted.current = true;

        return () => {
            // Set to false when component unmounts
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        const fetchVaultDescription = async () => {
            try {
                const nomaFactoryContract = new ethers.Contract(
                    nomaFactoryAddress,
                    NomaFactoryAbi,
                    localProvider
                );

                const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vaultAddress);

                const plainVaultDescription = {
                    tokenName: vaultDescriptionData[0],
                    tokenSymbol: vaultDescriptionData[1],
                    tokenDecimals: Number(vaultDescriptionData[2]), // Convert BigInt to number
                    token0: vaultDescriptionData[3],
                    token1: vaultDescriptionData[4],
                    deployer: vaultDescriptionData[5],
                    vault: vaultDescriptionData[6],
                    presaleContract: vaultDescriptionData[7],
                    stakingContract: vaultDescriptionData[8],
                };

                if (isMounted.current) {
                    setVaultDescription(plainVaultDescription);
                    setToken0(plainVaultDescription.token0);
                    setToken1(plainVaultDescription.token1);
                }
            } catch (error) {
                console.error("Error fetching vault description:", error);
            }
        }

        fetchVaultDescription();
    }, [vaultAddress]);

    useEffect(() => {
        if (!address) return;

        const fetchEthBalance = async () => {
            try {
                const balance = await localProvider.getBalance(address);
                if (isMounted.current) {
                    setEthBalance(balance);
                }
            } catch (error) {
                console.error("Error fetching ETH balance:", error);
            }
        };

        // Fetch immediately
        fetchEthBalance();

        const interval = setInterval(fetchEthBalance, 3000);

        return () => clearInterval(interval);
    }, [address]);

    useEffect(() => {
        if (!token0 || !token1 || !address) return;

        // Set loading only on initial fetch, not during interval updates
        let initialFetch = true;
        if (initialFetch) {
            setIsTokenInfoLoading(true);
        }

        const fetchTokenInfo = async (tokenAddress) => {
            if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) return null;

            try {
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ERC20Abi,
                    localProvider
                );

                const [tokenName, tokenSymbol, tokenDecimals, balance] = await Promise.all([
                    tokenContract.name(),
                    tokenContract.symbol(),
                    tokenContract.decimals(),
                    tokenContract.balanceOf(address)
                ]);

                return { tokenName, tokenSymbol, tokenDecimals, balance };
            } catch (error) {
                console.error(`Error fetching token info for ${tokenAddress}:`, error);
                return null;
            }
        };

        const updateTokenInfo = async () => {
            try {
                // Execute both calls in parallel
                const [token0Data, token1Data] = await Promise.all([
                    fetchTokenInfo(token0),
                    fetchTokenInfo(token1)
                ]);

                if (!isMounted.current) return;

                if (token0Data) setToken0Info(token0Data);
                if (token1Data) setToken1Info(token1Data);

                // Only set loading to false if this is the initial fetch
                if (initialFetch) {
                    setIsTokenInfoLoading(false);
                    initialFetch = false;
                }
            } catch (error) {
                console.error("Error updating token info:", error);
                if (initialFetch && isMounted.current) {
                    setIsTokenInfoLoading(false);
                    initialFetch = false;
                }
            }
        };

        // Initial fetch
        updateTokenInfo();

        const interval = setInterval(updateTokenInfo, 3000);

        return () => clearInterval(interval);
    }, [token0, token1, address]);

    // Remove this useEffect as it's redundant with the other useEffects
    // and is likely causing the loading state to get stuck in a loop
    useEffect(() => {
        // This effect has been consolidated into the previous ones
        // No need for another interval fetching the same data
        return () => {
            // Empty cleanup function for safety
        };
    }, []);

    const {
        write: approve
    } = useContractWrite({
        address: token0,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultDescription.stakingContract,
            ethers.constants.MaxUint256
        ],
        onSuccess(data) {

            stake();

        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsStaking(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });

    const {
        write: stake
    } = useContractWrite({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "stake",
        args: [
            // address,
            parseEther(`${stakeAmount}`)
        ],
        onSuccess(data) {
            setIsStaking(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsStaking(false);

            const msg = Number(error.message.toString().indexOf("StakingNotEnabled")) > -1 ? "Staking not enabled." :
                        Number(error.message.toString().indexOf("InvalidParameters")) > -1 ? "Can't stake zero." :
                        Number(error.message.toString().indexOf("CooldownNotElapsed")) > -1 ? "Cooldown not elapsed. Try again later." :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
                        
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: unstake
    } = useContractWrite({
        address: vaultDescription.stakingContract,
        abi: StakingContractAbi,
        functionName: "unstake",
        args: [],
        onSuccess(data) {
            setIsUnstaking(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsUnstaking(false);

            const msg = Number(error.message.toString().indexOf("StakingNotEnabled")) > -1 ? "Staking not enabled." :
                        Number(error.message.toString().indexOf("LockInPeriodNotElapsed")) > -1 ? "You can't unstake yet." :
                        Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });

    const {
        write: approveSnoma
    } = useContractWrite({
        address: sNomaToken,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            vaultDescription.stakingContract,
            ethers.constants.MaxUint256
        ],
        onSuccess(data) {

            unstake();
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsUnstaking(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });
    
    const handleSetAmountToStake = (e) => {
        const value = e.target.value;
        if (isNaN(value) || value === "") return;
        setStakeAmount(e.target.value);
    }

    const handleStake = async () => {
        setIsStaking(true);
        approve();
    }

    const handleUnstake = async () => {
        setIsUnstaking(true);
        approveSnoma();
    }

    console.log(`sNoma Balance: ${sNomaBalance} stakedBalance: ${stakedBalance}`);
    const rewards = formatEther(`${sNomaBalance || 0}`) - formatEther(`${stakedBalance || 0}`);
    return (
        <Container maxW="container.xl" py={12} pl={"0%"} ml={"10%"}>
            <Toaster />

            {!isConnected ? (
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100vh"
                    color="white"
                >
                <Heading as="h2">Connect your wallet</Heading>
                </Box>
            ) : isMobile && isLandscape ? (
                <RotateDeviceMessage />
            ) : (

                <Box
                    w="100%"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="left"
                    position="relative"
                    mt={"50px"}
                    // border="1px solid red"
                    mb={"15%"}
                >
                 {isAddress(vaultAddress) ? (
                    isMobile ? (
                        <Flex direction="column">
                        <Box mt={10} ml={-20}>
                            <BalanceCard 
                                ethBalance={ethBalance}
                                token0Balance={token0Info?.balance} 
                                token0Symbol={token0Info?.tokenSymbol} 
                                token1Symbol={token1Info.tokenSymbol} 
                                token1Balance={token1Info?.balance}
                                setIsLoading={setIsLoading}
                                isLoading={isLoading}
                                isTokenInfoLoading={isTokenInfoLoading}
                                isWrapping={isWrapping}
                                setIsWrapping={setIsWrapping}
                                isUnwrapping={isUnwrapping}
                                setIsUnwrapping={setIsUnwrapping}
                                setWrapAmount={setWrapAmount}
                                wrapAmount={wrapAmount}
                                vaultAddress={vaultAddress} 
                                page="stake"
                            />
                        </Box>
                        <Box p={4} pb={4} mt={5} w="380px" ml={"-75px"} border="1px solid gray" borderRadius={10} backgroundColor={"#222831"} >
                        <Text fontSize={"xs"} fontWeight={"bold"} color="#a67c00">Active Position</Text>
                        <SimpleGrid columns={5} mt={-5} fontSize={"11px"}>
                            <Box h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> Staked </Box>
                            <Box h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> {isTokenInfoLoading ? <Spinner size="xs" mt={1}/> : `s${token0Info.tokenSymbol}`} </Box>
                            <Box h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> Rewards </Box>
                            <Box h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> APR</Box>
                            <Box h="20px" px={2} color="white" backgroundColor={"#bf9b30"}> Actions </Box> 
                            {stakedBalance > 0 ? ( 
                                <>
                                <Box px={2}> 
                                    <HStack mt={2} >
                                        <Box  fontSize="xs">
                                        <Text fontSize="xs">{formatNumberPrecise(formatEther(`${stakedBalance || 0}`), 2)}</Text>
                                        </Box>
                                        <Box ml={-1} fontSize="xx-small">
                                        {isTokenInfoLoading ? <Spinner size="xs" /> :  <Text fontSize="xs">{token0Info.tokenSymbol}</Text>}
                                        </Box>
                                    </HStack>
                                </Box>
                                <HStack>
                                <Box px={2}>
                                    <Text fontSize="xs">{formatNumberPrecise(formatEther(`${sNomaBalance || 0}`), 2)}</Text>
                                </Box>
                                <Box  fontSize="xx-small" ml={-3}>
                                    {isTokenInfoLoading ? <Spinner size="xs" mt={1}/> : <Text fontSize="xs" >s{token0Info.tokenSymbol}</Text>}
                                </Box> 
                                </HStack>                               
                                <Box px={2} >     
                                    <HStack>
                                        <Box mt={2}  fontSize="xs">
                                        {commify(rewards, 2)}
                                        </Box>
                                        <Box  fontSize="xx-small" ml={-2} mt={2}>
                                            {isTokenInfoLoading ? <Spinner size="xs" mt={1}/> : <Text fontSize="xs" >&nbsp;{token0Info.tokenSymbol}</Text>}
                                        </Box> 
                                    </HStack>
                                </Box>
                                <Box px={2} mt={2}>
                                    {0}%
                                </Box>
                                <Box px={2}  mt={2} ml={-10}> 
                                <Button 
                                    h={"25px"}  
                                    borderColor={"#a67c00"} 
                                    variant="outline" 
                                    ml={5} 
                                    onClick={() => handleUnstake()}  
                                    disabled={isUnstaking} 
                                    w={"80px"}
                                    
                                >
                                    {isUnstaking ? <Spinner size="xs" color="#a67c00" /> : <Text fontSize={"xs"} color="#a67c00">Unstake</Text>}
                                </Button>
                                </Box>

                                </>
                            ) : (
                                <>
                                <Box p={2}>
                                No Data
                                </Box>
                                <Box>
                                <Box></Box>
                                </Box>
                                <Box>
                                </Box>
                                <Box></Box>
                                </>
                            )}                                

                        </SimpleGrid>                         
                        </Box>

                        <Box p={2} px={4} mt={5} ml={"-75px"} w="380px"   border="1px solid gray" borderRadius={10} backgroundColor={"#222831"} >
                            <Text fontSize={"xs"} fontWeight={"bold"} color="#a67c00">New Position</Text>
                            <SimpleGrid columns={2} w="340px" mt={-5} fontSize={"14px"}>
                                <Box w="340px" backgroundColor={"#bf9b30"}  mb={2}>
                                    <Text fontSize="xs">&nbsp;<b>Amount</b></Text>
                                </Box>
                                <Box backgroundColor={"#bf9b30"} mb={2}>
                                    <Text fontSize="xs" ml={10}>Actions</Text>
                                </Box>
                                <Box w="auto">
                                    <HStack>
                                        <Box w="auto">
                                        <NumberInputRoot
                                            isMobile={isMobile}
                                            min={0}
                                            mt={1}
                                            max={999999999}
                                            step={0.1}
                                            onChange={handleSetAmountToStake}
                                            ml={isMobile ? 0 : 1.5}
                                            marginRight={"5px"}
                                            value={stakeAmount}
                                            setTokenSupply={(() => {})}
                                            setPrice={setStakeAmount}
                                            setFloorPrice={(() => {})}
                                            h="25px"
                                        >
                                            <NumberInputLabel h={"25px"} w={{ base: "", lg: "auto" }} />
                                            <NumberInputField h={"25px"} w={{ base: "", lg: "200px" }} />
                                        </NumberInputRoot>
                                        </Box>
                                        <Box mt={2}>
                                            <Image src={placeholderLogo} w="25px"></Image>
                                        </Box>
                                    </HStack>
                                        <HStack mt={5} ml={2}>
                                        <Box>
                                            <Text fontSize="xs">Staking:</Text>
                                        </Box>
                                        <Box>
                                            <HStack>
                                                <Box w="auto"><Text fontSize="xs">{formatNumberPrecise(stakeAmount, 4)} </Text></Box>
                                                <Box fontSize="xs">{isTokenInfoLoading ? <Spinner size="xs" /> : token0Info.tokenSymbol}</Box>
                                            </HStack>
                                        </Box>
                                        </HStack>
                                        {/* <Box mt={5}>
                                            <Text fontWeight={"bold"} color="gray">Collateral required</Text>
                                        </Box>
                                        <Box>
                                            <Text>{commify(collateral || 0)} {token0Info.tokenSymbol}</Text>
                                        </Box>
                                        <Box mt={5}>
                                        <HStack>
                                            <Box> <Text fontWeight={"bold"} color="gray">Loan Fees</Text>    </Box>
                                            <Box><Image src={placeholderLogo} w={15}></Image></Box>
                                        </HStack>
                                        </Box>
                                        <Box>
                                            <Text>{commifyDecimals(formatEther(`${1 || 0}`), 6)} {token1Info.tokenSymbol}</Text>
                                        </Box>
                                        <Box mt={5}> 
                                            <HStack>
                                                <Box><Text fontWeight={"bold"} color="gray">IMV</Text> </Box>
                                                <Box>{commifyDecimals(formatEther(`${1 || 0}`) || 0, 4)}</Box>
                                                <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}/{token1Info?.tokenSymbol}</Box>
                                            </HStack>
                                        </Box>  */}
                                </Box>
                                <Box>
                                {/* <SelectRoot
                                    mt={1}
                                    ml={isMobile?25:55}
                                    collection={durationChoices}
                                    size="sm"
                                    width={isMobile?"180px":"110px"}
                                    onChange={handleSetDuration}
                                    value={duration}
                                    >
                                    <SelectTrigger>
                                        {durationChoices.items.map((data, index) => {
                                            if (index > 0) return;
                                            return (
                                                <SelectValueText placeholder={data.label}>
                                                </SelectValueText>
                                            );
                                            })}       
                                    </SelectTrigger>
                                    <SelectContent>
                                        {durationChoices.items.map((choice) => (
                                            <SelectItem item={choice} key={choice.value}>
                                                {choice.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectRoot> */}
                                    <Button 
                                        mt={1} 
                                        h={"25px"}  
                                        borderColor={"#a67c00"} 
                                        variant="outline" 
                                        ml={10} 
                                        onClick={() => handleStake()}  
                                        disabled={isLoading || stakeAmount == 0} 
                                        w={"120px"}
                                    >
                                        {isStaking ? <Spinner size="sm" color="#a67c00" /> : <Text fontSize={"13px"} color="#a67c00">Stake</Text>}
                                    </Button>
                                </Box>
                            </SimpleGrid>                        
                        </Box>                           
                        </Flex>
                    ) : ( 
                    <Box>                       
                    <Grid
                        h="600px"
                        templateRows="repeat(2, 1fr)"
                        templateColumns="repeat(2, 1fr)"
                        gap={10}
                        mb={20}
                        mt={10}
                        p={4}

                    >
                        <GridItem border={"1px solid white"} p={4} ml={20}  backgroundColor={"#222831"} borderRadius={10}>
                            <Text fontSize={"14px"} fontWeight={"bold"} color="#a67c00">Active Position</Text>
                            <SimpleGrid columns={5} mt={-5} fontSize={"14px"}>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Staked </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> {isTokenInfoLoading ? <Spinner size="xs" /> : `s${token0Info.tokenSymbol}`} </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Rewards </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> APR</Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Actions </Box> 
                                {stakedBalance > 0 ? ( 
                                    <>
                                    <Box px={2} mt={2}> 
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {formatNumberPrecise(formatEther(`${stakedBalance || 0}`), 4)}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2}>
                                        {formatNumberPrecise(formatEther(`${sNomaBalance || 0}`), 6)}
                                    </Box>
                                    <Box px={2} mt={2}>     
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {commify(rewards, 4)}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2}>
                                        {0}%
                                    </Box>
                                    <Box px={2}  mt={2} ml={-10}> 
                                    <Button 
                                        h={"25px"}  
                                        borderColor={"#a67c00"} 
                                        variant="outline" 
                                        ml={10} 
                                        onClick={() => handleUnstake()}  
                                        disabled={isUnstaking} 
                                        w={"120px"}
                                        
                                    >
                                        {isUnstaking ? <Spinner size="sm" color="#a67c00" /> : <Text fontSize={"13px"} color="#a67c00">Unstake</Text>}
                                    </Button>
                                    </Box>

                                    </>
                                ) : (
                                    <>
                                    <Box p={2}>
                                    No Data
                                    </Box>
                                    <Box>
                                    <Box></Box>
                                    </Box>
                                    <Box>
                                    </Box>
                                    <Box></Box>
                                    </>
                                )}                                

                            </SimpleGrid>
                        </GridItem>
                        <GridItem>
                            <BalanceCard 
                                ethBalance={ethBalance}
                                token0Balance={token0Info?.balance} 
                                token0Symbol={token0Info?.tokenSymbol} 
                                token1Symbol={token1Info.tokenSymbol} 
                                token1Balance={token1Info?.balance}
                                // deposit={deposit}
                                // withdraw={withdraw}
                                setIsLoading={setIsLoading}
                                isLoading={isLoading}
                                isTokenInfoLoading={isTokenInfoLoading}
                                isWrapping={isWrapping}
                                setIsWrapping={setIsWrapping}
                                isUnwrapping={isUnwrapping}
                                setIsUnwrapping={setIsUnwrapping}
                                setWrapAmount={setWrapAmount}
                                wrapAmount={wrapAmount}
                                vaultAddress={vaultAddress}
                                page="borrow" 
                            />
                        </GridItem>
                        <GridItem border={"1px solid white"} p={4} ml={20}  backgroundColor={"#222831"} borderRadius={10}>
                        <Text fontSize={"14px"} fontWeight={"bold"} color="#a67c00">New Position</Text>
                        <SimpleGrid columns={2} w="700px" mt={-5} fontSize={"14px"}>
                            <Box w="500px" backgroundColor={"#bf9b30"}  mb={2}>
                                <Text>&nbsp;<b>Amount</b></Text>
                            </Box>
                            <Box backgroundColor={"#bf9b30"} mb={2}>
                                <Text ml={5}>Actions</Text>
                            </Box>
                            <Box w="auto">
                                <HStack>
                                    <Box w="auto">
                                    <NumberInputRoot
                                        isMobile={isMobile}
                                        min={0}
                                        max={999999999}
                                        step={0.1}
                                        onChange={handleSetAmountToStake}
                                        ml={isMobile ? 0 : 1.5}
                                        marginRight={"5px"}
                                        value={stakeAmount}
                                        setTokenSupply={(() => {})}
                                        setPrice={setStakeAmount}
                                        setFloorPrice={(() => {})}
                                        h="25px"
                                    >
                                        <NumberInputLabel h={"38px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"38px"} w={{ base: "", lg: "200px" }} />
                                    </NumberInputRoot>
                                    </Box>
                                    <Box mt={2}>
                                        <Image src={placeholderLogo} w="25px"></Image>
                                    </Box>
                                </HStack>
                                    <HStack mt={5} ml={2}>
                                    <Box>
                                        <Text>Staking:</Text>
                                    </Box>
                                    <Box>
                                        <HStack>
                                            <Box w="auto"><Text>{formatNumberPrecise(stakeAmount, 4)} </Text></Box>
                                            <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info.tokenSymbol}</Box>
                                        </HStack>
                                    </Box>
                                    </HStack>
                                    {/* <Box mt={5}>
                                        <Text fontWeight={"bold"} color="gray">Collateral required</Text>
                                    </Box>
                                    <Box>
                                        <Text>{commify(collateral || 0)} {token0Info.tokenSymbol}</Text>
                                    </Box>
                                    <Box mt={5}>
                                       <HStack>
                                        <Box> <Text fontWeight={"bold"} color="gray">Loan Fees</Text>    </Box>
                                        <Box><Image src={placeholderLogo} w={15}></Image></Box>
                                       </HStack>
                                    </Box>
                                    <Box>
                                        <Text>{commifyDecimals(formatEther(`${1 || 0}`), 6)} {token1Info.tokenSymbol}</Text>
                                    </Box>
                                    <Box mt={5}> 
                                        <HStack>
                                            <Box><Text fontWeight={"bold"} color="gray">IMV</Text> </Box>
                                            <Box>{commifyDecimals(formatEther(`${1 || 0}`) || 0, 4)}</Box>
                                            <Box>{isTokenInfoLoading ? <Spinner size="sm" /> : token0Info?.tokenSymbol}/{token1Info?.tokenSymbol}</Box>
                                        </HStack>
                                    </Box>  */}
                            </Box>
                            <Box>
                            {/* <SelectRoot
                                mt={1}
                                ml={isMobile?25:55}
                                collection={durationChoices}
                                size="sm"
                                width={isMobile?"180px":"110px"}
                                onChange={handleSetDuration}
                                value={duration}
                                >
                                <SelectTrigger>
                                    {durationChoices.items.map((data, index) => {
                                        if (index > 0) return;
                                        return (
                                            <SelectValueText placeholder={data.label}>
                                            </SelectValueText>
                                        );
                                        })}       
                                </SelectTrigger>
                                <SelectContent>
                                    {durationChoices.items.map((choice) => (
                                        <SelectItem item={choice} key={choice.value}>
                                            {choice.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectRoot> */}
                                <Button 
                                    mt={1} h={"30px"}  
                                    borderColor={"#a67c00"} 
                                    variant="outline" ml={5} 
                                    onClick={() => handleStake()}  
                                    disabled={isLoading || stakeAmount == 0} w={"120px"}
                                >
                                    {isStaking ? <Spinner size="sm" color="#a67c00" /> : <Text fontSize={"13px"} color="#a67c00">Stake</Text>}
                                </Button>
                            </Box>
                        </SimpleGrid>

                        </GridItem>
                    </Grid>
                    </Box>
                     )
                ) : (
                    <>Empty</>
                )} 
                </Box>  
            )}

        </Container>
    )
}

export default Stake;