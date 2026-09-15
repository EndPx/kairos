import { describe, expect, it } from 'vitest';
import { formatUnits, isEffectivePriceAtMost, mulDivCeil, mulDivFloor, parseDecimalToUnits, priceUnits } from '../src/index.js';

describe('integer unit conventions', () => {
  it('parses exactly and rejects silent precision loss', () => {
    expect(parseDecimalToUnits('12.340001', 6)).toBe(12_340_001n);
    expect(() => parseDecimalToUnits('12.3400001', 6)).toThrow('more fractional digits');
    expect(() => parseDecimalToUnits('1e3', 6)).toThrow('plain decimal');
  });

  it('formats integer units without floating point conversion', () => {
    expect(formatUnits(12_340_001n, 6)).toBe('12.340001');
    expect(formatUnits(2_000_000n, 6)).toBe('2');
  });

  it('uses explicit conservative rounding primitives', () => {
    expect(mulDivFloor(10n, 10n, 6n)).toBe(16n);
    expect(mulDivCeil(10n, 10n, 6n)).toBe(17n);
  });

  it('enforces an effective BUY price without lossy division', () => {
    // USDC has 6 decimals, MON has 18 decimals, and price uses 8 decimals.
    expect(isEffectivePriceAtMost(2_000_000n, 1_000_000_000_000_000_000n, priceUnits(200_000_000n), 6, 18, 8)).toBe(true);
    expect(isEffectivePriceAtMost(2_000_001n, 1_000_000_000_000_000_000n, priceUnits(200_000_000n), 6, 18, 8)).toBe(false);
  });
});
