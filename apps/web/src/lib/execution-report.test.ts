import {describe, expect, it} from 'vitest';

import type {IndexedFill} from '../../../../packages/indexer/src/types';

import {
  buildExecutionReport,
  latestExecutionAttempts,
  validateExecutionAttemptJournal,
  type FillChainEvidence,
} from './execution-report';

const HASH_A = `0x${'11'.repeat(32)}` as const;
const HASH_B = `0x${'22'.repeat(32)}` as const;
const BLOCK_HASH = `0x${'aa'.repeat(32)}` as const;
const SNAPSHOT = `0x${'bb'.repeat(32)}` as const;

function fill(overrides: Partial<IndexedFill> = {}): IndexedFill {
  return {
    nonce: '0',
    actualInput: '2000000',
    actualOutput: '1000000000000000000',
    returnedInput: '0',
    snapshotId: SNAPSHOT,
    transactionHash: HASH_A,
    blockNumber: '100',
    ...overrides,
  };
}

function evidence(overrides: Partial<FillChainEvidence> = {}): FillChainEvidence {
  return {
    blockHash: BLOCK_HASH,
    blockTimestamp: '1000',
    effectiveGasPrice: '10',
    gasLimit: '100000',
    gasUsed: '40000',
    takerFeeBps: '0',
    transactionHash: HASH_A,
    ...overrides,
  };
}

describe('buildExecutionReport', () => {
  it('aggregates actual settlement and rounds the weighted buy price upward', () => {
    const report = buildExecutionReport(
      [fill(), fill({nonce: '1', actualInput: '1000000', actualOutput: '400000000000000000', transactionHash: HASH_B})],
      [evidence(), evidence({transactionHash: HASH_B, blockTimestamp: '1012'})],
      '3000000',
      '1400000000000000000',
    );

    expect(report.actualInput).toBe('3000000');
    expect(report.actualOutput).toBe('1400000000000000000');
    expect(report.weightedAveragePrice).toBe('214285715');
    expect(report.durationSeconds).toBe('12');
    expect(report.fillCount).toBe(2);
    expect(report.indexMatchesPolicy).toBe(true);
  });

  it('uses the submitted gas limit, not gas used, for Monad charged gas', () => {
    const report = buildExecutionReport([fill()], [evidence()], '2000000', '1000000000000000000');

    expect(report.submittedGasLimit).toBe('100000');
    expect(report.chargedGas).toBe('1000000');
  });

  it('reports an exact zero venue fee only when every pinned market fee is zero', () => {
    expect(buildExecutionReport([fill()], [evidence()], '2000000', '1000000000000000000').tradingFee).toEqual({
      status: 'EXACT_ZERO',
      amount: '0',
    });
    expect(
      buildExecutionReport([fill()], [evidence({takerFeeBps: '30'})], '2000000', '1000000000000000000').tradingFee,
    ).toMatchObject({status: 'UNAVAILABLE'});
  });

  it('marks incomplete enrichment and index lag instead of inventing totals', () => {
    const report = buildExecutionReport([fill()], [], '3000000', '1000000000000000000');

    expect(report.evidenceComplete).toBe(false);
    expect(report.indexMatchesPolicy).toBe(false);
    expect(report.durationSeconds).toBeUndefined();
    expect(report.tradingFee.status).toBe('UNAVAILABLE');
  });
});

describe('execution attempt journal', () => {
  const attempt = {
    kind: 'EXECUTION_ATTEMPT',
    source: 'CRE_WORKFLOW',
    recordedAt: '2026-09-16T10:00:00.000Z',
    orderId: '7',
    nonce: '0',
    proposalHash: SNAPSHOT,
    status: 'SUBMITTED',
    reason: 'REPORT_ACCEPTED_FOR_SUBMISSION',
    transactionHash: HASH_A,
  } as const;

  it('requires hashes for submitted and confirmed attempts and rejects invalid provenance', () => {
    expect(validateExecutionAttemptJournal([attempt])).toEqual([attempt]);
    expect(() => validateExecutionAttemptJournal([{...attempt, transactionHash: undefined}])).toThrow(/invalid/i);
    expect(() => validateExecutionAttemptJournal([{...attempt, source: 'UNKNOWN'}])).toThrow(/invalid/i);
  });

  it('selects the latest state for one proposal after restart', () => {
    const failed = {
      ...attempt,
      recordedAt: '2026-09-16T10:00:02.000Z',
      status: 'FAILED' as const,
      reason: 'POLICY_REVERTED',
    };
    const latest = latestExecutionAttempts([failed, attempt]);

    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({status: 'FAILED', reason: 'POLICY_REVERTED'});
  });
});
