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
import { isMobile } from "react-device-detect";
import useScreenOrientation from '../hooks/useScreenOrientation';
import RotateDeviceMessage from '../components/RotateDeviceMessage';
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

const ModelHelperArtifact = await import(`../assets/ModelHelper.json`);
const ModelHelperAbi = ModelHelperArtifact.abi;

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesBsc;

const addressModelHelper = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "ModelHelper");

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  config.RPC_URL
);

// Dynamically import the NomaFactory artifact and extract its ABI
const OikosFactoryArtifact = await import(`../assets/OikosFactory.json`);
const OikosFactoryAbi = OikosFactoryArtifact.abi;

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
  const screenOrientation = useScreenOrientation();
  const isLandscape = screenOrientation.includes("landscape");
  const [isAllVaultsLoading, setIsAllVaultsLoading] = useState(true);
  const [vaultDescriptions, setVaultDescriptions] = useState([]);
  const [selectedVault, setSelectedVault] = useState(""); // State to store the selected vault address
  const [vaultsSelectData, setVaultsSelectData] = useState(createListCollection({ items: [] }));
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

  const _navigationSelectData = {
    items: [
      {
        label: "Exchange",
        value: "/exchange",
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
        const cacheTime = localStorage.getItem('bnb_usd_price');

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
        console.log(err.message);
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
   * Fetch all vaults for the "All Markets" view
   */
  const {
    data: deployersData,
    isError: isAllVaultsError,
  } = useContractRead({
    address: nomaFactoryAddress,
    abi: OikosFactoryAbi,
    functionName: "getDeployers",
    enabled: isConnected,
  });

  useEffect(() => {
    if (typeof deployersData !== "undefined") {
      const nomaFactoryContract = new ethers.Contract(
        nomaFactoryAddress,
        OikosFactoryAbi,
        localProvider
      );

      setTimeout(() => {
        const fetchVaults = async () => {
          setIsAllVaultsLoading(true);

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
                    // console.log("Skipping OKS vault:", vault.toString());
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
            setIsAllVaultsLoading(false);

            // Set the first vault as the default selected value
            if (allVaultDescriptions.length > 0) {
                setSelectedVault(allVaultDescriptions[0].vault);
            }
            
          } catch (error) {
            console.error("Error fetching vaults:", error);
          }
        };

        fetchVaults();
      }, 3000);
    }
  }, [deployersData]);

  useEffect(() => {
    if (vaultDescriptions.length > 0) {
      const _vaultsSelectData = {
        items: vaultDescriptions
          .filter((vault) => vault?.tokenName && vault?.vault) // Ensure valid values
          .map((vault) => ({
            label: vault.tokenName, // Label shown in dropdown
            value: vault.vault, // Unique identifier for selection
          })),
      };
  
      if (_vaultsSelectData.items.length > 0) {
        console.log("Vaults Select Data:", _vaultsSelectData);
        setVaultsSelectData(createListCollection(_vaultsSelectData));
  
        // Set the first vault as the selected value if no vault is currently selected
        if (!selectedVault) {
          console.log("Setting selectedVault to:", _vaultsSelectData.items[0].value);
          setSelectedVault(_vaultsSelectData.items[0].value);
        }
      }
    }
  }, [vaultDescriptions]); // Runs when vaultDescriptions updates

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
  
        const [
          liquidityRatio,
          circulatingSupply,
          spotPrice,
          anchorCapacity,
          floorCapacity,
          token0Address,
          token1Address,
          newFloorPrice
        ] = await VaultContract.getVaultInfo();
  
        
        setCirculatingSupply(circulatingSupply);
        setSpotPrice(spotPrice);
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

  const handleSelectMarket = (event) => {
    console.log("Selected Market:", event.target.value);
    setSelectedVault(event.target.value);
    setErrorDeployed(false); // Reset the error state when a new vault is selected
  }

  const handleSelectDestination = (event) => {
      console.log(`Selected destination: ${event.target.value}`);
        
      window.location = event.target.value;
  }
    

  return (
    <Container maxW="container.xl" h="90vh">
      <Toaster />

      {!isConnected ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          height="100%"
          color="white"
          backgroundColor={"blackAlpha.800"}
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
          mt={"10px"}
          backgroundColor={"blackAlpha.800"}
        >
          <SimpleGrid columns={1} w={isMobile ? "95%" : "100%"} ml={isMobile ? "0" : "15%"} mt={"8vh"}>
              {/* Header Section */}
              {/* <Heading as="h3">
                Liquidity
                <Text fontSize="md">
                  All tokens launched with the Noma protocol in one place 🚀
                </Text>
              </Heading> */}

              <Box w={isMobile ? "55%" : "25%"}>
              {isAllVaultsLoading ? (
                  <><HStack><Box mt={10} ml={5}><Text>Loading vaults...</Text></Box> <Box mt={10}><Spinner size="sm" /></Box></HStack></>
              ) : vaultsSelectData?.items?.length > 0 ? (
                <Box ml={isMobile ? 2 : "15%"}>
                <VStack mt={10} >
                  <Box w="100%">
                    <SimpleGrid columns={2}>
                        {isMobile ? (
                          <></>
                          ) : (
                            <GridItem><Text fontSize="sm" mt={isMobile ? 0 : 10}>Go to:</Text></GridItem>
                          )
                        }
                      <GridItem colSpan={isMobile ? 2 : 1}>
                        <SelectRoot
                          mt={isMobile ? 5 : 0}
                          ml={isMobile ? 3 : 5}
                          collection={createListCollection(_navigationSelectData )}
                          size="sm"
                          width={isMobile ? "165px" : "160px"}
                          onChange={handleSelectDestination}
                          value={selectedDestination} // Bind the selected value to the state
                          h={"30px"}
                        >
                        <SelectTrigger>
                          {_navigationSelectData.items.map((data, index) => {
                          if (index > 0) return;
                              return (
                              <SelectValueText placeholder={data.label}>
                              </SelectValueText>
                              );
                          })}                  
                          </SelectTrigger>
                          <SelectContent>
                          {_navigationSelectData.items
                            .slice()          // make a shallow copy
                            .reverse()        // reverse the copy 
                            .map((data) => {
                              return (
                              <SelectItem item={data} key={data.value}>
                                  {data.label}
                              </SelectItem>
                              );
                          })}
                          </SelectContent>
                      </SelectRoot>                       
                      </GridItem>
                    </SimpleGrid>
                  </Box>
                  <Box >
                    <SimpleGrid columns={2}>
                          {isMobile ? (
                            <></>
                            ) : (
                              <GridItem  mt={isMobile ? 0 : "10px"}><Text fontSize="sm">Market:</Text></GridItem>
                            )
                          }
                      <GridItem colSpan={isMobile ? 2 : 1}>
                      <SelectRoot
                        ml={isMobile ? "-20px" : 5}
                        mb={isMobile ? 2 : 0}
                        mt={isMobile ? 2  : 2}
                        collection={vaultsSelectData}
                        size="sm"
                        width={isMobile ? "165px" : "160px"}
                        onChange={handleSelectMarket}
                        value={selectedVault} // Bind the selected value to the state
                        h={"30px"}
                    >
                      <SelectTrigger>
                      {vaultsSelectData.items
                        .slice()          // make a shallow copy
                        .reverse()        // reverse the copy 
                        .map((vaultData, index) => {
                        if (index > 0) return;
                          return (
                            <SelectValueText placeholder={vaultData.label}>
                            </SelectValueText>
                          );
                        })}                  
                        </SelectTrigger>
                      <SelectContent>
                        {vaultsSelectData.items
                        .slice()          // make a shallow copy
                        .reverse()        // reverse the copy 
                        .map((vaultData) => {
                          return (
                            <SelectItem item={vaultData} key={vaultData.value}>
                              {vaultData.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                        </SelectRoot>                        
                      </GridItem>
                    </SimpleGrid>
                  </Box>
                </VStack>
                </Box>
              ) : (
                <Text>No vaults available.</Text>
              )}
                </Box>

                {!errorDeployed ? (
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
                />) : (
                    <Text fontSize="xs" ml={5} w="auto">Failed to fetch vault info. Please try again later.</Text>
                )}
                
          </SimpleGrid>
        </Box>
      )}
    </Container>
  );
};

export default Liquidity;