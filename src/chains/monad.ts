import { type Chain } from 'viem'

export const monad = {
  id: 56,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://monad-testnet.g.alchemy.com/v2/mVGRu2kI9eyr_Q1yUzdBW'],
    },
    public: {
      http: ['https://https://bnb-mainnet.g.alchemy.com/v2/ABiHuR-8MHnojsrXqqV_tAnPKJSZyUbN/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 251449,
    },
  },
} as const satisfies Chain
