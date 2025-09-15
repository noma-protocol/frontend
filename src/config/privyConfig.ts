import { defineChain } from 'viem'
import type { PrivyClientConfig } from '@privy-io/react-auth'

export const monad = defineChain({
  id: 42069,
  name: 'Monad',
  network: 'monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.troll.box'],
    },
    public: {
      http: ['https://rpc.troll.box'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.troll.box' },
  },
})

export const privyConfig = {
  appId: 'cmflex67u0189l40cgysx2vvy',
  config: {
    loginMethods: ['wallet', 'email', 'google', 'twitter', 'discord', 'apple'],
    appearance: {
      theme: 'dark',
      accentColor: '#6B6CFF',
      logo: 'https://raw.githubusercontent.com/noma-protocol/assets/refs/heads/main/noma_logo_dark_bg.png',
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
    },
    defaultChain: monad,
    supportedChains: [monad],
    walletConnectCloudProjectId: 'a49d90d6ef89c4f94f1629f5821784a5',
    // Development settings
    ...(import.meta.env.DEV && {
      clientId: 'cmflex67u0189l40cgysx2vvy',
    }),
  },
}