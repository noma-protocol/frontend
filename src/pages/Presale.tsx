import React, { useEffect, useState } from "react";
import {
  Container,
  VStack,
  Box,
  SimpleGrid,
  HStack,
  Heading,
  Image,
  Text,
  Button,
  Flex,
  Textarea,
  Spinner
} from "@chakra-ui/react";
import { useAccount, useBalance, useContractRead, useContractWrite } from "wagmi";
import { isMobile } from "react-device-detect";
import { Slider } from "../components/ui/slider"
import {
  StatRoot,
  StatLabel,
  StatValueText,
} from "../components/ui/stat";
import {
  NumberInputField,
  NumberInputLabel,
  NumberInputRoot,
} from "../components/ui/number-input"

import { Toaster, toaster } from "../components/ui/toaster"
import { useSearchParams } from "react-router-dom"; // Import useSearchParams

import { commify, commifyDecimals, generateBytes32String, getContractAddress, generateReferralCode } from "../utils";
import Logo from "../assets/images/noma_logo_transparent.png";
import { ethers } from "ethers"; // Import ethers.js
import { ProgressLabel, ProgressBar, ProgressRoot, ProgressValueText } from "../components/ui/progress"
import PresaleDetails from "../components/PresaleDetails";
import usePresaleContract from '../hooks/usePresaleContract';

import metamaskLogo from "../assets/images/metamask.svg";
import placeholderLogo from "../assets/images/question.svg";
import config from '../config'; 
import bnbLogo from "../assets/images/bnb.png";

import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import { Badge } from "reactstrap";

const { formatEther, parseEther } = ethers.utils;

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesMonad;

const tokenAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Proxy");

const { environment, presaleContractAddress } = config;

