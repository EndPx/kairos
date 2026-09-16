import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import type {OrdersReadModel} from '@/lib/order-read-model';

import {OrderDetail, OrdersList} from './orders-view';

const HASH = `0x${'a'.repeat(64)}` as const;
const fixtureModel: OrdersReadModel = {
  state: 'READY',
  cursor: {blockNumber: '12', blockHash: HASH},
  policyBlock: {blockNumber: '13', blockHash: HASH, blockTimestamp: '1500'},
  market: {
    readStatus: 'AVAILABLE',
    coverage: 'MANUAL_L2_ONLY',
    blockNumber: '13',
    blockHash: HASH,
    blockTimestamp: '1500',
    bidLevels: 1,
    askLevels: 2,
    bestAskPrice: '6.1',
  },
  orders: [{
    orderId: '7',
    owner: '0x3000000000000000000000000000000000000003',
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
    indexStatus: 'ACTIVE',
    reports: [],
    fills: [{
      nonce: '0',
      actualInput: '40000000',
      actualOutput: '8000000000000000000',
      returnedInput: '10000000',
      snapshotId: HASH,
      transactionHash: HASH,
      blockNumber: '11',
    }],
    latestDecision: {
      kind: 'OFFCHAIN_DECISION',
      source: 'REPLAY',
      recordedAt: '2026-09-16T00:00:00Z',
      orderId: '7',
      decision: 'WAIT',
      reason: 'INSUFFICIENT_LIQUIDITY',
      snapshotId: HASH,
    },
  }],
};

describe('OrdersList', () => {
  it('does not substitute fixtures when deployment/index configuration is missing', () => {
    const model: OrdersReadModel = {state: 'CONFIG_REQUIRED', orders: [], message: 'Configuration required.'};
    render(<OrdersList model={model} />);

    expect(screen.getByText(/order index is not configured/i)).toBeInTheDocument();
    expect(screen.getByText(/no sample orders are substituted/i)).toBeInTheDocument();
    expect(screen.queryByText(/order #/i)).not.toBeInTheDocument();
  });

  it('keeps offchain WAIT provenance separate from a confirmed settlement receipt', () => {
    render(<OrderDetail order={fixtureModel.orders[0]!} model={fixtureModel} />);

    expect(screen.getByText('INSUFFICIENT_LIQUIDITY')).toBeInTheDocument();
    expect(screen.getByText('REPLAY')).toBeInTheDocument();
    expect(screen.getAllByText('40 USDC')).toHaveLength(2);
    expect(screen.getAllByText('8 MON')).toHaveLength(2);
    expect(screen.getByText(/manual l2 only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /cancel order/i})).toBeDisabled();
  });
});
