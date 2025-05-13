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
import bnbLogo from "../assets/images/bnb.png";
import config from '../config';
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesMonad;

const { environment, presaleContractAddress } = config;

const FactoryArtifact = await import(`../assets/OikosFactory.json`);
const FactoryAbi = FactoryArtifact.abi;
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");

const Launchpad: React.FC = () => {
    const { address, isConnected } = useAccount();
    const [deployStep, setDeployStep] = useState(0);
    const [tokenName, setTokenName] = useState("");
    const [tokenSymbol, setTokenSymbol] = useState("");
    const [tokenDecimals, setTokenDecimals] = useState("18");
    const [tokenSupply, setTokenSupply] = useState("100");

    const [price, setPrice] = useState("0");
    const [floorPrice, setFloorPrice] = useState("0");
    const [presalePrice, setPresalePrice] = useState("0");

    const [token1, setToken1] = useState("0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701");
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
        gas: 40000000, // Increase gas limit
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
            { label: "WBNB", value: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" }, // WBNB
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
        <Container maxW="container.xl" py={12}> 
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
                w="95%"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                textAlign="left"
                position="relative"
                mt={50}
                mb={"30%"}
            >
            <SimpleGrid columns={1} w="100%" ml={isMobile?"2vh":"20vw"}>
                {/* <Heading as={"h3"}>
                    Launchpad
                    <Text>Launch your Unruggable & Up only token 🚀</Text>
                </Heading> */}
                {deployStep == 0 ? (
                <SimpleGrid columns={1} w="100%" mt={20}>
                    <Box border="1px solid gray" p={8} borderRadius={20} w={isMobile ? "auto" : "80%"} h="400px" backgroundColor="#222831">
                        <Heading as={"h4"} color="white" mr={8}>
                            <HStack>
                                <Text fontSize={"21px"} color="#d6a700">Step 1 - </Text>Token Info
                            </HStack>
                        </Heading>
                        <Box w={"100%"}>
                            <HStack>
                                <Box w={{ base: "180px", lg: "120px" }}>Name</Box>
                                <Box>
                                    <Input
                                        border={isFirstSel == true ? "1px solid #00FF00" : "1px solid #000000"}
                                        id="name"
                                        placeholder="e.g. Oikos Token"
                                        h={"40px"}
                                        w={{ base: "", lg: "200px" }}
                                        onChange={handleSetTokenName}
                                        onClick={() => setIsFirstSel(true)}
                                        value={tokenName}
                                    />
                                </Box>
                            </HStack>
                        </Box>
                        <Box w={"100%"}>
                            <HStack>
                                <Box w={{ base: "180px", lg: "120px" }}>Symbol</Box>
                                <Box mt={2}>
                                    <Input
                                        id="symbol"
                                        placeholder="e.g. OKS"
                                        h={"40px"}
                                        w={{ base: "", lg: "200px" }}
                                        onChange={handleSetTokenSymbol}
                                        value={tokenSymbol}
                                    />
                                </Box>
                            </HStack>
                        </Box>

                        <Box w={"100%"} mt={2}>
                            <HStack>
                                <Box w={{ base: "180px", lg: "115px" }}>Decimals</Box>
                                <Box>
                                    <NumberInputRoot
                                        isMobile={isMobile}
                                        defaultValue="18"
                                        min={6}
                                        max={18}
                                        onChange={handleSetDecimals}
                                        ml={isMobile ? 0 : 1.5}
                                        marginRight={"5px"}
                                        disabled={true}
                                    >
                                        <NumberInputLabel h={"40px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"40px"} w={{ base: "", lg: "200px" }} />
                                    </NumberInputRoot>
                                </Box>
                            </HStack>
                        </Box>
                        <Box w={"100%"} >
                        <HStack>
                            <Box w={{ base: "180px", lg: "100px" }}>
                                <Text>Presale</Text>
                            </Box>
                            <Box>
                            <SelectRoot
                                ml={5}
                                mb={2}
                                collection={presaleChoices}
                                size="sm"
                                width={"200px"}
                                onChange={handleSetPresale}
                                defaultValue={"0"} // Set the default value to "0" (No)
                                value={presale}
                                border="2px solid white"
                            >
                                <SelectTrigger>
                                    <SelectValueText placeholder="Choose option" />
                                </SelectTrigger>
                                <SelectContent style={{borderColor:"white"}}>
                                    {presaleChoices.items.map((choice) => (
                                        <SelectItem item={choice} key={choice.value}>
                                            {choice.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectRoot>
                            </Box>
                        </HStack>
                        </Box>
                        <Box color="red" mt={5}>
                            <Text fontSize={"16px"}>{error}</Text>
                        </Box>
                    </Box>
                    {deployStep > 0 ? (
                        <Button onClick={handleClickBack} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"} ml={10} mr={2}>Back</Button>
                    ) : <></>}
                    <Button onClick={handleClickNext} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"} ml={10}>Next</Button>
                </SimpleGrid>
                ) : deployStep == 1 ? (
                    <>
                    <Box border="1px solid gray" p={8} borderRadius={20} w={isMobile ? "auto" : "80%"} h="350px" backgroundColor="#222831"  mt={"80px"}>
                        <Heading as={"h4"} color="white" mr={8}>
                            <HStack>
                                <Text fontSize={"21px"} color="#d6a700">Step 2 - </Text>Pool Info
                            </HStack>
                        </Heading>
                        <Box w={"100%"}>
                        <HStack>
                                <Box w={{ base: "180px", lg: "120px" }}>Floor Price</Box>
                                <Box>
                                    <NumberInputRoot
                                        id="floorPrice"
                                        isMobile={isMobile}
                                        defaultValue={0.001}
                                        step={Number(0.001)}
                                        min={0.001}
                                        customStep={0.001}
                                        marginRight={"5px"}
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
                                        <NumberInputLabel h={"40px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"40px"} w={{ base: "", lg: "200px" }} />
                                    </NumberInputRoot>
                                </Box>
                                <Box>
                                <Image
                                    w="25px"
                                    src={bnbLogo}
                                    alt="reserve asset logo"
                                    mt={-2}
                                    ml={2}
                                    />
                                </Box>                                        
                            </HStack>
                            <HStack>
                                <Box w={{ base: "180px", lg: "95px" }}>Supply</Box>
                                <Box>
                                    <NumberInputRoot
                                        id="supply"
                                        isMobile={isMobile}
                                        marginRight={"5px"}
                                        defaultValue="1000000"
                                        min={100}
                                        max={10e27}
                                        ml={isMobile ? 0 : "25px"}
                                        type="supply"
                                        setTokenSupply={setTokenSupply}
                                        targetValue={tokenSupply}
                                        customStep={1}
                                        onChange={handleSetSupply}
                                        value={commify(tokenSupply, 0)}
                                    >
                                        <NumberInputLabel h={"40px"} w={{ base: "", lg: "auto" }} />
                                        <NumberInputField h={"40px"} w={{ base: "", lg: "200px" }} />
                                    </NumberInputRoot>
                                </Box>
                                <Box>
                                <Image
                                    w="25px"
                                    src={placeholderLogo}
                                    alt="asset logo"
                                    ml={2}
                                    mt={-2}
                                    />
                                </Box>                                     
                            </HStack>
                        </Box>
                        <Box w={"100%"}>
                            <HStack>
                                <Box w={{ base: "120px", lg: "120px" }}>Asset</Box>
                                <Box>
                                <SelectRoot
                                    collection={assets}
                                    size="sm"
                                    ml={isMobile? "-30px": 0}
                                    width={isMobile?"185px":"200px"}
                                    onChange={handleSelectAsset}
                                    border="2px solid white"
                                >
                                    <SelectTrigger>
                                    {assets.items.map((data, index) => {
                                            if (index > 0) return;
                                            return (
                                                <SelectValueText placeholder={data.label}>
                                                </SelectValueText>
                                            );
                                            })}  
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assets.items.map((asset) => (
                                            <SelectItem item={asset} key={asset.value}>
                                                {asset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectRoot>
                                </Box>
                            </HStack>
                        </Box>
                    </Box>
                    <Box>
                        {deployStep > 0 ? (
                            <Button onClick={handleClickBack} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"} mr={2} ml={10}>Back</Button>
                        ) : <></>}
                        <Button onClick={handleClickNext} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"}>Next</Button>
                    </Box>
                    </>
                ) : (deployStep == 2 ? (
                <>
                    <Box border="1px solid gray" p={8} borderRadius={20} w={isMobile ? "auto" : "80%"} h="350px"  backgroundColor="#222831" mt={"80px"}>
                        <Heading as={"h4"} color="white" mr={8}>
                            <HStack>
                                <Text fontSize={"21px"} color="#d6a700">Step 3 - </Text>Presale Info
                            </HStack>
                        </Heading>
                        <Box w={"100%"}>
                        {presale == 1 && (
                            <>
                            <HStack>
                            <Box w={{ base: "180px", lg: "140px" }}>Presale price</Box>
                                <Box>
                                    <Input 
                                        id="presalePrice"
                                        placeholder="e.g. 0.001"
                                        h={"40px"}
                                        w={{ base: "", lg: "200px" }}
                                        // onChange={handleSetPrice}
                                        value={price}
                                        disabled={true}
                                    />
                                </Box>
                                <Box>
                                <Image
                                    w="25px"
                                    src={bnbLogo}
                                    alt="reserve asset logo"
                                    ml={2}
                                    />
                                </Box> 
                            </HStack>
                            <HStack mt={2}>
                                <Box w={{ base: "180px", lg: "115px" }}>Soft Cap</Box> 
                                <Box>
                                    <Input
                                        id="softcap"
                                        w={{ base: "", lg: "200px" }}
                                        h="40px"
                                        // isMobile={isMobile}
                                        // marginRight={"5px"}
                                        defaultValue={((tokenSupply * 10/100) * price) / 8}
                                        min={((tokenSupply * 10/100) * price) / 8 } 
                                        max={((tokenSupply * 10/100) * price) * 60/100}
                                        ml={isMobile ? 0 : "25px"}
                                        // setTokenSupply={(()=>{})}
                                        // targetValue={softCap}
                                        // customStep={1}
                                        onChange={handleSetSoftCap}
                                        value={commify(softCap, 0)}
                                    />
                                </Box>
                                <Box>
                                <Image
                                    w="25px"
                                    src={bnbLogo}
                                    alt="reserve asset logo"
                                    ml={2}
                                    />
                                </Box> 
                            </HStack>                                
                            <HStack mt={2}>
                                <Box w={{ base: "100x", lg: "140px" }}>Duration</Box>
                                <Box>
                                <SelectRoot
                                    mt={1}
                                    ml={isMobile?25:0}
                                    collection={durationChoices}
                                    size="sm"
                                    width={isMobile?"180px":"200px"}
                                    onChange={handleSetDuration}
                                    value={duration}
                                    border="2px solid white"
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
                                    </SelectRoot>
                                </Box>
                            </HStack>                  
                            </>
                        )}
                        </Box>
                        </Box>
                        <Box>
                        {deployStep > 0 ? (
                            <Button onClick={handleClickBack} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"} mr={2} ml={10}>Back</Button>
                        ) : <></>}
                        <Button onClick={handleClickNext} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"}>Next</Button>
                    </Box>                            
                </>
                ) : 
                    <Box >
                    <Box border="1px solid gray" p={8} borderRadius={20} w={isMobile ? "auto" : "80%"} h="450px" backgroundColor="#222831" mt={"80px"}>
                        <Heading as={"h4"} color="white" mr={8}>
                            <HStack>
                                <Text fontSize={"21px"} color="#d6a700">Step {presale == 0 ? "3" : "4"} - </Text>Confirm {isMobile ? "" : "Deploy"}
                            </HStack>
                        </Heading>

                        <Box w={"100%"}>
                            <HStack>
                                <Box w={{ base: "120px", lg: "140px" }}>Name</Box>
                                <Box>
                                    <Text>{tokenName}</Text>
                                </Box>
                            </HStack>
                            <HStack>
                                <Box w={{ base: "120px", lg: "140px" }}>Symbol</Box>
                                <Box>
                                    <Text>{tokenSymbol}</Text>
                                </Box>
                            </HStack>
                            <HStack>
                                <Box w={{ base: "120px", lg: "140px" }}>Logo</Box>
                                <Box >
                                    <Image h={4} src={placeholderLogo} />
                                </Box>
                            </HStack>
                            <HStack>
                                <Box w={{ base: "120px", lg: "140px" }}>Decimals</Box>
                                <Box>
                                    <Text>{tokenDecimals}</Text>
                                </Box>
                            </HStack>
                            <HStack>
                            <Box w={{ base: "120px", lg: "140px" }}>Floor Price</Box>
                            <Box>
                                <Text>{floorPrice}</Text>
                            </Box>
                            <Box>
                                <Text>WBNB</Text>
                            </Box>
                            </HStack>
                            {presale == 1 ? (
                            <>
                            <HStack>
                            <Box w={{ base: "120px", lg: "140px" }}>Presale Price</Box>
                            <Box>
                                <Text>{commify(price)}</Text>
                            </Box>
                            <Box>
                                <Text>WBNB</Text>
                            </Box>
                            </HStack> 
                            <HStack>
                            <Box w={{ base: "120px", lg: "140px" }}>Soft Cap</Box>
                            <Box>
                                <Text>{commify(softCap, 0)}</Text>
                            </Box>
                            <Box>
                                <Text>WBNB</Text>
                            </Box>
                            </HStack>
                            <HStack>
                            <Box w={{ base: "120px", lg: "140px" }}>Duration</Box>
                            <Box>
                                <Text>{getDaysFromDuration(duration)} days</Text>
                            </Box>
                            </HStack>
                            </>                                                              
                            ) : 
                            <></>}
                            <HStack>
                                <Box w={{ base: "120px", lg: "140px" }}>Supply</Box>
                                <Box>
                                    <Text>{commify(tokenSupply, 0)}</Text>
                                </Box>
                                <Box>
                                    <Text>{tokenName}</Text>
                                </Box>
                            </HStack>
                            <HStack>
                                <Box w={{ base: "120px", lg: "140px" }}>Asset</Box>
                                <Box>
                                {isMobile ? <>{`${getAssetLabelByValue(token1)} `}</> :
                                    <Text>{`${getAssetLabelByValue(token1)} (${token1?.slice(0, 6)}...${token1?.slice(-6)})`}</Text>}
                                </Box>
                                <Box>
                                <Image
                                w="25px"
                                src={bnbLogo}
                                alt="reserve asset logo"
                                ml={2}
                                />
                                </Box>
                            </HStack>
                        </Box>
                    </Box>
                    {deployStep == 3 ? (
                        <HStack>
                            <Button onClick={handleClickBack} mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"} ml={10}>Back</Button>
                            <Button
                            disabled={deploying}
                                onClick={() => {
                                    try {
                                        handleClickDeploy();
                                    } catch (error) {
                                        console.error("Failed to contribute:", error);
                                    }
                                }}
                                isLoading={deploying}
                                mt={5} colorScheme="green" w={isMobile ? "120px" : "10%"}>
                                    {deploying ? <Spinner size="sm" /> : "Deploy"}
                                </Button>
                        </HStack>
                    ) : <></>}
                    </Box>
                )}
            </SimpleGrid>
            </Box>)}
        </Container>
    );
};

export default Launchpad;
 