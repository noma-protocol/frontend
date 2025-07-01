import { Container, Box, Text, Button, VStack, HStack, Link } from "@chakra-ui/react"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from "../components/ui/dialog"
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import { commify } from "../utils";
import { formatEther } from "viem";
import metamaskLogo from "../assets/images/metamask.svg";
import { ethers } from "ethers";

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const tokenAddress = "0x614da16Af43A8Ad0b9F419Ab78d14D163DEa6488"; // Replace with your token's contract address

const VaultModal = ({vaultInfo, isMobile, token0Info, token1Info, address, ...rest}) => {

  const bscscanLink = `https://bscscan.com/token/${tokenAddress}`;
  const tokenDecimals = vaultInfo.tokenDecimals || 0;

     const {
        data: totalSupply
    } = useContractRead({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "totalSupply",
        args: []
    });

    const addTokenToMetaMask = async () => {

      const tokenAddress = "0x614da16Af43A8Ad0b9F419Ab78d14D163DEa6488"; // Replace with your token's contract address

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
          const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

          // Get the token details
          const name = await tokenContract.name();
          const symbol = await tokenContract.symbol();
          const decimals = await tokenContract.decimals();

          // Prepare the token information for MetaMask
          const formattedSymbol = symbol || "OKS";
          const formattedDecimals = decimals || 18; // Default to 18 if not specified

          const hexValue = ethers.utils.parseUnits('1', formattedDecimals);

          // Add the token to MetaMask
          await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: tokenAddress,
                symbol: formattedSymbol,
                decimals: formattedDecimals,
                image: `http://app.oikos.cash/src/assets/images/logo.svg`, 
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
    <Container>
      <DialogRoot>
      <DialogTrigger asChild >
        <Button
          variant="outline"
          size="sm"
          fontSize={["xs", "sm", "md"]}
          borderColor="#4ade80"
          color="#4ade80"
          width={{base: "80px", md: "100px"}}
          ml={"-25px"}
        >
          Details
        </Button>
      </DialogTrigger>
      <DialogContent marginTop="20%">
        <DialogHeader>
          <DialogTitle>
            <Text fontSize="20px" ml={4}>
                Vault Details
            </Text>
          </DialogTitle>
        </DialogHeader>
        <DialogBody mt={10} p={4} mt={"=50px"}>
            <VStack p={4} w="100%">
            <Box w="100%">
              <HStack>
                <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Vault Address</Text>
                </Box>
                <Box>
                  <Text>
                    <a href={`https://bscscan.com/address/${vaultInfo.vault}`} target="_blank" rel="noreferrer">
                    {`${vaultInfo.vault?.slice(0, 6)}...${vaultInfo.vault?.slice(-6)}`}
                    </a>
                  </Text>
                </Box>
              </HStack>
              <HStack>
                <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Pool Address</Text>
                </Box>
                <Box>
                  <Text>
                    <a href={`https://bscscan.com/address/${vaultInfo.poolAddress}`} target="_blank" rel="noreferrer">
                    {`${vaultInfo.poolAddress?.slice(0, 6)}...${vaultInfo.poolAddress?.slice(-6)}`}
                    </a>
                  </Text>
                </Box>
              </HStack> 
              <HStack>
                <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Token Address</Text>
                </Box>
                <Box>
                  <Text><Link target="_blank" href={bscscanLink}>{`${tokenAddress?.slice(0, 6)}...${tokenAddress?.slice(-6)}`}</Link></Text>
                </Box>
              </HStack>             
              <HStack>
                <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Token Name</Text>
                </Box>
                <Box>
                  <Text>{vaultInfo.tokenName}</Text>
                </Box>
              </HStack>
              <HStack>
                <Box  w={"50%"}>
                  <Text fontWeight="bold" color="gray">Token Symbol</Text>
                </Box>
                <Box>
                  <Text>{vaultInfo.tokenSymbol}</Text>
                </Box>
              </HStack>
              <HStack>
              <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Decimals</Text>
                </Box>
                <Box>
                  <Text>{tokenDecimals.toString()}</Text>
                </Box>
              </HStack>
              <HStack>
                <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Total Supply</Text>
                </Box>
                <Box>
                  <Text>{commify(formatEther(`${totalSupply}`))}</Text>
                </Box>
              </HStack>
              <HStack>
                <Box w={"50%"}>
                </Box>
                <Box w="50%">
                <button
                  onClick={addTokenToMetaMask}
                  style={{
                    borderRadius: "0px",
                    height: "35px",
                    padding: "0px 10px",
                    width: "200px",
                    backgroundColor: "transparent",
                    border: "1px solid gray",
                    marginTop: "20px",
                    fontSize: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(248, 189, 69, 0.2)";
                    e.currentTarget.style.borderColor = "#f8bd45";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "ivory";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  >
                  <div style={{ marginLeft: "10%", display: "flex", alignItems: "center" }}>
                      <img src={metamaskLogo} style={{ width: "15px", marginRight: "5px" }} />
                      <span style={{ fontSize: "11px", color: "white" }}>Add OKS to Metamask</span>
                  </div>
                </button>                    
                </Box>
              </HStack>
            </Box>
            </VStack>


        </DialogBody>

        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
    </Container>
  )
}

export default VaultModal