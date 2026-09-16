import type { Address, OrderStatus } from '@kairos/shared';
import { describe, expect, it } from 'vitest';
import { PolicyReadError, readPolicyState, type MarketState, type PolicyCoreRead, type PolicyReadSource } from '../src/index.js';

const POLICY = '0x1000000000000000000000000000000000000001' as Address;
const OWNER = '0x2000000000000000000000000000000000000002' as Address;
const EXECUTOR = '0x3000000000000000000000000000000000000003' as Address;
const MARKET = '0x4000000000000000000000000000000000000004' as Address;
const TOKEN_IN = '0x5000000000000000000000000000000000000005' as Address;
const TOKEN_OUT = '0x0000000000000000000000000000000000000000' as Address;

class RecordingSource implements PolicyReadSource {
  readonly blockNumbers: bigint[] = [];
  balance = 80_000_000n;
  allowance = 70_000_000n;
  marketState: MarketState = 'ACTIVE';
  core: PolicyCoreRead = {
    executor: EXECUTOR,
    market: MARKET,
    tokenIn: TOKEN_IN,
    tokenOut: TOKEN_OUT,
    owner: OWNER,
    budget: 100_000_000n,
    spent: 20_000_000n,
    received: 400_000_000_000_000_000_000n,
    startTime: 900n,
    endTime: 2_000n,
    maxPerFill: 30_000_000n,
    minFill: 5_000_000n,
    maxEffectivePrice: 6_000_000n,
    executionNonce: 1n,
    cancelled: false,
    status: 'ACTIVE' as OrderStatus,
    releasedBudget: 50_000_000n,
    availableToSpend: 30_000_000n,
  };

  async getBlock() {
    return {
      number: 123n,
      hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
      timestamp: 1_000n,
    };
  }

  async readPolicyCore(_policy: Address, _orderId: bigint, timestamp: bigint, blockNumber: bigint) {
    expect(timestamp).toBe(1_000n);
    this.blockNumbers.push(blockNumber);
    return this.core;
  }

  async readWalletBalance(_token: Address, _owner: Address, blockNumber: bigint) {
    this.blockNumbers.push(blockNumber);
    return this.balance;
  }

  async readAllowance(_token: Address, _owner: Address, _spender: Address, blockNumber: bigint) {
    this.blockNumbers.push(blockNumber);
    return this.allowance;
  }

  async readMarketState(_market: Address, blockNumber: bigint) {
    this.blockNumbers.push(blockNumber);
    return this.marketState;
  }
}

describe('policy-state reader', () => {
  it('pins every policy, wallet, allowance, and market read to one block', async () => {
    const source = new RecordingSource();
    const snapshot = await readPolicyState({ source, policy: POLICY, orderId: 7n });

    expect(source.blockNumbers).toEqual([123n, 123n, 123n, 123n]);
    expect(snapshot.blockHash).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(snapshot.order.id).toBe(7n);
    expect(snapshot.remainingBudget).toBe(80_000_000n);
    expect(snapshot.availableToSpend).toBe(30_000_000n);
    expect(snapshot.walletBalance).toBe(80_000_000n);
    expect(snapshot.tokenAllowance).toBe(70_000_000n);
    expect(snapshot.marketState).toBe('ACTIVE');
    expect(snapshot.balanceScope).toBe('WALLET_SHARED_NOT_RESERVED');
  });

  it('does not reserve a shared wallet balance or allowance for another order', async () => {
    const source = new RecordingSource();
    const first = await readPolicyState({ source, policy: POLICY, orderId: 1n });
    const second = await readPolicyState({ source, policy: POLICY, orderId: 2n });

    expect(first.walletBalance).toBe(80_000_000n);
    expect(second.walletBalance).toBe(80_000_000n);
    expect(first.tokenAllowance).toBe(70_000_000n);
    expect(second.tokenAllowance).toBe(70_000_000n);
  });

  it('rejects internally inconsistent onchain budget snapshots', async () => {
    const source = new RecordingSource();
    source.core = { ...source.core, availableToSpend: 90_000_000n };
    await expect(readPolicyState({ source, policy: POLICY, orderId: 1n })).rejects.toThrow(PolicyReadError);
  });
});
