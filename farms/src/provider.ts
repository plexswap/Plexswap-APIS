import { StaticJsonRpcProvider } from '@ethersproject/providers'

export const bscProvider = new StaticJsonRpcProvider(
  {
    url: 'https://bsc-mainnet.nodereal.io/v1/e44eb77ea3f94d11b77ef27be519e58d',
    skipFetchSetup: true,
  },
  56,
)

export const bscTestnetProvider = new StaticJsonRpcProvider(
  {
    url: 'https://bsc-testnet.nodereal.io/v1/e44eb77ea3f94d11b77ef27be519e58d',
    skipFetchSetup: true,
  },
  97,
)

export const goerliProvider = new StaticJsonRpcProvider(
  {
    url: 'https://eth-goerli.nodereal.io/v1/e44eb77ea3f94d11b77ef27be519e58d',
    skipFetchSetup: true,
  },
  5,
)

export const plexchainProvider = new StaticJsonRpcProvider(
  {
    url: 'https://plex-rpc.plexfinance.us',
    skipFetchSetup: false,
  },
  1149,
)
