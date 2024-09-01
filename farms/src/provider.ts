import { ChainId } from '@plexswap/chains'
import { createPublicClient, http, PublicClient } from 'viem'
import {
  bsc,
  bscTestnet,
} from 'viem/chains'

const requireCheck = [
  BSC_NODE,
  BSC_TESTNET_NODE,
]


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

export const viemProviders = ({ chainId }: { chainId?: ChainId }): PublicClient => {
  switch (chainId) {
    case ChainId.BSC:
      return bscClient
    case ChainId.BSC_TESTNET:
      return bscTestnetClient
    default:
      return bscClient
  }
}