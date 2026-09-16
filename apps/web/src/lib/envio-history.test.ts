import {describe, expect, it} from 'vitest';
import type {Address} from 'viem';

import {parseEnvioHistory} from './envio-history';

const POLICY = '0x1111111111111111111111111111111111111111' as Address;
const OTHER_POLICY = '0x2222222222222222222222222222222222222222' as Address;
const OWNER = '0x3333333333333333333333333333333333333333';
const HASH_A = `0x${'aa'.repeat(32)}`;
const HASH_B = `0x${'bb'.repeat(32)}`;
const HASH_C = `0x${'cc'.repeat(32)}`;

function payload(policy = POLICY) {
  return {
    _meta: [
      {
        chainId: 10_143,
        progressBlock: 100,
        eventsProcessed: 3,
        bufferBlock: 102,
        firstEventBlock: 90,
        sourceBlock: 103,
        readyAt: '2026-09-17T00:00:00Z',
        isReady: true,
        startBlock: 90,
        endBlock: null,
      },
    ],
    Order: [
      {
        chainId: 10_143,
        policy,
        orderId: '7',
        owner: OWNER,
        budget: '3000000',
        startTime: '1800000000',
        endTime: '1800086400',
        eventStatus: 'CREATED',
        totalActualInput: '1000000',
        totalActualOutput: '500000000000000000',
        fills: [
          {
            nonce: '0',
            actualInput: '1000000',
            actualOutput: '500000000000000000',
            returnedInput: '0',
            snapshotId: HASH_A,
            transactionHash: HASH_B,
            blockNumber: '99',
          },
        ],
      },
    ],
    CreReport: [
      {
        reportHash: HASH_C,
        workflowId: HASH_A,
        orderId: '7',
        nonce: '0',
        snapshotId: HASH_A,
        reportId: '0x1234',
        transactionHash: HASH_B,
        blockNumber: '99',
      },
    ],
  };
}

describe('Envio HyperIndex history parser', () => {
  it('normalizes integer event history and groups reports by order', () => {
    const snapshot = parseEnvioHistory(payload(), POLICY);

    expect(snapshot.meta).toMatchObject({
      chainId: 10_143,
      progressBlock: '100',
      sourceBlock: '103',
      eventsProcessed: '3',
      isReady: true,
    });
    expect(snapshot.orders).toHaveLength(1);
    expect(snapshot.orders[0]).toMatchObject({
      orderId: '7',
      status: 'ACTIVE',
      spent: '1000000',
      received: '500000000000000000',
    });
    expect(snapshot.orders[0]?.fills[0]?.transactionHash).toBe(HASH_B);
    expect(snapshot.orders[0]?.reports[0]?.reportHash).toBe(HASH_C);
  });

  it('rejects history from a different policy deployment', () => {
    expect(() => parseEnvioHistory(payload(OTHER_POLICY), POLICY)).toThrow(
      'Envio order identity does not match the configured Monad Testnet policy.',
    );
  });

  it('rejects malformed integer units instead of coercing them', () => {
    const malformed = payload();
    malformed.Order[0]!.totalActualInput = '1.5';
    expect(() => parseEnvioHistory(malformed, POLICY)).toThrow('Order[0].totalActualInput must be an unsigned integer.');
  });
});
