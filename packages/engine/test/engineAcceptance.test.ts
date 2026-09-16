import {
  priceUnits,
  tokenAmount,
  unixSeconds,
  type Address,
  type ExecutionNonce,
  type OrderId,
} from '@kairos/shared';
import { describe, expect, it } from 'vitest';
import {
  decodeAbiBytesReturn,
  decideExecution,
  parseKuruL2Snapshot,
  type KuruMarketSnapshot,
  type PolicyStateSnapshot,
} from '../src/index.js';
import {
  KURU_FIXED_ETH_CALL_RESULT,
  KURU_FIXED_IDENTITY,
  KURU_MARKET_PARAMS,
} from './fixtures/kuruFixedSnapshot.js';

const POLICY = '0x1000000000000000000000000000000000000001' as Address;
const OWNER = '0x2000000000000000000000000000000000000002' as Address;
const word = (value: bigint) => value.toString(16).padStart(64, '0');

function market(asks: ReadonlyArray<readonly [bigint, bigint]>): KuruMarketSnapshot {
  return parseKuruL2Snapshot({
    payload: `0x${[KURU_FIXED_IDENTITY.blockNumber, 0n, ...asks.flatMap(([price, size]) => [price, size])]
      .map(word)
      .join('')}`,
    identity: {
      ...KURU_FIXED_IDENTITY,
      kind: 'FIXTURE',
      blockTimestamp: unixSeconds(1_000n),
      observedAt: unixSeconds(1_001n),
    },
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
      executor: '0x3000000000000000000000000000000000000003',
      market: KURU_FIXED_IDENTITY.market,
      tokenIn: KURU_MARKET_PARAMS.quoteAsset,
      tokenOut: KURU_MARKET_PARAMS.baseAsset,
      recipient: OWNER,
      budget: tokenAmount(100_000_000n),
      spent: tokenAmount(0n),
      received: tokenAmount(0n),
      startTime: unixSeconds(1_000n),
      endTime: unixSeconds(2_000n),
      maxPerFill: tokenAmount(100_000_000n),
      minFill: tokenAmount(5_000_000n),
      maxEffectivePrice: priceUnits(10_000_000n),
      executionNonce: 0n as ExecutionNonce,
      cancelled: false,
    },
    status: 'ACTIVE',
    releasedBudget: tokenAmount(100_000_000n),
    availableToSpend: tokenAmount(100_000_000n),
    remainingBudget: tokenAmount(100_000_000n),
    walletBalance: tokenAmount(100_000_000n),
    tokenAllowance: tokenAmount(100_000_000n),
    marketState: 'ACTIVE',
    balanceScope: 'WALLET_SHARED_NOT_RESERVED',
    ...overrides,
  };
}

describe('M2 acceptance closure', () => {
  it('handles release boundaries without duplicating contract schedule arithmetic', () => {
    const book = market([[5_000_000n, 4_000_000_000_000n]]);
    const beforeMinimum = decideExecution({
      policy: policy({ availableToSpend: tokenAmount(4_999_999n) }),
      market: book,
      evaluatedAt: 1_002n,
    });
    const atMinimum = decideExecution({
      policy: policy({ availableToSpend: tokenAmount(5_000_000n) }),
      market: book,
      evaluatedAt: 1_002n,
    });

    expect(beforeMinimum.reason).toBe('NOT_DUE');
    expect(beforeMinimum.proposal).toBeUndefined();
    expect(atMinimum.kind).toBe('EXECUTE');
    expect(atMinimum.proposal?.proposedInput).toBe(5_000_000n);
  });

  it('re-evaluates shared wallet balance after external contention', () => {
    const book = market([[5_000_000n, 4_000_000_000_000n]]);
    const initial = decideExecution({ policy: policy(), market: book, evaluatedAt: 1_002n });
    const refreshed = decideExecution({
      policy: policy({ walletBalance: tokenAmount(4_999_999n) }),
      market: book,
      evaluatedAt: 1_002n,
    });

    expect(initial.kind).toBe('EXECUTE');
    expect(refreshed.kind).toBe('WAIT');
    expect(refreshed.reason).toBe('INSUFFICIENT_BALANCE');
    expect(refreshed.proposal).toBeUndefined();
  });

  it('turns the recorded real empty Kuru snapshot into WAIT without an onchain proposal (ENG-03)', () => {
    const realReplay = parseKuruL2Snapshot({
      payload: decodeAbiBytesReturn(KURU_FIXED_ETH_CALL_RESULT),
      identity: KURU_FIXED_IDENTITY,
      marketState: 'ACTIVE',
      params: KURU_MARKET_PARAMS,
      policyPriceDecimals: 8,
    });
    const replayPolicy = policy({
      blockTimestamp: KURU_FIXED_IDENTITY.blockTimestamp,
      order: {
        ...policy().order,
        startTime: unixSeconds(KURU_FIXED_IDENTITY.blockTimestamp - 100n),
        endTime: unixSeconds(KURU_FIXED_IDENTITY.blockTimestamp + 1_000n),
      },
    });
    const decision = decideExecution({
      policy: replayPolicy,
      market: realReplay,
      evaluatedAt: KURU_FIXED_IDENTITY.observedAt,
      freshnessPolicy: { maxSnapshotAgeSeconds: 10_000n, proposalValiditySeconds: 5n },
    });

    expect(decision.kind).toBe('WAIT');
    expect(decision.reason).toBe('INSUFFICIENT_LIQUIDITY');
    expect(decision.capacity.stopReason).toBe('NO_LIQUIDITY');
    expect(decision.proposal).toBeUndefined();
  });

  it('replays identical inputs to byte-for-byte-equivalent decision data', () => {
    const state = policy();
    const book = market([
      [5_000_000n, 4_000_000_000_000n],
      [6_000_000n, 4_000_000_000_000n],
    ]);
    const decisions = Array.from({ length: 25 }, () =>
      decideExecution({ policy: state, market: book, evaluatedAt: 1_002n }),
    );
    const encoded = decisions.map((decision) =>
      JSON.stringify(decision, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
    );
    expect(new Set(encoded).size).toBe(1);
  });
});
