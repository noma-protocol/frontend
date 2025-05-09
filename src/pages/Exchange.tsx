import React, { useEffect, useState } from "react";
import {
  Container,
  VStack,
  Flex,
  Box,
  SimpleGrid,
  Heading,
  Text,
  Button,
  HStack,
  Image,
  Link,
  Select,
  createListCollection,
  Input,
  Spinner,
  Grid,
  Checkbox,
GridItem,
} from "@chakra-ui/react";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import { Toaster, toaster } from "../components/ui/toaster";
import { ethers } from "ethers";
const { utils } = ethers;

import { isMobile } from "react-device-detect";
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
  } from "../components/ui/select";

import { formatEther, parseEther } from "viem";
import {commify, commifyDecimals, getContractAddress} from "../utils";

import BalanceCard from "../components/BalanceCard";
import TradeControlsCard from "../components/TradeControlsCard";
import TradeSimulationCard from "../components/TradeSimulationCard";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';

import { Line } from 'react-chartjs-2';
import {fa, faker} from '@faker-js/faker'
import PriceData from "../components/PriceData";
import useUniswapPrice from "../hooks/useUniswapPrice";
import addresses from "../assets/deployment.json";

const { JsonRpcProvider } = ethers.providers;

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const IWETHArtifact = await import(`../assets/IWETH.json`);
const IWETHAbi = IWETHArtifact.abi;

const ExchangeHelperArtifact = await import(`../assets/ExchangeHelper.json`);
const ExchangeHelperAbi = ExchangeHelperArtifact.abi;

const QuoterArtifact = await import(`../assets/QuoterV2.json`);
const QuoterAbi = QuoterArtifact.abi;

const localProvider = new JsonRpcProvider("https://monad-testnet.g.alchemy.com/v2/mVGRu2kI9eyr_Q1yUzdBW");

// Dynamically import the NomaFactory artifact and extract its ABI
const NomaFactoryArtifact = await import(`../assets/NomaFactory.json`);
const NomaFactoryAbi = NomaFactoryArtifact.abi;

const ModelHelperArtifact = await import(`../assets/ModelHelper.json`);
const ModelHelperAbi = ModelHelperArtifact.abi;

const uniswapV3FactoryABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

// const ERC20Abi = [
//     "function totalSupply() view returns (uint)",
//     "function balanceOf(address) view returns (uint)",
//     "function decimals() view returns (uint)",
//     "function symbol() view returns (string)",
//     "function name() view returns (string)",
// ];

const WETHAbi = [
    "function deposit() payable external"
];

// NomaFactory contract address
const nomaFactoryAddress = getContractAddress(addresses, "10143", "Factory");
const uniswapV3FactoryAddress = "0x961235a9020B05C44DF1026D956D1F4D78014276";
const exchangeHelperAddress = getContractAddress(addresses, "10143", "Exchange");
const quoterAddress = "0x78D78E420Da98ad378D7799bE8f4AF69033EB077";
const addressModelHelper = getContractAddress(addresses, "10143", "ModelHelper");

const feeTier = 3000;

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );
  
export const options = {
responsive: true,
plugins: {
    legend: {
    display: false, // Hides the legend
    // position: 'top' as const,
    },
    title: {
    display: true,
    text: '',
    },
},
};

const labels = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.'];

