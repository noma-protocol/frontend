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

import { commify } from "../utils";


const VaultModal = ({vaultInfo, isMobile, token0Info, token1Info, ...rest}) => {

  const tokenDecimals = vaultInfo.tokenDecimals || 0;
  const totalSupply = vaultInfo.totalSupply || 0;

  return (
    <Container>
      <DialogRoot>
      <DialogTrigger asChild >
        <Button variant="outline" size="sm" ml={5} fontSize={isMobile?"11px": "14px"} borderColor="#a67c00" color="#a67c00">
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
                    <a href={`https://etherscan.io/address/${vaultInfo.vaultAddress}`} target="_blank" rel="noreferrer">
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
                  <Text>{commify(totalSupply)}</Text>
                </Box>
              </HStack>
              <HStack>
                <Box w={"50%"}>
                  <Text fontWeight="bold" color="gray">Pool Address</Text>
                </Box>
                <Box>
                  <Text>
                    <a href={`https://etherscan.io/address/${vaultInfo.poolAddress}`} target="_blank" rel="noreferrer">
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