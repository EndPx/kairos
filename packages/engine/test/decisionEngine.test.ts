import { priceUnits, tokenAmount, unixSeconds, type Address, type ExecutionNonce, type OrderId } from '@kairos/shared';
import { describe, expect, it } from 'vitest';
import { decideExecution, parseKuruL2Snapshot, type PolicyStateSnapshot } from '../src/index.js';
import { KURU_FIXED_IDENTITY, KURU_MARKET_PARAMS } from './fixtures/kuruFixedSnapshot.js';

const POLICY = '0x1000000000000000000000000000000000000001' as Address;
const OWNER = '0x2000000000000000000000000000000000000002' as Address;
const EXECUTOR = '0x3000000000000000000000000000000000000003' as Address;
const word = (value: bigint) => value.toString(16).padStart(64, '0');
const payload = (...values: bigint[]) => `0x${values.map(word).join('')}` as const;

function market(asks: ReadonlyArray<readonly [bigint, bigint]> = [[5_000_000n, 4_000_000_000_000n]]) {
  return parseKuruL2Snapshot({
    payload: payload(KURU_FIXED_IDENTITY.blockNumber, 0n, ...asks.flatMap(([price, size]) => [price, size])),
    identity: { ...KURU_FIXED_IDENTITY, kind: 'FIXTURE' },
    marketState: 'ACTIVE',
    params: KURU_MARKET_PARAMS,
    policyPriceDecimals: 8,
  });
}

function policy(overrides: Partial<PolicyStateSnapshot> = {}): PolicyStateSnapshot {
  return {
    policy: POLICY,
    blockNumber: KURU_FIXED_IDENTITY.blockNumber,
    blockHash: KURU_FIXED_IDENTITY.blockHash,
    blockTimestamp: unixSeconds(1_000n),
    order: {
      id: 1n as OrderId,
      owner: OWNER,
      executor: EXECUTOR,
      market: KURU_FIXED_IDENTITY.market,
      tokenIn: KURU_MARKET_PARAMS.quoteAsset,
      tokenOut: KURU_MARKET_PARAMS.baseAsset,
      recipient: OWNER,
      budget: tokenAmount(100_000_000n),
      spent: tokenAmount(20_000_000n),
      received: tokenAmount(400_000_000_000_000_000_000n),
      startTime: unixSeconds(500n),
      endTime: unixSeconds(2_000n),
      maxPerFill: tokenAmount(30_000_000n),
      minFill: tokenAmount(5_000_000n),
      maxEffectivePrice: priceUnits(6_000_000n),
      executionNonce: 1n as ExecutionNonce,
      cancelled: false,
    },
    status: 'ACTIVE',
    releasedBudget: tokenAmount(70_000_000n),
    availableToSpend: tokenAmount(50_000_000n),
    remainingBudget: tokenAmount(80_000_000n),
    walletBalance: tokenAmount(25_000_000n),
    tokenAllowance: tokenAmount(40_000_000n),
    marketState: 'ACTIVE',
    balanceScope: 'WALLET_SHARED_NOT_RESERVED',
    ...overrides,
  };
}

const decide = (state = policy(), book = market()) =>
  decideExecution({ policy: state, market: book, evaluatedAt: 1_010n, proposalValidUntil: 1_020n });

describe('adaptive decision engine', () => {
  it('selects the minimum constraint and emits an auditable proposal', () => {
    const decision = decide();
    expect(decision.kind).toBe('EXECUTE');
    expect(decision.reason).toBe('EXECUTE');
    expect(decision.constraints).toEqual({
      releasedAvailable: 50_000_000n,
      remainingBudget: 80_000_000n,
      maxPerFill: 30_000_000n,
      walletBalance: 25_000_000n,
      tokenAllowance: 40_000_000n,
      estimatedLiquidityCapacity: 20_000_000n,
      selectedInput: 20_000_000n,
    });
    expect(decision.proposal?.proposedInput).toBe(20_000_000n);
    expect(decision.proposal?.nonce).toBe(1n);
    expect(decision.proposal?.snapshotId).toBe(KURU_FIXED_IDENTITY.blockHash);
    expect(decision.proposal?.minOutput).toBe(83_333_333_333_333_333_334n);
  });

  it('emits deterministic lifecycle and market WAIT reasons', () => {
    expect(decide(policy({ status: 'CANCELLED' })).reason).toBe('CANCELLED');
    expect(decide(policy({ status: 'EXPIRED' })).reason).toBe('EXPIRED');
    expect(decide(policy({ status: 'COMPLETED' })).reason).toBe('COMPLETED');
    expect(decide(policy(), { ...market(), marketState: 'SOFT_PAUSED' }).reason).toBe('MARKET_NOT_ACTIVE');
  });

  it('distinguishes schedule, dust, balance, and allowance limits', () => {
    expect(decide(policy({ availableToSpend: tokenAmount(4_999_999n) })).reason).toBe('NOT_DUE');
    expect(decide(policy({ remainingBudget: tokenAmount(4_999_999n) })).reason).toBe('REMAINDER_BELOW_MIN_FILL');
    expect(decide(policy({ walletBalance: tokenAmount(4_999_999n) })).reason).toBe('INSUFFICIENT_BALANCE');
    expect(decide(policy({ tokenAllowance: tokenAmount(4_999_999n) })).reason).toBe('INSUFFICIENT_ALLOWANCE');
  });

  it('records WAIT when capacity is below minimum without creating a proposal (ENG-03)', () => {
    const decision = decide(policy(), market([[5_000_000n, 500_000_000_000n]]));
    expect(decision.kind).toBe('WAIT');
    expect(decision.reason).toBe('INSUFFICIENT_LIQUIDITY');
    expect(decision.proposal).toBeUndefined();
    expect(decision.constraints.estimatedLiquidityCapacity).toBe(2_500_000n);
  });

  it('distinguishes price-bound capacity from absent liquidity', () => {
    const tight = policy({ order: { ...policy().order, maxEffectivePrice: priceUnits(4_000_000n) } });
    expect(decide(tight).reason).toBe('PRICE_OUT_OF_BOUNDS');
    expect(decide(policy(), market([])).reason).toBe('INSUFFICIENT_LIQUIDITY');
  });

  it('rejects inconsistent snapshot identity and deterministically replays identical input', () => {
    const mismatched = { ...market(), identity: { ...market().identity, blockNumber: 999n } };
    expect(decide(policy(), mismatched).reason).toBe('INCONSISTENT_SNAPSHOT');
    expect(decide()).toEqual(decide());
  });
});
