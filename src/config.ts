const environment = import.meta.env.VITE_ENV;
const chain = import.meta.env.VITE_CHAIN;
const RPC_URL = import.meta.env.VITE_RPC_URL;
const feeTiers = [3000, 10000];

const oksVault = "0x3AA2Ea2aca5DD788140aE78906Ded9C4e6524d11";
const presaleContractAddress = "0x99b32151E3C0c8432c4c6C9b6F3213123e443F06";

const vault2ProtocolMap = {
    [oksVault]: "uniswap",
};

const protocolAddresses = {
    uniswapV3Factory: "0x961235a9020B05C44DF1026D956D1F4D78014276",
    pancakeV3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865", // PancakeSwap V3 Factory
    pancakeQuoterV2: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997", 
    uniswapQuoterV2: "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
    WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
}

export default {
    chain,
    RPC_URL,
    vault2ProtocolMap, 
    feeTiers,
    protocolAddresses,
    environment,
    presaleContractAddress
};

