import { Link } from "react-router-dom";
import { SimpleGrid, Box, HStack, Center } from '@chakra-ui/react';

const Footer: React.FC = () => {
  return (
    <footer>
      <br /> <br /> <br /><br /> <br /> <br /><br /> <br /> <br /><br /> <br /> <br /><br /> <br /> <br /><br /> <br /> <br />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 p-10 text-center">
            <div className="footer-items">
              <Center>
                <p className="nomalogo">Oikos Protocol</p>
              </Center>
              <div className="social-icons d-flex justify-content-center my-4">
                  <Box  w="55vh" h="2vh">
                    <center>
                      <SimpleGrid columns={3} spacing={4}>
                        <Box >
                        <HStack maxWidth={"fit-content"} color={"#bf9b30"}>
                        <i className="fa-brands fa-discord"></i>
                            <Link 
                              className="discord"
                              to="https://discord.gg/cFZDeS3cQc"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Discord
                            </Link>
                        </HStack>
                        </Box>
                        <Box>
                        <HStack  maxWidth={"fit-content"} color={"#bf9b30"}>
                          <i className="fa-brands fa-github"></i>
                          <Link 
                          className="github"
                          to="https://github.com/noma-protocol"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                        Github
                        </Link>
                        </HStack>
                        </Box>
                        <Box>
                          <HStack  maxWidth={"fit-content"} color={"#bf9b30"}>
                            <i className="fa-brands fa-twitter"></i>
                            <Link 
                              className="twitter"
                              to="https://twitter.com/nomaprotocol"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                            X/Twitter
                          </Link>
                          </HStack>
                        </Box>
                      </SimpleGrid>
                    </center>
                  </Box>
              </div> 
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
