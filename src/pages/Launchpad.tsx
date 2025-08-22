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
  Input,
  Spinner,
  createListCollection
} from "@chakra-ui/react";
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox"
  
import { useAccount, useBalance, useContractWrite } from "wagmi";
import { isMobile } from "react-device-detect";
import { Slider } from "../components/ui/slider"
import { FaInfoCircle, FaCoins, FaChartLine, FaRocket, FaCheckCircle, FaTag, FaLayerGroup, FaClock, FaWallet, FaUpload, FaImage, FaFileAlt } from "react-icons/fa";
import { MdToken } from "react-icons/md";
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

import { unCommify, commify, generateBytes32String, getContractAddress } from "../utils";
import Logo from "../assets/images/noma_logo_transparent.png";
import { ethers } from "ethers"; // Import ethers.js
const { formatEther, parseEther } = ethers.utils;

import { ProgressLabel, ProgressBar, ProgressRoot, ProgressValueText } from "../components/ui/progress"
import PresaleDetails from "../components/PresaleDetails";
import usePresaleContract from '../hooks/usePresaleContract';
import { set } from "react-ga";
import placeholderLogo from "../assets/images/question.svg";
import wethLogo from "../assets/images/weth.svg";
import monadLogo from "../assets/images/monad.png";
import config from '../config';
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import addressesBsc from "../assets/deployment.json";

const addresses = config.chain == "local"
  ? addressesLocal
  : addressesBsc;

const { environment, presaleContractAddress } = config;

const FactoryArtifact = await import(`../assets/OikosFactory.json`);
const FactoryAbi = FactoryArtifact.abi;
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory"); 

