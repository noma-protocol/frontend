import React from "react";
import { Container } from "@chakra-ui/react";
// import { commify } from "../utils";

// Components
import Stats from "../components/Stats.tsx";
import Treasury from "../components/Treasury.tsx";
import AMM from "../components/AMM.tsx";
import ALM from "../components/ALM.tsx";
import CTA from "../components/CTA.tsx";
import Hero from "../components/Hero.tsx";
import Details from "../components/Details.tsx";


const HomePage: React.FC = () => {
  return (
    <>
      <Container>
        <Hero />
        <Stats />
        <Treasury />
        <Details />
        <ALM />
        <AMM />
        <CTA />
      </Container>
    </>
  );
};

export default HomePage;