const PresaleArtifact = await import(`../assets/Presale.json`);
const PresaleAbi = PresaleArtifact.abi;

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const Presale: React.FC = () => {
  const { address, isConnected } = useAccount();
  // Parse the referral code from the URL
  const [searchParams] = useSearchParams();
  const urlReferralCode = searchParams.get("r") || ""; // Fallback to empty string
  const contractAddress = searchParams.get("a") || ""; // Fallback to empty string

  // console.log(`Referral code from URL: ${urlReferralCode}`);

  useEffect(() => {
    if (contractAddress == "0x0000000000000000000000000000000000000000") {
      window.location.href = "https://oikos.cash"
    }

  }, [contractAddress]);
    
  // State for contribution and presale data
  const [timeLeft, setTimeLeft] = useState("00:00:00"); // Example default

  const [allowance, setAllowance] = useState(0);
  const [contributionAmount, setContributionAmount] = useState("");
  const [tokensPurchased, setTokensPurchased] = useState(0);
  const [targetDate, setTargetDate] = useState(""); // 24 hours from now

  const [referralCode, setReferralCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressSc, setProgressSc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const presaleUrl = `${environment == "development" ? 
    `http://localhost:5173/presale?a=${contractAddress}r=${referralCode}`:
    "https://presale.oikos.cash"}/presale?a=${contractAddress}r=${referralCode}`;
  

  const AddToMetaMaskButton = ({ contractAddress, tokenSymbol, tokenDecimals }) => {
    const addTokenToMetaMask = async () => {
      try {
        // Create a provider using MetaMask's injected web3 provider
        if (typeof window.ethereum !== 'undefined') {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
  
          // Get the contract interface and ABI (replace with your token's ABI)
          const tokenABI = [
            "function name() public view returns (string memory)",
            "function symbol() public view returns (string memory)",
            "function decimals() public view returns (uint8)",
            "function totalSupply() public view returns (uint256)",
            "function balanceOf(address account) public view returns (uint256)",
            "function transfer(address recipient, uint256 amount) public returns (bool)",
          ];
          
          // Create a contract instance
          const tokenContract = new ethers.Contract(contractAddress, tokenABI, signer);
  
          // Get the token details
          const name = await tokenContract.name();
          const symbol = await tokenContract.symbol();
          const decimals = await tokenContract.decimals();
  
          // Prepare the token information for MetaMask
          const formattedSymbol = tokenSymbol || symbol;
          const formattedDecimals = tokenDecimals || decimals;
  
          const hexValue = ethers.utils.parseUnits('1', formattedDecimals);
  
          // Add the token to MetaMask
          await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contractAddress,
                symbol: formattedSymbol,
                decimals: formattedDecimals,
                image: `https://example.com/token-logo.png`, // Replace with your token logo URL
              },
            },
          });
        } else {
          console.error("MetaMask is not installed.");
        }
      } catch (error) {
        console.error(error);
      }
    };
  
    return (
      <Button onClick={addTokenToMetaMask} 
        variant={"outline"}
        fontSize={isMobile ? 9 : 11}
        mt={isMobile ? 2 : 5}
        border={"1px solid white"}
        w={"150px"}
      >
        &nbsp;Add to MetaMask
        <Image src={metamaskLogo} w={15} mt={-1} />
      </Button>
    );
  };
  
  
  const handleCopy = () => {
    navigator.clipboard.writeText(presaleUrl).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000); // Reset after 2 seconds
    });
  };

  const handleAddAmount = () => {
    // Default to 0 if empty or not a number
    const currentAmount = contributionAmount === "" || isNaN(parseFloat(contributionAmount))
      ? 0
      : parseFloat(contributionAmount);

    const number = (currentAmount + 0.001).toFixed(4);
    if (number > 5) {
      return;
    }
    setContributionAmount(number);
  }

  const handleSubtractAmount = () => {
    // Default to 0 if empty or not a number
    const currentAmount = contributionAmount === "" || isNaN(parseFloat(contributionAmount))
      ? 0
      : parseFloat(contributionAmount);

    const number = (currentAmount - 0.001).toFixed(4);
    if (number <= 0) {
      return;
    }
    setContributionAmount(number);
  }
  
    const {
      data: tokenBalancePresale
    } = useContractRead({
      address: tokenAddress,
      abi: ERC20Abi,
      functionName: "balanceOf",
      args: [contractAddress],
      watch: true,
    });

    // console.log(`Token balance in presale contract is ${tokenBalancePresale}`);
    
    const {
      data: presaleInfo
    } = useContractRead({
      address: contractAddress,
      abi: PresaleAbi,
      functionName: "getPresaleParams",
    });

    // console.log(presaleInfo);

  const {
    data: tokenBalance, refetch: refetchTokenBalance
  } = useContractRead({
    address: contractAddress,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [address],
    watch: true,
  });

  const {
    data: tokenName
  } = useContractRead({
    address: contractAddress,
    abi: ERC20Abi,
    functionName: "name",
    args: [],
  });

  const {
    data: tokenSymbol
  } = useContractRead({
    address: contractAddress,
    abi: ERC20Abi,
    functionName: "symbol",
    args: [],
  });

  // console.log(`Token balance is ${tokenBalance} token name is ${tokenName} token symbol is ${tokenSymbol}`);

  let { 
    totalRaised,
    participantCount,
    finalized,
    softCapReached,
    contributions,
    totalReferred,
    referralCount,
    softCap,
    hardCap,
    initialPrice,
    deployer,
    timeLeftInSeconds,
    hasExpired,
    currentTimestamp
  } = usePresaleContract(
    "ganache",
    address,
    contractAddress,
    urlReferralCode
  );

  // console.log(`Initial price is ${initialPrice} hasExpired ${hasExpired} currentTimestamp ${currentTimestamp}`);
  // console.log(`Token balance is ${tokenBalance} token name is ${tokenName} token symbol is ${tokenSymbol} timeLeft ${timeLeftInSeconds}`);

  const { refetch: fetchPresaleInfo } = 
  usePresaleContract(
    "ganache",
    address,
    urlReferralCode
  );

   contributions = Number(formatEther(contributions)).toFixed(4);
    // console.log(`Contributions is ${contributions}`);

  //  console.log({ 
  //   totalRaised, 
  //   participantCount, 
  //   finalized, 
  //   softCapReached, 
  //   contributions, 
  //   totalReferred, 
  //   referralCount, 
  //   progress 
  // });

  const balance =  useBalance({
    address: address,
  });
  
  const { refetch: refetchBalance } = useBalance({
    address: address,
  });

  const presaleData = {
    isMobile,
    balance,
    initialPrice,
    contributions,
    contributionAmount,
    tokensPurchased,
    Logo,
    tokenSymbol
};

  const {
    isLoading: contributing,
    write: deposit
  } = useContractWrite({
    address: contractAddress,
    abi: PresaleAbi,
    functionName: "deposit",
    args: [generateBytes32String("0")],
    value: contributionAmount && parseFloat(contributionAmount) > 0 ? parseEther(contributionAmount.toString()) : undefined,
    onSuccess(data) {
      console.log(`transaction successful: ${data.hash} referral code: ${urlReferralCode}`);
      refetchBalance();
      fetchPresaleInfo();
      toaster.create({
        title: "Success",
        description: "Thanks for contributing!",
      })
      setTimeout(() => {
        window.location.reload();
      }, 4000); // 3000ms = 3 seconds
    },
    onError(error) {
      const msg = error.message.indexOf("PresaleOngoing") > -1 ? "The presale is ongoing" :
                  error.message.indexOf("PresaleEnded") > -1 ? "The presale has ended" :
                  error.message.indexOf("exceeds the balance of the account") > -1 ? "Insufficient balance" : 
                  error.message.indexOf("Already contributed") > -1 ? "Already contributed" : 
                  error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
      toaster.create({
        title: "Error",
        description: msg,
      })
      console.log(error)
      console.error("failed:", error);
    }
  });

  const {
    write: finalize 
  } = useContractWrite({
    address: contractAddress,
    abi: PresaleAbi,
    functionName: "finalize",
    onSuccess(data) {
        console.log(`transaction successful: ${data.hash}`);
        setIsLoading(false);
        fetchPresaleInfo();
        toaster.create({
          title: "Success",
          description: "Presale finalized!",
        })
        setTimeout(() => {
          window.location.reload();
        }, 4000); // 3000ms = 3 seconds      
      },
      onError(error) {
        setIsLoading(false);
        const msg = error.message.indexOf("WithdrawNotAllowedYet") > -1 ? "Withdraw not allowed yet" :
                    error.message.indexOf("InvalidParameters") > -1 ? "Invalid parameters" :
                    error.message.indexOf("HardCapExceeded") > -1 ? "Hard cap exceeded" :
                    error.message.indexOf("SoftCapNotMet") > -1 ? "Soft cap not met" :
                    error.message.indexOf("PresaleOngoing()") > -1 ? "Presale not yet ended" :
                    error.message.indexOf("AlreadyFinalized") > -1 ? "Presale already finalized" : error.message;
        toaster.create({
          title: "Error",
          description: msg,
        })
        console.log(error)
        console.error("failed:", error);
      }
  });

  const {
    write: withdraw 
  } = useContractWrite({
    address: contractAddress,
    abi: PresaleAbi,
    functionName: "withdraw",
    onSuccess(data) {
      console.log(`transaction successful: ${data.hash}`);
      fetchPresaleInfo();
      toaster.create({
        title: "Success",
        description: "Withdrawal successful!",
      })
      setTimeout(() => {
        window.location.reload();
      }, 4000); // 3000ms = 3 seconds  
    },
    onError(error) {
      setIsLoading(false);
      console.error("failed:", error);
      toaster.create({
        title: "Error",
        description: error.message,
      })
    }
  });

  useEffect(() => {
    const progress = (totalRaised / hardCap) * 100;
    const progressSc = (totalRaised / softCap) * 100;

    setProgress(progress);
    setProgressSc(progressSc);
  }
  , [totalRaised, softCap, hardCap]);

  useEffect(() => {
    const now = Date.now(); // Get the current timestamp in milliseconds
    const newTimestamp = now + Number(timeLeftInSeconds) * 1000; // Add 30 days in milliseconds
    const newDate = new Date(newTimestamp);

    // console.log(newDate.toISOString()); // Outputs the new date in ISO format
    setTargetDate(newDate.toISOString());
  }
  , [timeLeftInSeconds]);

  // useEffect(() => {
  //   // const fetchReferralCode = async () => {
  //   //   if (!isConnected || !address) return;

  //   //   try {
  //   //     const response = await fetch(`${environment == "development" ? "http://localhost:3000" : "https://referrals.oikos.cash"}/referral`, {
  //   //       method: 'POST',
  //   //       headers: {
  //   //         'Content-Type': 'application/json',
  //   //       },
  //   //       body: JSON.stringify({ address }),
  //   //     });

  //   //     const data = await response.json();

  //   //     if (response.ok) {
  //   //       setReferralCode(data.referralCode);
  //   //       setErrorMessage('');
  //   //     } else {
  //   //       setErrorMessage(data.error || 'An error occurred while fetching the referral code.');
  //   //     }
  //   //   } catch (error) {
  //   //     setErrorMessage('Failed to connect to the server. Please try again later.');
  //   //     console.error('Error fetching referral code:', error);
  //   //   }
  //   // };

  //   // fetchReferralCode();

  //   const referralCode = generateReferralCode(address);

  //   console.log(`Referral code is ${referralCode}`)

  //   setReferralCode(referralCode?.slice(0, 16)[0]);  

  // }, [isConnected, address]); // Run whenever isConnected or address changes 

  useEffect(() => {

    if (!targetDate || isNaN(new Date(targetDate).getTime())) {
      console.error("Invalid targetDate:", targetDate);
      return;
    }

    const targetTimestamp = new Date(targetDate).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = targetTimestamp - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft("00:00:00:00");
        hasExpired = true;
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(
        `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );

      
      // console.log(timeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);
  


  useEffect(() => {
    let tokensPurchased = tokenBalance || 0;
    if (tokensPurchased === 0 && contributionAmount !== "") {
        const contributionValue = parseFloat(contributionAmount);
        if (!isNaN(contributionValue) && contributionValue > 0 && initialPrice) {
          const cc = contributionValue / initialPrice;
          if (cc > 0) {
            tokensPurchased = parseEther((cc).toString());
            console.log(`Tokens purchased is ${tokensPurchased}`);
          }
        }
      }
    setTokensPurchased(Number(formatEther(tokensPurchased)).toFixed(4));
  }, [contributionAmount, tokenBalance, initialPrice]);

  const handleClickFinalize = async () => {
    setIsLoading(true);
    try {
      await finalize();
    } catch (error) {
      setIsLoading(false);
      console.error("Failed to finalize presale:", error);
    }
  };

//  console.log(`Contract address ${contractAddress}`)

  const handleWithdraw = async () => {
    setIsLoading(true);
    try {
      await withdraw();
    } catch (error) {
      setIsLoading(false);
      console.error("Failed to withdraw:", error);
    }
  }

    const handleSetContributionAmount = (e) => {
      const value = e.target.value;
      if (value === "") {
        setContributionAmount("");
      } else {
        // Allow input to start with "." by automatically prepending "0"
        const normalizedValue = value.startsWith('.') ? `0${value}` : value;
        const parsedValue = parseFloat(normalizedValue);

        // Check if it's a valid number
        if (!isNaN(parsedValue) && parsedValue >= 0) {
          setContributionAmount(normalizedValue);
        }
      }
    }

  const handleClickDeposit = async () => {
      deposit()
    }

    // console.log(`hard cap is ${hardCap} soft cap is ${softCap} x ${hardCap / 200} y ${hardCap / 25}`)

  return (
    <Container maxW="container.xl" p={2}>
      <Box
        // as="section"
        // p={{ base: "4vh", md: "8vh" }}
        // my={10}
        w="100%"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        textAlign="left"
        position="relative"
        mt={150}
      >
        {/* {!hasExpired || address == presaleInfo?.deployer ? ( */}
          <>
        <VStack spacing={8} w="full" px={4}>
          <Box w="full" maxW="1000px" ml={isMobile?0:"18%"}>
            {contractAddress != "0x0000000000000000000000000000000000000000" && contractAddress ? 
          <VStack spacing={4} w="full" align="center">
            {/* Content Box */}
            <Box
              w="full"
              maxW="1000px"
              p={4}
              // borderRadius="lg"
              // border="2px solid white"
              // bg="#2d2f33"
              boxShadow="lg"
            >
          {/* Welcome and Stats Section */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
            <Box 
              p={2} 
            >
              <HStack>
                <Box >
                  <Text fontSize="lg" color="white" >
                    Welcome
                  </Text>
                </Box>
                <Box>
                <Text fontSize={isMobile ? "sm": "lg"} fontWeight="bold" color="#f3b500">
                {address ? `${address.slice(0, 6)}...${address.slice(-6)}` : "Not connected"}
              </Text>
                </Box>
              </HStack>
               {presaleInfo?.deployer == address /*&& hasExpired*/ && !finalized ? (
                    <Box 
                      border="1px solid #a67c00" 
                      p={4} 
                      mt={5}               
                      w={"auto"} 
                      h="150px"
                      bgColor={"#222831"} borderRadius={10}
                      >
                      <Text color="#a67c00"><b>Admin Controls</b></Text>
                        <HStack>
                        <Button 
                          disabled={finalized}
                          onClick={handleClickFinalize}
                          variant={"outline"}
                          border="1px solid white"
                          borderRadius={10}
                          fontSize="sm"
                          w="100px">
                          {isLoading ? <Spinner size="sm" /> : "Finalize"}
                        </Button>                           
                        </HStack>
                    </Box>): <></>}
            </Box>
            <Box
              textAlign={{ base: "left", md: "right" }}
              h={"100%"}
              // border="1px solid white"
              display="flex"
              flexDirection="column"
              gap={5}
              pr={10}
              pl={5}
              ml={"5%"}
            >
            <Flex flexWrap="wrap" justifyContent="space-between" gap={4} mt={isMobile? 5:0} >
              <Box >
                <StatRoot>
                  <StatLabel fontSize="sm" lineHeight="5px">
                    Contributed
                  </StatLabel>
                  <StatValueText
                    value={totalRaised}
                    fontSize="md"
                    lineHeight="5px"
                    color="#f3b500"
                  />
                </StatRoot>
              </Box>

              <Box>
                <StatRoot>
                  <StatLabel fontSize="sm" lineHeight="5px">
                    # Contributors
                  </StatLabel>
                  <StatValueText fontSize="md" lineHeight="1px" value={participantCount} color="#f3b500" />
                </StatRoot>
              </Box>

              <Box>
                <StatRoot>
                  <StatLabel fontSize="sm" lineHeight="5px">
                    Time Left
                  </StatLabel>
                  <StatValueText w={"130px"} fontSize="md" lineHeight="5px" color="#f3b500">
                    {timeLeft}
                  </StatValueText>
                </StatRoot>
              </Box>
            <Box w={isMobile?"88%":"auto"} mt={5} >
              <ProgressRoot value={timeLeft != "00:00:00:00" ? progress : progressSc} max={100}  maxW="sm" size="lg">
                <HStack gap="5">
                  <Box mt={5} >
                    <ProgressLabel >Progress <br /> <br />

                    </ProgressLabel>
                  </Box>
                  <ProgressBar flex="1" defaultValue={0} />
                  <ProgressValueText >100%</ProgressValueText>
                </HStack>
              </ProgressRoot>

              <Flex  w="400px" mt={3} direction="column">
                <Box>
                  <HStack>
                  <Box w="80px"  ml={-2}>
                  <Text fontSize="sm" color="#a1a1aa">Hard Cap</Text>
                </Box>
                  <Box  w="120px">
                  <Text fontStyle="italic" color="#f3b500">
                     &nbsp;<b>{Number(progress).toFixed(2)}</b>%
                  </Text>
                  </Box>
                  <Box>
                {isMobile ? <></> :
                  <Text fontStyle="italic" color="gray" fontSize={"11px"}>
                  &nbsp;<b>({commify(Number(hardCap), 2)} BNB)</b>
                </Text>}
                  </Box>
                  </HStack>
                </Box>

                <Box mt={2}>
                <HStack >
                  <Box  w="80px" >
                    <Text fontSize="sm" color="#a1a1aa" ml={isMobile ? -2 : 0}>Soft Cap&nbsp;</Text>
                  </Box>
                  <Box  w="120px" ml={isMobile ? 0 : -2}>
                  <Text fontStyle="italic" color="#f3b500">
                     <b>{Number(progressSc).toFixed(2)}</b>%
                  </Text>
                  </Box>
                  <Box ml={2}>
                  {isMobile ? <></>:
                    <Text fontStyle="italic" color="gray" fontSize={"11px"}>
                    <b>({Number(softCap).toFixed(2)} BNB)</b>
                  </Text>}
                  </Box>
                  </HStack>
                </Box>
              </Flex>

            </Box>
            </Flex>
            </Box>
          </SimpleGrid>


            <Box mt={10} ></Box>
              <SimpleGrid columns={{ base: 1, md: 2 }}  gap={4}>
                  {contributions == 0 && !finalized ? (
                      <Box bg="#222831" border="1px solid white" p={2}  borderRadius={10}>
                      <StatRoot>
                        <StatLabel fontSize="sm" lineHeight="5px" ml={2} color="#f3b500">
                          Contribution Amount
                        </StatLabel>
                        <Text fontSize={13}  fontStyle={"italic"} m={2} mt={-2}>
                          Choose a contribution amount {isMobile?<br />:<></>} (min <Badge fontSize="sm">{commifyDecimals(hardCap / 200, 2)}</Badge> max <Badge fontSize="sm">{commify(hardCap / 25, 2)}</Badge> BNB)
                        </Text>
                      </StatRoot>
                      <HStack spacing={4} align="center" justify="center" mt={2}>
                      <VStack>
                        <Box ml={isMobile ? -6 : 0}>
                          <NumberInputRoot 
                            mt={5}
                            w={isMobile ? "140px": 60}
                            h={"40px"} 
                            resize={"none"} 
                            size="sm" 
                            variant="outline" 
                            value={contributionAmount}
                            marginRight={"5px"}
                            defaultValue={0}
                          >
                            <NumberInputField
                              h={'40px'}
                              defaultValue={hardCap}
                              onChange={(e) => {
                                  return handleSetContributionAmount(e);
                                }
                              }
                            />
                          </NumberInputRoot>
                        </Box>
                        <Box>
                        <Slider
                          step={(hardCap/200)/100}
                          defaultValue={[Number(hardCap)]}
                          variant="outline"
                          colorPalette={"yellow"}
                          w={{ base: "120px", sm: "120px", md: "220px", lg: "220px" }} // Responsive widths
                          marks={[
                            { value: (hardCap/200), label: commifyDecimals(hardCap / 200, 2).toString() },
                            { value: (hardCap/25), label: commify(hardCap / 25, 0).toString() },
                          ]}
                          min={Number(hardCap/200)}
                          max={Number(hardCap/25)}
                          mt="3%"
                          ml={isMobile ? -2 :0}
                          value={[contributionAmount > Number(hardCap/200) ? contributionAmount : Number(hardCap/200)]}
                          onValueChange={(e) => {
                            if (e.value < hardCap/200) {
                              return setContributionAmount(hardCap/200);
                            }
                            return setContributionAmount(e.value);
                        }}
                        />
                      <br />
                        </Box>  
                      </VStack>
                      {allowance === 0 ? (
                      <Box mt={-5}>
                      <VStack h={"100px"} p={2} w={"100px"} ml={4} mt={2}>
                        <HStack>
                        <Box>
                          <Button 
                            backgroundColor={"gray.900"}
                            variant={"outline"}
                            colorScheme="blue"
                            h={"40px"} 
                            borderRadius={10}
                            onClick={handleAddAmount}
                          >+</Button>
                        </Box>
                        <Box>
                          <Button 
                            backgroundColor={"gray.900"}
                            variant={"outline"}
                            colorScheme="blue"
                            h={"40px"} 
                            borderRadius={10}
                            onClick={handleSubtractAmount}
                          >-</Button>
                        </Box>
                        </HStack>
                        <Box>
                        <Button
                          ml={1}
                          variant={"outline"}
                          colorScheme="blue"
                          w={"100px"}
                          fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}
                          maxH={40}
                          backgroundColor={"gray.900"}
                          borderRadius={10}
                          disabled={!isConnected || !contributionAmount || parseFloat(contributionAmount) === 0 || contributing || balance == 0}
                          onClick={() => {
                            // if (contributionAmount < 0.25 || contributionAmount > 5) {
                            //   setErrorMessage("Contribution must be between 0.25 and 5 BNB.");
                            //   return;
                            // }
                            setErrorMessage(""); // Clear any previous error
                            handleClickDeposit();
                          }}
                        >
                        {contributing ? <Spinner size="sm" /> : "Deposit"}
                      </Button>
                      </Box>
                      </VStack>
                      <Toaster />
                      </Box>

                    ) : <></>}
                    </HStack>
                    </Box>): <></>}
                  {contributions == 0 && !finalized ? (
                    <>{isConnected ? <PresaleDetails {...presaleData} /> : 
                    <>
                      <Box bg="#222831" border="1px solid white" p={4}>
                        <Text fontSize="sm" color="white">
                          Connect your wallet to contribute
                        </Text>
                      </Box>
                    </>}</>
                ): <></>}
              </SimpleGrid>
            
            <Box 
              mt={3} 
              alignContent={"center"} 
              backgroundColor="#222831" 
              fontSize="sm" 
              lineHeight="tall" 
              p={4} 
              w={"auto"} 
              border="1px solid" 
              borderRadius={10}

            >
              <Box w={isMobile?"100%":"55%"} p={1}>
                {finalized ? (
                  <Text as="h4">
                    The presale has been finalized
                  </Text>
                ) : (
                  <></>
                )}
                
                {contributions > 0 ? (
                  <StatRoot mb={10}>
                  <StatLabel fontSize="sm" lineHeight="5px" color="#f3b500">
                    Contribution Details
                  </StatLabel>
                  <Box bg="#222831"  p={4}>
                  <HStack mt={"2px"} spacing={4}>
                  <Box w="100px">
                      <Text fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>Contributed</Text>
                  </Box>
                  <Box w={isMobile ? "69px" : "120px"}>
                      <Text
                          color="#f3b500"
                          fontWeight="bold"
                          fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                      >
                          {commify(contributions, 2)}
                      </Text>
                  </Box>
                  <Box w="auto">
                      <Image h={5} src={bnbLogo} />
                  </Box>
                  <Box w="auto">
                      <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                          &nbsp;BNB
                      </Text>
                  </Box>
              </HStack>

              <HStack mt={3} spacing={4} >
                  <Box w="100px">
                      <Text fontSize={{ base: "11px", sm: "11px", md: "14px", lg: "14px" }}>
                          {contributions === 0 ? "You get" : "Balance"}
                      </Text>
                  </Box>
                  <Box w={isMobile ? "69px" : "120px"}>
                      <Text
                          color="#f3b500"
                          fontWeight="bold"
                          fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}
                      >
                          {commify(tokensPurchased, 2)}
                      </Text>
                  </Box>
                  <Box w="auto" ml={1}>
                      <Image h={4} src={placeholderLogo} />
                  </Box>
                  <Box w="auto">
                      <Text fontWeight="bold" fontSize={{ base: "12px", sm: "12px", md: "14px", lg: "14px" }}>
                          &nbsp;{tokenSymbol}
                      </Text>
                  </Box>
              </HStack>
                  {isMobile ? 
                  <VStack alignItems={"left"} mt={2}>
                    {Number(tokensPurchased) > 0 && (
                      <>
                        <Box>
                          <Button
                            mt={5} 
                            w={"150px"}
                            disabled={!finalized}
                            onClick={() => {
                              withdraw();
                            }
                          }>
                            Withdraw
                          </Button>  
                        </Box>
                        <Box>
                          <AddToMetaMaskButton 
                            contractAddress={contractAddress} 
                          />
                        </Box>
                      </>
                      )}
                  </VStack>
                   :
                    <HStack>
                      {Number(tokensPurchased) > 0 && (
                      <>
                      <Box>
                        <Button 
                          mt={5}
                          w="120px"
                          disabled={!finalized}
                          onClick={() => {
                            handleWithdraw();
                          }
                        }>
                        {isLoading ? <Spinner size="sm" /> : "Withdraw"}
                      </Button>  
                    </Box>
                    <Box>
                      <AddToMetaMaskButton 
                        contractAddress={contractAddress} 
                      />
                    </Box>
                    </>)}
                  </HStack>}
                  </Box>
                  </StatRoot>
                ) : <></>}
                {!finalized ? (
                  <StatRoot>
                  <StatLabel fontSize="sm" lineHeight="5px" color="#f3b500">
                    Referral Program
                  </StatLabel>
                <Text fontSize={isMobile ? "11px" : "14px"} fontStyle={"italic"} mt={-2}>
                  For each user referred you get 3% of their contribution
                </Text>
                </StatRoot>): <></>}
              </Box>
              <Box>
                {!finalized ? (
                  <>
                    <HStack columns={2} p={1} mt={2}>
                    <Box w="80px">
                      <Text>Referred</Text>
                    </Box>
                    <Box color="#f3b500" >
                      {Number(referralCount)}
                    </Box><b>users</b>
                  </HStack>
                  <HStack columns={2} p={1} mt={2}>
                      <Box w="80px">
                      <Text>Earned</Text>
                    </Box>
                    <Box color="#f3b500" >
                      {Number(commify(formatEther(totalReferred) * 0.03)).toFixed(4)}
                    </Box><b>BNB</b>
                  </HStack>              
                  <Box w={isMobile?"100%":"75%"} mt={4} ml={1} >
                    {isConnected ? (
                      <Flex align="left" gap={1} direction={isMobile? "column" : "row"} alignItems="left" justifyContent="space-between">
                      <Box w="180px">
                        <Text fontSize={"sm"} >Share referral URL</Text>
                      </Box>
                      <Box>
                      <Text 
                        borderRadius={"10px"}
                        p={1} 
                        mt={-4}
                        h={isMobile ? "40px" : "40px"}
                        backgroundColor="ivory" 
                        fontStyle="bold" 
                        color="black" 
                        fontSize={isMobile ? "9px" : "10px"}
                        w={isMobile ? "300px" : "395px"}
                        ml={isMobile ? '2px' : -75}
                      >
                        {presaleUrl}
                      </Text>
                      </Box>
                      <Box>
                        <Button
                          p={2}
                          px={2}
                          ml={isMobile ? "5px" : -55}
                          h={8}
                          mt={isMobile?3:1}
                          w={"120px"}
                          borderRadius={10}
                          onClick={handleCopy}
                          colorScheme="white"
                          variant="ghost"
                          bg="transparent"
                          border="2px solid"
                          color="white"
                          fontSize={isMobile ? "xs" : "sm"}
                          _hover={{ bg: "rgba(0, 0, 255, 0.1)" }}
                          _active={{ bg: "rgba(0, 0, 255, 0.2)" }}
                      >
                        {hasCopied ? "Copied!" : "Copy"}
                      </Button>
                      </Box>
                    </Flex>): <>Please login with your wallet</>}
                  </Box>        
                  </>
                ):<></>}
              </Box>
            </Box> 

            </Box>
        <br />  <br />  <br />
          </VStack>
          : <>
            <Box textAlign={"center"} h={"50vh"}>
              <Text as="h2" color="white" mt={"25%"}>
                No address provided
              </Text>
            </Box>
          </>}
          </Box>
        </VStack>          
          </>
          {/*} ) : 
           <>
          <Text as="h2">Expired!</Text>
           </>*/}
      </Box>
    <Toaster />
    </Container>
  );
};

export default Presale;
 