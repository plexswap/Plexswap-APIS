import { ChainId } from '@plexswap/chains'
import { FarmWithPrices, SerializedFarmConfig } from '@plexswap/farms'
import { CurrencyAmount, Pair } from '@plexswap/sdk-core'
import { BUSD, WAYA, USDP } from '@plexswap/tokens'
import BN from 'bignumber.js'
import { formatUnits } from 'viem'
import { farmFetcher } from './helper'
import { FarmKV, FarmResult } from './kv'
import { bscClient, bscTestnetClient, plexchainClient } from './provider'

// copy from src/config, should merge them later
const BSC_BLOCK_TIME = 3
const BLOCKS_PER_YEAR = (60 / BSC_BLOCK_TIME) * 60 * 24 * 365 // 10512000

const FIXED_ZERO = new BN(0)
const FIXED_100 = new BN(100)

export const getFarmWayaRewardApr = (farm: FarmWithPrices, wayaPriceBusd: BN, regularWayaPerBlock: number) => {
  let wayaRewardsAprAsString = '0'
  if (!wayaPriceBusd) {
    return wayaRewardsAprAsString
  }
  const totalLiquidity = new BN(farm.lpTotalInQuoteToken).times(new BN(farm.quoteTokenPriceBusd))
  const poolWeight = new BN(farm.poolWeight)
  if (totalLiquidity.isZero() || poolWeight.isZero()) {
    return wayaRewardsAprAsString
  }
  const yearlyWayaRewardAllocation = poolWeight
    ? poolWeight.times(new BN(BLOCKS_PER_YEAR).times(new BN(String(regularWayaPerBlock))))
    : FIXED_ZERO
  const wayaRewardsApr = yearlyWayaRewardAllocation.times(wayaPriceBusd).div(totalLiquidity).times(FIXED_100)
  if (!wayaRewardsApr.isZero()) {
    wayaRewardsAprAsString = wayaRewardsApr.toFixed(2)
  }
  return wayaRewardsAprAsString
}

const pairAbi = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      {
        internalType: 'uint112',
        name: 'reserve0',
        type: 'uint112',
      },
      {
        internalType: 'uint112',
        name: 'reserve1',
        type: 'uint112',
      },
      {
        internalType: 'uint32',
        name: 'blockTimestampLast',
        type: 'uint32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const wayaBusdPairMap = {
  [ChainId.BSC]: {
    address: Pair.getAddress(WAYA[ChainId.BSC], BUSD[ChainId.BSC]),
    tokenA: WAYA[ChainId.BSC],
    tokenB: BUSD[ChainId.BSC],
  },
  [ChainId.BSC_TESTNET]: {
    address: Pair.getAddress(WAYA[ChainId.BSC_TESTNET], BUSD[ChainId.BSC_TESTNET]),
    tokenA: WAYA[ChainId.BSC_TESTNET],
    tokenB: BUSD[ChainId.BSC_TESTNET],
  },
  [ChainId.GOERLI]: {
    address: Pair.getAddress(WAYA[ChainId.GOERLI], BUSD[ChainId.GOERLI]),
    tokenA: WAYA[ChainId.GOERLI],
    tokenB: BUSD[ChainId.GOERLI],
  },
  [ChainId.PLEXCHAIN]: {
    address: Pair.getAddress(WAYA[ChainId.PLEXCHAIN], USDP[ChainId.PLEXCHAIN]),
    tokenA: WAYA[ChainId.PLEXCHAIN],
    tokenB: USDP[ChainId.PLEXCHAIN],
  },
}

const getWayaPrice = async (chainId: ChainId) => {
  const pairConfig = wayaBusdPairMap[chainId]
  const client = {
    [ChainId.BSC]           : bscClient,
    [ChainId.BSC_TESTNET]   : bscTestnetClient,
    [ChainId.PLEXCHAIN]     : plexchainClient,
    [ChainId.GOERLI]           : bscClient,
  } 

  const [reserve0, reserve1] = await client[chainId].readContract({
    abi: pairAbi,
    address: pairConfig.address,
    functionName: 'getReserves',
  })

  const { tokenA, tokenB } = pairConfig

  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]

  const pair = new Pair(
    CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
    CurrencyAmount.fromRawAmount(token1, reserve1.toString()),
  )

  return pair.priceOf(tokenA)
}

const farmConfigApi = 'https://plexswap-farms.pages.dev'

export async function saveFarms(chainId: number, event: ScheduledEvent | FetchEvent) {
  try {
    const farmsConfig = await (await fetch(`${farmConfigApi}/${chainId}.json`)).json<SerializedFarmConfig[]>()
    let lpPriceHelpers: SerializedFarmConfig[] = []
    try {
      lpPriceHelpers = await (
        await fetch(`${farmConfigApi}/priceHelperLps/${chainId}.json`)
      ).json<SerializedFarmConfig[]>()
    } catch (error) {
      console.error('Get LP price helpers error', error)
    }

    if (!farmsConfig) {
      throw new Error(`Farms config not found ${chainId}`)
    }
    const { farmsWithPrice, poolLength, regularWayaPerBlock } = await farmFetcher.fetchFarms({
      chainId,
      farms: farmsConfig.filter((f) => f.pid !== 0).concat(lpPriceHelpers),
    })

    const wayaBusdPrice = await getWayaPrice(chainId)

    const finalFarm = farmsWithPrice.map((f) => {
      return {
        ...f,
        wayaApr: getFarmWayaRewardApr(f, new BN(wayaBusdPrice.toSignificant(3)), regularWayaPerBlock),
      }
    }) as FarmResult

    const savedFarms = {
      updatedAt: new Date().toISOString(),
      poolLength,
      regularWayaPerBlock,
      data: finalFarm,
    }

    event.waitUntil(FarmKV.saveFarms(chainId, savedFarms))

    return savedFarms
  } catch (error) {
    console.error('[ERROR] fetching farms', error)
    throw error
  }
}

const chainlinkAbi = [
  {
    inputs: [],
    name: 'latestAnswer',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export async function fetchWayaPrice() {
  const address = '0xB6064eD41d4f67e353768aA239cA86f4F73665a1'
  const latestAnswer = await bscClient.readContract({
    abi: chainlinkAbi,
    address,
    functionName: 'latestAnswer',
  })

  return formatUnits(latestAnswer, 8)
}
