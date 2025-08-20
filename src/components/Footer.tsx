import React from "react";
import { Box, HStack, VStack, Text, Link, Button, Image, Container, SimpleGrid } from '@chakra-ui/react';
import { ethers } from "ethers";
import Logo from "../assets/images/logo.svg";
import { isMobile } from "react-device-detect";
import metamaskLogo from "../assets/images/metamask.svg";

const Footer: React.FC = () => { 
    const isFilteredPage = window.location.href.includes("liquidity") || window.location.href.includes("markets");

    const addTokenToMetaMask = async () => {
      const tokenAddress = "0x614da16Af43A8Ad0b9F419Ab78d14D163DEa6488";

      try {
        if (typeof window.ethereum !== 'undefined') {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();

          const tokenABI = [
            "function name() public view returns (string memory)",
            "function symbol() public view returns (string memory)",
            "function decimals() public view returns (uint8)",
            "function totalSupply() public view returns (uint256)",
            "function balanceOf(address account) public view returns (uint256)",
            "function transfer(address recipient, uint256 amount) public returns (bool)",
          ];
          
          const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

          const name = await tokenContract.name();
          const symbol = await tokenContract.symbol();
          const decimals = await tokenContract.decimals();

          const formattedSymbol = symbol || "OKS";
          const formattedDecimals = decimals || 18;

          const hexValue = ethers.utils.parseUnits('1', formattedDecimals);

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
    
  if (isMobile || isFilteredPage) {
    return null;
  }

  return (
    <Box 
      as="footer"
      position="relative"
      bottom={0}
      left={0}
      right={0}
      bg="#0a0a0a"
      borderTop="1px solid #1a1a1a"
      py={8}
    >
      <Container maxW="container.xl" px={{ base: 4, md: 16 }}>
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={8}>
          {/* Logo Column */}
          <VStack align="flex-start" spacing={4}>
            <Image src={Logo} alt="Noma Protocol" w="40px" h="40px" />
            <Text color="#666" fontSize="sm">
              © 2024 Noma Protocol
            </Text>
          </VStack>

          {/* Resources Column */}
          <VStack align="flex-start" spacing={3}>
            <Text color="white" fontWeight="600" mb={2}>Resources</Text>
            <Link 
              href="https://docs.noma.money" 
              isExternal
              color="#888"
              _hover={{ color: "#4ade80" }}
              fontSize="sm"
              fontWeight="500"
            >
              Documentation
            </Link>
            <Link 
              href="https://nomaprotocol.medium.com/" 
              isExternal
              color="#888"
              _hover={{ color: "#4ade80" }}
              fontSize="sm"
              fontWeight="500"
            >
              Blog
            </Link>
            <Link 
              href="/Terms"
              color="#888"
              _hover={{ color: "#4ade80" }}
              fontSize="sm"
              fontWeight="500"
            >
              Terms of Use
            </Link>
          </VStack>

          {/* Community Column */}
          <VStack align="flex-start" spacing={3}>
            <Text color="white" fontWeight="600" mb={2}>Community</Text>
            <HStack spacing={4}>
              <Link
                href="https://twitter.com/nomaprotocol"
                isExternal
                color="#888"
                _hover={{ color: "#4ade80" }}
                fontSize="20px"
              >
                <i className="fab fa-twitter" />
              </Link>
              <Link
                href="https://github.com/noma-protocol"
                isExternal
                color="#888"
                _hover={{ color: "#4ade80" }}
                fontSize="20px"
              >
                <i className="fab fa-github" />
              </Link>
              <Link
                href="https://discord.gg/nomaprotocol"
                isExternal
                color="#888"
                _hover={{ color: "#4ade80" }}
                fontSize="20px"
              >
                <i className="fab fa-discord" />
              </Link>
              <Link
                href="https://t.me/nomaprotocol"
                isExternal
                color="#888"
                _hover={{ color: "#4ade80" }}
                fontSize="20px"
              >
                <i className="fab fa-telegram" />
              </Link>
            </HStack>
          </VStack>

          {/* Add Token Column */}
          <VStack align="flex-start" spacing={3}>
            <Text color="white" fontWeight="600" mb={2}>Get Started</Text>
            <Button
              onClick={addTokenToMetaMask}
              size="sm"
              variant="outline"
              borderColor="#4ade80"
              color="white"
              _hover={{ 
                bg: "rgba(74, 222, 128, 0.1)",
                borderColor: "#4ade80",
                transform: "translateY(-2px)"
              }}
              transition="all 0.2s"
              leftIcon={<Image src={metamaskLogo} w="16px" h="16px" />}
            >
              Add NOMA to MetaMask
            </Button>
          </VStack>
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default Footer;