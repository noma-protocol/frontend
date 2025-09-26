const environment = import.meta.env.VITE_ENV;
const chain = import.meta.env.VITE_CHAIN;
const RPC_URL = import.meta.env.VITE_RPC_URL;
const feeTiers = [3000, 10000];

const presaleContractAddress = "0x99b32151E3C0c8432c4c6C9b6F3213123e443F06";

// API URL configuration based on environment
const API_URL = environment === 'dev' 
    ? 'http://localhost:3004/api' 
    : 'https://trollbox.noma.money/api';

// WebSocket URL configuration based on environment
const WS_URL = environment === 'dev' 
    ? 'ws://localhost:9090' 
    : 'wss://trollbox-ws.noma.money';

const protocolAddresses = {
    uniswapV3Factory: "0x961235a9020B05C44DF1026D956D1F4D78014276",
    pancakeV3Factory: "0x3b7838D96Fc18AD1972aFa17574686be79C50040", // PancakeSwap V3 Factory
    pancakeQuoterV2: "0x7f988126C2c5d4967Bb5E70bDeB7e26DB6BD5C28", 
    uniswapQuoterV2: "0x1b4E313fEF15630AF3e6F2dE550Dbf4cC9D3081d",
    WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    // WMON: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
}

export default {
    chain,
    RPC_URL,
    API_URL,
    WS_URL,
    feeTiers,
    protocolAddresses,
    environment,
    presaleContractAddress
};

