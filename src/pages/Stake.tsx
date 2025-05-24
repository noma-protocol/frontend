import React, { useState, useEffect } from 'react';
import { Input, Image, Flex, Container, Heading, HStack, Box, Grid, GridItem, Button, Spinner, Text, createListCollection, SimpleGrid, NumberInput, VStack } from "@chakra-ui/react";
import { ethers } from 'ethers';
import { isMobile } from "react-device-detect";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
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
import { commify, commifyDecimals, getDaysLeft, calculateExpiryDate, getContractAddress } from '../utils';
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

const { formatEther, parseEther, isAddress } = ethers.utils;
const { JsonRpcProvider } = ethers.providers;

const localProvider = new JsonRpcProvider("http://localhost:8545");

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
const nomaFactoryAddress = getContractAddress(addresses, "1337", "Factory");
const modelHelperAddress = getContractAddress(addresses, "1337", "ModelHelper");

const Stake = () => {
    const { address, isConnected } = useAccount();
    const [searchParams] = useSearchParams();

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

    useEffect(() => {

        const fetchVaultDescription = async () => {
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
            
            setVaultDescription(plainVaultDescription);

            setToken0(plainVaultDescription.token0);
            setToken1(plainVaultDescription.token1);
        }
    
        fetchVaultDescription();
    }, [vaultAddress]);

    useEffect(() => {
        const interval  = setInterval(() => {
            const fetchEthBalance = async () => {
                const ethBalance = await localProvider.getBalance(address);
                setEthBalance(ethBalance);
            };

            fetchEthBalance();
        }, 3000);

        return () => clearInterval(interval);
    }, [address]);

    useEffect(() => {
        
        const interval = setInterval(() => {
            const fetchTokenInfo = async (tokenAddress) => {
            setIsTokenInfoLoading(true);

            const tokenContract = new ethers.Contract(
                tokenAddress,
                ERC20Abi,
                localProvider
            );

            const tokenName = await tokenContract.name();
            const tokenSymbol = await tokenContract.symbol();
            const tokenDecimals = await tokenContract.decimals();
            
            const balance = await tokenContract.balanceOf(address);

            setIsTokenInfoLoading(false);
            return { tokenName, tokenSymbol, tokenDecimals, balance };
            };

            fetchTokenInfo(token0).then((data) => {
                // console.log({data})
                setToken0Info(data);
            });

            fetchTokenInfo(token1).then((data) => {
                // console.log({data})
                setToken1Info(data);
            });

        }, 3000);

        return () => clearInterval(interval);    
    } , [token0, token1]);

    useEffect(() => {

        const fetchTokenInfo = async (tokenAddress) => {
            setIsTokenInfoLoading(true);

            const tokenContract = new ethers.Contract(
                tokenAddress,
                ERC20Abi,
                localProvider
            );

            const tokenName = await tokenContract.name();
            const tokenSymbol = await tokenContract.symbol();
            const tokenDecimals = await tokenContract.decimals();
            
            const balance = await tokenContract.balanceOf(address);

            setIsTokenInfoLoading(false);
            return { tokenName, tokenSymbol, tokenDecimals, balance };
        };


        const nomaFactoryContract = new ethers.Contract(
            nomaFactoryAddress,
            NomaFactoryAbi,
            localProvider
        );

        const interval = setInterval(() => {

            const fetchVaultInfo = async () => {
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
                };

                fetchTokenInfo(plainVaultDescription.token0).then((data) => {
                    // console.log({data})
                    setToken0Info(data);
                    setToken0(plainVaultDescription.token0);
                });
        
                fetchTokenInfo(plainVaultDescription.token1).then((data) => {
                    // console.log({data})
                    setToken1Info(data);
                    setToken1(plainVaultDescription.token1);
                });
            }

            fetchVaultInfo();

            }
        , 3000);

        return () => clearInterval(interval);

    }, [vaultAddress]);

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
            setIsRepaying(false);

            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
        }
    });
    
    const handleSetAmountToStake = (e) => {
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

                >
                {/* {isAddress(vaultAddress) ? (
                    isMobile ? (
                        <Flex direction="column">
                        <Box ml={-10}>
                        <BalanceCard 
                            ethBalance={ethBalance}
                            token0Balance={token0Info?.balance} 
                            token0Symbol={token0Info?.tokenSymbol} 
                            token1Symbol={token1Info.tokenSymbol} 
                            token1Balance={token1Info?.balance}
                            deposit={deposit}
                            withdraw={withdraw}
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
                        </Box>
                        </Flex>
                    ) : ( */}
                    <Box>
                    {/* <Heading as="h2">
                        Stake
                    <Text fontSize="md">
                        Stake your tokens to obtain rewards
                    </Text> 
                    </Heading> */}                        
                    <Grid
                        h="600px"
                        templateRows="repeat(2, 1fr)"
                        templateColumns="repeat(2, 1fr)"
                        gap={10}
                        mb={20}
                        mt={10}
                        p={4}
                        // border="1px solid yellow"

                    >
                        <GridItem border={"1px solid white"} p={4} ml={20}  backgroundColor={"#222831"} borderRadius={10}>
                            <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"}>Active Position</Text>
                            <SimpleGrid columns={5} mt={-5}>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Staked </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> s{token0Info.tokenSymbol} </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Rewards </Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> APR</Box>
                                <Box px={2} color="white" backgroundColor={"#bf9b30"}> Actions </Box> 
                                {stakedBalance > 0 ? ( 
                                    <>
                                    <Box px={2} mt={2}> 
                                        <HStack>
                                            <Box  fontSize="sm">
                                            {commify(formatEther(`${stakedBalance || 0}`))}
                                            </Box>
                                            <Box  fontSize="xx-small">
                                            {token0Info.tokenSymbol}
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box px={2} mt={2}>
                                        {commify(formatEther(`${sNomaBalance || 0}`), 8)}
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
                                        h={"30px"}  
                                        borderColor={"#a67c00"} 
                                        variant="outline" 
                                        ml={10} 
                                        onClick={() => handleUnstake()}  
                                        disabled={isUnstaking} 
                                        w={"120px"}
                                    >
                                        {isUnstaking ? <Spinner size="sm" color="cyan" /> : <Text color="white">Unstake</Text>}
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
                        <Text fontSize={isMobile?"12px":"15px"} fontWeight={"bold"}>New Position</Text>
                        <SimpleGrid columns={3} w="700px" mt={-5}>
                            <Box w="500px" backgroundColor={"#bf9b30"}  mb={2}>
                                <Text>&nbsp;<b>Amount</b></Text>
                            </Box>
                            <Box  >
                                <Text ml="40px">&nbsp;&nbsp;&nbsp;<b>Duration</b></Text>
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
                                    >
                                        <NumberInputLabel h={"38px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"38px"} w={{ base: "", lg: "200px" }} />
                                    </NumberInputRoot>
                                    </Box>
                                    <Box>
                                        <Image src={placeholderLogo} w="25px"></Image>
                                    </Box>
                                </HStack>
                                    <HStack mt={5}>
                                    <Box>
                                        <Text>Staking:</Text>
                                    </Box>
                                    <Box>
                                        <HStack>
                                            <Box w="auto"><Text>{commify(stakeAmount)} </Text></Box>
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
                            </Box>
                            <Box>
                                <Button 
                                    mt={1} h={"30px"}  
                                    borderColor={"#a67c00"} 
                                    variant="outline" ml={5} 
                                    onClick={() => handleStake()}  
                                    disabled={isLoading} w={"120px"}
                                >
                                    {isStaking ? <Spinner size="sm" color="#a67c00" /> : <Text color="white">Stake</Text>}
                                </Button>
                            </Box>
                        </SimpleGrid>

                        </GridItem>
                    </Grid>
                    </Box>
                    {/* )
                ) : (
                    <>Empty</>
                )} */}
                </Box>  
            )}

        </Container>
    )
}

export default Stake;