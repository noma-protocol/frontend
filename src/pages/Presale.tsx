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
import Logo from "../assets/images/noma.png";
import { ethers } from "ethers"; // Import ethers.js
import { ProgressLabel, ProgressBar, ProgressRoot, ProgressValueText } from "../components/ui/progress"
import PresaleDetails from "../components/PresaleDetails";
import usePresaleContract from '../hooks/usePresaleContract';

import metamaskLogo from "../assets/images/metamask.svg";
import placeholderLogo from "../assets/images/question.svg";
import monadLogo from "../assets/images/monad.png";

import config from '../config'; 
import bnbLogo from "../assets/images/bnb.png";

import addressesLocal   from "../assets/deployment.json";
import addressesBsc   from "../assets/deployment.json";

import { Badge } from "reactstrap";

const { formatEther, parseEther } = ethers.utils;

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

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
      window.location.href = "https://noma.money"
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
    "https://presale.noma.money"}/presale?a=${contractAddress}r=${referralCode}`;
  

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
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh">
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
      ) : contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000" ? ( 
        <Flex direction={isMobile ? "column" : "row"} gap={4} p={isMobile ? 2 : 4} minH="calc(100vh - 80px)">
          {/* Left side - Presale Information */}
          <Box 
            flex={isMobile ? "1" : "0 0 350px"} 
            maxW={isMobile ? "100%" : "350px"} 
            w={isMobile ? "100%" : "350px"}
          >
            <Box bg="#1a1a1a" borderRadius="lg" p={4}>
              <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>Presale Information</Text>
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Token</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {tokenSymbol || "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Price</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {initialPrice ? `${initialPrice} MON` : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Hard Cap</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {hardCap ? `${commify(formatEther(hardCap), 2)} MON` : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Soft Cap</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {softCap ? `${commify(formatEther(softCap), 2)} MON` : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Status</Text>
                  </Box>
                  <Box>
                    <Text 
                      color={finalized ? "#4ade80" : hasExpired ? "#ef4444" : "#fbbf24"} 
                      fontSize="sm" 
                      fontWeight="500"
                    >
                      {finalized ? "Finalized" : hasExpired ? "Expired" : "Active"}
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </Box>
            
            {/* Progress Box */}
            <Box bg="#1a1a1a" borderRadius="lg" p={4} mt={4}>
              <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>Progress</Text>
              <VStack align="stretch" gap={3}>
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text color="#888" fontSize="sm">Raised</Text>
                    <Text color="#4ade80" fontSize="sm" fontWeight="500">
                      {totalRaised ? `${commify(formatEther(totalRaised), 2)} MON` : "0 MON"}
                    </Text>
                  </HStack>
                  <ProgressRoot value={timeLeft != "00:00:00:00" ? progress : progressSc} max={100}>
                    <ProgressBar bg="#2a2a2a">
                      <ProgressValueText color="white" fontSize="xs" />
                    </ProgressBar>
                  </ProgressRoot>
                </Box>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Contributors</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {participantCount || 0}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Time Left</Text>
                  </Box>
                  <Box>
                    <Text color={hasExpired ? "#ef4444" : "#4ade80"} fontSize="sm" fontWeight="500">
                      {hasExpired ? "Expired" : timeLeft}
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </Box>
            
            {/* Admin Controls */}
            {presaleInfo?.deployer == address && !finalized && (
              <Box bg="#1a1a1a" borderRadius="lg" p={4} mt={4}>
                <Text fontSize="lg" fontWeight="bold" color="white" mb={3}>Admin Controls</Text>
                <Button 
                  w="100%"
                  h="40px"
                  bg="#4ade80"
                  color="black"
                  fontWeight="600"
                  onClick={handleClickFinalize}
                  isLoading={isLoading}
                  isDisabled={finalized || hasExpired}
                  _hover={{ bg: "#22c55e" }}
                >
                  Finalize Presale
                </Button>
              </Box>
            )}
          </Box>
          
          {/* Middle - Main Content */}
          <Box flex={isMobile ? "1" : "2"} w={isMobile ? "100%" : "auto"}>
            {/* Contribution Form */}
            <Box bg="#1a1a1a" borderRadius="lg" p={6}>
              <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
                Contribute to Presale
              </Text>
              
              {!finalized && !hasExpired ? (
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="#888" mb={2}>Amount to Contribute</Text>
                    <HStack>
                      <Button 
                        onClick={handleSubtractAmount} 
                        bg="#2a2a2a" 
                        color="white"
                        h="48px"
                        w="48px"
                        _hover={{ bg: "#3a3a3a" }}
                      >
                        -
                      </Button>
                      <NumberInputRoot
                        value={contributionAmount}
                        onChange={handleSetContributionAmount}
                        min={0.001}
                        max={5}
                        step={0.001}
                        w="100%"
                      >
                        <NumberInputField 
                          placeholder="0.00"
                          bg="#2a2a2a"
                          border="none"
                          h="48px"
                          color="white"
                          _placeholder={{ color: "#666" }}
                          _hover={{ bg: "#3a3a3a" }}
                          _focus={{ bg: "#3a3a3a", outline: "none" }}
                        />
                      </NumberInputRoot>
                      <Button 
                        onClick={handleAddAmount} 
                        bg="#2a2a2a" 
                        color="white"
                        h="48px"
                        w="48px"
                        _hover={{ bg: "#3a3a3a" }}
                      >
                        +
                      </Button>
                      <Box w="80px" textAlign="center">
                        <HStack>
                          <Image src={monadLogo} w="20px" h="20px" />
                          <Text color="white" fontWeight="500">MON</Text>
                        </HStack>
                      </Box>
                    </HStack>
                    <Slider 
                      value={[parseFloat(contributionAmount) || 0]}
                      onValueChange={(e) => setContributionAmount(e.value[0].toFixed(4))}
                      min={0}
                      max={5}
                      step={0.001}
                      mt={4}
                    />
                  </Box>
                  
                  <SimpleGrid columns={2} gap={4} pt={2}>
                    <Box>
                      <Text color="#888" fontSize="sm">You'll receive</Text>
                      <Text color="white" fontSize="lg" fontWeight="500">
                        {tokensPurchased} {tokenSymbol}
                      </Text>
                    </Box>
                    <Box>
                      <Text color="#888" fontSize="sm">Price per token</Text>
                      <Text color="white" fontSize="lg" fontWeight="500">
                        {initialPrice} MON
                      </Text>
                    </Box>
                  </SimpleGrid>
                  
                  <Button
                    w="100%"
                    h="48px"
                    bg="#4ade80"
                    color="black"
                    fontWeight="600"
                    onClick={handleClickDeposit}
                    isLoading={isLoading}
                    isDisabled={!contributionAmount || parseFloat(contributionAmount) <= 0}
                    _hover={{ bg: "#22c55e" }}
                  >
                    Contribute
                  </Button>
                </VStack>
              ) : (
                <Box py={8} textAlign="center">
                  <Text color="#666" fontSize="lg">
                    {finalized ? "This presale has been finalized" : "This presale has expired"}
                  </Text>
                </Box>
              )}
            </Box>
            
            {/* Your Contribution Box */}
            {contributions > 0 && (
              <Box bg="#1a1a1a" borderRadius="lg" p={6} mt={4}>
                <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
                  Your Contribution
                </Text>
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Text color="#888" fontSize="sm">Contributed</Text>
                    <HStack>
                      <Text color="white" fontSize="sm" fontWeight="500">
                        {commify(contributions, 2)}
                      </Text>
                      <Image src={monadLogo} w="16px" h="16px" />
                      <Text color="#888" fontSize="sm">MON</Text>
                    </HStack>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="#888" fontSize="sm">Tokens to receive</Text>
                    <HStack>
                      <Text color="#4ade80" fontSize="sm" fontWeight="500">
                        {commify(tokensPurchased, 2)}
                      </Text>
                      <Text color="#888" fontSize="sm">{tokenSymbol}</Text>
                    </HStack>
                  </HStack>
                  {finalized && (
                    <Box pt={2}>
                      <Button
                        w="100%"
                        h="40px"
                        bg="#4ade80"
                        color="black"
                        fontWeight="600"
                        onClick={handleWithdraw}
                        isLoading={isLoading}
                        _hover={{ bg: "#22c55e" }}
                      >
                        Withdraw Tokens
                      </Button>
                      <AddToMetaMaskButton 
                        contractAddress={contractAddress}
                        tokenSymbol={tokenSymbol}
                        tokenDecimals={18}
                      />
                    </Box>
                  )}
                </VStack>
              </Box>
            )}
            
            {/* Referral Program Box */}
            {!finalized && (
              <Box bg="#1a1a1a" borderRadius="lg" p={6} mt={4}>
                <Text fontSize="xl" fontWeight="bold" color="white" mb={2}>
                  Referral Program
                </Text>
                <Text fontSize="sm" color="#888" mb={4}>
                  Earn 3% of contributions from users you refer
                </Text>
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <Text color="#888" fontSize="sm">Users referred</Text>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {referralCount || 0}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="#888" fontSize="sm">Earned</Text>
                    <HStack>
                      <Text color="#4ade80" fontSize="sm" fontWeight="500">
                        {(formatEther(totalReferred) * 0.03).toFixed(4)}
                      </Text>
                      <Text color="#888" fontSize="sm">MON</Text>
                    </HStack>
                  </HStack>
                  <Box pt={2}>
                    <Text color="#888" fontSize="sm" mb={2}>Your referral link</Text>
                    <HStack>
                      <Box 
                        flex="1" 
                        bg="#2a2a2a" 
                        p={2} 
                        borderRadius="md"
                        fontSize="xs"
                        color="white"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {presaleUrl}
                      </Box>
                      <Button
                        size="sm"
                        bg="#2a2a2a"
                        color="white"
                        onClick={handleCopy}
                        _hover={{ bg: "#3a3a3a" }}
                      >
                        {hasCopied ? "Copied!" : "Copy"}
                      </Button>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            )}
          </Box>
          
          {/* Right side - Presale Details */}
          {!isMobile && (
            <Box w="300px">
              <PresaleDetails {...presaleData} />
            </Box>
          )}
        </Flex>
      ) : (
        <Box py={8} textAlign="center">
          <Text color="#666">Invalid or missing presale address</Text>
        </Box>
      )}
    </Container>
  );
};

export default Presale;
