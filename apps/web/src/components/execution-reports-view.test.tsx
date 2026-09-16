import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import type {ExecutionReportsReadModel} from '@/lib/execution-report';

import {ExecutionReportsView} from './execution-reports-view';

const HASH = `0x${'1'.repeat(64)}` as const;
const BLOCK_HASH = `0x${'2'.repeat(64)}` as const;
const SNAPSHOT = `0x${'3'.repeat(64)}` as const;

afterEach(cleanup);

const readyModel: ExecutionReportsReadModel = {
  ordersModel: {
    state: 'READY',
    cursor: {blockNumber: '10', blockHash: BLOCK_HASH},
    orders: [],
  },
  reports: [
    {
      order: {
        orderId: '7',
        owner: '0x3000000000000000000000000000000000000003',
        availableToSpend: '0',
        budget: '2000000',
        endTime: '2000',
        executionNonce: '1',
        fills: [],
        indexStatus: 'COMPLETED',
        maxEffectivePrice: '250000000',
        maxPerFill: '2000000',
        minFill: '1000000',
        received: '1000000000000000000',
        releasedBudget: '2000000',
        reports: [],
        spent: '2000000',
        startTime: '1000',
        status: 'COMPLETED',
      },
      report: {
        actualInput: '2000000',
        actualOutput: '1000000000000000000',
        chargedGas: '1000000',
        durationSeconds: '0',
        evidenceComplete: true,
        fillCount: 1,
        indexMatchesPolicy: true,
        submittedGasLimit: '100000',
        tradingFee: {status: 'EXACT_ZERO', amount: '0'},
        weightedAveragePrice: '200000000',
        fills: [
          {
            nonce: '0',
            actualInput: '2000000',
            actualOutput: '1000000000000000000',
            returnedInput: '0',
            snapshotId: SNAPSHOT,
            transactionHash: HASH,
            blockNumber: '10',
            chainEvidence: {
              blockHash: BLOCK_HASH,
              blockTimestamp: '1000',
              effectiveGasPrice: '10',
              gasLimit: '100000',
              gasUsed: '40000',
              takerFeeBps: '0',
              transactionHash: HASH,
            },
          },
        ],
      },
    },
  ],
};

describe('ExecutionReportsView', () => {
  it('shows actual settlement, separate fees and gas, and public explorer evidence', () => {
    render(<ExecutionReportsView model={readyModel} />);

    expect(screen.getAllByText('2 USDC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 MON').length).toBeGreaterThan(0);
    expect(screen.getByText('2 USDC / MON')).toBeInTheDocument();
    expect(screen.getByText('0 MON (pinned taker fee = 0 bps)')).toBeInTheDocument();
    expect(screen.getByText(/submitted gas limit × effective gas price/i)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /explorer/i})).toHaveAttribute('href', expect.stringContaining(`/tx/${HASH}`));
    expect(screen.getByText('No inferred failures')).toBeInTheDocument();
  });

  it('does not substitute sample reports when configuration is missing', () => {
    render(
      <ExecutionReportsView
        model={{
          ordersModel: {state: 'CONFIG_REQUIRED', orders: [], message: 'Index path is required.'},
          reports: [],
        }}
      />,
    );

    expect(screen.getByText('Execution reports are not configured')).toBeInTheDocument();
    expect(screen.queryByText(/actual settlement, not an estimate/i)).not.toBeInTheDocument();
  });
});
