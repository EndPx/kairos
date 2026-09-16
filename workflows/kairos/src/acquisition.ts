import type { HTTPSendRequester } from '@chainlink/cre-sdk';
import { decodeFunctionResult, encodeFunctionData, encodeFunctionResult, type Address, type Hex } from 'viem';
import { ERC20_READ_ABI, KAIROS_POLICY_ABI, KURU_MARKET_ABI } from './abi.js';
import type { WorkflowConfig } from './config.js';
import { jsonRpc, rpcHex } from './rpc.js';

export interface RpcBlock {
  readonly number: Hex;
  readonly hash: Hex;
  readonly timestamp: Hex;
}

export interface SerializedAcquisition {
  readonly proofKind:
    | 'LIVE_RPC_WITH_FIXTURE_POLICY'
    | 'LIVE_RPC_POLICY'
    | 'LIVE_RPC_WITH_FIXTURE_POLICY_AND_L2'
    | 'LIVE_RPC_POLICY_WITH_FIXTURE_L2';
  readonly block: RpcBlock;
  readonly observedAt: string;
  readonly l2Result: Hex;
  readonly marketParamsResult: Hex;
  readonly marketStateResult: Hex;
  readonly policy?: {
    readonly orderResult: Hex;
    readonly statusResult: Hex;
    readonly releasedResult: Hex;
    readonly availableResult: Hex;
    readonly executorResult: Hex;
    readonly marketResult: Hex;
    readonly tokenInResult: Hex;
    readonly tokenOutResult: Hex;
    readonly priceDecimalsResult: Hex;
    readonly balanceResult: Hex;
    readonly allowanceResult: Hex;
  };
}

function fixtureL2Result(config: WorkflowConfig, blockNumber: Hex): Hex {
  if (config.fixtureAsks === undefined || config.fixtureAsks.length === 0) {
    throw new Error('FIXTURE_L2 requires at least one configured ask.');
  }
  const words = [
    BigInt(blockNumber),
    0n,
    ...config.fixtureAsks.flatMap((level) => [BigInt(level.price), BigInt(level.size)]),
  ];
  const payload = `0x${words.map((value) => value.toString(16).padStart(64, '0')).join('')}` as Hex;
  return encodeFunctionResult({ abi: KURU_MARKET_ABI, functionName: 'getL2Book', result: payload });
}

function ethCall(
  requester: HTTPSendRequester,
  config: WorkflowConfig,
  id: number,
  to: string,
  data: Hex,
  blockNumber: Hex,
): Hex {
  return rpcHex(jsonRpc(requester, config.rpcUrl, id, 'eth_call', [{ to, data }, blockNumber]), 'eth_call');
}

function callData(abi: readonly unknown[], functionName: string, args?: readonly unknown[]): Hex {
  return encodeFunctionData({ abi, functionName, ...(args === undefined ? {} : { args }) } as never);
}

