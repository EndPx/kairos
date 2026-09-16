export const INPUT_DECIMALS = 6;
export const OUTPUT_DECIMALS = 18;
export const PRICE_DECIMALS = 8;

function pow10(decimals: number): bigint {
  return 10n ** BigInt(decimals);
}

export function mulDivCeil(value: bigint, multiplier: bigint, denominator: bigint): bigint {
  if (value < 0n || multiplier < 0n || denominator <= 0n) {
    throw new RangeError('mulDivCeil requires non-negative factors and a positive denominator.');
  }
  const numerator = value * multiplier;
  return numerator === 0n ? 0n : (numerator - 1n) / denominator + 1n;
}

/**
 * Quote-token units per base token, scaled by PRICE_DECIMALS and rounded up.
 * Computing from cumulative actual amounts is the quantity-weighted price;
 * averaging individual fill prices would be incorrect.
 */
export function weightedAveragePrice(totalActualInput: bigint, totalActualOutput: bigint): bigint | undefined {
  if (totalActualInput < 0n || totalActualOutput < 0n) {
    throw new RangeError('Settlement totals cannot be negative.');
  }
  if (totalActualOutput === 0n) return undefined;
  return mulDivCeil(
    totalActualInput,
    pow10(OUTPUT_DECIMALS + PRICE_DECIMALS),
    totalActualOutput * pow10(INPUT_DECIMALS),
  );
}
