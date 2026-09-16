import {formatUnits, parseDecimalToUnits} from '@kairos/shared/units';

import type {CreateOrderArguments} from './transactions';

export const INPUT_TOKEN_DECIMALS = 6;
export const OUTPUT_TOKEN_DECIMALS = 18;
export const POLICY_PRICE_DECIMALS = 8;

export interface OrderDraft {
  readonly approval: string;
  readonly budget: string;
  readonly endTime: string;
  readonly maxEffectivePrice: string;
  readonly maxPerFill: string;
  readonly minFill: string;
  readonly startTime: string;
}

export type OrderDraftField = keyof OrderDraft;

export interface ValidatedOrderDraft {
  readonly order: CreateOrderArguments;
  readonly schedule: ReadonlyArray<{label: string; released: bigint}>;
}

export interface OrderDraftValidation {
  readonly errors: Partial<Record<OrderDraftField, string>>;
  readonly value?: ValidatedOrderDraft;
}

function parsePositive(
  input: string,
  decimals: number,
  label: string,
): {error?: string; value?: bigint} {
  if (!input.trim()) return {error: `${label} is required.`};
  try {
    const value = parseDecimalToUnits(input.trim(), decimals);
    if (value <= 0n) return {error: `${label} must be greater than zero.`};
    return {value};
  } catch (error) {
    if (error instanceof RangeError) {
      return {error: `${label} supports at most ${decimals} fractional digits.`};
    }
    return {error: `${label} must be a plain non-negative decimal.`};
  }
}

export function validateApprovalAmount(input: string): {error?: string; value?: bigint} {
  return parsePositive(input, INPUT_TOKEN_DECIMALS, 'Approval amount');
}

function parseTimestamp(input: string, label: string): {error?: string; value?: bigint} {
  if (!input.trim()) return {error: `${label} is required.`};
  const milliseconds = Date.parse(input);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return {error: `${label} must be a valid date and time.`};
  }
  return {value: BigInt(Math.floor(milliseconds / 1_000))};
}

export function validateOrderDraft(draft: OrderDraft): OrderDraftValidation {
  const budget = parsePositive(draft.budget, INPUT_TOKEN_DECIMALS, 'Total budget');
  const maxPerFill = parsePositive(draft.maxPerFill, INPUT_TOKEN_DECIMALS, 'Maximum per fill');
  const minFill = parsePositive(draft.minFill, INPUT_TOKEN_DECIMALS, 'Minimum fill');
  const maxEffectivePrice = parsePositive(
    draft.maxEffectivePrice,
    POLICY_PRICE_DECIMALS,
    'Maximum effective price',
  );
  const startTime = parseTimestamp(draft.startTime, 'Start time');
  const endTime = parseTimestamp(draft.endTime, 'End time');

  const errors: Partial<Record<OrderDraftField, string>> = {};
  if (budget.error) errors.budget = budget.error;
  if (maxPerFill.error) errors.maxPerFill = maxPerFill.error;
  if (minFill.error) errors.minFill = minFill.error;
  if (maxEffectivePrice.error) errors.maxEffectivePrice = maxEffectivePrice.error;
  if (startTime.error) errors.startTime = startTime.error;
  if (endTime.error) errors.endTime = endTime.error;

  if (budget.value !== undefined && maxPerFill.value !== undefined && maxPerFill.value > budget.value) {
    errors.maxPerFill = 'Maximum per fill cannot exceed the total budget.';
  }
  if (
    minFill.value !== undefined &&
    maxPerFill.value !== undefined &&
    minFill.value > maxPerFill.value
  ) {
    errors.minFill = 'Minimum fill cannot exceed maximum per fill.';
  }
  if (
    startTime.value !== undefined &&
    endTime.value !== undefined &&
    endTime.value <= startTime.value
  ) {
    errors.endTime = 'End time must be later than start time.';
  }

  if (Object.keys(errors).length > 0) return {errors};

  const order: CreateOrderArguments = {
    budget: budget.value!,
    startTime: startTime.value!,
    endTime: endTime.value!,
    maxPerFill: maxPerFill.value!,
    minFill: minFill.value!,
    maxEffectivePrice: maxEffectivePrice.value!,
  };

  return {
    errors,
    value: {
      order,
      schedule: [
        {label: 'Start', released: 0n},
        {label: '25%', released: order.budget / 4n},
        {label: '50%', released: order.budget / 2n},
        {label: '75%', released: (order.budget * 3n) / 4n},
        {label: 'Expiry', released: order.budget},
      ],
    },
  };
}

export function formatInputAmount(value: bigint | undefined): string {
  return value === undefined ? 'Unavailable' : `${formatUnits(value, INPUT_TOKEN_DECIMALS)} USDC`;
}
