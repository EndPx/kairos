import { unixSeconds } from '@kairos/shared';
import { describe, expect, it } from 'vitest';
import {
  decideExecution,
  evaluateAdaptiveDecision,
  parseKuruL2Snapshot,
  type PolicyStateSnapshot,
  type RetryPolicy,
} from '../src/index.js';
import { KURU_FIXED_IDENTITY, KURU_MARKET_PARAMS } from './fixtures/kuruFixedSnapshot.js';
import { tokenAmount, priceUnits, type Address, type ExecutionNonce, type OrderId } from '@kairos/shared';

const POLICY = '0x1000000000000000000000000000000000000001' as Address;
const OWNER = '0x2000000000000000000000000000000000000002' as Address;
const word = (value: bigint) => value.toString(16).padStart(64, '0');

function inputs(blockTimestamp = 1_000n, observedAt = 1_001n) {
  const market = parseKuruL2Snapshot({
    payload: `0x${[KURU_FIXED_IDENTITY.blockNumber, 0n, 5_000_000n, 4_000_000_000_000n]
      .map(word)
      .join('')}`,
    identity: {
      ...KURU_FIXED_IDENTITY,
      kind: 'FIXTURE',
      blockTimestamp: unixSeconds(blockTimestamp),
      observedAt: unixSeconds(observedAt),
    },
    marketState: 'ACTIVE',
    params: KURU_MARKET_PARAMS,
    policyPriceDecimals: 8,
  });
  const policy: PolicyStateSnapshot = {
    policy: POLICY,
    blockNumber: KURU_FIXED_IDENTITY.blockNumber,
    blockHash: KURU_FIXED_IDENTITY.blockHash,
    blockTimestamp: unixSeconds(blockTimestamp),
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
      startTime: unixSeconds(500n),
      endTime: unixSeconds(2_000n),
      maxPerFill: tokenAmount(30_000_000n),
      minFill: tokenAmount(5_000_000n),
      maxEffectivePrice: priceUnits(6_000_000n),
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
  };
  return { policy, market };
}

const TEST_RETRY: RetryPolicy = {
  requestTimeoutMs: 100,
  maxAttempts: 3,
  initialBackoffMs: 250,
  backoffMultiplier: 2,
  maxBackoffMs: 1_000,
};

describe('freshness and retry policy', () => {
  it('turns stale and invalid timestamps into WAIT without a proposal (ENG-02)', () => {
    const stale = decideExecution({ ...inputs(), evaluatedAt: 1_011n });
    expect(stale.kind).toBe('WAIT');
    expect(stale.reason).toBe('STALE_MARKET_DATA');
    expect(stale.proposal).toBeUndefined();
    expect(stale.freshness).toEqual({ status: 'STALE', ageSeconds: 11n, maxAgeSeconds: 10n });

    const future = decideExecution({ ...inputs(1_020n, 1_020n), evaluatedAt: 1_010n });
    expect(future.reason).toBe('STALE_MARKET_DATA');
    expect(future.freshness.status).toBe('INVALID');
  });

  it('retries a transient source deterministically and then executes with a fresh snapshot', async () => {
    let attempts = 0;
    const delays: number[] = [];
    const decision = await evaluateAdaptiveDecision({
      evaluatedAt: 1_005n,
      retryPolicy: TEST_RETRY,
      sleep: async (delay) => {
        delays.push(delay);
      },
      load: async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('fixture transport failure');
        return inputs();
      },
    });

    expect(attempts).toBe(3);
    expect(delays).toEqual([250, 500]);
    expect(decision.kind).toBe('EXECUTE');
  });

  it('returns an auditable WAIT after API retries are exhausted (ENG-02)', async () => {
    const delays: number[] = [];
    const decision = await evaluateAdaptiveDecision({
      evaluatedAt: 1_005n,
      retryPolicy: TEST_RETRY,
      sleep: async (delay) => {
        delays.push(delay);
      },
      load: async () => {
        throw new Error('fixture API unavailable');
      },
    });

    expect(decision).toEqual({
      kind: 'WAIT',
      reason: 'STALE_MARKET_DATA',
      evaluatedAt: 1_005n,
      dataStatus: 'UNAVAILABLE',
      attempts: 3,
      retryDelaysMs: [250, 500],
    });
  });
});
