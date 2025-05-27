const presaleContractAddress = "0xd582883e944fb36A2Be30f478e58e33339c01426";
const environment = import.meta.env.VITE_ENV;
const chain = import.meta.env.VITE_CHAIN;

const protocolAddresses = {
    uniswapV3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    QuoterV2: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997", //Uniswap "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
    WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
}

export default {
    chain,
    protocolAddresses,
    environment,
    presaleContractAddress
};