const generateRandomData = () => {
    return {
      labels: labels.map(() => faker.date.month()),
      datasets: [
        {
          label: 'Dataset 1',
          data: labels.map(() => faker.number.int({ min: -1000, max: 1000 })),
          borderColor: 'cyan',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
      ],
    };
  }

const Exchange: React.FC = () => {
  const { address, isConnected } = useAccount();

  const [isAllVaultsLoading, setIsAllVaultsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExecuteTrade, setIsLoadingExecuteTrade] = useState(false);

  const [errorDeployed, setErrorDeployed] = useState(false);
  const [isTokenInfoLoading, setIsTokenInfoLoading] = useState(true);
  const [isWrapping, setIsWrapping] = useState(false);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [vaultDescriptions, setVaultDescriptions] = useState([]);
  const [selectedVault, setSelectedVault] = useState(""); // State to store the selected vault address
  const [vaultsSelectData, setVaultsSelectData] = useState(createListCollection({ items: [] }));
  const [token0, setToken0] = useState("");
  const [token1, setToken1] = useState("");

  const [token0Info, setToken0Info] = useState({});
  const [token1Info, setToken1Info] = useState({});
  const [ethBalance, setEthBalance] = useState(0);
  const [spotPrice, setSpotPrice] = useState(0);  
  const [allVaultDescriptions, setAllVaultDescriptions] = useState([]);

  const [chartData, setChartData] = useState(generateRandomData());
  const [wrapAmount, setWrapAmount] = useState(0);
  const [poolInfo, setPoolInfo] = useState({});

  const [amountToBuy, setAmountToBuy] = useState(0);
  const [amountToSell, setAmountToSell] = useState(0);
  const [useWeth, setUseWeth] = useState(0);
  const [sellArgs, setSellArgs] = useState([]);
  const [buyArgs, setBuyArgs] = useState([]);
  const [tradeMode, setTradeMode] = useState("BUY");
  const [swapPath, setSwapPath] = useState([]);
  const [quote, setQuote] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [txAmount, setTxAmount] = useState("");

  const {
    data: imv
  } = useContractRead({
    address: addressModelHelper,
    abi: ModelHelperAbi,
    functionName: "getIntrinsicMinimumValue",
    args: [selectedVault],
    watch: true,
  });

  console.log(`Imv is ${formatEther(`${imv || 0}`)} for vault ${selectedVault}`);

  useEffect(() => {

    if (token0 && token1) {
      const buyBath = utils.solidityPack(
        ["address", "uint24", "address"],
        [
          token0, 
          feeTier, 
          token1
        ]
      );

      const sellPath = utils.solidityPack(
        ["address", "uint24", "address"],
        [
          token1, 
          feeTier, 
          token0
        ]
      );

      setSwapPath(
        tradeMode === "BUY" ? buyBath
        : sellPath
      );
    }
  }, [token0, token1]);

  const fetchPoolAddress = async (token0: string, token1: string) => {
    const uniswapV3FactoryContract = new ethers.Contract(
      uniswapV3FactoryAddress,
      uniswapV3FactoryABI,
      localProvider
    );

    const poolAddress = await uniswapV3FactoryContract.getPool(token0, token1, feeTier);
    console.log(`Pool address for ${token0} and ${token1} is ${poolAddress}`);
    return poolAddress;
  };

  const {
    priceData,
    percentageChange
  } = useUniswapPrice(poolInfo.poolAddress, "https://testnet-rpc.monad.xyz");
  
  /**
   * Fetch all vaults for the "All Markets" view
   */
  const {
    data: deployersData,
    isError: isAllVaultsError,
  } = useContractRead({
    address: nomaFactoryAddress,
    abi: NomaFactoryAbi,
    functionName: "getDeployers",
    // enabled: isConnected,
  });

  console.log(`Deployers data: ${deployersData}`);

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
    if (typeof deployersData !== "undefined") {
      const nomaFactoryContract = new ethers.Contract(
        nomaFactoryAddress,
        NomaFactoryAbi,
        localProvider
      );

      setTimeout(() => {
        const fetchVaults = async () => {
          setIsAllVaultsLoading(true);

          try {
            const allVaultDescriptions = [];
            console.log(`Deployers data: ${deployersData}`);
            // Iterate over deployers
            for (const deployer of deployersData) {
              const vaultsData = await nomaFactoryContract.getVaults(deployer);

              // Iterate over vaults for each deployer
              for (const vault of vaultsData) {
                const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                
                console.log({vaultDescriptionData})
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
                  stakingContract: vaultDescriptionData[8],
                };

                if (plainVaultDescription.tokenSymbol === "OKS") {
                  console.log("Skipping OKS vault:", vault.toString());
                  continue;
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
            
          } catch (error) {
            console.error("Error fetching vaults:", error);
          }
        };

        fetchVaults();
      }, 1000);
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
        setVaultsSelectData(createListCollection(_vaultsSelectData));
  
        // Set the first vault as the selected value if no vault is currently selected
        if (!selectedVault) {
          setSelectedVault(_vaultsSelectData.items[0].value);
        }
      }

    vaultDescriptions
        .filter(item => item.vault === selectedVault)
        .map((vaultData) => {
            setToken0(vaultData.token0);
            setToken1(vaultData.token1);
            setSpotPrice(vaultData.spotPrice);
        });
    }

    // Set the first vault as the default selected value
    if (vaultDescriptions.length > 0) {
        // setSelectedVault(vaultDescriptions[0].vault);

        console.log(`Selected vault is ${selectedVault}`);

        // find the selected vault in descriptions
        const _selectedVault = vaultDescriptions
        .find(item => item.vault === selectedVault);

        (async () => {
            const vault = vaultDescriptions.find(item => item.vault === selectedVault);
            console.log({vault})
            const poolAddress = await fetchPoolAddress(vault.token0, vault.token1);
            // console.log(`Got pool address: ${poolAddress} spotPrice ${spotPrice}`);
            setPoolInfo({
                poolAddress
            })

            // console.log(vaultDescriptions);
        })();

    }    
  }, [vaultDescriptions, selectedVault]); // Runs when vaultDescriptions updates

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
  
        console.log(`Spot price is ${formatEther(`${spotPrice}`)}`);

        // setCirculatingSupply(circulatingSupply);
        setSpotPrice(spotPrice);

        // setCapacity({
        //   anchor: anchorCapacity,
        //   floor: floorCapacity
        // });
  
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
  
        // setUnderlyingBalances({
        //   token0: token0BalanceVault,
        //   token1: token1BalanceVault
        // });
  
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
        
        // console.log(data);

        // setVaultData(data);
        // setLiquidityRatio(liquidityRatio);
  
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

  const { 
    write : deposit,
  } = useContractWrite({
      address: token1,
      abi: IWETHAbi,
      functionName: "deposit",
      value: parseEther(`${wrapAmount}`),
      onSuccess(data) {
          setIsWrapping(false);
        },
        onError(error) {
            setIsWrapping(false);
            const msg = Number(error.message.toString().indexOf("exceeds")) > -1 ? "Not enough balance" :
                        error.message.indexOf("PresaleEnded") > -1 ? "The presale has ended" :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });
            setWrapAmount(0);
        }
    });

    const {
        write: withdraw,
    } = useContractWrite({
        address: token1,
        abi: IWETHAbi,
        functionName: "withdraw",
        args: [parseEther(`${wrapAmount}`)],
        onSuccess(data) {
            setIsUnwrapping(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsUnwrapping(false);
            const msg = Number(error.message.toString().indexOf("burn amount exceeds balance")) > -1 ? "Not enough balance" :
                        error.message.indexOf("PresaleEnded") > -1 ? "The presale has ended" :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            }); 
            setWrapAmount(0);           
        }
    });
    
    const {
        write: buyTokensETH
    } = useContractWrite({
        address: exchangeHelperAddress,
        abi: ExchangeHelperAbi,
        functionName: "buyTokens",
        args: buyArgs,
        value: parseEther(`${amountToBuy}`),
        onSuccess(data) {
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = Number(error.message.toString().indexOf("InvalidSwap()")) > -1 ? "Error with swap operation" :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });
    
    const {
      write: buyTokensWETH
  } = useContractWrite({
      address: exchangeHelperAddress,
      abi: ExchangeHelperAbi,
      functionName: "buyTokensWETH",
      args: buyArgs,
      onSuccess(data) {
          setIsLoading(false);
          setIsLoadingExecuteTrade(false);
      },
      onError(error) {
          console.error(`transaction failed: ${error.message}`);
          setIsLoading(false);
          setIsLoadingExecuteTrade(false);
          const msg = Number(error.message.toString().indexOf("InvalidSwap()")) > -1 ? "Error with swap operation" :
                      error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
          toaster.create({
              title: "Error",
              description: msg,
          });         
      }
  });

    const {
        write: sellTokens
    } = useContractWrite({
        address: exchangeHelperAddress,
        abi: ExchangeHelperAbi,
        functionName: useWeth == "1" ? "sellTokens" : "sellTokensETH",
        args: sellArgs,
        onSuccess(data) {
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false); 
            const msg = Number(error.message.toString().indexOf("InvalidSwap()")) > -1 ? "Error with swap operation" :
                        Number(error.message.toString().indexOf("0xe450d38c")) > -1 ? "Not enough balance" :
                        Number(error.message.toString().indexOf("Amount must be greater than 0")) > -1 ? "Invalid amount" :
                        error.message.toString().indexOf("User rejected the request.") > -1  ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });
    
    const {
        write: approve
    } = useContractWrite({
        address: token0,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            exchangeHelperAddress,
            parseEther(`${amountToSell}`)
        ],
        onSuccess(data) {
          // setIsLoading(false);
          sellTokens();
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });

    const {
        write: approveWeth
    } = useContractWrite({
        address: token1,
        abi: ERC20Abi,
        functionName: "approve",
        args: [
            exchangeHelperAddress,
            parseEther(`${amountToBuy}`)
        ],
        onSuccess(data) {
            // setIsLoading(false);
            buyTokensWETH();
        },
        onError(error) {
            console.error(`transaction failed: ${error.message}`);
            setIsLoading(false);
            setIsLoadingExecuteTrade(false);
            const msg = Number(error.message.toString().indexOf("User rejected the request.")) > -1 ? "Rejected operation" : error.message;
            toaster.create({
                title: "Error",
                description: msg,
            });         
        }
    });

    const handleSelectMarket = (event) => {
      console.log("Selected Market:", event.target.value);
      setChartData(generateRandomData());
      setIsTokenInfoLoading(true);
      setSelectedVault(event.target.value);
      setErrorDeployed(false); // Reset the error state when a new vault is selected
    }

    const handleBuyTokens = () => {
        if (isLoading) return;

        let args = [];

        setIsLoading(true);
        
        if (useWeth == "1") {

          args = [
            poolInfo.poolAddress,
            `${spotPrice}`,
            parseEther(`${amountToBuy}`),
            address,
            false
          ]

          setBuyArgs(args);
          approveWeth();
        } else if (useWeth == "0") {

          args = [
            poolInfo.poolAddress,
            `${spotPrice}`,
            parseEther(`${amountToBuy}`),
            address,
            false
          ]

          setBuyArgs(args);
          buyTokensETH();
        }
    }

    const handleSellTokens = () => {
        if (isLoading) return;

        const args = [
            poolInfo.poolAddress,
            `${spotPrice}`,
            parseEther(`${amountToSell}`),
            address,
            false
        ]

        console.log(args);

        setIsLoading(true);
        setSellArgs(args);
        approve();
    }

    const refreshParams = () => {

        const buyArgs = [
            poolInfo.poolAddress,
            `${spotPrice}`,
            parseEther(`${amountToBuy}`),
            address,
            false
        ]
        setBuyArgs(buyArgs);

        const sellArgs = [
            poolInfo.poolAddress,
            `${spotPrice}`,
            parseEther(`${amountToSell}`),
            address,
            false
        ]
        setSellArgs(sellArgs);
    }


    const handleSetWeth = (value) => {
        console.log(`Use WETH: ${value}`);
        setUseWeth(value);
    }

  return (
    <Container maxW="container.xl" py={12} minH="1100px" >
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
        >
          <SimpleGrid columns={1} w={isMobile ? "95%" : "100%"} ml={isMobile ? "0" : "20vw"}>
            <Box px={4}>
              {/* Header Section */}
              {/* <Heading as="h3">
                Exchange
                <Text fontSize="md">
                  All tokens launched with the Noma protocol in one place 🚀
                </Text>
              </Heading> */}

              <Box mt={8}>
              {isAllVaultsLoading ? (
                <><HStack><Box><Text>Loading vaults...</Text></Box> <Box><Spinner size="sm" /></Box></HStack></>
              ) : vaultsSelectData?.items?.length > 0 ? (
                <Box>
                <HStack>
                <Box>
                <SelectRoot
                    ml={5}
                    mb={2}
                    collection={vaultsSelectData}
                    size="sm"
                    width={isMobile ? "185px" : "200px"}
                    onChange={handleSelectMarket}
                    value={selectedVault} // Bind the selected value to the state
                    
                >
                    <SelectTrigger>
                    {vaultsSelectData.items.map((vaultData, index) => {
                    if (index > 0) return;
                        return (
                        <SelectValueText placeholder={vaultData.label}>
                        </SelectValueText>
                        );
                    })}                  
                    </SelectTrigger>
                    <SelectContent>
                    {vaultsSelectData.items.map((vaultData) => {
                        return (
                        <SelectItem item={vaultData} key={vaultData.value}>
                            {vaultData.label}
                        </SelectItem>
                        );
                    })}
                    </SelectContent>
                </SelectRoot>
                </Box>
                <Box mt={-2} ml={2}>
                    {isMobile ?
                    <VStack alignItems={"left"} ml={5}>
                    <Box><Text >SPOT PRICE</Text></Box>
                    <Box><Text>{commifyDecimals(formatEther(`${spotPrice || 0}`), 5)}</Text></Box>
                    <Box><Text>{token1Info?.tokenSymbol}/{token0Info?.tokenSymbol}</Text></Box>
                    <Box><Text color={percentageChange < 0 ? "red" : percentageChange > 0 ? "green" : "gray"} fontWeight={"bold"} fontSize={"sm"}>(+{commifyDecimals(percentageChange, 2)}%)</Text></Box>
                    </VStack>
                    : 
                    <HStack>
                    <Box><Text >SPOT PRICE</Text></Box> 
                    <Box><Text>{commifyDecimals(formatEther(`${spotPrice || 0}`), 5)}</Text></Box>
                    <Box><Text>{token1Info?.tokenSymbol}/{token0Info?.tokenSymbol}</Text></Box>
                    <Box><Text color={percentageChange < 0 ? "red" : percentageChange > 0 ? "green" : "gray"} fontWeight={"bold"} fontSize={"sm"}>({commifyDecimals(percentageChange, 2)}%)</Text></Box>
                    </HStack>                    
                    }
                </Box>
                </HStack>
                {isMobile ? 
                <Box mt={10}>
                    <Flex direction="column">
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
                        vaultAddress={selectedVault}
                        page="exchange"
                    />
                    <Box mt={10}>
                        {/* <Line options={options} data={chartData} /> */}
                        <PriceData 
                          poolAddress={poolInfo.poolAddress} 
                          providerUrl="https://testnet-rpc.monad.xyz"  
                          token0Symbol={token0Info?.tokenSymbol} 
                          token1Symbol={token1Info.tokenSymbol}
                        />
                    </Box>
                    <Box w="90%" h="250px" border={isMobile ? "":"1px solid gray"}>
                        <TradeControlsCard 
                            ethBalance={ethBalance}
                            token0Balance={token0Info?.balance} 
                            token0Symbol={token0Info?.tokenSymbol} 
                            token1Symbol={token1Info.tokenSymbol} 
                            token1Balance={token1Info?.balance}
                            deposit={deposit}
                            setIsLoading={setIsLoading}
                            isLoading={isLoading}
                            isTokenInfoLoading={isTokenInfoLoading}
                            buyTokens={handleBuyTokens}
                            sellTokens={handleSellTokens}
                            spotPrice={spotPrice}
                            isLoadingExecuteTrade={isLoadingExecuteTrade}
                            setIsLoadingExecuteTrade={setIsLoadingExecuteTrade}
                            amountToBuy={amountToBuy}
                            amountToSell={amountToSell}
                            setAmountToBuy={setAmountToBuy} 
                            setAmountToSell={setAmountToSell}
                            refreshParams={refreshParams}
                            useWeth={useWeth}
                            tradeMode={tradeMode}
                            setTradeMode={setTradeMode}
                            setUseWeth={handleSetWeth}
                            quoteMax={0}
                            />
                    </Box>
                    <Box w="90%" h="250px"  pt={4}>
                      {isMobile ? <><br /><br /><br /><br /><br /><br /><br /><br /></>: <></>}
                    <Text fontWeight={"bold"} ml={8} color="#a67c00">
                        Trade Info 
                    </Text>

                    <TradeSimulationCard 
                        
                                setQuote={setQuote}
                                quote={quote}
                                token0Info={token0Info}
                                token1Info={token1Info}
                                amountToBuy={amountToBuy}
                                amountToSell={amountToSell}
                                tradeMode={tradeMode}
                                swapPath={swapPath}
                                quoterAddress={quoterAddress}
                                quoterAbi={QuoterAbi}
                                setTxAmount={setTxAmount}
                                slippage={slippage}
                                setSlippage={setSlippage}
                                isMobile={isMobile}
                              />
                    </Box>
                    </Flex>
                </Box> : 
                    <Grid
                        h="200px"
                        templateRows="repeat(2, 1fr)"
                        templateColumns="repeat(2, 1fr)"
                        gap={4}
                        mb={20}
                        mt={10}
                    >
                        <GridItem>
                            {/* <Line options={options} data={chartData} /> */}
                          <Box mt={5}>
                          <PriceData
                              imv={imv}
                              poolAddress={poolInfo.poolAddress} 
                              providerUrl="https://testnet-rpc.monad.xyz"  
                              token0Symbol={token0Info?.tokenSymbol} 
                              token1Symbol={token1Info.tokenSymbol}
                            />
                          </Box>
                        </GridItem>
                        <GridItem>
                            <Box mt={10}>
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
                                vaultAddress={selectedVault}
                                page="exchange"
                                />
                            </Box>
                        </GridItem>
                        <GridItem colSpan={1} mt={10}> 
                            <Box w="100%" h="300px" /*border={isMobile ? "":"1px solid gray"}*/>
                            <TradeControlsCard 
                                ethBalance={ethBalance}
                                token0Balance={token0Info?.balance} 
                                token0Symbol={token0Info?.tokenSymbol} 
                                token1Symbol={token1Info.tokenSymbol} 
                                token1Balance={token1Info?.balance}
                                deposit={deposit}
                                setIsLoading={setIsLoading}
                                isLoading={isLoading}
                                isTokenInfoLoading={isTokenInfoLoading}
                                buyTokens={handleBuyTokens}
                                sellTokens={handleSellTokens}
                                spotPrice={spotPrice}
                                isLoadingExecuteTrade={isLoadingExecuteTrade}
                                setIsLoadingExecuteTrade={setIsLoadingExecuteTrade}
                                amountToBuy={amountToBuy}
                                amountToSell={amountToSell}
                                setAmountToBuy={setAmountToBuy}  
                                setAmountToSell={setAmountToSell}  
                                refreshParams={refreshParams}
                                useWeth={useWeth}
                                tradeMode={tradeMode}
                                setTradeMode={setTradeMode}
                                setUseWeth={handleSetWeth}
                                quoteMax={0}                            
                                />
                            </Box>
                        </GridItem> 
                        <GridItem colSpan={1} mt={10} ml={20}> 
                            <Box w="100%" h="auto" /*border={isMobile ? "":"1px solid gray"}*/  pt={8} >
                              
                              <Text fontWeight={"bold"} ml={8} color="#a67c00">
                                  Trade Info 
                              </Text>

                              <TradeSimulationCard 
                                setQuote={setQuote}
                                quote={quote}
                                token0Info={token0Info}
                                token1Info={token1Info}
                                amountToBuy={amountToBuy}
                                amountToSell={amountToSell}
                                tradeMode={tradeMode}
                                swapPath={swapPath}
                                quoterAddress={quoterAddress}
                                quoterAbi={QuoterAbi}
                                setTxAmount={setTxAmount}
                                slippage={slippage}
                                setSlippage={setSlippage}
                                isMobile={isMobile}
                              />
                            </Box>
                            
                        </GridItem>                             
                    </Grid>
                }
                </Box>

              ) : (
                <Text>No vaults available.</Text>
              )}
                </Box>
            </Box>
          </SimpleGrid>

        </Box>
      )}
    </Container>
  );
};

export default Exchange;