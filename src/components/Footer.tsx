import { Link } from "react-router-dom";
import { SimpleGrid, Box, HStack, Center, VStack, Text} from '@chakra-ui/react';
import {
  Button,
  NavItem,
  Nav,
  Container,
  Row,
  Col,
  UncontrolledTooltip,
} from "reactstrap";

import { ethers } from "ethers";
import Logo from "../assets/images/oikos-type.svg";
import { isMobile } from "react-device-detect";
import metamaskLogo from "../assets/images/metamask.svg";

const Footer: React.FC = (
  page = "home" // Default value for page prop, can be overridden when used
) => { 

    const isFilteredPage = window.location.href.includes("liquidity") || window.location.href.includes("markets");

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
    <>
  { !isMobile && !isFilteredPage ? (    
    <footer className="footer" 
    style={{ 
        position:  "relative",
        bottom:    0,
        left:      0,
        width:     "100%",
        borderTop: "1px solid #4ade80",
        background: "#000",     // or whatever bg you want
        zIndex:    2400
      }}>
      <Container>
        <Row style={{marginTop: "-20px", marginLeft: "-15%"}}>
          <Col md="3" style={{paddingTop: isMobile?25:0}}>

            <VStack>
              {/* <img
                src={Logo}
                style={{
                  maxWidth: "10vh",
                  marginLeft: isMobile ? "36%" : 20,
                  marginTop: isMobile? 30 : 50
                }}
              /> */}
               <Box mt={2}>

               </Box>
            </VStack>
          </Col>
          <Col md="3" xs="6" >
            <Nav style={{margin:'5vh'}}>
              <VStack>
                <Box>
                <NavItem>
                <a href="https://docs.oikos.cash" rel="noopener noreferrer" style={{fontSize:isMobile?"12px": "14px"}}>
                  <><p style={{color:"#4ade80"}}>Docs</p></>
                </a>
              </NavItem>
                </Box>
                <Box>
                <NavItem>
                <a href="https://oikoscash.medium.com/" target="_blank" rel="noopener noreferrer" style={{fontSize:isMobile?"12px": "14px", color:"#f3f7c6"}}>
                   <><p style={{color:"#4ade80"}}>Blog</p></>
                </a>
              </NavItem>
                </Box>
              </VStack>
            </Nav>
          </Col>
          <Col md="3" xs="6">
            <Nav style={{margin:'5vh'}}>
              <NavItem>
                <Link to="/Terms" style={{fontSize:isMobile?"12px": "14px", color:"#4ade80"}}>
                 <><p style={{color:"#4ade80"}}>Terms of Use</p></>
                 </Link>
              </NavItem>
              {/* <NavItem>
                <Link to="/Privacy">Privacy Policy</Link>
              </NavItem> */}
            </Nav>
          </Col>
          <Col md="3" style={{marginTop:'50px', paddingLeft:"100px", marginLeft:isMobile? "5%": 0}}>
            <h3 className="title" color="white">Follow us:</h3>
              <a
                href="https://twitter.com/oikos_cash"
                id="tooltip39661217"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "5px" }}
                className="btn-icon btn-neutral btn-round btn-simple ml-1"
              >
                <i className="fab fa-twitter" />&nbsp;&nbsp;
              </a>
              <UncontrolledTooltip delay={0} target="tooltip39661217">
                Follow us
              </UncontrolledTooltip>

              <a
                href="https://github.com/orgs/oikos-cash/"
                id="tooltip206037619"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "5px" }}
                className="btn-icon btn-neutral btn-round btn-simple ml-1"
              >
                <i className="fab fa-github" />&nbsp;&nbsp;
              </a>
              <UncontrolledTooltip delay={0} target="tooltip206037619">
                Like us
              </UncontrolledTooltip>

              <a
                href="https://discord.gg/VVDu6Er"
                id="tooltip750293512"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "5px" }}
                className="btn-icon btn-neutral btn-round btn-simple ml-1"
              >
                <i className="fab fa-discord" />&nbsp;&nbsp;
              </a>
              <UncontrolledTooltip delay={0} target="tooltip750293512">
                Follow us
              </UncontrolledTooltip>

              <a
                href="https://t.me/oikoscash"
                id="tooltip750293512"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: "5px" }}
                className="btn-icon btn-neutral btn-round btn-simple ml-1"
              >
                <i className="fab fa-telegram" />&nbsp;&nbsp;
              </a>
              <UncontrolledTooltip delay={0} target="tooltip750293512">
                Follow us
              </UncontrolledTooltip>
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
                        marginLeft: "-55px",
                        marginBottom: "40px"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(74, 222, 128, 0.2)";
                        e.currentTarget.style.borderColor = "#4ade80";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "#4ade80";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                      >
                      <div style={{ marginLeft: "10%", display: "flex", alignItems: "center" }}>
                          <img src={metamaskLogo} style={{ width: "15px", marginRight: "5px" }} />
                          <span style={{ fontSize: "11px", color: "white" }}>Add NOMA to Metamask</span>
                      </div>
                </button>    
          </Col>
        </Row>
        {isMobile ? <><br /><br /></> : <></>}
      </Container>
    </footer>) : <></>}
    </>
  );
};

export default Footer;
