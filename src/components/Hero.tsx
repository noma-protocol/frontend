import React from "react";
import { Box, Flex, Image, Stack, Heading, Text, Button, HStack } from "@chakra-ui/react";
import { isMobile } from "react-device-detect";
import styled from "styled-components";
import { useMenu } from "../hooks/MenuContext"; // Import useMenu hook for context

const StyledLink = styled.a`
  color: gray !important; /* Force color to be white */
  text-decoration: none; /* Remove underline */

  &:visited {
    color: gray !important; /* Ensure visited links stay white */
  }
`;

const Hero: React.FC = () => {
  const { isMenuOpen } = useMenu(); // Access menu state from context
  console.log("isMenuOpen in Hero:", isMenuOpen); // Debugging log

  return (
    <Box
      alignContent="center"
      as="section"
      p={isMobile ? "8vh" : "10vh"}
      minH="100vh"
      position="relative" // Required for absolute positioning of the banner
    >
      {/* Animated Banner */}
      {!isMenuOpen ? (
        <Box
          key={`banner-${isMenuOpen}`} // Unique key to force re-render
          bg="lightgreen"
          height="60px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          position="absolute"
          top="150px"
          left="0"
          width="100vw"
          zIndex="5"
          visibility="visible" // Ensure it's visible when not hidden
          className="animated-banner"
        >
        <Box
          as="span"
          whiteSpace="nowrap"
          fontSize="16px"
          color="black"
          display="flex"
          animation={`scroll ${isMobile ? "20s" : "40s"} linear infinite`}
        >
          <Box as="span">Earn</Box>
          <Box as="span" color="gray">&nbsp;<b>$NOMA</b>&nbsp;</Box>
          <Box as="span">points by participating in our community and promoting the upcoming</Box>
          <Box as="span" color="gray">&nbsp;<b>bootstrap</b>&nbsp;</Box>
          <Box as="span">event.&nbsp;&nbsp;Read more</Box>
          <StyledLink href="https://nomaprotocol.medium.com/bootstrap-event-49c1ad496ab6" target="_blank">
            &nbsp;<b>here</b>&nbsp;
          </StyledLink>
          <Box as="span">&nbsp;&nbsp;👈👈👈&nbsp;&nbsp;</Box>
          <Box as="span" color="gray">&nbsp;<b>$NOMA</b>&nbsp;</Box>
          <Box as="span">points earned globally:&nbsp;</Box>
          <Box as="span" color="gray" fontSize="21px" mt={-1}>&nbsp;&nbsp;<b>28,973</b>&nbsp;&nbsp;📈</Box>
        </Box>

        </Box>
      ) : (
        <Box visibility="hidden" /> // Hide without removing from the DOM
      )}

      <style>
        {`
          @keyframes scroll {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }         
        `}
      </style>

      {/* Main Hero Content */}
      <Box
        // ml={"5%"}
        // p={isMobile ? "10vw" : "5vw"}
        ml={isMobile ? 0 : "15%"}
        flex={1}
        gap={20}
        className="container"
        mt="120px" // Push content down to accommodate the banner
      >
        <Box className="row align-items-center justify-content-center">
          <Flex direction={{ base: "column", md: "row" }} align="center" justify="center" width="full">
            <Box className="col-md">
              <Stack spacing={0}>
                <Heading
                  fontSize={{
                    base: "3xl",
                    md: "4xl",
                    lg: "5xl",
                  }}
                >
                  <Text as="span">
                    Money with
                  </Text>
                  <br />
                  <Text color="lightgreen" as="span">
                    Special Powers
                  </Text>
                </Heading>
                <Text color="white">
                  Perpetually increasing and guaranteed Intrinsic Minimum Value (IMV) with permission-less market making on top of Uniswap V3.
                </Text>
                <HStack minW={100} justify={{ base: "center", md: "flex-start" }}>
                  <a href="https://nomaprotocol.medium.com/announcing-noma-ecafef785e34" onClick={() => gaEventTracker("read_announcement")} target="_blank">
                    <Button p={15} minW={100} fontWeight={600} background="black" color="lightgreen" h={70} border={"1px solid gray"}>
                      Read our <br />announcement
                    </Button>
                  </a>
                  <Button p={15} bg="lightgreen" minW={100} fontWeight={600} isDisabled h={70} borderStyle={"outset"} border={"1px solid white"}>
                    <div style={{ textAlign: "center" }}>
                      <div>Go to dApp</div>
                      <div style={{ fontSize: "10px", marginTop: "5px", color: "gray" }}>Coming Soon</div>
                    </div>
                  </Button>
                </HStack>
              </Stack>
            </Box>
            <Box width={isMobile ? "0" : "50%"} textAlign="center">
              <Image
                objectFit="cover"
                src="https://raw.githubusercontent.com/noma-protocol/assets/main/hands.png"
                visibility={isMobile ? "hidden" : "initial"}
              />
            </Box>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
};

export default Hero;
