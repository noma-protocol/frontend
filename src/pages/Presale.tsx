import React, { useEffect, useState, useMemo } from "react";
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

import { commify, commifyDecimals, generateBytes32String, getContractAddress, generateReferralCode, formatNumberPrecise } from "../utils";
import Logo from "../assets/images/noma.png";
import { ethers } from "ethers"; // Import ethers.js
import { ProgressLabel, ProgressBar, ProgressRoot, ProgressValueText } from "../components/ui/progress"
import PresaleDetails from "../components/PresaleDetails";
import usePresaleContract from '../hooks/usePresaleContract';

import metamaskLogo from "../assets/images/metamask.svg";
// import WalletNotConnected from '../components/WalletNotConnected';
import placeholderLogo from "../assets/images/question_white.svg"; 
import monadLogo from "../assets/images/monad.png";

import config from '../config'; 
import { tokenApi } from '../services/tokenApi';

import addressesLocal   from "../assets/deployment.json";
import addressesBsc   from "../assets/deployment.json";

import { Badge } from "reactstrap";

const { formatEther, parseEther } = ethers.utils;

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

// const tokenAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Proxy");

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
  const [contributionAmount, setContributionAmount] = useState("0");
  const [tokensPurchased, setTokensPurchased] = useState("0");
  const [targetDate, setTargetDate] = useState(""); // 24 hours from now

  const [referralCode, setReferralCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressSc, setProgressSc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenLogo, setTokenLogo] = useState<string>(placeholderLogo);
  const [tokenDescription, setTokenDescription] = useState<string>("");
  const [tokenSupply, setTokenSupply] = useState<string>("");
  
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
      address: contractAddress,
      abi: ERC20Abi,
      functionName: "balanceOf",
      args: [contractAddress],
      watch: true,
      enabled: /*!!tokenAddress &&*/ !!contractAddress,
      onError(error) {
        console.error("Error in tokenBalancePresale read:", error);
      }
    });

    console.log("Contract reads:", {
      tokenBalancePresale: tokenBalancePresale?.toString(),
      contractAddress
    });
    
    // Removed duplicate presaleInfo read - using usePresaleContract instead

  const {
    data: tokenBalance, refetch: refetchTokenBalance
  } = useContractRead({
    address: contractAddress,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [address],
    watch: true,
    onError(error) {
      console.error("Error in tokenBalance read:", error);
    }
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

  const {
    data: minContribution
  } = useContractRead({
    address: contractAddress,
    abi: PresaleAbi,
    functionName: "MIN_CONTRIBUTION",
    args: [],
  });

  const {
    data: maxContribution
  } = useContractRead({
    address: contractAddress,
    abi: PresaleAbi,
    functionName: "MAX_CONTRIBUTION",
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

   console.log("Raw contributions:", contributions);
   // contributions is already a string from usePresaleContract, no need to format
   console.log("Formatted contributions:", contributions);
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

  const { data: monBalance, refetch: refetchBalance } = useBalance({
    address: address,
  });
  
  // Log balance data safely
  if (monBalance) {
    console.log("Balance data:", {
      value: monBalance.value?.toString(),
      formatted: monBalance.formatted,
      symbol: monBalance.symbol,
      decimals: monBalance.decimals
    });
  }

  // Debug logging
  console.log("Presale Debug:", {
    initialPrice,
    contributionAmount,
    tokensPurchased,
    contributions,
    monBalance: monBalance?.value?.toString(),
    totalReferred,
    tokenBalance: tokenBalance?.toString(),
    hardCap,
    softCap,
    totalRaised,
    minContribution: minContribution?.toString(),
    maxContribution: maxContribution?.toString()
  });

  const presaleData = {
    isMobile,
    balance: { data: monBalance },
    initialPrice: initialPrice || "0",
    contributions: contributions || "0",
    contributionAmount: contributionAmount || "0",
    tokensPurchased: tokensPurchased || "0",
    Logo,
    tokenSymbol: tokenSymbol || "TOKEN"
  };
  
  // Log presaleData to check for problematic values
  console.log("presaleData object:", JSON.stringify(presaleData, (key, value) => {
    // Handle BigNumber objects
    if (typeof value === 'object' && value !== null && value._isBigNumber) {
      return value.toString();
    }
    // Handle BigInt values
    if (typeof value === 'bigint') {
      return value.toString();
    }
    // Handle objects with BigInt values
    if (value && typeof value === 'object' && value.value && typeof value.value === 'bigint') {
      return {
        ...value,
        value: value.value.toString()
      };
    }
    return value;
  }, 2));

  const {
    isLoading: contributing,
    write: deposit
  } = useContractWrite({
    address: contractAddress,
    abi: PresaleAbi,
    functionName: "deposit",
    args: [urlReferralCode ? generateBytes32String(urlReferralCode) : generateBytes32String("0")],
    value: contributionAmount && parseFloat(contributionAmount) > 0 ? parseEther(parseFloat(contributionAmount).toFixed(6)) : undefined,
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

  // Fetch token logo from API
  useEffect(() => {
    const fetchTokenLogo = async () => {
      if (!tokenSymbol) {
        console.log("Token symbol not yet loaded");
        return;
      }
      
      console.log(`Fetching logo for token: ${tokenSymbol}`);
      
      // Remove "p-" prefix from presale tokens to match the base token
      const baseTokenSymbol = tokenSymbol.startsWith("p-") 
        ? tokenSymbol.substring(2) 
        : tokenSymbol;
      
      console.log(`Looking for base token: ${baseTokenSymbol}`);
      
      try {
        const response = await tokenApi.getTokens();
        console.log("API response:", response);
        
        const token = response.tokens.find(t => t.tokenSymbol === baseTokenSymbol);
        console.log(`Found token:`, token);
        
        if (token) {
          // Use logoUrl if available, otherwise fall back to logoPreview
          const logoSource = token.logoUrl || token.logoPreview;
          if (logoSource) {
            setTokenLogo(logoSource);
            console.log(`Set logo for ${tokenSymbol}: ${logoSource}`);
          } else {
            console.log(`No logo found for ${baseTokenSymbol}`);
          }
          
          // Also set the token description
          if (token.tokenDescription) {
            setTokenDescription(token.tokenDescription);
            console.log(`Set description for ${tokenSymbol}: ${token.tokenDescription}`);
          }
          
          // Also set the token supply
          if (token.tokenSupply) {
            setTokenSupply(token.tokenSupply);
            console.log(`Set supply for ${tokenSymbol}: ${token.tokenSupply}`);
          }
        } else {
          console.log(`Token ${baseTokenSymbol} not found in API response`);
        }
      } catch (error) {
        console.error("Failed to fetch token logo:", error);
      }
    };
    
    fetchTokenLogo();
  }, [tokenSymbol]);

  // Initialize contribution amount to min contribution when it's loaded
  useEffect(() => {
    if (minContribution && maxContribution) {
      const minContribInEther = Number(formatEther(`${minContribution}`));
      const maxContribInEther = Number(formatEther(`${maxContribution}`));
      const currentAmount = parseFloat(contributionAmount) || 0;
      
      // If current amount is outside valid range, set to min
      if (currentAmount < minContribInEther || currentAmount > maxContribInEther) {
        setContributionAmount(minContribInEther.toFixed(4));
      }
    }
  }, [minContribution, maxContribution]);

  useEffect(() => {
    const totalRaisedNum = parseFloat(totalRaised) || 0;
    const hardCapNum = parseFloat(hardCap) || 1; // Avoid division by zero
    const softCapNum = parseFloat(softCap) || 1;
    
    const progress = (totalRaisedNum / hardCapNum) * 100;
    const progressSc = (totalRaisedNum / softCapNum) * 100;

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
    try {
      if (tokenBalance && tokenBalance !== "0") {
        // If we have an actual token balance, convert it from BigNumber
        const tokenBalanceNum = Number(formatEther(tokenBalance));
        setTokensPurchased(tokenBalanceNum.toFixed(4));
      } else if (contributionAmount !== "" && initialPrice) {
        const contributionValue = parseFloat(contributionAmount);
        const initialPriceNum = parseFloat(initialPrice);
        
        if (!isNaN(contributionValue) && contributionValue > 0 && !isNaN(initialPriceNum) && initialPriceNum > 0) {
          const cc = contributionValue / initialPriceNum;
          if (cc > 0) {
            // Ensure we're not passing a very long decimal
            // Ensure we don't have excessive decimal places
            // Round to 4 decimal places to avoid precision issues
            const ccRounded = Math.round(cc * 10000) / 10000;
            console.log("Token calculation:", {
              contributionValue,
              initialPriceNum,
              cc,
              ccRounded
            });
            setTokensPurchased(ccRounded.toString());
            console.log(`Tokens purchased is ${ccRounded}`);
          } else {
            setTokensPurchased("0.0000");
          }
        } else {
          setTokensPurchased("0.0000");
        }
      } else {
        setTokensPurchased("0.0000");
      }
    } catch (error) {
      console.error("Error calculating tokens purchased:", error);
      setTokensPurchased("0.0000");
    }
  }, [contributionAmount, tokenBalance, initialPrice]);

  // Check if user has already withdrawn from localStorage
  const hasWithdrawnFromStorage = useMemo(() => {
    if (!address || !contractAddress) return false;
    const key = `withdrawn_${contractAddress}_${address}`;
    return localStorage.getItem(key) === 'true';
  }, [address, contractAddress]);

  // Calculate tokens to claim based on contributions
  const tokensToWithdraw = useMemo(() => {
    if (!contributions || parseFloat(contributions) <= 0) return "0";
    if (!initialPrice || parseFloat(initialPrice) <= 0) return "0";
    
    const tokens = parseFloat(contributions) / parseFloat(initialPrice);
    return tokens.toFixed(4);
  }, [contributions, initialPrice]);

  // Calculate if user has already withdrawn
  const hasWithdrawn = useMemo(() => {
    console.log("Calculating hasWithdrawn:", {
      contributions,
      initialPrice,
      tokenBalance: tokenBalance?.toString(),
      tokenBalanceFormatted: tokenBalance ? formatEther(tokenBalance) : "0",
      tokensToWithdraw
    });
    
    // If no contributions, consider as withdrawn
    if (!contributions || parseFloat(contributions) <= 0) return true;
    
    // If presale not finalized, can't withdraw yet
    if (!finalized) return false;
    
    // Check if user already has the tokens they're supposed to receive
    const currentBalance = tokenBalance ? parseFloat(formatEther(tokenBalance)) : 0;
    const expectedTokens = parseFloat(tokensToWithdraw);
    
    console.log("Withdraw check:", {
      currentBalance,
      expectedTokens,
      hasTokens: currentBalance >= expectedTokens * 0.9
    });
    
    // If user has most of their expected tokens, they haven't withdrawn yet
    // If balance is 0 and they should have tokens, they've already withdrawn
    return expectedTokens > 0 && currentBalance < expectedTokens * 0.1;
  }, [contributions, initialPrice, tokenBalance, tokensToWithdraw, finalized]);

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
      // Mark as withdrawn in localStorage
      if (address && contractAddress) {
        const key = `withdrawn_${contractAddress}_${address}`;
        localStorage.setItem(key, 'true');
      }
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
      console.log("Contribute button clicked", {
        deposit: !!deposit,
        contributionAmount,
        contractAddress,
        urlReferralCode,
        contributing
      });
      
      if (deposit) {
        deposit()
      } else {
        console.error("Deposit function not available")
      }
    }

    // console.log(`hard cap is ${hardCap} soft cap is ${softCap} x ${hardCap / 200} y ${hardCap / 25}`)

  return (
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh">
      <Toaster />
      {!isConnected ? (
        <Box display="flex" alignItems="center" justifyContent="center" minH="100vh">
          <Text color="white" fontSize="xl">Please connect your wallet</Text>
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
                      {hardCap ? `${commify(hardCap, 2)} MON` : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Soft Cap</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {softCap ? `${commify(softCap, 2)} MON` : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Total Supply</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {tokenSupply ? formatNumberPrecise(tokenSupply, 4) : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Status</Text>
                  </Box>
                  <Box>
                    <Text 
                      color={finalized ? "#4ade80" : hasExpired ? "#ef4444" : "#4ade80"} 
                      fontSize="sm" 
                      fontWeight="500"
                    >
                      {finalized ? "Finalized" : hasExpired ? "Ended" : "Active"}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Min Contribution</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {minContribution ? `${formatEther(minContribution)} MON` : "Loading..."}
                    </Text>
                  </Box>
                </HStack>
                <HStack justify="space-between">
                  <Box>
                    <Text color="#888" fontSize="sm">Max Contribution</Text>
                  </Box>
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="500">
                      {maxContribution ? `${formatEther(maxContribution)} MON` : "Loading..."}
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
                    <Box><Text color="#888" fontSize="sm">Raised</Text></Box>
                    <Box><Text color="#4ade80" fontSize="sm" fontWeight="500">
                      {totalRaised ? `${commify(totalRaised, 2)} MON` : "0 MON"}
                    </Text></Box>
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
                      {hasExpired ? "Ended" : timeLeft}
                    </Text>
                  </Box>
                </HStack>
              </VStack>
            </Box>
            
            {/* Admin Controls */}
            {deployer == address && !finalized && (
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
            {/* Token Information Box */}
            <Box bg="#1a1a1a" borderRadius="lg" p={8} mb={4}>
              <HStack spacing={12} align="center">
                {/* Token Logo - Left Side */}
                <Box minW="150px">
                  <Box
                    w="130px"
                    h="130px"
                    bg="#0a0a0a"
                    borderRadius="full"
                    border="2px solid #2a2a2a"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    overflow="hidden"
                    p={6}
                  >
                    <Box
                      position="absolute"
                      inset={0}
                      bgGradient="linear(to-br, #4ade8040, transparent)"
                    />
                    <Image
                      src={tokenLogo}
                      alt={tokenSymbol}
                      w="80px"
                      h="80px"
                    />
                  </Box>
                </Box>
                
                {/* Token Info - Right Side */}
                <Box flex="1">
                  <VStack align="flex-start" spacing={4}>
                    {/* Token Name and Symbol */}
                    <Box>
                      <Text color="white" fontSize="3xl" fontWeight="bold" mb={1}>
                        {tokenName || "Loading..."}
                      </Text>
                      <Text color="#888" fontSize="xl">
                        ${tokenSymbol || "..."}
                      </Text>
                    </Box>
                    
                    {/* Token Description */}
                    <Text color="#888" fontSize="md" lineHeight="1.6">
                      {tokenDescription || `Join the presale for ${tokenName || "this token"} and be part of an innovative DeFi ecosystem with automated liquidity protection and price floor mechanisms.`}
                    </Text>
                  </VStack>
                </Box>
              </HStack>
            </Box>

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
                      {/* <Box><Button 
                        onClick={handleSubtractAmount} 
                        bg="#2a2a2a" 
                        color="white"
                        h="48px"
                        w="48px"
                        _hover={{ bg: "#3a3a3a" }}
                      >
                        -
                      </Button></Box> */}
                      <Box flex="1"><NumberInputRoot
                        value={contributionAmount}
                        onChange={handleSetContributionAmount}
                        min={0.001}
                        max={5}
                        step={0.001}
                        w="95%"
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
                      </NumberInputRoot></Box>
                      {/* <Box><Button 
                        onClick={handleAddAmount} 
                        bg="#2a2a2a" 
                        color="white"
                        h="48px"
                        w="48px"
                        _hover={{ bg: "#3a3a3a" }}
                      >
                        +
                      </Button></Box> */}
                      <Box w="80px" textAlign="center" ml={-10}>
                        <HStack>
                          <Box><Image src={monadLogo} w="40px" h="40px" /></Box>
                          <Box><Text color="white" fontWeight="500">MON</Text></Box>
                        </HStack>
                      </Box>
                    </HStack>
                    {minContribution && maxContribution ? (
                      <Slider 
                        value={[Math.max(0, parseFloat(contributionAmount) || 0)]}
                        onValueChange={(e) => setContributionAmount(e.value[0].toFixed(4))}
                        min={Number(formatEther(`${minContribution}`))}
                        max={Number(formatEther(`${maxContribution}`))}
                        step={0.001}
                        mt={4}
                      />
                    ) : (
                      <Box h="40px" display="flex" alignItems="center" justifyContent="center">
                        <Spinner size="sm" color="#4ade80" />
                      </Box>
                    )}
                  </Box>
                  
                  <SimpleGrid columns={2} gap={4} pt={2} w={"100%"}>
                    <Box w="95%">
                        <HStack>
                          <Box mb={2} w="180px">
                            <Text color="#888" fontSize="sm">You'll receive</Text>
                            <Text color="white" fontSize="lg" fontWeight="500">
                              {tokensPurchased}  
                            </Text>  
                          </Box>
                          <Box mt={10}>
                            <Text color="white" fontSize="lg" fontWeight="500" >
                               {tokenSymbol}
                            </Text>  
                          </Box>
                        </HStack>
                    </Box>
                    <Box w="95%" >
                        <HStack>
                          <Box mb={2} w="180px">
                            <Text color="#888" fontSize="sm">Price per token</Text>
                            <Text color="white" fontSize="lg" fontWeight="500">
                              {initialPrice}  
                            </Text>  
                          </Box>
                          <Box mt={10}>
                            <Text color="white" fontSize="lg" fontWeight="500" >
                               MON
                            </Text>  
                          </Box>
                        </HStack>                      
                    </Box>
                  </SimpleGrid>
                  
                  <Button
                    w="100%"
                    h="48px"
                    bg="#4ade80"
                    color="black"
                    fontWeight="600"
                    onClick={handleClickDeposit}
                    isLoading={contributing}
                    isDisabled={!contributionAmount || parseFloat(contributionAmount) <= 0 || contributing}
                    _hover={{ bg: "#22c55e" }}
                  >
                    Contribute
                  </Button>
                </VStack>
              ) : (
                <Box py={8} textAlign="center">
                  <Text color="#666" fontSize="lg">
                    {finalized ? "This presale has been finalized" : "This presale has ended"}
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
                    <Box><Text color="#888" fontSize="sm">Contributed</Text></Box>
                    <HStack>
                      <Box><Text color="white" fontSize="sm" fontWeight="500">
                        {commify(contributions, 2)}
                      </Text></Box>
                      <Box><Image src={monadLogo} w="16px" h="16px" /></Box>
                      <Box><Text color="#888" fontSize="sm">MON</Text></Box>
                    </HStack>
                  </HStack>
                  <HStack justify="space-between">
                    <Box><Text color="#888" fontSize="sm">Tokens to receive</Text></Box>
                    <HStack>
                      <Box><Text color="#4ade80" fontSize="sm" fontWeight="500">
                        {commify(tokensToWithdraw, 2)}
                      </Text></Box>
                      <Box><Text color="#888" fontSize="sm">{tokenSymbol}</Text></Box>
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
                        isDisabled={
                          !finalized || 
                          !contributions || 
                          parseFloat(contributions) <= 0 ||
                          hasWithdrawnFromStorage
                        }
                        _hover={{ bg: "#22c55e" }}
                        _disabled={{
                          bg: "#2a2a2a",
                          color: "#666",
                          cursor: "not-allowed"
                        }}
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
                    <Box><Text color="#888" fontSize="sm">Users referred</Text></Box>
                    <Box><Text color="white" fontSize="sm" fontWeight="500">
                      {referralCount || 0}
                    </Text></Box>
                  </HStack>
                  <HStack justify="space-between">
                    <Box><Text color="#888" fontSize="sm">Earned</Text></Box>
                    <HStack>
                      <Box><Text color="#4ade80" fontSize="sm" fontWeight="500">
                        {(parseFloat(totalReferred) * 0.03).toFixed(4)}
                      </Text></Box>
                      <Box><Text color="#888" fontSize="sm">MON</Text></Box>
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
                      <Box><Button
                        size="sm"
                        bg="#2a2a2a"
                        color="white"
                        onClick={handleCopy}
                        _hover={{ bg: "#3a3a3a" }}
                      >
                        {hasCopied ? "Copied!" : "Copy"}
                      </Button></Box>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            )}
            
            {/* Wallet Balance Box on Mobile */}
            {isMobile && (
              <Box bg="#1a1a1a" borderRadius="lg" p={4} w="100%" mt={4}>
                <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
                  Wallet
                </Text>
                
                <VStack align="stretch" gap={3}>
                  {/* MON Balance */}
                  <Box>
                    <Flex justifyContent="space-between" alignItems="center">
                      <HStack>
                        <Box w="20px" h="20px">
                          <Image
                            src={monadLogo}
                            alt="MON"
                            w="20px"
                            h="20px"
                          />
                        </Box>
                        <Box>
                          <Text color="#888" fontSize="sm">MON</Text>
                        </Box>
                      </HStack>
                      <Box>
                        <Text color="white" fontWeight="bold">
                          {monBalance ? parseFloat(formatEther(monBalance.value)).toFixed(4) : "0.0000"}
                        </Text>
                      </Box>
                    </Flex>
                    <Text color="#666" fontSize="xs" textAlign="right">
                      ≈ ${monBalance ? (parseFloat(formatEther(monBalance.value)) * 50).toFixed(2) : "0.00"}
                    </Text>
                  </Box>
                  
                  {/* Token Balance if user has tokens */}
                  {tokenBalance && parseFloat(formatEther(tokenBalance)) > 0 && (
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center">
                        <HStack>
                          <Box w="20px" h="20px">
                            <Image
                              src={tokenLogo}
                              alt={tokenSymbol}
                              w="20px"
                              h="20px"
                            />
                          </Box>
                          <Box>
                            <Text color="#888" fontSize="sm">{tokenSymbol}</Text>
                          </Box>
                        </HStack>
                        <Box>
                          <Text color="white" fontWeight="bold">
                            {parseFloat(formatEther(tokenBalance)).toFixed(4)}
                          </Text>
                        </Box>
                      </Flex>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}
          </Box>
          
          {/* Right side - Wallet Box and Presale Details */}
          {!isMobile && (
            <Box w="300px">
              <VStack gap={4}>
                {/* Wallet Balance Box */}
                <Box bg="#1a1a1a" borderRadius="lg" p={4} w="100%">
                  <Text color="white" fontSize="lg" fontWeight="bold" mb={3}>
                    Wallet
                  </Text>
                  
                  <VStack align="stretch" gap={3}>
                    {/* MON Balance */}
                    <Box>
                      <Flex justifyContent="space-between" alignItems="center">
                        <HStack>
                          <Box w="20px" h="20px">
                            <Image
                              src={monadLogo}
                              alt="MON"
                              w="20px"
                              h="20px"
                            />
                          </Box>
                          <Box>
                            <Text color="#888" fontSize="sm">MON</Text>
                          </Box>
                        </HStack>
                        <Box>
                          <Text color="white" fontWeight="bold">
                            {monBalance ? parseFloat(formatEther(monBalance.value)).toFixed(4) : "0.0000"}
                          </Text>
                        </Box>
                      </Flex>
                      <Text color="#666" fontSize="xs" textAlign="right">
                        ≈ ${monBalance ? (parseFloat(formatEther(monBalance.value)) * 50).toFixed(2) : "0.00"}
                      </Text>
                    </Box>
                    
                    {/* Token Balance if user has tokens */}
                    {tokenBalance && parseFloat(formatEther(tokenBalance)) > 0 && (
                      <Box>
                        <Flex justifyContent="space-between" alignItems="center">
                          <HStack>
                            <Box w="20px" h="20px">
                              <Image
                                src={tokenLogo}
                                alt={tokenSymbol}
                                w="20px"
                                h="20px"
                              />
                            </Box>
                            <Box>
                              <Text color="#888" fontSize="sm">{tokenSymbol}</Text>
                            </Box>
                          </HStack>
                          <Box>
                            <Text color="white" fontWeight="bold">
                              {parseFloat(formatEther(tokenBalance)).toFixed(4)}
                            </Text>
                          </Box>
                        </Flex>
                      </Box>
                    )}
                  </VStack>
                </Box>
                
                {/* Presale Details Box */}
                {/* {(() => {
                  try {
                    return <PresaleDetails {...presaleData} />;
                  } catch (error) {
                    console.error("Error rendering PresaleDetails:", error);
                    return <Box>Error loading presale details</Box>;
                  }
                })()} */}
              </VStack>
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
