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
  Center,
} from "@chakra-ui/react";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import { Toaster, toaster } from "../components/ui/toaster";
import { ethers } from "ethers";
const { utils } = ethers;

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
import config from '../config'; 
import addressesLocal   from "../assets/deployment.json";
import addressesMonad from "../assets/deployment_monad.json";

const addresses = config.chain === "local"
  ? addressesLocal
  : addressesMonad;

  // console.log(`Config chain is ${config.chain}`);
  // console.log(`Addresses are ${JSON.stringify(addresses)}`);

const { JsonRpcProvider } = ethers.providers;

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const IWETHArtifact = await import(`../assets/IWETH.json`);
const IWETHAbi = IWETHArtifact.abi;

const ExchangeHelperArtifact = await import(`../assets/ExchangeHelper.json`);
const ExchangeHelperAbi = ExchangeHelperArtifact.abi;

const QuoterArtifact = await import(`../assets/QuoterV2.json`);
const QuoterAbi = QuoterArtifact.abi;

const localProvider = new JsonRpcProvider(
  config.chain == "local" ? "http://localhost:8545" :
  "https://testnet-rpc.monad.xyz"
);

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
const nomaFactoryAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Factory");
const exchangeHelperAddress = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "Exchange");
const addressModelHelper = getContractAddress(addresses, config.chain == "local" ? "1337" : "10143", "ModelHelper");

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


const ExchangeCard: React.FC = ({ children }) => (
  <Box
    bg="whiteAlpha.100"               // translucent background
    backdropFilter="blur(10px)"       // nice glassy look
    borderRadius="2xl"                // rounded corners
    boxShadow="lg"                    // drop shadow
    p={{ base: 4, md: 6 }}            // padding: 4 on mobile, 6 on desktop
    mx="auto"                         // center horizontally
    maxW={{ base: "100%", md: "800px" }} // full width on mobile, 800px max on desktop
    my={{ base: 4, md: 8 }}           // vertical margin
  >
    {children}
  </Box>
);

// The useScreenOrientation hook is now imported from '../hooks/useScreenOrientation'

