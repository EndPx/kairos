import {decodeFunctionData, getAddress} from 'viem';
import {describe, expect, it} from 'vitest';

import {erc20Abi, kairosPolicyAbi} from './abi';
import {
  buildApprovalTransaction,
  buildCancelOrderTransaction,
  buildCreateOrderTransaction,
} from './transactions';

const token = getAddress('0x1111111111111111111111111111111111111111');
const policy = getAddress('0x2222222222222222222222222222222222222222');

describe('Kairos wallet transaction builders', () => {
  it('encodes allowance approval to the immutable policy address', () => {
    const transaction = buildApprovalTransaction(token, policy, 250_000_000n);
    const decoded = decodeFunctionData({abi: erc20Abi, data: transaction.data});

    expect(transaction.to).toBe(token);
    expect(decoded.functionName).toBe('approve');
    expect(decoded.args).toEqual([policy, 250_000_000n]);
  });

  it('uses the same approval path to revoke allowance', () => {
    const transaction = buildApprovalTransaction(token, policy, 0n);
    const decoded = decodeFunctionData({abi: erc20Abi, data: transaction.data});

    expect(decoded.args).toEqual([policy, 0n]);
  });

  it('encodes all policy bounds without decimal conversion or rounding', () => {
    const transaction = buildCreateOrderTransaction(policy, {
      budget: 250_000_000n,
      startTime: 1_800_000_000n,
      endTime: 1_800_086_400n,
      maxPerFill: 50_000_000n,
      minFill: 5_000_000n,
      maxEffectivePrice: 650_000_000n,
    });
    const decoded = decodeFunctionData({abi: kairosPolicyAbi, data: transaction.data});

    expect(decoded.functionName).toBe('createOrder');
    expect(decoded.args).toEqual([
      250_000_000n,
      1_800_000_000n,
      1_800_086_400n,
      50_000_000n,
      5_000_000n,
      650_000_000n,
    ]);
  });

  it('rejects a client-side policy shape that the contract rejects', () => {
    expect(() =>
      buildCreateOrderTransaction(policy, {
        budget: 10n,
        startTime: 100n,
        endTime: 200n,
        maxPerFill: 5n,
        minFill: 6n,
        maxEffectivePrice: 1n,
      }),
    ).toThrow('Order arguments do not satisfy');
  });

  it('encodes cancellation for the selected order only', () => {
    const transaction = buildCancelOrderTransaction(policy, 12n);
    const decoded = decodeFunctionData({abi: kairosPolicyAbi, data: transaction.data});

    expect(transaction.to).toBe(policy);
    expect(decoded.functionName).toBe('cancelOrder');
    expect(decoded.args).toEqual([12n]);
  });
});
