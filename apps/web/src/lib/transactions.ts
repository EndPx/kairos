import {encodeFunctionData, type Address, type Hex} from 'viem';

import {erc20Abi, kairosPolicyAbi} from './abi';
import {MONAD_TESTNET_CHAIN_ID} from './chain';

export interface UnsignedKairosTransaction {
  readonly to?: Address;
  readonly data: Hex;
  readonly chainId: number;
  readonly gasLimit?: bigint;
}

export interface CreateOrderArguments {
  readonly budget: bigint;
  readonly startTime: bigint;
  readonly endTime: bigint;
  readonly maxPerFill: bigint;
  readonly minFill: bigint;
  readonly maxEffectivePrice: bigint;
}

export function buildApprovalTransaction(
  token: Address,
  policy: Address,
  amount: bigint,
): UnsignedKairosTransaction {
  if (amount < 0n) throw new RangeError('Approval amount cannot be negative.');
  return {
    to: token,
    chainId: MONAD_TESTNET_CHAIN_ID,
    data: encodeFunctionData({abi: erc20Abi, functionName: 'approve', args: [policy, amount]}),
  };
}

export function buildCreateOrderTransaction(
  policy: Address,
  order: CreateOrderArguments,
): UnsignedKairosTransaction {
  if (
    order.budget <= 0n ||
    order.startTime < 0n ||
    order.endTime <= order.startTime ||
    order.maxPerFill <= 0n ||
    order.minFill <= 0n ||
    order.minFill > order.maxPerFill ||
    order.maxPerFill > order.budget ||
    order.maxEffectivePrice <= 0n
  ) {
    throw new RangeError('Order arguments do not satisfy the Kairos policy bounds.');
  }

  return {
    to: policy,
    chainId: MONAD_TESTNET_CHAIN_ID,
    data: encodeFunctionData({
      abi: kairosPolicyAbi,
      functionName: 'createOrder',
      args: [
        order.budget,
        order.startTime,
        order.endTime,
        order.maxPerFill,
        order.minFill,
        order.maxEffectivePrice,
      ],
    }),
  };
}

export function buildCancelOrderTransaction(
  policy: Address,
  orderId: bigint,
): UnsignedKairosTransaction {
  if (orderId < 0n) throw new RangeError('Order ID cannot be negative.');
  return {
    to: policy,
    chainId: MONAD_TESTNET_CHAIN_ID,
    data: encodeFunctionData({abi: kairosPolicyAbi, functionName: 'cancelOrder', args: [orderId]}),
  };
}