const Exchange: React.FC = () => {
  const { address, isConnected } = useAccount();
  const screenOrientation = useScreenOrientation();
  const isLandscape = screenOrientation.includes("landscape");

  const [isAllVaultsLoading, setIsAllVaultsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExecuteTrade, setIsLoadingExecuteTrade] = useState(false);

  const [errorDeployed, setErrorDeployed] = useState(false);
  const [isTokenInfoLoading, setIsTokenInfoLoading] = useState(true);
  const [isRefreshingTokenInfo, setIsRefreshingTokenInfo] = useState(false);
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
  const [balanceBeforePurchase, setBalanceBeforePurchase] = useState(0);
  const [balanceBeforeSale, setBalanceBeforeSale] = useState(0);

  const {
    data: imv
  } = useContractRead({
    address: addressModelHelper,
    abi: ModelHelperAbi,
    functionName: "getIntrinsicMinimumValue",
    args: [selectedVault],
    watch: true,
  });

  // console.log(`Imv is ${formatEther(`${imv || 0}`)} for vault ${selectedVault}`);

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
      config.protocolAddresses.uniswapV3Factory,
      uniswapV3FactoryABI,
      localProvider
    );

    const poolAddress = await uniswapV3FactoryContract.getPool(token0, token1, feeTier);
    // console.log(`Pool address for ${token0} and ${token1} is ${poolAddress}`);
    return poolAddress;
  };

  const {
    priceData,
    percentageChange
  } = useUniswapPrice(
    poolInfo.poolAddress, 
    config.chain == "local" ? 
     "http://localhost:8545" :
    "https://testnet-rpc.monad.xyz"
  );
  
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

  // console.log(`Deployers data: ${deployersData}`);

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

  // Initial fetch of token information
  useEffect(() => {
    const fetchInitialTokenInfo = async () => {
      if (!token0 || !token1) return;

      setIsTokenInfoLoading(true);

      try {
        // Fetch token0 info
        const token0Contract = new ethers.Contract(
          token0,
          ERC20Abi,
          localProvider
        );

        const token0Name = await token0Contract.name();
        const token0Symbol = await token0Contract.symbol();
        const token0Decimals = await token0Contract.decimals();
        const token0Balance = await token0Contract.balanceOf(address);

        // Fetch token1 info
        const token1Contract = new ethers.Contract(
          token1,
          ERC20Abi,
          localProvider
        );

        const token1Name = await token1Contract.name();
        const token1Symbol = await token1Contract.symbol();
        const token1Decimals = await token1Contract.decimals();
        const token1Balance = await token1Contract.balanceOf(address);

        // Update state with fetched data
        setToken0Info({
          tokenName: token0Name,
          tokenSymbol: token0Symbol,
          tokenDecimals: token0Decimals,
          balance: token0Balance
        });

        setToken1Info({
          tokenName: token1Name,
          tokenSymbol: token1Symbol,
          tokenDecimals: token1Decimals,
          balance: token1Balance
        });
      } catch (error) {
        console.error("Error fetching initial token info:", error);
      } finally {
        setIsTokenInfoLoading(false);
      }
    };

    fetchInitialTokenInfo();
  }, [token0, token1, address]);

  // Background refresh of token information
  useEffect(() => {
    if (!token0 || !token1) return;

    const interval = setInterval(() => {
      const refreshTokenInfo = async (tokenAddress) => {
        // Use a different state for background refreshes
        setIsRefreshingTokenInfo(true);

        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20Abi,
            localProvider
          );

          const tokenName = await tokenContract.name();
          const tokenSymbol = await tokenContract.symbol();
          const tokenDecimals = await tokenContract.decimals();
          const balance = await tokenContract.balanceOf(address);

          return { tokenName, tokenSymbol, tokenDecimals, balance };
        } catch (error) {
          console.error(`Error refreshing token info for ${tokenAddress}:`, error);
          return null;
        }
      };

      // Only update state if the refresh was successful
      Promise.all([
        refreshTokenInfo(token0),
        refreshTokenInfo(token1)
      ]).then(([token0Data, token1Data]) => {
        if (token0Data) setToken0Info(token0Data);
        if (token1Data) setToken1Info(token1Data);
        setIsRefreshingTokenInfo(false);
      });
    }, 3000); // Increased interval to 5 seconds

    return () => clearInterval(interval);
  } , [ethBalance, token0, token1, address]);

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
            // console.log(`Deployers data: ${deployersData}`);
            // Iterate over deployers
            for (const deployer of deployersData) {
              const vaultsData = await nomaFactoryContract.getVaults(deployer);
               
              // Iterate over vaults for each deployer
              for (const vault of vaultsData) {
                const vaultDescriptionData = await nomaFactoryContract.getVaultDescription(vault);
                
                // console.log({vaultDescriptionData})
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

        // console.log(`Selected vault is ${selectedVault}`);

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
  
        // console.log(`Spot price is ${formatEther(`${spotPrice}`)}`);

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
            setTimeout(() => {
                      
              const fetchBalances = async () => {
                const tokenContract = new ethers.Contract(
                  token0,
                  ERC20Abi,
                  localProvider
                );

                const ethBalance = await localProvider.getBalance(address);
                const balance = await tokenContract.balanceOf(address);

                setEthBalance(ethBalance);

                let  ethDiff = formatEther(`${balanceBeforeSale}`) - formatEther(`${ethBalance}`);
                let  tokenDiff = formatEther(`${balance}`) - formatEther(`${balanceBeforePurchase}`);

                // console.log(`ethDiff: ${ethDiff} ETH, tokenDiff: ${tokenDiff} ${token0Info.tokenSymbol}`);
                setIsLoading(false);
                setIsLoadingExecuteTrade(false);
                toaster.create({
                    title: "Success",
                    description: `Spent ${commifyDecimals(ethDiff, 4)} MON.\nReceived ${commify(tokenDiff, 4)} ${token0Info.tokenSymbol}`,
                });
              };
              fetchBalances();


            }, 6000); // 3000ms = 3 seconds      
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
            setTimeout(() => {
                      
              const fetchBalances = async () => {
                const token0Contract = new ethers.Contract(
                  token0,
                  ERC20Abi,
                  localProvider
                );
                const token1Contract = new ethers.Contract(
                  token1,
                  ERC20Abi,
                  localProvider
                );

                const wethBalance = await token1Contract.balanceOf(address);
                const balance = await token0Contract.balanceOf(address);

                let  wethDiff = formatEther(`${balanceBeforeSale}`) - formatEther(`${wethBalance}`);
                let  tokenDiff = formatEther(`${balance}`) - formatEther(`${balanceBeforePurchase}`);

                // console.log(`ethDiff: ${ethDiff} ETH, tokenDiff: ${tokenDiff} ${token0Info.tokenSymbol}`);
                setIsLoading(false);
                setIsLoadingExecuteTrade(false);
                toaster.create({
                    title: "Success",
                    description: `Spent ${commifyDecimals(wethDiff, 4)} WMON.\nReceived ${commify(tokenDiff, 4)} ${token0Info.tokenSymbol}`,
                });
              };
              fetchBalances();


            }, 6000); // 3000ms = 3 seconds  
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
            setTimeout(() => {
                      
              const fetchBalances = async () => {
                const token0Contract = new ethers.Contract(
                  token0,
                  ERC20Abi,
                  localProvider
                );
                const token1Contract = new ethers.Contract(
                  token1,
                  ERC20Abi,
                  localProvider
                );
                console.log(`Balance WETH/MON before transaction : ${formatEther(`${balanceBeforePurchase}`)}`);
                console.log(`Token0 Balance before transaction : ${formatEther(`${balanceBeforeSale}`)}`);

                const ethBalance = await localProvider.getBalance(address);
                const wethBalance = await token1Contract.balanceOf(address);
                const balance = await token0Contract.balanceOf(address);

                
                let  wethDiff =  (useWeth == 1 ? formatEther(`${wethBalance}`) : formatEther(`${ethBalance}`)) - formatEther(`${balanceBeforePurchase}`) ;

                let  tokenDiff = Number(formatEther(`${balanceBeforeSale}`)) - formatEther(`${balance}`);

                console.log(`Balance WETH/MON before transaction : ${formatEther(`${balanceBeforePurchase}`)} diff : ${wethDiff} WETH/MON`);

                // console.log(`ethDiff: ${ethDiff} ETH, tokenDiff: ${tokenDiff} ${token0Info.tokenSymbol}`);
                setIsLoading(false);
                setIsLoadingExecuteTrade(false);
                toaster.create({
                    title: "Success",
                    description: `Sold  ${commify(tokenDiff, 4)} ${token0Info.tokenSymbol}.\nReceived ${commify(wethDiff, 4)} ${useWeth == 1 ? token1Info.tokenSymbol : "MON"}`,
                });
              };
              fetchBalances();


            }, 6000); // 3000ms = 3 seconds  
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
      setIsTokenInfoLoading(true); // Set loading state for initial load
      setSelectedVault(event.target.value);
      setErrorDeployed(false); // Reset the error state when a new vault is selected

      // Set a timeout to reset loading state in case token data fetch takes too long
      const safetyTimeout = setTimeout(() => {
        setIsTokenInfoLoading(false);
      }, 5000);

      return () => clearTimeout(safetyTimeout);
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

          setBalanceBeforePurchase(token0Info.balance);
          setBalanceBeforeSale(token1Info.balance);
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
          setBalanceBeforePurchase(token0Info.balance);
          setBalanceBeforeSale(ethBalance);
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

        // console.log(args);

        setBalanceBeforePurchase(useWeth == "0" ? ethBalance :  token1Info.balance);
        setBalanceBeforeSale(token0Info.balance);

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
    <Container maxW="container.xl" py={12} minH="1100px">
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
          ml={"5px"}
        >
          <SimpleGrid columns={1} w={isMobile ? "95%" : "100%"} ml={isMobile ? "0" : "24%"}>
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
                <>
                <HStack>
                  <Box>
                    <Text fontSize={isMobile ? "13px" : "14px"}>
                      Loading vaults...
                    </Text>
                  </Box> 
                <Box>
                  <Spinner size="sm" />
                </Box>
                </HStack>
              </>
              ) : vaultsSelectData?.items?.length > 0 ? (
              <Flex direction="column" alignItems="left">
                <HStack>
                <Box>
                <SelectRoot
                    mt={isMobile ? "-60px" : 0}
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
                </Box>
                <Box mt={-2} ml={isMobile? 8 : 2}>
                    {isMobile ?
                    <VStack alignItems={"left"} ml={5}>
                      <Box><Text color="#a67c00" fontWeight="bold" fontSize="sm">SPOT PRICE</Text></Box>
                      <Box><Text>{commifyDecimals(formatEther(`${spotPrice || 0}`), 5)}</Text></Box>
                      <Box><Text>{isTokenInfoLoading ? <Spinner size="sm" /> : `${token1Info?.tokenSymbol}/${token0Info?.tokenSymbol}`} </Text></Box>
                      <Box><Text color={percentageChange < 0 ? "red" : percentageChange > 0 ? "green" : "gray"} fontWeight={"bold"} fontSize={"sm"}>(+{commifyDecimals(percentageChange, 2)}%)</Text></Box>
                    </VStack>
                    : 
                    <HStack>
                      <Box><Text color="#a67c00" fontWeight="bold">SPOT PRICE</Text></Box> 
                      <Box><Text>{commifyDecimals(formatEther(`${spotPrice || 0}`), 5)}</Text></Box>
                      <Box><Text>{isTokenInfoLoading ? <Spinner size="sm" /> : `${token1Info?.tokenSymbol}/${token0Info?.tokenSymbol}`}</Text></Box>
                      <Box><Text color={percentageChange < 0 ? "red" : percentageChange > 0 ? "green" : "gray"} fontWeight={"bold"} fontSize={"sm"}>({commifyDecimals(percentageChange, 2)}%)</Text></Box>
                    </HStack>                    
                    }
                </Box>
                </HStack>
                {isMobile ? 
                <Box mt={10}>
                    <Flex direction="column">
                    <Box mt={10}>
                        {/* <Line options={options} data={chartData} /> */}
                        <PriceData 
                          poolAddress={poolInfo.poolAddress} 
                          providerUrl="https://testnet-rpc.monad.xyz"  
                          token0Symbol={token0Info?.tokenSymbol} 
                          token1Symbol={token1Info.tokenSymbol}
                        />
                    </Box>
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
                      isRefreshingTokenInfo={isRefreshingTokenInfo}
                      isWrapping={isWrapping}
                      setIsWrapping={setIsWrapping}
                      isUnwrapping={isUnwrapping}
                      setIsUnwrapping={setIsUnwrapping}
                      setWrapAmount={setWrapAmount}
                      wrapAmount={wrapAmount}
                      vaultAddress={selectedVault}
                      page="exchange"
                    />
                    {/* <Box w="90%" h="440px" ml={2} border={isMobile ? 0 : "1px solid gray"}> */}
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
                    {/* </Box> */}
 
                    <TradeSimulationCard 
                        useWeth={useWeth}
                        setQuote={setQuote}
                        quote={quote}
                        token0Info={token0Info}
                        token1Info={token1Info}
                        amountToBuy={amountToBuy}
                        amountToSell={amountToSell}
                        tradeMode={tradeMode}
                        swapPath={swapPath}
                        quoterAddress={config.protocolAddresses.QuoterV2}
                        quoterAbi={QuoterAbi}
                        setTxAmount={setTxAmount}
                        slippage={slippage}
                        setSlippage={setSlippage}
                        isMobile={isMobile}
                        isLoading={isTokenInfoLoading}
                      />
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
                                isRefreshingTokenInfo={isRefreshingTokenInfo}
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
                            {/* <Box w="100%" h="300px" border={isMobile ? "":"1px solid gray"}> */}
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
                            {/* </Box> */}
                        </GridItem> 
                        <GridItem colSpan={1} mt={10} ml={"35px"}> 
                            <Box w="100%" h="auto" /*border={isMobile ? "":"1px solid gray"}*/  pt={8} >
                              <TradeSimulationCard 
                                setQuote={setQuote}
                                quote={quote}
                                token0Info={token0Info}
                                token1Info={token1Info}
                                amountToBuy={amountToBuy}
                                amountToSell={amountToSell}
                                tradeMode={tradeMode}
                                swapPath={swapPath}
                                quoterAddress={config.protocolAddresses.QuoterV2}
                                quoterAbi={QuoterAbi}
                                setTxAmount={setTxAmount}
                                slippage={slippage}
                                setSlippage={setSlippage}
                                isMobile={isMobile}
                                isLoading={isTokenInfoLoading}
                              />
                            </Box>
                            
                        </GridItem>                             
                    </Grid>
                }
                </Flex>

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