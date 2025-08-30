import React, { useEffect, useState } from "react";
import {
  Container,
  VStack,
  Box,
  SimpleGrid,
  Heading,
  Text,
  Button,
  HStack,
  Image,
  Link,
  Select,
  Spinner,
  createListCollection,
  GridItem
} from "@chakra-ui/react";
import { useAccount, useContractRead } from "wagmi";
import { Toaster } from "../components/ui/toaster";
import { ethers } from "ethers";
const { JsonRpcProvider } = ethers.providers;
const { formatEther } = ethers.utils;
import { isMobile } from "react-device-detect";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';
import { commify, commifyDecimals } from "../utils";
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";
import LiquidityChart from "../components/LiquidityChart";
// import { set } from "react-ga";
import {getContractAddress} from "../utils";
import config from '../config'; 
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";
import addressesBsc   from "../assets/deployment.json";
import axios from 'axios';
import { useLocation } from 'react-router-dom';

import ModelHelperArtifact from "../assets/ModelHelper.json";
const ModelHelperAbi = ModelHelperArtifact.abi;

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

const addressModelHelper = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "ModelHelper");

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  config.RPC_URL
);

// Import the NomaFactory artifact and extract its ABI
import NomaFactoryArtifact from "../assets/NomaFactory.json";
const NomaFactoryAbi = NomaFactoryArtifact.abi;

const uniswapV3FactoryABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

const ERC20Abi = [
    "function totalSupply() view returns (uint)",
    "function balanceOf(address) view returns (uint)",
];

// NomaFactory contract address
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
const feeTier = 3000;

