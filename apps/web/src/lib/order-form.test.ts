import {describe, expect, it} from 'vitest';

import {validateApprovalAmount, validateOrderDraft, type OrderDraft} from './order-form';

const validDraft: OrderDraft = {
  approval: '250',
  budget: '250',
  startTime: '2026-09-16T10:00:00Z',
  endTime: '2026-09-17T10:00:00Z',
  maxPerFill: '40',
  minFill: '5',
  maxEffectivePrice: '6.125',
};

describe('validateOrderDraft', () => {
  it('converts policy fields to exact integer units and builds a cumulative schedule', () => {
    const result = validateOrderDraft(validDraft);

    expect(result.errors).toEqual({});
    expect(result.value?.order).toEqual({
      budget: 250_000_000n,
      startTime: 1_789_552_800n,
      endTime: 1_789_639_200n,
      maxPerFill: 40_000_000n,
      minFill: 5_000_000n,
      maxEffectivePrice: 612_500_000n,
    });
    expect(result.value?.schedule.map((point) => point.released)).toEqual([
      0n,
      62_500_000n,
      125_000_000n,
      187_500_000n,
      250_000_000n,
    ]);
  });

  it('rejects fractional precision instead of rounding', () => {
    const result = validateOrderDraft({...validDraft, budget: '1.0000001'});

    expect(result.value).toBeUndefined();
    expect(result.errors.budget).toMatch(/at most 6 fractional digits/i);
  });

  it('keeps allowance parsing separate from policy validity', () => {
    const policy = validateOrderDraft({...validDraft, approval: ''});
    const approval = validateApprovalAmount('39.999999');

    expect(policy.value?.order.budget).toBe(250_000_000n);
    expect(approval.value).toBe(39_999_999n);
    expect(approval.error).toBeUndefined();
  });

  it('rejects an approval amount with excess token precision', () => {
    expect(validateApprovalAmount('1.0000001').error).toMatch(/at most 6 fractional digits/i);
  });

  it('rejects invalid policy relationships and schedule ordering', () => {
    const result = validateOrderDraft({
      ...validDraft,
      budget: '20',
      maxPerFill: '25',
      minFill: '30',
      endTime: validDraft.startTime,
    });

    expect(result.errors.maxPerFill).toMatch(/total budget/i);
    expect(result.errors.minFill).toMatch(/cannot exceed/i);
    expect(result.errors.endTime).toMatch(/later than/i);
  });
});
