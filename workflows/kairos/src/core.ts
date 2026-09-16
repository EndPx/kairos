import { decodeAbiBytesReturn, decideExecution, parseKuruL2Snapshot, type EngineDecision, type MarketState, type PolicyStateSnapshot } from '@kairos/engine';
import { priceUnits, tokenAmount, unixSeconds, type Address, type ExecutionNonce, type OrderId, type OrderStatus } from '@kairos/shared';
import { decodeFunctionResult, encodeAbiParameters, type Hex } from 'viem';
import { KAIROS_POLICY_ABI, KURU_MARKET_ABI } from './abi.js';
import type { SerializedAcquisition } from './acquisition.js';
import type { WorkflowConfig } from './config.js';

const STATUS: readonly OrderStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
const MARKET_STATE: readonly MarketState[] = ['ACTIVE', 'SOFT_PAUSED', 'HARD_PAUSED'];

function statusAt(index: number): OrderStatus {
  const status = STATUS[index];
  if (status === undefined) throw new Error(`Unknown policy status ${index}.`);
  return status;
}

function marketStateAt(index: number): MarketState {
  return MARKET_STATE[index] ?? 'UNKNOWN';
}

function decodePolicy(config: WorkflowConfig, acquired: SerializedAcquisition): PolicyStateSnapshot {
  const blockNumber = BigInt(acquired.block.number);
  const blockTimestamp = unixSeconds(BigInt(acquired.block.timestamp));
  if (config.policySource === 'FIXTURE_POLICY') {
    const fixture = config.fixturePolicy;
    if (fixture === undefined) throw new Error('FIXTURE_POLICY requires fixturePolicy config.');
    const budget = BigInt(fixture.budget);
    const spent = BigInt(fixture.spent);
    const fixtureStatus: OrderStatus = fixture.cancelled
      ? 'CANCELLED'
      : spent >= budget
        ? 'COMPLETED'
        : BigInt(acquired.block.timestamp) >= BigInt(fixture.endTime)
          ? 'EXPIRED'
          : 'ACTIVE';
    return {
      policy: config.policyAddress as Address,
      blockNumber,
      blockHash: acquired.block.hash,
      blockTimestamp,
      order: {
        id: BigInt(config.orderId) as OrderId,
        owner: fixture.owner as Address,
        executor: fixture.executor as Address,
        market: config.marketAddress as Address,
        tokenIn: fixture.tokenIn as Address,
        tokenOut: fixture.tokenOut as Address,
        recipient: fixture.recipient as Address,
        budget: tokenAmount(budget),
        spent: tokenAmount(spent),
        received: tokenAmount(BigInt(fixture.received)),
        startTime: unixSeconds(BigInt(fixture.startTime)),
        endTime: unixSeconds(BigInt(fixture.endTime)),
        maxPerFill: tokenAmount(BigInt(fixture.maxPerFill)),
        minFill: tokenAmount(BigInt(fixture.minFill)),
        maxEffectivePrice: priceUnits(BigInt(fixture.maxEffectivePrice)),
        executionNonce: BigInt(fixture.executionNonce) as ExecutionNonce,
        cancelled: fixture.cancelled,
      },
      status: fixtureStatus,
      releasedBudget: tokenAmount(BigInt(fixture.releasedBudget)),
      availableToSpend: tokenAmount(BigInt(fixture.availableToSpend)),
      remainingBudget: tokenAmount(budget - spent),
      walletBalance: tokenAmount(BigInt(fixture.walletBalance)),
      tokenAllowance: tokenAmount(BigInt(fixture.tokenAllowance)),
      marketState: 'UNKNOWN',
      balanceScope: 'WALLET_SHARED_NOT_RESERVED',
    };
  }

  const rpc = acquired.policy;
  if (rpc === undefined) throw new Error('RPC_POLICY acquisition omitted policy data.');
  const order = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'getOrder', data: rpc.orderResult });
  const status = Number(decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'statusOf', data: rpc.statusResult }));
  const releasedBudget = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'releasedBudget', data: rpc.releasedResult });
  const availableToSpend = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'availableToSpend', data: rpc.availableResult });
  const executor = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'executor', data: rpc.executorResult });
  const market = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'market', data: rpc.marketResult });
  const tokenIn = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'tokenIn', data: rpc.tokenInResult });
  const tokenOut = decodeFunctionResult({ abi: KAIROS_POLICY_ABI, functionName: 'tokenOut', data: rpc.tokenOutResult });
  const balance = decodeFunctionResult({ abi: [{ type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const, functionName: 'balanceOf', data: rpc.balanceResult });
  const allowance = decodeFunctionResult({ abi: [{ type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const, functionName: 'allowance', data: rpc.allowanceResult });
  return {
    policy: config.policyAddress as Address,
    blockNumber,
    blockHash: acquired.block.hash,
    blockTimestamp,
    order: {
      id: BigInt(config.orderId) as OrderId,
      owner: order.owner,
      executor,
      market,
      tokenIn,
      tokenOut,
      recipient: order.owner,
      budget: tokenAmount(order.budget),
      spent: tokenAmount(order.spent),
      received: tokenAmount(order.received),
      startTime: unixSeconds(order.startTime),
      endTime: unixSeconds(order.endTime),
      maxPerFill: tokenAmount(order.maxPerFill),
      minFill: tokenAmount(order.minFill),
      maxEffectivePrice: priceUnits(order.maxEffectivePrice),
      executionNonce: order.executionNonce as ExecutionNonce,
      cancelled: order.cancelled,
    },
    status: statusAt(status),
    releasedBudget: tokenAmount(releasedBudget),
    availableToSpend: tokenAmount(availableToSpend),
    remainingBudget: tokenAmount(order.budget - order.spent),
    walletBalance: tokenAmount(balance),
    tokenAllowance: tokenAmount(allowance),
    marketState: 'UNKNOWN',
    balanceScope: 'WALLET_SHARED_NOT_RESERVED',
  };
}

export interface WorkflowEvaluation {
  readonly proofKind: SerializedAcquisition['proofKind'];
  readonly decision: EngineDecision;
  readonly reportPayload?: Hex;
}

export function evaluateAcquisition(config: WorkflowConfig, serialized: string, evaluatedAt: bigint): WorkflowEvaluation {
  const acquired = JSON.parse(serialized) as SerializedAcquisition;
  const marketParams = decodeFunctionResult({
    abi: KURU_MARKET_ABI,
    functionName: 'getMarketParams',
    data: acquired.marketParamsResult,
  });
  const marketStateIndex = Number(
    decodeFunctionResult({ abi: KURU_MARKET_ABI, functionName: 'marketState', data: acquired.marketStateResult }),
  );
  const marketState = marketStateAt(marketStateIndex);
  const policy = { ...decodePolicy(config, acquired), marketState };
  const priceDecimals =
    config.policySource === 'RPC_POLICY' && acquired.policy !== undefined
      ? Number(
          decodeFunctionResult({
            abi: KAIROS_POLICY_ABI,
            functionName: 'priceDecimals',
            data: acquired.policy.priceDecimalsResult,
          }),
        )
      : 8;
  const market = parseKuruL2Snapshot({
    payload: decodeAbiBytesReturn(acquired.l2Result),
    identity: {
      kind: 'LIVE_READ',
      chainId: BigInt(config.chainId),
      market: config.marketAddress as Address,
      blockNumber: BigInt(acquired.block.number),
      blockHash: acquired.block.hash,
      blockTimestamp: unixSeconds(BigInt(acquired.block.timestamp)),
      observedAt: unixSeconds(BigInt(acquired.observedAt)),
      sourceRevision: config.sourceRevision,
    },
    marketState,
    params: {
      pricePrecision: BigInt(marketParams.pricePrecision),
      sizePrecision: marketParams.sizePrecision,
      baseAsset: marketParams.baseAsset,
      baseAssetDecimals: Number(marketParams.baseAssetDecimals),
      quoteAsset: marketParams.quoteAsset,
      quoteAssetDecimals: Number(marketParams.quoteAssetDecimals),
      tickSize: BigInt(marketParams.tickSize),
      minSize: marketParams.minSize,
      maxSize: marketParams.maxSize,
      takerFeeBps: marketParams.takerFeeBps,
      makerFeeBps: marketParams.makerFeeBps,
    },
    policyPriceDecimals: priceDecimals,
  });
  const decision = decideExecution({ policy, market, evaluatedAt });
  if (decision.kind === 'WAIT' || decision.proposal === undefined) return { proofKind: acquired.proofKind, decision };
  const proposal = decision.proposal;
  const reportPayload = encodeAbiParameters(
    [
      { type: 'uint256' },
      { type: 'uint64' },
      { type: 'uint64' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'bytes32' },
    ],
    [proposal.orderId, proposal.nonce, proposal.validUntil, proposal.proposedInput, proposal.minOutput, proposal.snapshotId as Hex],
  );
  return { proofKind: acquired.proofKind, decision, reportPayload };
}

export function serializableTrace(evaluation: WorkflowEvaluation, elapsedMs: number, submitted: boolean): string {
  return JSON.stringify(
    {
      proofKind: evaluation.proofKind,
      decision: evaluation.decision,
      reportPayload: evaluation.reportPayload,
      elapsedMs,
      submitted,
      estimatorCoverage: { manualL2: 'INCLUDED', ammVault: 'EXCLUDED' },
    },
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
  );
}
