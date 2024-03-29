import { StaticJsonRpcProvider } from '@ethersproject/providers'
import { ChainId } from '@plexswap/chains'

export const bscProvider = new StaticJsonRpcProvider(
  {
    url: 'https://bsc-mainnet.nodereal.io/v1/e44eb77ea3f94d11b77ef27be519e58d',
    skipFetchSetup: true,
  },
  ChainId.BSC,
)

export const bscTestnetProvider = new StaticJsonRpcProvider(
  {
    url: 'https://bsc-testnet.nodereal.io/v1/e44eb77ea3f94d11b77ef27be519e58d',
    skipFetchSetup: true,
  },
  ChainId.BSC_TESTNET,
)

export const goerliProvider = new StaticJsonRpcProvider(
  {
    url: 'https://eth-goerli.nodereal.io/v1/e44eb77ea3f94d11b77ef27be519e58d',
    skipFetchSetup: true,
  },
  ChainId.GOERLI,
)

export const plexchainProvider = new StaticJsonRpcProvider(
  {
    url: 'https://plex-rpc.plexfinance.us',
    skipFetchSetup: true,
  },
  ChainId.PLEXCHAIN,
)

export const rpcProvider = {
  [ChainId.GOERLI]        : goerliProvider,
  [ChainId.BSC]           : bscProvider,
  [ChainId.BSC_TESTNET]   : bscTestnetProvider,
  [ChainId.PLEXCHAIN]     : plexchainProvider
}
