const presaleContractAddress = "0xd582883e944fb36A2Be30f478e58e33339c01426";
const environment = import.meta.env.VITE_ENV;
const chain = import.meta.env.VITE_CHAIN;

const protocolAddresses = {
    uniswapV3Factory: "0x961235a9020B05C44DF1026D956D1F4D78014276",
    QuoterV2: "0x1b4E313fEF15630AF3e6F2dE550Dbf4cC9D3081d",
    WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
}

export default {
    chain,
    protocolAddresses,
    environment,
    presaleContractAddress
};