const Liquidity: React.FC = () => {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const screenOrientation = useScreenOrientation();
  const isLandscape = screenOrientation.includes("landscape");
  const [vaultDescriptions, setVaultDescriptions] = useState([]);
  const [errorDeployed, setErrorDeployed] = useState(false);
  const [vaultData, setVaultData] = useState({});
  const [liquidityRatio, setLiquidityRatio] = useState(0);
  const [underlyingBalances, setUnderlyingBalances] = useState({});
  const [circulatingSupply, setCirculatingSupply] = useState(0);
  const [spotPrice, setSpotPrice] = useState(0);
  const [capacity, setCapacity] = useState({});
  const [feesToken0, setFeesToken0] = useState(0);
  const [feesToken1, setFeesToken1] = useState(0);
  const [priceUSD, setPriceUSD] = useState("0.00000000000");
  const [selectedDestination, setSelectedDestination] = useState("/liquidity");
  const [token1Symbol, setToken1Symbol] = useState("MON");
  
  // Get selected vault from URL params
  const searchParams = new URLSearchParams(location.search);
  const selectedVault = searchParams.get('vault') || '';

  const _navigationSelectData = {
    items: [
      {
        label: "Exchange",
        value: "/",
      },
      {
        label: "Markets",
        value: "/markets",
      },
      {
        label: "Borrow",
        value: `/borrow?v=${selectedVault}`,
      },
      {
        label: "Stake",
        value: `/stake?v=${selectedVault}`,
      },
    ],
  };

  const {
    data: imv
  } = useContractRead({
    address: addressModelHelper,
    abi: ModelHelperAbi,
    functionName: "getIntrinsicMinimumValue",
    args: [selectedVault],
    watch: true,
  });

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const cached = localStorage.getItem('bnb_usd_price');
        const cacheTime = localStorage.getItem('bnb_usd_price_time');

        // Check if cache exists and is fresh (less than 5 minutes old)
        if (cached && cacheTime && Date.now() - Number(cacheTime) < 5 * 60 * 1000) {
          setPriceUSD(Number(cached).toFixed(11));
          return;
        }

        const url = 'https://api.coingecko.com/api/v3/simple/price';

        const params = {
          ids: 'binancecoin',
          vs_currencies: 'usd',
        };

        const headers = {
          'x-cg-demo-api-key': process.env.VITE_CG_API_KEY,
        };
  
        const response = await axios.get(url, { params, headers });

        console.log(response)
        console.log(response.data)

        const freshPrice = response.data['binancecoin'].usd;

        // // Save to state and cache
        setPriceUSD(Number(freshPrice).toFixed(11));

        localStorage.setItem('bnb_usd_price', freshPrice);
        localStorage.setItem('bnb_usd_price_time', Date.now().toString());

      } catch (err) {
        console.log('Error fetching BNB price:', err.message);
        // Set a default price if fetch fails
        setPriceUSD("600.00000000000"); // Default BNB price
      }
    };

    fetchPrice();
  }, [spotPrice]);

  const fetchPoolAddress = async (token0: string, token1: string) => {
    const uniswapV3FactoryContract = new ethers.Contract(
      config.protocolAddresses.uniswapV3Factory,
      uniswapV3FactoryABI,
      localProvider
    );

    const poolAddress = await uniswapV3FactoryContract.getPool(token0, token1, feeTier);

    return poolAddress;
  };

  /**
   * Fetch vault descriptions to display token info
   */
  const {
    data: deployersData,
    isError: isAllVaultsError,
  } = useContractRead({
    address: nomaFactoryAddress,
    abi: NomaFactoryAbi,
    functionName: "getDeployers",
    enabled: selectedVault !== '',
  });

  useEffect(() => {
    if (typeof deployersData !== "undefined" && selectedVault) {
      const nomaFactoryContract = new ethers.Contract(
        nomaFactoryAddress,
        NomaFactoryAbi,
        localProvider
      );

      const fetchVaultDescriptions = async () => {
        try {
          const allVaultDescriptions = [];

          // Iterate over deployers
          for (const deployer of deployersData) {
            const vaultsData = await nomaFactoryContract.getVaults(deployer);

            // Iterate over vaults for each deployer
            for (const vault of vaultsData) {
              const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);

              // Convert Proxy(_Result) to a plain object
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
              
              if (config.environment != "dev") {
                if (plainVaultDescription.tokenSymbol != "OKS") {
                  continue;
                }
              }

              const poolAddress = await fetchPoolAddress(plainVaultDescription.token0, plainVaultDescription.token1);

              // Create a new object with the additional poolAddress property
              const augmentedVaultDescription = {
                ...plainVaultDescription, // Retains all original keys
                poolAddress, // Add poolAddress to the object
              };

              allVaultDescriptions.push(augmentedVaultDescription);
            }
          }

          // Update state with all vault descriptions
          setVaultDescriptions(allVaultDescriptions);
            
        } catch (error) {
          console.error("Error fetching vault descriptions:", error);
        }
      };

      fetchVaultDescriptions();
    }
  }, [deployersData, selectedVault]);


  useEffect(() => {
    const fetchVaultInfo = async () => {
      setErrorDeployed(false);
      try {
        if (selectedVault === "") {
          console.log("Selected vault is empty. Skipping fetch.");
          return;
        }
  
        // Dynamically import the required JSONs based on the network
        const Vault = await import(`../assets/BaseVault.json`);
        const VaultAbi = Vault.abi;
  
        const VaultContract = new ethers.Contract(
          selectedVault,
          VaultAbi,
          localProvider
        );
  
        let data = {};
  
        const vaultInfo = await VaultContract.getVaultInfo();
        
        // Destructure the VaultInfo struct
        const liquidityRatio = vaultInfo.liquidityRatio;
        const circulatingSupply = vaultInfo.circulatingSupply;
        const spotPriceX96 = vaultInfo.spotPriceX96;
        const anchorCapacity = vaultInfo.anchorCapacity;
        const floorCapacity = vaultInfo.floorCapacity;
        const token0Address = vaultInfo.token0;
        const token1Address = vaultInfo.token1;
        const newFloorPrice = vaultInfo.newFloor;
  
        console.log("Vault Info Response:", {
          liquidityRatio: liquidityRatio.toString(),
          circulatingSupply: circulatingSupply.toString(),
          spotPriceX96: spotPriceX96.toString(),
          anchorCapacity: anchorCapacity.toString(),
          floorCapacity: floorCapacity.toString(),
          token0Address,
          token1Address,
          newFloorPrice: newFloorPrice.toString()
        });
        
        setCirculatingSupply(circulatingSupply);
        
        // Convert spot price from wei to ether
        if (spotPriceX96 && !spotPriceX96.isZero()) {
          // The value is in wei, convert to ether
          const spotPriceFormatted = parseFloat(ethers.utils.formatEther(spotPriceX96));
          
          console.log("Spot price:", {
            spotPriceWei: spotPriceX96.toString(),
            spotPriceEther: spotPriceFormatted
          });
          
          setSpotPrice(spotPriceFormatted);
          
          // Debug log for display values
          console.log("Price display debug:", {
            spotPrice: spotPriceFormatted,
            priceUSD: priceUSD,
            displayValue: spotPriceFormatted * parseFloat(priceUSD)
          });
        } else {
          console.log("Spot price is zero or invalid");
          setSpotPrice(0);
        }
        
        setCapacity({
          anchor: anchorCapacity,
          floor: floorCapacity
        });
  
        const token0Contract = new ethers.Contract(
          token0Address,
          ERC20Abi,
          localProvider
        );
  
        const token1Contract = new ethers.Contract(
          token1Address,
          ERC20Abi,
          localProvider
        );
  
        const token0BalanceVault = await token0Contract.balanceOf(selectedVault);
        const token1BalanceVault = await token1Contract.balanceOf(selectedVault);
  
        setUnderlyingBalances({
          token0: token0BalanceVault,
          token1: token1BalanceVault
        });
  
        const [lowerTickFloor, upperTickFloor, amount0Floor, amount1Floor] =
          await VaultContract.getUnderlyingBalances(0);
  
        const [lowerTickAnchor, upperTickAnchor, amount0Anchor, amount1Anchor] =
          await VaultContract.getUnderlyingBalances(1);
  
        const [lowerTickDiscovery, upperTickDiscovery, amount0Discovery, amount1Discovery] =
          await VaultContract.getUnderlyingBalances(2);
  
        data["Floor"] = {
          lowerTick: lowerTickFloor,
          upperTick: upperTickFloor,
          amount0: amount0Floor,
          amount1: amount1Floor
        };
  
        data["Anchor"] = {
          lowerTick: lowerTickAnchor,
          upperTick: upperTickAnchor,
          amount0: amount0Anchor,
          amount1: amount1Anchor
        };
  
        data["Discovery"] = {
          lowerTick: lowerTickDiscovery,
          upperTick: upperTickDiscovery,
          amount0: amount0Discovery,
          amount1: amount1Discovery
        };
        
        console.log(data);

        setVaultData(data);
        setLiquidityRatio(liquidityRatio);
  
        // Uncomment if you want to fetch fees
        // const [feesToken0, feesToken1] = await VaultContract.getAccumulatedFees();
        // setFeesToken0(feesToken0);
        // setFeesToken1(feesToken1);
  
      } catch (error) {
        console.error(`Failed to fetch vault info: ${error}`);
        setErrorDeployed(true);
      }
    };
  
    if (selectedVault !== "") {
      fetchVaultInfo();
      const intervalId = setInterval(fetchVaultInfo, 5000);
  
      // Clear the interval when the component unmounts or when selectedVault changes
      return () => clearInterval(intervalId);
    }
  
  }, [selectedVault]); // Only run this effect when selectedVault changes


  const handleSelectDestination = (details) => {
      console.log(`Selected destination:`, details);
      const value = details.value?.[0] || details.value || details.target?.value;
      if (value) {
        window.location = value;
      }
  }
    

  return (
    <Container maxW="100%" p={0} bg="#0a0a0a" minH="100vh">
      <Toaster />

      {isMobile && isLandscape ? (
        <RotateDeviceMessage />
      ) : (
        <Box w="100%" bg="#0a0a0a" p={isMobile ? 4 : 8}>
          <Box maxW="1600px" mx="auto">
            {/* Header with navigation */}



            {/* Main content area */}
            {!errorDeployed ? (
              selectedVault ? (
                <Box bg="#1a1a1a" borderRadius="xl" p={isMobile ? 4 : 8} minH="600px">
                  <LiquidityChart
                    isConnected={isConnected}
                    data={vaultData}
                    spotPrice={spotPrice}
                    priceUSD={priceUSD}
                    imvPrice={imv}
                    circulatingSupply={circulatingSupply}
                    liquidityRatio={liquidityRatio}
                    capacity={capacity}
                    accumulatedFees={[feesToken0, feesToken1]}
                    underlyingBalances={underlyingBalances}
                    tokenName={vaultDescriptions.find((vault) => vault.vault === selectedVault)?.tokenName}
                    tokenSymbol={vaultDescriptions.find((vault) => vault.vault === selectedVault)?.tokenSymbol}
                  />
                </Box>
              ) : (
                <Box bg="#1a1a1a" borderRadius="xl" p={20} textAlign="center">
                  <Text color="#888" fontSize="lg">Select a vault to view liquidity analytics</Text>
                </Box>
              )
            ) : (
              <Box bg="#1a1a1a" borderRadius="xl" p={20} textAlign="center">
                <Text color="#888" fontSize="lg">Failed to fetch vault info. Please try again later.</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default Liquidity;