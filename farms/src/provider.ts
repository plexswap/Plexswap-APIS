import { ChainId } from '@plexswap/chains'
import { Chain, createPublicClient, http, PublicClient, defineChain } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

const requireCheck = [
  BSC_NODE,
  BSC_TESTNET_NODE,
  PLEXCHAIN_NODE
]

export const plexchain = /*#__PURE__*/ defineChain({
  id: 1149,
  name: 'Symplexia Smart Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Plex Native Token',
    symbol: 'PLEX',
  },
  rpcUrls: {
    default: { http: ["https://plex-rpc.plexfinance.us"] },
  },
  blockExplorers: {
    default: {
      name: 'Plexchain Explorer',
      url: 'https://explorer.plexfinance.us',
    },
  },
  contracts: {
    multicall3: {
      address: '0x2210e34629E5B17B5F2D875a76098223d71F1D3E',
      blockCreated: 455863,
    },
  },
})


requireCheck.forEach((node) => {
  if (!node) {
    throw new Error('Missing env var')
  }
})

export const bscClient: PublicClient = createPublicClient({
  chain: bsc,
  transport: http(BSC_NODE),
  batch: {
    multicall: {
      batchSize: 1024 * 200,
      wait: 16,
    },
  },
  pollingInterval: 6_000,
})

export const bscTestnetClient: PublicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(BSC_TESTNET_NODE),
  batch: {
    multicall: {
      batchSize: 1024 * 200,
      wait: 16,
    },
  },
  pollingInterval: 6_000,
})

export const plexchainClient: PublicClient = createPublicClient({
  chain: plexchain,
  transport: http(PLEXCHAIN_NODE),
  batch: {
    multicall: {
      batchSize: 1024 * 200,
      wait: 16,
    },
  },
  pollingInterval: 6_000,
})

export const viemProviders = ({ chainId }: { chainId?: ChainId }): PublicClient => {
  switch (chainId) {
    case ChainId.BSC:
      return bscClient
    case ChainId.BSC_TESTNET:
      return bscTestnetClient
    case ChainId.PLEXCHAIN:
      return plexchainClient
    default:
      return bscClient
  }
}