const Launchpad: React.FC = () => {
    const { address, isConnected } = useAccount();
    const [deployStep, setDeployStep] = useState(0);
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenDescription, setTokenDescription] = useState("");
    const [tokenDecimals, setTokenDecimals] = useState("18");
    const [tokenSupply, setTokenSupply] = useState("100");
    const [tokenLogo, setTokenLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");

    const [price, setPrice] = useState("0");
    const [floorPrice, setFloorPrice] = useState("0");
    const [presalePrice, setPresalePrice] = useState("0");

    const [token1, setToken1] = useState(config.protocolAddresses.WMON || "0x");
    const [feeTier, setFeeTier] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [presale, setPresale] = useState("0");
    const [softCap, setSoftCap] = useState("0");
    const [duration, setDuration] = useState(Number(86400*30).toString());

    const [isFirstSel, setIsFirstSel] = useState(true);
    const [isSecondSel, setIsSecondSel] = useState(false);
    const [isThirdSel, setIsThirdSel] = useState(false);
    const [isFourthSel, setIsFourthSel] = useState(false);

    const { 
        isLoading: deploying, 
        write: deployVault 
    } = useContractWrite({
        address: nomaFactoryAddress,
        abi: FactoryAbi,
        functionName: "deployVault",
        args: [
            {
                softCap: parseEther(`${softCap}`),
                deadline: duration,
            },
            {
                name: tokenName,
                symbol: tokenSymbol,
                decimals: tokenDecimals.toString(),
                initialSupply: parseEther(`${Number(tokenSupply)}`),
                maxTotalSupply: parseEther(`${Number(tokenSupply)}`),
                IDOPrice: parseEther(`${Number(price)}`),
                floorPrice: parseEther(`${Number(floorPrice)}`),
                token1: token1,
                feeTier: "3000",
                presale: presale.toString()
            },
        ],
        value: parseEther(`${1}`), // 0.1 MON for deployment
        gasLimit: 30000000, // Increase gas limit
        onSuccess(data) {
        console.log(`transaction successful: ${data.hash}`);

        toaster.create({
            title: "Success",
            description: "Deployment successful",
        })
        setTimeout(() => {
            window.location.href = "markets?v=my";
        }, 1500); // 3000ms = 3 seconds
        },
        onError(error) {
        const msg = error.message.indexOf("TokenAlreadyExists") > -1 ? "Token already exists" : 
                    error.message.indexOf("Already contributed") > -1 ? "Already contributed" : 
                    error.message.indexOf("0xf4354b39") > -1 ? "Invalid soft cap" :
                    error.message.indexOf("NotAuthorityError") > -1 ? "Permissionless deployment is disabled. Reach out on Discord." :
                    error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
        toaster.create({
            title: "Error",
            description: msg,
        })
        console.log(error)
        console.error("failed:", error);
        }
    }); 

    const handleLogoUpload = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setTokenLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setError("Please upload a valid image file");
        }
    };

    const calculateProgress = () => {
        let baseProgress = deployStep * 25; // Each completed step is 25%
        let stepProgress = 0;
        
        if (deployStep === 0) {
            // Token Info step
            let fieldsCompleted = 0;
            if (tokenName && tokenName.trim() !== "") fieldsCompleted++;
            if (tokenSymbol && tokenSymbol.trim() !== "") fieldsCompleted++;
            if (tokenDescription && tokenDescription.trim() !== "") fieldsCompleted++;
            if (tokenDecimals && tokenDecimals !== "18") fieldsCompleted++; // Only count if changed from default
            stepProgress = (fieldsCompleted / 4) * 25;
        } else if (deployStep === 1) {
            // Pool Setup step
            let fieldsCompleted = 0;
            if (tokenSupply && tokenSupply !== "100" && Number(tokenSupply) > 0) fieldsCompleted++;
            if (price && price !== "0" && Number(price) > 0) fieldsCompleted++;
            if (token1) fieldsCompleted++; // This has a default value, so it's always counted
            stepProgress = (fieldsCompleted / 2) * 25; // Only 2 fields need to be changed
        } else if (deployStep === 2) {
            // Presale step
            let fieldsCompleted = 0;
            if (presalePrice && presalePrice !== "0" && Number(presalePrice) > 0) fieldsCompleted++;
            if (softCap && softCap !== "0" && Number(softCap) > 0) fieldsCompleted++;
            if (duration && duration !== Number(86400*30).toString()) fieldsCompleted++; // Only count if changed
            stepProgress = (fieldsCompleted / 3) * 25;
        } else if (deployStep === 3) {
            // Review step - always full
            stepProgress = 25;
        }
        
        return Math.round(baseProgress + stepProgress);
    };

    const handleClickNext = () => {
        if (deployStep == 1) {
            if (presale == 0) {
                setDeployStep(3);
                return
            }
        }
        let currentStep = deployStep + 1;
        if (currentStep > 3) {
        currentStep = 0;
        }
        if (deployStep == 0) {
            if (tokenName == "" || tokenSymbol == "" || tokenDecimals == 0) {
                console.log("error", "Please fill in all fields");
                setError("Please fill in all fields");
                return;
            }
        } else if (deployStep == 1) {
            if (tokenSupply == 0 || price == 0 || token1 == "") {
                console.log("error", "Please fill in all fields");
                setError("Please fill in all fields");
                return;
            }
        }
        calculateSoftCap();
        setDeployStep(currentStep);

    }

    const handleClickBack = (event) => {
        if (deployStep == 3) {
            if (presale == 0) {
                setDeployStep(1);
                return
            }
        }        
        let currentStep = deployStep - 1;
        if (currentStep < 0) {
        currentStep = 0;
        }
        console.log("Current Step: ", currentStep);
        setDeployStep(currentStep);
    }

    const handleSetTokenName = (event) => {
        setIsFirstSel(true);
        setError("");
        const value = event.target.value;
        // console.log("Token Name: ", value);
    
        // Fail if the input contains only numbers or numbers with special characters
        if (!/[a-zA-Z]/.test(value)) {
            toaster.create({
            title: "Error",
            description: "Token name must contain at least one letter (a-z, A-Z)"
          });
          setTokenName("");
          return;
        } else {
            // Update the state if validation passes
            setTokenName(value);
        }
    
        // Fail if the input contains special characters (other than hyphens and spaces)
        if (!/^[a-zA-Z0-9- ]*$/.test(value)) {
          toaster.create({
            title: "Error",
            description: "Token name must contain only letters, numbers, hyphens, and spaces"
          });
            setTokenName("");
          return;
        } else {
            // Update the state if validation passes
            setTokenName(value);
        }
      };


    const handleSetTokenSymbol = (event) => {
        setError("");
        const value = event.target.value;
        // console.log("Token Symbol: ", value);
    
        // Fail if the input contains only numbers or numbers with special characters
        if (!/[a-zA-Z]/.test(value)) {
            toaster.create({
            title: "Error",
            description: "Token symbol must contain at least one letter (a-z, A-Z)"
          });
          setTokenSymbol("");
          return;
        } else {
            // Update the state if validation passes
            setTokenSymbol(value);
        }
    
        // Fail if the input contains special characters (other than hyphens and spaces)
        if (!/^[a-zA-Z0-9- ]*$/.test(value)) {
          toaster.create({
            title: "Error",
            description: "Token symbol must contain only letters, numbers, hyphens, and spaces"
          });
            setTokenSymbol("");
          return;
        } else {
            // Update the state if validation passes
            setTokenSymbol(value);
        }

    }

    const handleSetTokenDescription = (event) => {
        setError("");
        const value = event.target.value;
        // Limit description to 500 characters
        if (value.length <= 500) {
            setTokenDescription(value);
        }
    }

    const handleSetDecimals = (event) => {
        // console.log("Token Decimals: ", event.target.value);
        if (event.target.value < 6) {
            event.target.value = 6;
        } else if (event.target.value > 18) {
            event.target.value = 18;
        }
                
        setTokenDecimals(event.target.value);
    }

    const handleSetSupply = (event) => {
        console.log("Token Supply: ", event.target.value);
        if (event.target.value != "") {
            const targetValue = unCommify(event.target.value);
            setTokenSupply(targetValue);
        }

        calculateSoftCap();
    }
    
    const calculateSoftCap = () => {
        // console.log(`${tokenSupply} * 10 / 100 * ${presalePrice} * 25 / 100`);
        const calculatedSoftCap = ((tokenSupply * 10 / 100) * presalePrice) * 20 / 100;
        setSoftCap(calculatedSoftCap);
    }

    const handleSetPrice = (value) => {
        console.log(`Got value ${value}`)
        if (value == (floorPrice * 1.25)) return;

        const inputValueStr = value.trim(); // Trim whitespace
    
        // If the input is empty, reset the price and floor price
        if (inputValueStr === "") {
          setPrice("");
          setFloorPrice("");
          return;
        }
    
        if (Number(inputValueStr) < 0.000001) {
          console.error("Invalid input: Price is too low");
          return;
        }
    
        // Parse the input value as a number
        const inputValue = parseFloat(inputValueStr);
    
        // Check if the input value is a valid number
        if (isNaN(inputValue)) {
          console.error("Invalid input: Not a number");
          return;
        }
    
        // Calculate the sale price with a 25% markup
        const salePrice = inputValue * 1.25;
    
        // Determine the number of decimal places in the input value
        const decimalPlaces = (inputValueStr.split('.')[1] || '').length;
    
        // Default to at least 6 decimal places if no decimal places exist
        const precision = decimalPlaces > 0 ? decimalPlaces : 6;
    
        // Ensure at least 7 decimals for very small values, avoiding scientific notation
        let formattedSalePrice = salePrice.toFixed(Math.max(precision, 7));
    
        // If the formatted sale price is still "0", ensure proper formatting
        if (formattedSalePrice === '0') {
          console.error("Invalid input: Sale price is zero");
          return;
        }
    
        // Log the result for debugging
        console.log(`Input: ${inputValueStr}, Sale Price: ${formattedSalePrice}`);
    
        // Update state
        setPrice(`${formattedSalePrice}`);
        setFloorPrice(`${inputValueStr}`);
        setPresalePrice(`${formattedSalePrice}`);
        calculateSoftCap();
      };
    
      // Use useEffect to trigger seftDefaultSoftCap after price and floorPrice are updated
    //   useEffect(() => {
    //     if (price && floorPrice) {
    //       seftDefaultSoftCap();
    //     }
    //   }, [price, floorPrice]); // Run this effect whenever price or floorPrice changes
       
       
    
    const handleSelectAsset = (event) => {
        // console.log("Selected Asset: ", event.target.value);
        setToken1(event.target.value);
    }

    const handleSetPresale = (event) => {
        console.log("Presale: ", event.target.value);
        setPresale(event.target.value);
    }

    const handleSetDuration = (event) => {
        console.log("Duration: ", event.target.value);
        setDuration(event.target.value);
    }

    const handleSetSoftCap = (event) => {
        console.log("Soft Cap: ", event.target.value);

        if (event.target.value != "") {
            const targetValue = unCommify(event.target.value);
            console.log(`Setting soft cap to ${parseEther(`${targetValue}`)}`);
            setSoftCap(targetValue);
        }
    }

    const assets = createListCollection({
        items: [
          { label: "WMON", value: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" }, // WMON
            { label: "WMON", value: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" }, // WMON
        ],
      })
    
    const presaleChoices = createListCollection({
        items: [
            { label: "Yes", value: "1" },
            { label: "No (Default)", value: "0" },
            ],
    });

    const durationChoices = createListCollection({
        items: [
            { label: "30 days", value: Number((86400 * 30)).toString()} ,
            { label: "60 days", value: Number((86400 * 60)).toString()} ,
            { label: "90 days", value: Number((86400 * 90)).toString()},
            { label: "1 minute", value: Number((60)).toString() },
            { label: "30 seconds", value: Number((30)).toString() },
            ],
    });

    const getAssetLabelByValue = (value) => {
        return assets.items.find((asset) => asset.value === value)?.label;
    }

    const getDaysFromDuration = (duration) => {
        if (duration < 86400) {
            return Number(duration)
        }
        return Number(duration) / 86400;
    }

    const handleClickDeploy = () => {  

        console.log( [
            {
                softCap: parseEther(`${softCap}`),
                deadline: duration,
            },
            {
            name: tokenName,
            symbol: tokenSymbol,
            decimals: tokenDecimals.toString(),
            totalSupply: parseEther(`${Number(tokenSupply)}`),
            maxTotalSupply: parseEther(`${Number(tokenSupply)}`),
            IDOPrice: parseEther(`${Number(price)}`),
            floorPrice: parseEther(`${Number(floorPrice)}`),
            token1: token1,
            feeTier: "3000",
            presale: presale.toString()
            },
        ])

        deployVault()
                
    }



    return (
        <Container maxW="100%" p={0} bg="#0a0a0a" minH="100vh" position="relative" overflow="hidden"> 
            {/* Background Gradient Effects */}
            <Box
                position="absolute"
                top="-20%"
                right="-10%"
                w="500px"
                h="500px"
                bg="radial-gradient(circle, #4ade8020 0%, transparent 70%)"
                filter="blur(100px)"
                pointerEvents="none"
            />
            <Box
                position="absolute"
                bottom="-20%"
                left="-10%"
                w="500px"
                h="500px"
                bg="radial-gradient(circle, #4ade8020 0%, transparent 70%)"
                filter="blur(100px)"
                pointerEvents="none"
            />
            
            <Toaster />
            {!isConnected ? (
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100vh"
                    color="white"
                    bg="#0a0a0a"
                >
                    <VStack spacing={4}>
                        <FaRocket size={60} color="#4ade80" />
                        <Heading as="h2" color="white">Connect your wallet</Heading>
                        <Text color="#888">To launch your token on the protocol</Text>
                    </VStack>
                </Box>
            ) : (            
            <Box
                w="100%"
                bg="#0a0a0a"
                p={isMobile ? 4 : 8}
                position="relative"
                zIndex={1}
                minH="100vh"
                display="flex"
            >
            <Box maxW="1600px" mx="auto" h="100%" display="flex" flexDirection="column">
                {/* Header */}
                {/* <Box mb={12} textAlign="center">
                    <HStack justify="center" mb={4}>
                        <Box
                            p={3}
                            bg="#4ade8020"
                            borderRadius="full"
                            border="1px solid #4ade8040"
                        >
                            <FaRocket size={30} color="#4ade80" />
                        </Box>
                    </HStack>
                    <Heading 
                        as="h1" 
                        size="4xl" 
                        color="white" 
                        mb={4}
                        bgGradient="linear(to-r, white, #4ade80)"
                        bgClip="text"
                        fontWeight="800"
                        letterSpacing="-0.03em"
                    >
                        Token Launchpad
                    </Heading>
                    <Text color="#888" fontSize="xl" maxW="700px" mx="auto" lineHeight="1.6">
                        Deploy your unruggable token with automated liquidity protection and price floor mechanisms
                    </Text>
                </Box> */}

                {/* Enhanced Progress Stepper */}
                <Box mb={6} mt="10px">
                    <Box 
                        bg="linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)" 
                        p={8} 
                        borderRadius="3xl" 
                        border="1px solid #2a2a2a"
                        boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                    >
                        <HStack spacing={8} justify="space-between" position="relative">
                            {/* Progress Line Background */}
                            <Box
                                position="absolute"
                                top="50%"
                                left="10%"
                                right="10%"
                                h="2px"
                                bg="#2a2a2a"
                                transform="translateY(calc(-50% - 20px))"
                                zIndex={0}
                            />
                            {/* Progress Line Fill */}
                            <Box
                                position="absolute"
                                top="50%"
                                left="10%"
                                w={`${Math.min(deployStep / 3 * 80, 80)}%`}
                                h="2px"
                                bg="#4ade80"
                                transform="translateY(calc(-50% - 20px))"
                                transition="width 0.3s ease"
                                zIndex={0}
                            />
                            
                            {[
                                { name: "Token Info", icon: MdToken },
                                { name: "Pool Setup", icon: FaChartLine },
                                { name: "Presale", icon: FaCoins },
                                { name: "Launch", icon: FaRocket }
                            ].map((step, index) => {
                                const Icon = step.icon;
                                const isActive = deployStep === index;
                                const isCompleted = deployStep > index;
                                
                                return (
                                    <VStack key={index} spacing={2} zIndex={1} position="relative">
                                        <Box
                                            position="relative"
                                            w={20}
                                            h={20}
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                        >
                                            {/* Background to hide the line */}
                                            <Box
                                                position="absolute"
                                                w="100%"
                                                h="100%"
                                                bg="#1a1a1a"
                                                borderRadius="full"
                                            />
                                            <Box
                                                position="relative"
                                                w={16}
                                                h={16}
                                                borderRadius="full"
                                                bg={isCompleted ? "#4ade80" : isActive ? "#4ade8040" : "#2a2a2a"}
                                                border={isActive ? "2px solid #4ade80" : "none"}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                transition="all 0.3s ease"
                                                transform={isActive ? "scale(1.1)" : "scale(1)"}
                                            >
                                            {isCompleted ? (
                                                <FaCheckCircle size={24} color="black" />
                                            ) : (
                                                <Icon size={24} color={isActive ? "#4ade80" : "#888"} />
                                            )}
                                            </Box>
                                        </Box>
                                        {!isMobile && (
                                            <Text
                                                color={isActive ? "white" : "#888"}
                                                fontSize="sm"
                                                fontWeight={isActive ? "bold" : "normal"}
                                            >
                                                {step.name}
                                            </Text>
                                        )}
                                    </VStack>
                                );
                            })}
                        </HStack>
                    </Box>
                </Box>
                <Box flex="1">
                <SimpleGrid columns={isMobile ? 1 : [1, 1, 2]} gap={4} h="100%" w="100%" minH="650px" sx={{ '& > div': { minHeight: '100%' } }}>
                    {/* Main Form */}
                    <Box h="100%" display="flex" flexDirection="column">
                        {deployStep == 0 ? (
                        <Box 
                            bg="linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                            p={isMobile ? 8 : 10} 
                            borderRadius="3xl" 
                            border="1px solid #2a2a2a"
                            boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                            position="relative"
                            overflow="hidden"
                            h="100%"
                        >
                            {/* Decorative Element */}
                            <Box
                                position="absolute"
                                top={0}
                                left={0}
                                right={0}
                                h="4px"
                                bgGradient="linear(to-r, #4ade80, #22c55e)"
                            />
                            
                            <HStack mb={4} spacing={4} align="center">
                                <Box p={3} bg="#4ade8020" borderRadius="xl">
                                    <MdToken size={24} color="#4ade80" />
                                </Box>
                                <Box>
                                    <Heading as="h3" size="xl" color="white" fontWeight="700" letterSpacing="-0.02em">
                                        Token Information
                                    </Heading>
                                </Box>
                                <Box>
                                    <Text color="#888" fontSize="md" mt={1}>Define your token's basic properties</Text>
                                </Box>
                            </HStack>
                            <VStack align="stretch" spacing={3} flex="1">
                                <Box>
                                    <HStack mb={2}>
                                        <Box>
                                            <FaTag size={14} color="#888" />
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Token Name</Text>
                                        </Box>
                                    </HStack>
                                    <Box position="relative">
                                        <Input
                                            bg="#0a0a0a"
                                            border="1px solid #2a2a2a"
                                            color="white"
                                            placeholder="e.g. Noma Token"
                                            h="50px"
                                            pl={4}
                                            pr={tokenName ? 12 : 4}
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#4ade80", bg: "#0a0a0a", boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.1)" }}
                                            _placeholder={{ color: "#666" }}
                                            onChange={handleSetTokenName}
                                            value={tokenName}
                                            transition="all 0.2s"
                                        />
                                        {tokenName && (
                                            <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
                                                <FaCheckCircle size={16} color="#4ade80" />
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                <Box>
                                    <HStack mb={2}>
                                        <Box>
                                            <MdToken size={14} color="#888" />
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Token Symbol</Text>
                                        </Box>
                                    </HStack>
                                    <Box position="relative">
                                        <Input
                                            bg="#0a0a0a"
                                            border="1px solid #2a2a2a"
                                            color="white"
                                            placeholder="e.g. NOMA"
                                            h="50px"
                                            pl={4}
                                            pr={tokenSymbol ? 12 : 4}
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#4ade80", bg: "#0a0a0a", boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.1)" }}
                                            _placeholder={{ color: "#666" }}
                                            onChange={handleSetTokenSymbol}
                                            value={tokenSymbol}
                                            textTransform="uppercase"
                                            transition="all 0.2s"
                                        />
                                        {tokenSymbol && (
                                            <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
                                                <FaCheckCircle size={16} color="#4ade80" />
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                                
                                <Box>
                                    <HStack mb={2}>
                                        <Box>
                                            <FaFileAlt size={14} color="#888" />
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Token Description</Text>
                                        </Box>
                                    </HStack>
                                    <Box position="relative">
                                        <Textarea
                                            bg="#0a0a0a"
                                            border="1px solid #2a2a2a"
                                            color="white"
                                            placeholder="Describe your token's purpose and utility (optional)"
                                            minH="100px"
                                            resize="vertical"
                                            pl={4}
                                            pr={4}
                                            py={3}
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#4ade80", bg: "#0a0a0a", boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.1)" }}
                                            _placeholder={{ color: "#666" }}
                                            onChange={handleSetTokenDescription}
                                            value={tokenDescription}
                                            transition="all 0.2s"
                                            maxLength={500}
                                        />
                                        <Box position="absolute" right={3} bottom={3}>
                                            <Text color="#666" fontSize="xs">
                                                {tokenDescription.length}/500
                                            </Text>
                                        </Box>
                                    </Box>
                                </Box>

                                <SimpleGrid columns={2} gap={4}>
                                    <Box>
                                        <HStack mb={2}>
                                            <Box>
                                                <FaLayerGroup size={14} color="#888" />
                                            </Box>
                                            <Box>
                                                <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Decimals</Text>
                                            </Box>
                                        </HStack>
                                        <NumberInputRoot
                                            defaultValue="18"
                                            min={6}
                                            max={18}
                                            onChange={handleSetDecimals}
                                            disabled={true}
                                        >
                                            <NumberInputField 
                                                h="50px" 
                                                bg="#0a0a0a"
                                                border="1px solid #2a2a2a"
                                                color="#666"
                                                _disabled={{ bg: "#0a0a0a", color: "#666", cursor: "not-allowed" }}
                                            />
                                        </NumberInputRoot>
                                    </Box>
                                    <Box>
                                        <HStack mb={2}>
                                            <Box>
                                                <FaCoins size={14} color="#888" />
                                            </Box>
                                            <Box>
                                                <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Enable Presale</Text>
                                            </Box>
                                        </HStack>
                                        <SelectRoot
                                            collection={presaleChoices}
                                            onChange={handleSetPresale}
                                            defaultValue="0"
                                            value={presale}
                                        >
                                            <SelectTrigger 
                                                bg="#0a0a0a"
                                                border="1px solid #2a2a2a"
                                                color="white" 
                                                h="50px"
                                                _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                                _focus={{ borderColor: "#3a3a3a", bg: "#0a0a0a", outline: "none" }}
                                                transition="all 0.2s"
                                                display="flex"
                                                alignItems="center"
                                                px={4}
                                                css={{
                                                    '& [data-part="trigger"]': {
                                                        border: 'none !important',
                                                        outline: 'none !important',
                                                        boxShadow: 'none !important'
                                                    },
                                                    '& input, & select, & > div': {
                                                        border: 'none !important',
                                                        outline: 'none !important',
                                                        boxShadow: 'none !important'
                                                    },
                                                    '&:focus-within': {
                                                        borderColor: '#3a3a3a'
                                                    }
                                                }}
                                            >
                                                <SelectValueText placeholder="Choose option" />
                                            </SelectTrigger>
                                            <SelectContent bg="#1a1a1a" border="1px solid #2a2a2a">
                                                {presaleChoices.items.map((choice) => (
                                                    <SelectItem 
                                                        item={choice} 
                                                        key={choice.value}
                                                        _hover={{ bg: "#2a2a2a" }}
                                                        _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                    >
                                                        {choice.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectRoot>
                                    </Box>
                                    <Box>
                                        <HStack mb={2}>
                                            <Box>
                                                <FaImage size={14} color="#888" />
                                            </Box>
                                            <Box>
                                                <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Token Logo (Optional)</Text>
                                            </Box>
                                        </HStack>
                                        <Box>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                display="none"
                                                id="logo-upload"
                                            />
                                            <label htmlFor="logo-upload">
                                                <Box
                                                    as="div"
                                                    bg="#0a0a0a"
                                                    border="1px solid #2a2a2a"
                                                    borderRadius="lg"
                                                    p={4}
                                                    cursor="pointer"
                                                    _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                                    transition="all 0.2s"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    h="120px"
                                                >
                                                    {logoPreview ? (
                                                        <Box position="relative" w="80px" h="80px">
                                                            <Image
                                                                src={logoPreview}
                                                                alt="Token Logo"
                                                                w="100%"
                                                                h="100%"
                                                                objectFit="cover"
                                                                borderRadius="full"
                                                            />
                                                            <Box
                                                                position="absolute"
                                                                inset={0}
                                                                bg="blackAlpha.600"
                                                                borderRadius="full"
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                opacity={0}
                                                                _hover={{ opacity: 1 }}
                                                                transition="opacity 0.2s"
                                                            >
                                                                <FaUpload size={20} color="white" />
                                                            </Box>
                                                        </Box>
                                                    ) : (
                                                        <VStack spacing={2}>
                                                            <Box
                                                                w="40px"
                                                                h="40px"
                                                                borderRadius="full"
                                                                bg="#2a2a2a"
                                                                display="flex"
                                                                alignItems="center"
                                                                justifyContent="center"
                                                                mt={4}
                                                            >
                                                                <FaUpload size={18} color="#888" />
                                                            </Box>
                                                            <Text color="#888" fontSize="sm" mb={2}>Click to upload logo</Text>
                                                        </VStack>
                                                    )}
                                                </Box>
                                            </label>
                                        </Box>
                                    </Box>
                                </SimpleGrid>
                            </VStack>
                        
                            {error && (
                                <Box mt={4} p={4} bg="#ff000010" borderRadius="lg" border="1px solid #ff000040">
                                    <HStack>
                                        <Box color="#ff6666">
                                            <FaInfoCircle size={16} />
                                        </Box>
                                        <Box>
                                            <Text color="#ff6666" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{error}</Text>
                                        </Box>
                                    </HStack>
                                </Box>
                            )}
                        
                        <HStack justify="space-between" mt={4}>
                            <Box>
                                <Text color="#666" fontSize="xs">
                                    Step 1 of 4
                                </Text>
                            </Box>
                            <HStack gap={3}>
                                {deployStep > 0 && (
                                    <Button 
                                        onClick={handleClickBack} 
                                        bg="transparent"
                                        border="1px solid #2a2a2a"
                                        color="white"
                                        _hover={{ bg: "#1a1a1a", borderColor: "#3a3a3a" }}
                                        px={6}
                                        h="45px"
                                        transition="all 0.2s"
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button 
                                    onClick={handleClickNext} 
                                    bg="#4ade80" 
                                    color="black"
                                    fontWeight="600"
                                    _hover={{ bg: "#22c55e", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(74, 222, 128, 0.3)" }}
                                    _active={{ transform: "translateY(0)" }}
                                    px={8}
                                    h="45px"
                                    transition="all 0.2s"
                                    rightIcon={<FaChartLine />}
                                >
                                    Continue
                                </Button>
                            </HStack>
                        </HStack>
                        </Box>
                    ) : deployStep == 1 ? (
                        <Box 
                            bg="linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                            p={isMobile ? 8 : 10} 
                            borderRadius="3xl" 
                            border="1px solid #2a2a2a"
                            boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                            position="relative"
                            overflow="hidden"
                            h="100%"
                            display="flex"
                            flexDirection="column"
                        >
                            {/* Decorative Element */}
                            <Box
                                position="absolute"
                                top={0}
                                left={0}
                                right={0}
                                h="4px"
                                bgGradient="linear(to-r, #4ade80, #22c55e)"
                            />
                            
                            <HStack mb={4} spacing={4} align="center">
                                <Box p={3} bg="#4ade8020" borderRadius="xl">
                                    <FaChartLine size={24} color="#4ade80" />
                                </Box>
                                <HStack>
                                    <Box>
                                        <Heading as="h3" size="xl" color="white" fontWeight="700" letterSpacing="-0.02em">
                                            Pool Configuration
                                        </Heading>
                                    </Box>
                                    <Box><Text color="#888" fontSize="md" mt={1}>Set pricing and liquidity parameters</Text></Box>
                                </HStack>
                            </HStack>
                        <VStack align="stretch" spacing={5} flex="1">
                            <Box>
                                <HStack mb={2}>
                                    <Box>
                                        <FaTag size={14} color="#888" />
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Floor Price (MON)</Text>
                                    </Box>
                                </HStack>
                                <HStack>
                                    <NumberInputRoot
                                        defaultValue={0.001}
                                        step={Number(0.001)}
                                        min={0.001}
                                        customStep={0.001}
                                        type="price"
                                        setPrice={setPrice}
                                        setFloorPrice={setFloorPrice}
                                        setSupply={null}
                                        targetValue={Number(0.001)}
                                        value={floorPrice}
                                        onChange={() => { 
                                            handleSetPrice(event.target.value);
                                        }}
                                    >
                                        <NumberInputField 
                                            h="50px" 
                                            bg="#0a0a0a" 
                                            border="1px solid #2a2a2a" 
                                            color="white"
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#4ade80", bg: "#0a0a0a", boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.1)" }}
                                            _placeholder={{ color: "#666" }}
                                            transition="all 0.2s"
                                        />
                                    </NumberInputRoot>
                                    <Box bg="#2a2a2a" p={3} borderRadius="lg" border="1px solid #3a3a3a">
                                        <Image
                                            w="24px"
                                            h="24px"
                                            src={monadLogo}
                                            alt="MON"
                                        />
                                    </Box>
                                </HStack>
                            </Box>
                            <Box>
                                <HStack mb={2}>
                                    <Box>
                                        <FaCoins size={14} color="#888" />
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Total Supply</Text>
                                    </Box>
                                </HStack>
                                <HStack>
                                    <NumberInputRoot
                                        defaultValue="1000000"
                                        min={100}
                                        max={10e27}
                                        type="supply"
                                        setTokenSupply={setTokenSupply}
                                        targetValue={tokenSupply}
                                        customStep={1}
                                        onChange={handleSetSupply}
                                        value={commify(tokenSupply, 0)}
                                    >
                                        <NumberInputField 
                                            h="50px" 
                                            bg="#0a0a0a" 
                                            border="1px solid #2a2a2a" 
                                            color="white"
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#4ade80", bg: "#0a0a0a", boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.1)" }}
                                            _placeholder={{ color: "#666" }}
                                            transition="all 0.2s"
                                        />
                                    </NumberInputRoot>
                                    <Box bg="#2a2a2a" p={3} borderRadius="lg" border="1px solid #3a3a3a">
                                        <Image
                                            w="24px"
                                            h="24px"
                                            src={logoPreview || placeholderLogo}
                                            alt="Token"
                                        />
                                    </Box>
                                </HStack>
                            </Box>
                            <Box>
                                <HStack mb={2}>
                                    <Box>
                                        <FaWallet size={14} color="#888" />
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Paired Asset</Text>
                                    </Box>
                                </HStack>
                                <SelectRoot
                                    collection={assets}
                                    onChange={handleSelectAsset}
                                >
                                    <SelectTrigger 
                                        bg="#0a0a0a" 
                                        border="1px solid #2a2a2a" 
                                        color="white" 
                                        h="50px"
                                        _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                        _focus={{ borderColor: "#3a3a3a", bg: "#0a0a0a", outline: "none" }}
                                        transition="all 0.2s"
                                        display="flex"
                                        alignItems="center"
                                        px={4}
                                        css={{
                                            '& [data-part="trigger"]': {
                                                border: 'none !important',
                                                outline: 'none !important',
                                                boxShadow: 'none !important'
                                            },
                                            '& input, & select, & > div': {
                                                border: 'none !important',
                                                outline: 'none !important',
                                                boxShadow: 'none !important'
                                            },
                                            '&:focus-within': {
                                                borderColor: '#3a3a3a'
                                            }
                                        }}
                                    >
                                        <SelectValueText placeholder={assets.items[0]?.label} />
                                    </SelectTrigger>
                                    <SelectContent bg="#1a1a1a" border="1px solid #2a2a2a">
                                        {assets.items.map((asset) => (
                                            <SelectItem 
                                                item={asset} 
                                                key={asset.value}
                                                _hover={{ bg: "#2a2a2a" }}
                                                _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                            >
                                                {asset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectRoot>
                            </Box>
                        </VStack>
                        
                        {/* Enhanced Info Box */}
                        <Box 
                            mt={6} 
                            p={5} 
                            bg="linear-gradient(135deg, #4ade8010 0%, #22c55e10 100%)" 
                            borderRadius="xl"
                            border="1px solid #4ade8040"
                        >
                            <HStack spacing={4}>
                                <Box>
                                    <Text color="#888" fontSize="xs" mb={1}>Initial Price</Text>
                                    <Text color="white" fontSize="lg" fontWeight="bold">
                                        {price || "0"} MON
                                    </Text>
                                </Box>
                                <Box>
                                    <Text color="#888" fontSize="xs" mb={1}>Market Cap</Text>
                                    <Text color="white" fontSize="lg" fontWeight="bold">
                                        ${commify(Number(tokenSupply) * Number(price || 0), 0)}
                                    </Text>
                                </Box>
                            </HStack>
                        </Box>
                    
                    <HStack justify="space-between" mt={4}>
                        <Box>
                            <Text color="#666" fontSize="xs">
                                Step 2 of 4
                            </Text>
                        </Box>
                        <Box>
                            <HStack gap={3}>
                            <Button 
                                onClick={handleClickBack} 
                                bg="transparent"
                                border="1px solid #2a2a2a"
                                color="white"
                                _hover={{ bg: "#1a1a1a", borderColor: "#3a3a3a" }}
                                px={6}
                                h="45px"
                                transition="all 0.2s"
                            >
                                Back
                            </Button>
                            <Button 
                                onClick={handleClickNext} 
                                bg="#4ade80" 
                                color="black"
                                fontWeight="600"
                                _hover={{ bg: "#22c55e", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(74, 222, 128, 0.3)" }}
                                _active={{ transform: "translateY(0)" }}
                                px={8}
                                h="45px"
                                transition="all 0.2s"
                                rightIcon={presale == 0 ? <FaRocket /> : <FaCoins />}
                            >
                                Continue
                            </Button>
                        </HStack>
                        </Box>
                    </HStack>
                </Box>
                ) : deployStep == 2 ? (
                <Box h="100%" display="flex" flexDirection="column">
                    <Box 
                        bg="linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                        p={isMobile ? 8 : 10} 
                        borderRadius="3xl" 
                        border="1px solid #2a2a2a"
                        boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                        position="relative"
                        overflow="hidden"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                    >
                        {/* Decorative Element */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            h="4px"
                            bgGradient="linear(to-r, #4ade80, #22c55e)"
                        />
                        
                        <HStack mb={6} spacing={3}>
                            <Box p={2} bg="#4ade8020" borderRadius="lg">
                                <FaCoins size={24} color="#4ade80" />
                            </Box>
                            <HStack>
                                <Box>
                                <Heading as="h3" size="lg" color="white">
                                    Presale Configuration
                                </Heading>
                                </Box>
                                <Box><Text color="#888" fontSize="sm">Set up your token presale</Text></Box>
                            </HStack>
                        </HStack>
                        {presale == 1 ? (
                            <VStack align="stretch" spacing={3} flex="1">
                                <Box>
                                    <HStack mb={2}>
                                        <Box>
                                            <FaTag size={14} color="#888" />
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Presale Price (MON)</Text>
                                        </Box>
                                    </HStack>
                                    <HStack>
                                        <Input 
                                            bg="#0a0a0a"
                                            border="1px solid #2a2a2a"
                                            color="#666"
                                            h="50px"
                                            value={price}
                                            disabled={true}
                                            _disabled={{ bg: "#0a0a0a", color: "#666", cursor: "not-allowed" }}
                                            transition="all 0.2s"
                                        />
                                        <Box bg="#2a2a2a" p={3} borderRadius="lg" border="1px solid #3a3a3a">
                                            <Image
                                                w="24px"
                                                h="24px"
                                                src={monadLogo}
                                                alt="MON"
                                            />
                                        </Box>
                                    </HStack>
                                </Box>
                                <Box>
                                    <HStack mb={2}>
                                        <Box>
                                            <FaWallet size={14} color="#888" />
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Soft Cap (MON)</Text>
                                        </Box>
                                    </HStack>
                                    <HStack>
                                        <Input
                                            bg="#0a0a0a"
                                            border="1px solid #2a2a2a"
                                            color="white"
                                            h="50px"
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#4ade80", bg: "#0a0a0a", boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.1)" }}
                                            defaultValue={((tokenSupply * 10/100) * price) / 8}
                                            min={((tokenSupply * 10/100) * price) / 8 } 
                                            max={((tokenSupply * 10/100) * price) * 60/100}
                                            onChange={handleSetSoftCap}
                                            value={commify(softCap, 0)}
                                            transition="all 0.2s"
                                        />
                                        <Box bg="#2a2a2a" p={3} borderRadius="lg" border="1px solid #3a3a3a">
                                            <Image
                                                w="24px"
                                                h="24px"
                                                src={monadLogo}
                                                alt="MON"
                                            />
                                        </Box>
                                    </HStack>
                                </Box>                                
                                <Box>
                                    <HStack mb={2}>
                                        <Box>
                                            <FaClock size={14} color="#888" />
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Presale Duration</Text>
                                        </Box>
                                    </HStack>
                                    <SelectRoot
                                        collection={durationChoices}
                                        onChange={handleSetDuration}
                                        value={duration}
                                    >
                                        <SelectTrigger 
                                            bg="#0a0a0a" 
                                            border="1px solid #2a2a2a" 
                                            color="white" 
                                            h="50px"
                                            _hover={{ borderColor: "#3a3a3a", bg: "#1a1a1a" }}
                                            _focus={{ borderColor: "#3a3a3a", bg: "#0a0a0a", outline: "none" }}
                                            transition="all 0.2s"
                                            display="flex"
                                            alignItems="center"
                                            px={4}
                                            sx={{
                                                '& > *': {
                                                    border: 'none !important',
                                                    outline: 'none !important'
                                                }
                                            }}
                                        >
                                            <SelectValueText placeholder={durationChoices.items[0]?.label} />
                                        </SelectTrigger>
                                        <SelectContent bg="#1a1a1a" border="1px solid #2a2a2a">
                                            {durationChoices.items.map((choice) => (
                                                <SelectItem 
                                                    item={choice} 
                                                    key={choice.value}
                                                    _hover={{ bg: "#2a2a2a" }}
                                                    _selected={{ bg: "#2a2a2a", color: "#4ade80" }}
                                                >
                                                    {choice.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectRoot>
                                </Box>
                            </VStack>
                        ) : (
                            <Box p={8} textAlign="center" bg="#0a0a0a" borderRadius="xl" border="1px dashed #2a2a2a">
                                <Box mb={4} color="#666">
                                    <FaInfoCircle size={40} style={{ margin: "0 auto" }} />
                                </Box>
                                <Text color="#888" fontSize="lg" mb={2}>Presale Disabled</Text>
                                <Text color="#666" fontSize="sm">This token will launch directly without a presale phase</Text>
                            </Box>
                        )}
                    </Box>
                    
                    <HStack justify="space-between" mt={4}>
                        <Box>
                            <Text color="#666" fontSize="xs">
                                Step 3 of 4
                            </Text>
                        </Box>
                        <HStack gap={3}>
                            <Button 
                                onClick={handleClickBack} 
                                bg="transparent"
                                border="1px solid #2a2a2a"
                                color="white"
                                _hover={{ bg: "#1a1a1a", borderColor: "#3a3a3a" }}
                                px={6}
                                h="45px"
                                transition="all 0.2s"
                            >
                                Back
                            </Button>
                            <Button 
                                onClick={handleClickNext} 
                                bg="#4ade80" 
                                color="black"
                                fontWeight="600"
                                _hover={{ bg: "#22c55e", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(74, 222, 128, 0.3)" }}
                                _active={{ transform: "translateY(0)" }}
                                px={8}
                                h="45px"
                                transition="all 0.2s"
                                rightIcon={<FaRocket />}
                            >
                                Review & Launch
                            </Button>
                        </HStack>
                    </HStack>
                </Box>
                ) : (
                    <Box h="100%" display="flex" flexDirection="column">
                    <Box 
                        bg="linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                        p={isMobile ? 8 : 10} 
                        borderRadius="3xl" 
                        border="1px solid #2a2a2a"
                        boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                        position="relative"
                        overflow="hidden"
                        flex="1"
                        display="flex"
                        flexDirection="column"
                    >
                        {/* Decorative Element */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            h="4px"
                            bgGradient="linear(to-r, #4ade80, #22c55e)"
                        />
                        
                        <HStack mb={2} spacing={3}>
                            <Box p={2} bg="#4ade8020" borderRadius="lg">
                                <FaRocket size={20} color="#4ade80" />
                            </Box>
                            <Box>
                                <Heading as="h3" size="md" color="white">
                                    Review & Launch
                                </Heading>
                                <Text color="#888" fontSize="xs">Confirm your token details before deployment</Text>
                            </Box>
                        </HStack>

                        {/* Summary Cards */}
                        <VStack align="stretch" spacing={2} mb={2} flex="1">
                            {/* Token Details Card */}
                            <Box 
                                bg="#0a0a0a" 
                                p={3} 
                                borderRadius="xl" 
                                border="1px solid #2a2a2a"
                                transition="all 0.2s"
                                _hover={{ borderColor: "#3a3a3a", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                            >
                                <HStack mb={2} spacing={2} align="center">
                                    <Box>
                                        {logoPreview ? (
                                            <Box
                                                w={10}
                                                h={10}
                                                borderRadius="full"
                                                overflow="hidden"
                                                border="1px solid #2a2a2a"
                                            >
                                                <Image
                                                    src={logoPreview}
                                                    alt="Token Logo"
                                                    w="100%"
                                                    h="100%"
                                                    objectFit="cover"
                                                />
                                            </Box>
                                        ) : (
                                            <MdToken size={24} color="#4ade80" />
                                        )}
                                    </Box>
                                    <Box>
                                        <Text color="#4ade80" fontSize="sm" fontWeight="bold">Token Details</Text>
                                    </Box>
                                </HStack>
                                <SimpleGrid columns={2} gap={2}>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Name</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{tokenName}</Text>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Symbol</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{tokenSymbol}</Text>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Decimals</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{tokenDecimals}</Text>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Total Supply</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{commify(tokenSupply, 0)}</Text>
                                    </Box>
                                </SimpleGrid>
                                {tokenDescription && (
                                    <Box mt={2}>
                                        <Text color="#888" fontSize="xs" mb={1}>Description</Text>
                                        <Text color="white" fontSize="sm" lineHeight="1.5" noOfLines={3}>
                                            {tokenDescription}
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                            
                            {/* Pool Configuration Card */}
                            <Box 
                                bg="#0a0a0a" 
                                p={3} 
                                borderRadius="xl" 
                                border="1px solid #2a2a2a"
                                transition="all 0.2s"
                                _hover={{ borderColor: "#3a3a3a", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                            >
                                <HStack mb={2} spacing={2}>
                                    <Box>
                                        <FaChartLine size={18} color="#4ade80" />
                                    </Box>
                                    <Box>
                                        <Text color="#4ade80" fontSize="sm" fontWeight="bold">Pool Configuration</Text>
                                    </Box>
                                </HStack>
                                <SimpleGrid columns={2} gap={2}>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Floor Price</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{floorPrice} MON</Text>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Initial Price</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{price} MON</Text>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Paired Asset</Text>
                                        <HStack spacing={1}>
                                            <Box>
                                                <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{getAssetLabelByValue(token1)}</Text>
                                            </Box>
                                            <Box>
                                                <Image w="16px" h="16px" src={monadLogo} alt="MON" />
                                            </Box>
                                        </HStack>
                                    </Box>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Market Cap</Text>
                                        <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">
                                            ${commify(Number(tokenSupply) * Number(price || 0), 0)}
                                        </Text>
                                    </Box>
                                </SimpleGrid>
                            </Box>
                            {/* Presale Configuration Card */}
                            {presale == 1 && (
                                <Box 
                                    bg="#0a0a0a" 
                                    p={4} 
                                    borderRadius="xl" 
                                    border="1px solid #2a2a2a"
                                    transition="all 0.2s"
                                    _hover={{ borderColor: "#3a3a3a", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                                >
                                    <HStack mb={2} spacing={2}>
                                        <Box>
                                            <FaCoins size={18} color="#4ade80" />
                                        </Box>
                                        <Box>
                                            <Text color="#4ade80" fontSize="sm" fontWeight="bold">Presale Configuration</Text>
                                        </Box>
                                    </HStack>
                                    <SimpleGrid columns={2} gap={2}>
                                        <Box>
                                            <Text color="#888" fontSize="xs">Presale Price</Text>
                                            <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{commify(price)} MON</Text>
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="xs">Soft Cap</Text>
                                            <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{commify(softCap, 0)} MON</Text>
                                        </Box>
                                        <Box>
                                            <Text color="#888" fontSize="xs">Duration</Text>
                                            <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">{getDaysFromDuration(duration)} days</Text>
                                        </Box>
                                    </SimpleGrid>
                                </Box>
                            )}
                        </VStack>
                        
                        {/* Deployment Fee Notice */}
                        <Box 
                            p={3} 
                            bg="linear-gradient(135deg, #4ade8015 0%, #22c55e15 100%)" 
                            borderRadius="xl" 
                            border="1px solid #4ade8040"
                            position="relative"
                            overflow="hidden"
                        >
                            <Box
                                position="absolute"
                                top={0}
                                left={0}
                                bottom={0}
                                w="4px"
                                bg="#4ade80"
                            />
                            <HStack spacing={3} pl={3}>
                                <Box color="#4ade80">
                                    <FaInfoCircle size={20} />
                                </Box>
                                <Box>
                                    <Text color="white" fontSize="sm" fontWeight="600" letterSpacing="0.02em">Deployment Fee: 1 MON</Text>
                                    <Text color="#888" fontSize="xs">This fee helps maintain the protocol and prevent spam</Text>
                                </Box>
                            </HStack>
                        </Box>
                    </Box>
                    
                    <HStack justify="space-between" mt={4}>
                        <Box>
                            <Text color="#666" fontSize="xs">
                                Final Step
                            </Text>
                        </Box>
                        <HStack gap={3}>
                            <Button 
                                onClick={handleClickBack} 
                                bg="transparent"
                                border="1px solid #2a2a2a"
                                color="white"
                                _hover={{ bg: "#1a1a1a", borderColor: "#3a3a3a" }}
                                px={6}
                                h="45px"
                                transition="all 0.2s"
                            >
                                Back
                            </Button>
                            <Button
                                disabled={deploying}
                                onClick={() => {
                                    try {
                                        handleClickDeploy();
                                    } catch (error) {
                                        console.error("Failed to deploy:", error);
                                    }
                                }}
                                isLoading={deploying}
                                bg="#4ade80" 
                                color="black"
                                fontWeight="600"
                                _hover={{ bg: "#22c55e", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(74, 222, 128, 0.3)" }}
                                _active={{ transform: "translateY(0)" }}
                                _disabled={{ bg: "#2a2a2a", color: "#666", transform: "none", boxShadow: "none" }}
                                px={8}
                                h="45px"
                                minW="150px"
                                transition="all 0.2s"
                                leftIcon={!deploying && <FaRocket />}
                            >
                                {deploying ? <><Spinner size="sm" mr={2} /> Deploying...</> : "Deploy Token"}
                            </Button>
                        </HStack>
                    </HStack>
                </Box>
                )}
            </Box>
            
            {/* Live Preview Card - Desktop Only */}
            {!isMobile && deployStep != 3 && (
                <Box h="100%" display="flex" flexDirection="column">
                    <Box
                        bg="linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                        p={8}
                        borderRadius="3xl"
                        border="1px solid #2a2a2a"
                        boxShadow="0 10px 30px rgba(0, 0, 0, 0.5)"
                        position="relative"
                        overflow="hidden"
                        h="100%"
                        display="flex"
                        flexDirection="column"
                    >
                        {/* Decorative Element */}
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            h="4px"
                            bgGradient="linear(to-r, #4ade80, #22c55e)"
                        />
                        
                        {/* Preview Header */}
                        <HStack mb={8} spacing={4} align="center">
                            <Box p={3} bg="#4ade8020" borderRadius="xl">
                                <FaInfoCircle size={24} color="#4ade80" />
                            </Box>
                            <Box>
                                <Text color="white" fontSize="xl" fontWeight="700" letterSpacing="-0.02em">Live Preview</Text>
                            </Box>
                            <Box>
                                <Text color="#888" fontSize="md" mt={1}>Your token visualization</Text>
                            </Box>
                        </HStack>
                        
                        {/* Token Logo Placeholder */}
                        <VStack spacing={6}>
                            <Box
                                w="120px"
                                h="120px"
                                bg="#0a0a0a"
                                borderRadius="full"
                                border="2px solid #2a2a2a"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                position="relative"
                                overflow="hidden"
                            >
                                <Box
                                    position="absolute"
                                    inset={0}
                                    bgGradient="linear(to-br, #4ade8040, transparent)"
                                />
                                {logoPreview ? (
                                    <Image
                                        src={logoPreview}
                                        alt="Token Logo"
                                        w="100%"
                                        h="100%"
                                        objectFit="cover"
                                    />
                                ) : tokenSymbol ? (
                                    <Text color="#4ade80" fontSize="3xl" fontWeight="bold">
                                        {tokenSymbol.slice(0, 3).toUpperCase()}
                                    </Text>
                                ) : (
                                    <MdToken size={50} color="#4ade80" />
                                )}
                            </Box>
                            
                            {/* Token Info */}
                            <VStack spacing={1}>
                                <Text color="white" fontSize="2xl" fontWeight="bold">
                                    {tokenName || "Your Token"}
                                </Text>
                                <Text color="#888" fontSize="lg">
                                    {tokenSymbol ? `$${tokenSymbol.toUpperCase()}` : "TOKEN"}
                                </Text>
                            </VStack>
                            
                            {/* Stats Grid */}
                            <SimpleGrid columns={2} gap={4} w="100%">
                                <Box bg="#0a0a0a" p={4} borderRadius="lg" border="1px solid #2a2a2a">
                                    <Text color="#888" fontSize="xs" mb={1}>Supply</Text>
                                    <Text color="white" fontSize="sm" fontWeight="600">
                                        {tokenSupply ? commify(tokenSupply, 0) : "0"}
                                    </Text>
                                </Box>
                                <Box bg="#0a0a0a" p={4} borderRadius="lg" border="1px solid #2a2a2a">
                                    <Text color="#888" fontSize="xs" mb={1}>Initial Price</Text>
                                    <Text color="white" fontSize="sm" fontWeight="600">
                                        {price || "0"} MON
                                    </Text>
                                </Box>
                                <Box bg="#0a0a0a" p={4} borderRadius="lg" border="1px solid #2a2a2a">
                                    <Text color="#888" fontSize="xs" mb={1}>Market Cap</Text>
                                    <Text color="white" fontSize="sm" fontWeight="600">
                                        ${commify(Number(tokenSupply || 0) * Number(price || 0), 0)}
                                    </Text>
                                </Box>
                                <Box bg="#0a0a0a" p={4} borderRadius="lg" border="1px solid #2a2a2a">
                                    <Text color="#888" fontSize="xs" mb={1}>Floor Price</Text>
                                    <Text color="white" fontSize="sm" fontWeight="600">
                                        {floorPrice || "0"} MON
                                    </Text>
                                </Box>
                            </SimpleGrid>
                            
                            {/* Progress Indicator */}
                            <Box w="100%" pt={4}>
                                <HStack justify="space-between" mb={2}>
                                    <Box>
                                        <Text color="#888" fontSize="xs">Progress</Text>
                                    </Box>
                                    <Box>
                                        <Text color="#4ade80" fontSize="xs" fontWeight="600">
                                            {Math.round(calculateProgress())}%
                                        </Text>
                                    </Box>
                                </HStack>
                                <Box w="100%" h="8px" bg="#0a0a0a" borderRadius="full" overflow="hidden" position="relative">
                                    <Box
                                        position="absolute"
                                        top="0"
                                        left="0"
                                        w={`${calculateProgress()}%`}
                                        h="100%"
                                        bg="#4ade80"
                                        transition="width 0.3s ease"
                                        borderRadius="full"
                                    ></Box>
                                </Box>
                            </Box>
                        </VStack>
                    </Box>
                </Box>
            )}
            </SimpleGrid>
            </Box>
            </Box>
            </Box>
            )}
        </Container>
    );
};

export default Launchpad;
 