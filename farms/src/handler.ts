import { FixedNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getFarmWayaRewardApr, SerializedFarmConfig } from '@plexswap/farms'
import { BUSD, WAYA, USDP } from '@plexswap/tokens'
import { farmFetcher } from './helper'
import { FarmKV, FarmResult } from './kv'
import { updateLPsAPR } from './lpApr'
import { rpcProvider } from './provider'
import { ChainId, CurrencyAmount, Pair } from '@plexswap/sdk'

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
]

const wayaPricePairMap = {
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
    address: Pair.getAddress(WAYA[ChainId.GOERLI], USDP[ChainId.PLEXCHAIN]),
    tokenA: WAYA[ChainId.PLEXCHAIN],
    tokenB: USDP[ChainId.PLEXCHAIN],
  },
}

const getWayaPrice = async (chainId: ChainId) => {

  const pairConfig = wayaPricePairMap[chainId]
  const pairContract = new Contract(pairConfig.address, pairAbi, rpcProvider[chainId])
  const reserves = await pairContract.getReserves()
  const { reserve0, reserve1 } = reserves
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
    const isTestnet = farmFetcher.isTestnet(chainId)
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
      isTestnet,
      farms: farmsConfig.filter((f) => f.pid !== 0).concat(lpPriceHelpers),
    })

    const wayaBusdPrice = await getWayaPrice(chainId)
    const lpAprs = await handleLpAprs(chainId)

    const finalFarm = farmsWithPrice.map((f) => {
      return {
        ...f,
        lpApr: lpAprs?.[f.lpAddress.toLowerCase()] || 0,
        wayaApr: getFarmWayaRewardApr(f, FixedNumber.from(wayaBusdPrice.toSignificant(3)), regularWayaPerBlock),
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

export async function handleLpAprs(chainId: number) {
  let lpAprs = await FarmKV.getApr(chainId)
  if (!lpAprs) {
    lpAprs = await saveLPsAPR(chainId)
  }
  return lpAprs || {}
}

export async function saveLPsAPR(chainId: number) {
  // TODO: add other chains
  if (chainId === 56) {
    const value = await FarmKV.getFarms(chainId)
    if (value && value.data) {
      const aprMap = (await updateLPsAPR(chainId, Object.values(value.data))) || null
      FarmKV.saveApr(chainId, aprMap)
      return aprMap || null
    }
    return null
  }
  return null
}
