import { Container, Box, Text, Button, VStack, HStack } from "@chakra-ui/react"
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

const ERC20Artifact = await import(`../assets/ERC20.json`);
const ERC20Abi = ERC20Artifact.abi;

const tokenAddress = "0x614da16Af43A8Ad0b9F419Ab78d14D163DEa6488"; // Replace with your token's contract address

const VaultModal = ({vaultInfo, isMobile, token0Info, token1Info, address, ...rest}) => {

  const tokenDecimals = vaultInfo.tokenDecimals || 0;

    const {
        data: totalSupply
    } = useContractRead({
        address: tokenAddress,
        abi: ERC20Abi,
        functionName: "totalSupply",
        args: []
    });

  return (
    <Container>
      <DialogRoot>
      <DialogTrigger asChild >
        <Button
          variant="outline"
          size="sm"
          fontSize={["xs", "sm", "md"]}
          borderColor="#a67c00"
          color="#a67c00"
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
                    <a href={`https://bscscan.com/address/${vaultInfo.vaultAddress}`} target="_blank" rel="noreferrer">
                    {`${vaultInfo.vault?.slice(0, 6)}...${vaultInfo.vault?.slice(-6)}`}
                    </a>
                  </Text>
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