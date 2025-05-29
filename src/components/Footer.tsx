import { Link } from "react-router-dom";
import { SimpleGrid, Box, HStack, Center, VStack } from '@chakra-ui/react';
import {
  Button,
  NavItem,
  Nav,
  Container,
  Row,
  Col,
  UncontrolledTooltip,
} from "reactstrap";

import Logo from "../assets/images/oikos-type.svg";
import { isMobile } from "react-device-detect";

const Footer: React.FC = () => { 
  return (
    <>
    <footer className="footer" style={{ borderTop: "1px solid #f8bd45" }}>
      <Container>
        <Row >
          <Col md="3" style={{paddingTop: isMobile?25:0}}>
            <img
              src={Logo}
              style={{
                maxWidth: "10vh",
                marginLeft: isMobile ? "36%" : 50,
                marginTop: isMobile? 30 : 50
              }}
            />
          </Col>
          <Col md="3" xs="6" >
            <Nav style={{margin:'5vh'}}>
              <VStack>
                <Box>
                <NavItem>
                <a href="https://docs.oikos.cash" rel="noopener noreferrer" style={{fontSize:isMobile?"12px": "14px"}}>
                  <><p style={{color:"#f3f7c6"}}>Docs</p></>
                </a>
              </NavItem>
                </Box>
                <Box>
                <NavItem>
                <a href="https://oikoscash.medium.com/" target="_blank" rel="noopener noreferrer" style={{fontSize:isMobile?"12px": "14px", color:"#f3f7c6"}}>
                   <><p style={{color:"#f3f7c6"}}>Blog</p></>
                </a>
              </NavItem>
                </Box>
              </VStack>
            </Nav>
          </Col>
          <Col md="3" xs="6">
            <Nav style={{margin:'5vh'}}>
              <NavItem>
                <Link to="/Terms" style={{fontSize:isMobile?"12px": "14px", color:"#f3f7c6"}}>
                 <><p style={{color:"#f3f7c6"}}>Terms of Use</p></>
                 </Link>
              </NavItem>
              {/* <NavItem>
                <Link to="/Privacy">Privacy Policy</Link>
              </NavItem> */}
            </Nav>
          </Col>
          <Col md="3" style={{marginTop:'50px', paddingLeft:"100px", marginLeft:isMobile? "5%": 0}}>
            <h3 className="title" >Follow us:</h3>
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
          </Col>
        </Row>
        {isMobile ? <><br /><br /></> : <></>}
      </Container>
    </footer>
    </>
  );
};

export default Footer;
