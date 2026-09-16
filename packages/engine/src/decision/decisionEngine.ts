import {
  mulDivCeil,
  pow10,
  tokenAmount,
  unixSeconds,
  type DecisionReason,
  type ExecutionProposal,
} from '@kairos/shared';
import { estimateManualBuyCapacity } from '../capacity/manualBookCapacity.js';
import { DEFAULT_FRESHNESS_POLICY, evaluateSnapshotFreshness, type FreshnessPolicy } from '../freshness/freshnessPolicy.js';
import type {
  DecisionConstraintTrace,
  EngineDecision,
  KuruMarketSnapshot,
  LiquidityCapacity,
  PolicyStateSnapshot,
} from '../types.js';

export interface DecideExecutionInput {
  readonly policy: PolicyStateSnapshot;
  readonly market: KuruMarketSnapshot;
  readonly evaluatedAt: bigint;
  readonly freshnessPolicy?: FreshnessPolicy;
}

const ZERO_CAPACITY: LiquidityCapacity = {
  estimatedInput: tokenAmount(0n),
  estimatedGrossOutput: tokenAmount(0n),
  estimatedFeeOutput: tokenAmount(0n),
  estimatedOutput: tokenAmount(0n),
  stopReason: 'NO_LIQUIDITY',
  trace: [],
  includedSources: ['MANUAL_L2'],
  excludedSources: ['KURU_AMM_VAULT'],
};

function minimum(values: readonly bigint[]): bigint {
  return values.reduce((current, value) => (value < current ? value : current));
}

function minimumOutputForMinFill(policy: PolicyStateSnapshot, market: KuruMarketSnapshot): bigint {
  return mulDivCeil(
    policy.order.minFill,
    pow10(market.params.baseAssetDecimals) * pow10(market.policyPriceDecimals),
    policy.order.maxEffectivePrice * pow10(market.params.quoteAssetDecimals),
  );
}

function emptyConstraints(policy: PolicyStateSnapshot): DecisionConstraintTrace {
  return {
    releasedAvailable: policy.availableToSpend,
    remainingBudget: policy.remainingBudget,
    maxPerFill: policy.order.maxPerFill,
    walletBalance: policy.walletBalance,
    tokenAllowance: policy.tokenAllowance,
    estimatedLiquidityCapacity: tokenAmount(0n),
    selectedInput: tokenAmount(0n),
  };
}

function wait(
  reason: DecisionReason,
  input: DecideExecutionInput,
  capacity: LiquidityCapacity = ZERO_CAPACITY,
  constraints: DecisionConstraintTrace = emptyConstraints(input.policy),
  freshness = evaluateSnapshotFreshness(
    input.policy,
    input.market,
    input.evaluatedAt,
    input.freshnessPolicy ?? DEFAULT_FRESHNESS_POLICY,
  ),
): EngineDecision {
  return {
    kind: 'WAIT',
    reason,
    evaluatedAt: unixSeconds(input.evaluatedAt),
    policyBlockHash: input.policy.blockHash,
    marketBlockHash: input.market.identity.blockHash,
    freshness,
    constraints,
    capacity,
  };
}

function snapshotsAgree(policy: PolicyStateSnapshot, market: KuruMarketSnapshot): boolean {
  return (
    policy.blockNumber === market.identity.blockNumber &&
    policy.blockHash.toLowerCase() === market.identity.blockHash.toLowerCase() &&
    policy.order.market.toLowerCase() === market.identity.market.toLowerCase() &&
    policy.order.tokenIn.toLowerCase() === market.params.quoteAsset.toLowerCase() &&
    policy.order.tokenOut.toLowerCase() === market.params.baseAsset.toLowerCase()
  );
}

export function decideExecution(input: DecideExecutionInput): EngineDecision {
  const { policy, market } = input;
  if (!snapshotsAgree(policy, market)) return wait('INCONSISTENT_SNAPSHOT', input);
  const freshness = evaluateSnapshotFreshness(
    policy,
    market,
    input.evaluatedAt,
    input.freshnessPolicy ?? DEFAULT_FRESHNESS_POLICY,
  );
  if (freshness.status !== 'FRESH') return wait('STALE_MARKET_DATA', input, ZERO_CAPACITY, emptyConstraints(policy), freshness);
  if (policy.status === 'CANCELLED') return wait('CANCELLED', input);
  if (policy.status === 'EXPIRED') return wait('EXPIRED', input);
  if (policy.status === 'COMPLETED') return wait('COMPLETED', input);
  if (market.marketState !== 'ACTIVE') return wait('MARKET_NOT_ACTIVE', input);

  if (policy.remainingBudget < policy.order.minFill) return wait('REMAINDER_BELOW_MIN_FILL', input);
  if (policy.availableToSpend < policy.order.minFill) return wait('NOT_DUE', input);
  if (policy.walletBalance < policy.order.minFill) return wait('INSUFFICIENT_BALANCE', input);
  if (policy.tokenAllowance < policy.order.minFill) return wait('INSUFFICIENT_ALLOWANCE', input);

  const preLiquidityLimit = minimum([
    policy.availableToSpend,
    policy.remainingBudget,
    policy.order.maxPerFill,
    policy.walletBalance,
    policy.tokenAllowance,
  ]);
  const capacity = estimateManualBuyCapacity({
    snapshot: market,
    inputLimit: preLiquidityLimit,
    maxEffectivePrice: policy.order.maxEffectivePrice,
  });
  const selectedInput = minimum([preLiquidityLimit, capacity.estimatedInput]);
  const constraints: DecisionConstraintTrace = {
    releasedAvailable: policy.availableToSpend,
    remainingBudget: policy.remainingBudget,
    maxPerFill: policy.order.maxPerFill,
    walletBalance: policy.walletBalance,
    tokenAllowance: policy.tokenAllowance,
    estimatedLiquidityCapacity: capacity.estimatedInput,
    selectedInput: tokenAmount(selectedInput),
  };

  if (selectedInput < policy.order.minFill) {
    const reason: DecisionReason = capacity.stopReason === 'PRICE_LIMIT' ? 'PRICE_OUT_OF_BOUNDS' : 'INSUFFICIENT_LIQUIDITY';
    return wait(reason, input, capacity, constraints);
  }
  const requestedValidUntil = input.evaluatedAt + (input.freshnessPolicy ?? DEFAULT_FRESHNESS_POLICY).proposalValiditySeconds;
  const validUntil = requestedValidUntil < policy.order.endTime ? requestedValidUntil : policy.order.endTime;
  if (validUntil <= input.evaluatedAt) return wait('EXPIRED', input, capacity, constraints);

  const proposal: ExecutionProposal = {
    orderId: policy.order.id,
    nonce: policy.order.executionNonce,
    validUntil: unixSeconds(validUntil),
    proposedInput: tokenAmount(selectedInput),
    minOutput: tokenAmount(minimumOutputForMinFill(policy, market)),
    snapshotId: market.identity.blockHash,
  };
  return {
    kind: 'EXECUTE',
    reason: 'EXECUTE',
    evaluatedAt: unixSeconds(input.evaluatedAt),
    policyBlockHash: policy.blockHash,
    marketBlockHash: market.identity.blockHash,
    freshness,
    constraints,
    capacity,
    proposal,
  };
}