function fetchPolicy(
  requester: HTTPSendRequester,
  config: WorkflowConfig,
  block: RpcBlock,
  firstId: number,
): NonNullable<SerializedAcquisition['policy']> {
  const orderId = BigInt(config.orderId);
  const policy = config.policyAddress;
  const orderResult = ethCall(
    requester,
    config,
    firstId,
    policy,
    callData(KAIROS_POLICY_ABI, 'getOrder', [orderId]),
    block.number,
  );
  const order = decodeFunctionResult({
    abi: KAIROS_POLICY_ABI,
    functionName: 'getOrder',
    data: orderResult,
  });
  const timestamp = BigInt(block.timestamp);
  const statusResult = ethCall(
    requester,
    config,
    firstId + 1,
    policy,
    callData(KAIROS_POLICY_ABI, 'statusOf', [orderId]),
    block.number,
  );
  const releasedResult = ethCall(
    requester,
    config,
    firstId + 2,
    policy,
    callData(KAIROS_POLICY_ABI, 'releasedBudget', [orderId, timestamp]),
    block.number,
  );
  const availableResult = ethCall(
    requester,
    config,
    firstId + 3,
    policy,
    callData(KAIROS_POLICY_ABI, 'availableToSpend', [orderId, timestamp]),
    block.number,
  );
  const executorResult = ethCall(requester, config, firstId + 4, policy, callData(KAIROS_POLICY_ABI, 'executor'), block.number);
  const marketResult = ethCall(requester, config, firstId + 5, policy, callData(KAIROS_POLICY_ABI, 'market'), block.number);
  const tokenInResult = ethCall(requester, config, firstId + 6, policy, callData(KAIROS_POLICY_ABI, 'tokenIn'), block.number);
  const tokenOutResult = ethCall(requester, config, firstId + 7, policy, callData(KAIROS_POLICY_ABI, 'tokenOut'), block.number);
  const priceDecimalsResult = ethCall(
    requester,
    config,
    firstId + 8,
    policy,
    callData(KAIROS_POLICY_ABI, 'priceDecimals'),
    block.number,
  );
  const tokenIn = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'tokenIn', data: tokenInResult });
  const balanceResult = ethCall(
    requester,
    config,
    firstId + 9,
    tokenIn,
    callData(ERC20_READ_ABI, 'balanceOf', [order.owner]),
    block.number,
  );
  const allowanceResult = ethCall(
    requester,
    config,
    firstId + 10,
    tokenIn,
    callData(ERC20_READ_ABI, 'allowance', [order.owner, policy as Address]),
    block.number,
  );
  return {
    orderResult,
    statusResult,
    releasedResult,
    availableResult,
    executorResult,
    marketResult,
    tokenInResult,
    tokenOutResult,
    priceDecimalsResult,
    balanceResult,
    allowanceResult,
  };
}

export function acquireAtOneBlock(
  requester: HTTPSendRequester,
  config: WorkflowConfig,
  observedAtSeconds: bigint,
): string {
  const rawBlock = jsonRpc(requester, config.rpcUrl, 1, 'eth_getBlockByNumber', [config.blockTag, false]);
  if (rawBlock === null || typeof rawBlock !== 'object') throw new Error('Pinned block was not found.');
  const blockRecord = rawBlock as Record<string, unknown>;
  const block: RpcBlock = {
    number: rpcHex(blockRecord.number, 'eth_getBlockByNumber.number'),
    hash: rpcHex(blockRecord.hash, 'eth_getBlockByNumber.hash'),
    timestamp: rpcHex(blockRecord.timestamp, 'eth_getBlockByNumber.timestamp'),
  };
  const l2Result =
    config.marketDataSource === 'RPC_L2'
      ? ethCall(
          requester,
          config,
          2,
          config.marketAddress,
          callData(KURU_MARKET_ABI, 'getL2Book'),
          block.number,
        )
      : fixtureL2Result(config, block.number);
  const marketParamsResult = ethCall(
    requester,
    config,
    3,
    config.marketAddress,
    callData(KURU_MARKET_ABI, 'getMarketParams'),
    block.number,
  );
  const marketStateResult = ethCall(
    requester,
    config,
    4,
    config.marketAddress,
    callData(KURU_MARKET_ABI, 'marketState'),
    block.number,
  );
  const policy = config.policySource === 'RPC_POLICY' ? fetchPolicy(requester, config, block, 5) : undefined;
  const blockTimestamp = BigInt(block.timestamp);
  const effectiveObservedAt = observedAtSeconds < blockTimestamp ? blockTimestamp : observedAtSeconds;
  const proofKind: SerializedAcquisition['proofKind'] =
    policy === undefined
      ? config.marketDataSource === 'RPC_L2'
        ? 'LIVE_RPC_WITH_FIXTURE_POLICY'
        : 'LIVE_RPC_WITH_FIXTURE_POLICY_AND_L2'
      : config.marketDataSource === 'RPC_L2'
        ? 'LIVE_RPC_POLICY'
        : 'LIVE_RPC_POLICY_WITH_FIXTURE_L2';
  const acquisition: SerializedAcquisition = {
    proofKind,
    block,
    observedAt: effectiveObservedAt.toString(),
    l2Result,
    marketParamsResult,
    marketStateResult,
    ...(policy === undefined ? {} : { policy }),
  };
  return JSON.stringify(acquisition);
}
