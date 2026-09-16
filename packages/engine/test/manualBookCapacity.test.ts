import { priceUnits } from '@kairos/shared';
import { describe, expect, it } from 'vitest';
import { estimateManualBuyCapacity, parseKuruL2Snapshot } from '../src/index.js';
import { KURU_FIXED_IDENTITY, KURU_MARKET_PARAMS } from './fixtures/kuruFixedSnapshot.js';

const word = (value: bigint) => value.toString(16).padStart(64, '0');
const payload = (...values: bigint[]) => `0x${values.map(word).join('')}` as const;

function book(asks: ReadonlyArray<readonly [bigint, bigint]>, takerFeeBps = 0n) {
  return parseKuruL2Snapshot({
    payload: payload(KURU_FIXED_IDENTITY.blockNumber, 0n, ...asks.flatMap(([price, size]) => [price, size])),
    identity: { ...KURU_FIXED_IDENTITY, kind: 'FIXTURE' },
    marketState: 'ACTIVE',
    params: { ...KURU_MARKET_PARAMS, takerFeeBps },
    policyPriceDecimals: 8,
  });
}

describe('manual Kuru liquidity capacity', () => {
  it('produces different auditable capacity for thin and deep books (ENG-01)', () => {
    const thin = estimateManualBuyCapacity({
      snapshot: book([[5_000_000n, 4_000_000_000_000n]]),
      inputLimit: 100_000_000n,
      maxEffectivePrice: priceUnits(10_000_000n),
    });
    const deep = estimateManualBuyCapacity({
      snapshot: book([
        [5_000_000n, 4_000_000_000_000n],
        [6_000_000n, 4_000_000_000_000n],
      ]),
      inputLimit: 100_000_000n,
      maxEffectivePrice: priceUnits(10_000_000n),
    });

    expect(thin.estimatedInput).toBe(20_000_000n);
    expect(thin.estimatedOutput).toBe(400_000_000_000_000_000_000n);
    expect(thin.stopReason).toBe('BOOK_EXHAUSTED');
    expect(deep.estimatedInput).toBe(44_000_000n);
    expect(deep.estimatedOutput).toBe(800_000_000_000_000_000_000n);
    expect(deep.trace).toHaveLength(2);
  });

  it('uses the cumulative effective average rather than a per-level price cutoff', () => {
    const capacity = estimateManualBuyCapacity({
      snapshot: book([
        [5_000_000n, 4_000_000_000_000n],
        [7_000_000n, 4_000_000_000_000n],
      ]),
      inputLimit: 100_000_000n,
      maxEffectivePrice: priceUnits(6_000_000n),
    });

    expect(capacity.estimatedInput).toBe(48_000_000n);
    expect(capacity.estimatedOutput).toBe(800_000_000_000_000_000_000n);
    expect(capacity.trace[1]?.result).toBe('FULL_LEVEL');
  });

  it('takes a deterministic partial level at the effective-average price boundary', () => {
    const capacity = estimateManualBuyCapacity({
      snapshot: book([
        [5_000_000n, 4_000_000_000_000n],
        [7_000_000n, 4_000_000_000_000n],
      ]),
      inputLimit: 100_000_000n,
      maxEffectivePrice: priceUnits(5_500_000n),
    });

    expect(capacity.stopReason).toBe('PRICE_LIMIT');
    expect(capacity.trace[1]?.result).toBe('PARTIAL_PRICE_LIMIT');
    expect(capacity.estimatedInput).toBeGreaterThan(20_000_000n);
    expect(capacity.estimatedInput).toBeLessThan(48_000_000n);
  });

  it('applies Kuru output-fee ceiling before effective-price validation (PRICE-02)', () => {
    const capacity = estimateManualBuyCapacity({
      snapshot: book([[5_000_000n, 4_000_000_000_000n]], 100n),
      inputLimit: 100_000_000n,
      maxEffectivePrice: priceUnits(5_000_000n),
    });

    expect(capacity.estimatedInput).toBe(0n);
    expect(capacity.stopReason).toBe('PRICE_LIMIT');
    expect(capacity.trace[0]?.result).toBe('REJECTED_PRICE_LIMIT');
  });

  it('rounds quote cost up and output down for an input-limited partial level', () => {
    const capacity = estimateManualBuyCapacity({
      snapshot: book([[5_000_000n, 4_000_000_000_000n]]),
      inputLimit: 10_000_000n,
      maxEffectivePrice: priceUnits(10_000_000n),
    });

    expect(capacity.estimatedInput).toBe(10_000_000n);
    expect(capacity.estimatedOutput).toBe(200_000_000_000_000_000_000n);
    expect(capacity.stopReason).toBe('INPUT_LIMIT');
    expect(capacity.trace[0]?.result).toBe('PARTIAL_INPUT_LIMIT');
  });
});
