export type TokenAmount = bigint & { readonly __brand: 'TokenAmount' };
export type PriceUnits = bigint & { readonly __brand: 'PriceUnits' };
export type UnixSeconds = bigint & { readonly __brand: 'UnixSeconds' };

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;

export function tokenAmount(value: bigint): TokenAmount {
  if (value < 0n) throw new RangeError('Token amount cannot be negative.');
  return value as TokenAmount;
}

export function priceUnits(value: bigint): PriceUnits {
  if (value < 0n) throw new RangeError('Price cannot be negative.');
  return value as PriceUnits;
}

export function unixSeconds(value: bigint): UnixSeconds {
  if (value < 0n) throw new RangeError('Timestamp cannot be negative.');
  return value as UnixSeconds;
}

export function pow10(decimals: number): bigint {
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError('Decimals must be an integer between 0 and 255.');
  }
  return 10n ** BigInt(decimals);
}

/** Parses a non-negative decimal exactly; excess fractional digits are rejected, never rounded. */
export function parseDecimalToUnits(input: string, decimals: number): bigint {
  if (!DECIMAL_PATTERN.test(input)) throw new SyntaxError('Expected a non-negative plain decimal string.');
  const [whole = '', fraction = ''] = input.split('.');
  if (fraction.length > decimals) throw new RangeError('Input has more fractional digits than the token supports.');
  return BigInt(whole) * pow10(decimals) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0');
}

export function formatUnits(value: bigint, decimals: number): string {
  if (value < 0n) throw new RangeError('Cannot format a negative unsigned amount.');
  const scale = pow10(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
}

export function mulDivFloor(a: bigint, b: bigint, denominator: bigint): bigint {
  if (a < 0n || b < 0n || denominator <= 0n) throw new RangeError('Expected unsigned factors and positive denominator.');
  return (a * b) / denominator;
}

export function mulDivCeil(a: bigint, b: bigint, denominator: bigint): bigint {
  if (a < 0n || b < 0n || denominator <= 0n) throw new RangeError('Expected unsigned factors and positive denominator.');
  const product = a * b;
  return product === 0n ? 0n : (product - 1n) / denominator + 1n;
}

/**
 * BUY price guard without division.
 *
 * `maxPrice` represents quote tokens per base token scaled by `priceDecimals`.
 * Input/output amounts remain in their native token units, so both token decimal
 * scales are part of the comparison rather than an implicit UI convention.
 */
export function isEffectivePriceAtMost(
  actualInputQuoteUnits: bigint,
  actualOutputBaseUnits: bigint,
  maxPrice: PriceUnits,
  quoteDecimals: number,
  baseDecimals: number,
  priceDecimals: number,
): boolean {
  if (actualInputQuoteUnits < 0n || actualOutputBaseUnits <= 0n) {
    throw new RangeError('Expected non-negative input and positive output.');
  }
  const left = actualInputQuoteUnits * pow10(baseDecimals) * pow10(priceDecimals);
  const right = maxPrice * actualOutputBaseUnits * pow10(quoteDecimals);
  return left <= right;
}
