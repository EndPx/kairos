import {describe, expect, it} from 'vitest';

import type {PersistedIndexState} from '../../../../packages/indexer/src/types';

import {mergeIndexedOrders, progressBasisPoints, type LivePolicyOrder} from './order-read-model';

const OWNER = '0x3000000000000000000000000000000000000003' as const;
const HASH = `0x${'a'.repeat(64)}` as const;

const indexed: PersistedIndexState = {
  schemaVersion: 1,
  chainId: '10143',
  policyAddress: '0x1000000000000000000000000000000000000001',
  receiverAddress: '0x2000000000000000000000000000000000000002',
  deploymentBlock: '10',
  cursor: {blockNumber: '12', blockHash: HASH},
  receiver: null,
  orders: {
    '7': {
      orderId: '7',
      owner: OWNER,
      budget: '100000000',
      startTime: '1000',
      endTime: '2000',
      status: 'ACTIVE',
      spent: '40000000',
      received: '8000000000000000000',
      fills: [],
      reports: [],
    },
  },
};

const live: LivePolicyOrder = {
  owner: OWNER,
  budget: '100000000',
  spent: '40000000',
  received: '8000000000000000000',
  startTime: '1000',
  endTime: '2000',
  maxPerFill: '25000000',
  minFill: '5000000',
  maxEffectivePrice: '600000000',
  executionNonce: '1',
  releasedBudget: '50000000',
  availableToSpend: '10000000',
  status: 'ACTIVE',
};

describe('orders application read model', () => {
  it('combines event history, current chain authority, and explicitly sourced offchain decisions', () => {
    const orders = mergeIndexedOrders(indexed, {'7': live}, [{
      kind: 'OFFCHAIN_DECISION',
      source: 'REPLAY',
      recordedAt: '2026-09-16T00:00:00Z',
      orderId: '7',
      decision: 'WAIT',
      reason: 'INSUFFICIENT_LIQUIDITY',
      snapshotId: HASH,
    }]);

    expect(orders[0]).toMatchObject({orderId: '7', status: 'ACTIVE', indexStatus: 'ACTIVE'});
    expect(orders[0]?.latestDecision?.source).toBe('REPLAY');
  });

  it('rejects an index whose immutable identity disagrees with the contract', () => {
    expect(() => mergeIndexedOrders(indexed, {'7': {...live, budget: '2'}}, [])).toThrow(/does not match/i);
  });

  it('derives bounded integer progress without floating-point accounting', () => {
    expect(progressBasisPoints('1', '3')).toBe(3333n);
    expect(progressBasisPoints('120', '100')).toBe(10_000n);
  });
});
