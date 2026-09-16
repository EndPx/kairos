import {describe, expect, it} from 'vitest';
import {weightedAveragePrice} from '../src/math.js';

describe('actual-settlement aggregation', () => {
  it('computes a quantity-weighted cumulative price from integer totals', () => {
    const totalInput = 3_000_000n;
    const totalOutput = 1_400_000_000_000_000_000n;

    expect(weightedAveragePrice(totalInput, totalOutput)).toBe(214_285_715n);
  });

  it('rounds upward and does not invent a price without output', () => {
    expect(weightedAveragePrice(1_000_000n, 3_000_000_000_000_000_000n)).toBe(33_333_334n);
    expect(weightedAveragePrice(0n, 0n)).toBeUndefined();
  });
});
