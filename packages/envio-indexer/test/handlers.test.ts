import {createTestIndexer} from 'envio';
import {describe, expect, it} from 'vitest';
import {eventEntityId, orderEntityId} from '../src/ids.js';

type Hex = `0x${string}`;

const CHAIN_ID = 10_143;
const POLICY: Hex = '0x1111111111111111111111111111111111111111';
const RECEIVER: Hex = '0x2222222222222222222222222222222222222222';
const OWNER: Hex = '0x3333333333333333333333333333333333333333';
const WORKFLOW_OWNER: Hex = '0x4444444444444444444444444444444444444444';
const SNAPSHOT: Hex = `0x${'aa'.repeat(32)}`;
const WORKFLOW_ID: Hex = `0x${'bb'.repeat(32)}`;
const REPORT_HASH: Hex = `0x${'cc'.repeat(32)}`;
const BLOCK_HASH: Hex = `0x${'dd'.repeat(32)}`;

function txHash(suffix: string): Hex {
  return `0x${suffix.padStart(64, '0')}`;
}

function metadata(transactionHash: string, logIndex: number, blockNumber: number) {
  return {
    srcAddress: POLICY,
    logIndex,
    transaction: {hash: transactionHash},
    block: {number: blockNumber, hash: BLOCK_HASH, timestamp: 1_800_000_000 + blockNumber},
  };
}

function created(transactionHash = txHash('1'), logIndex = 0) {
  return {
    contract: 'KairosPolicy' as const,
    event: 'OrderCreated' as const,
    ...metadata(transactionHash, logIndex, 100),
    params: {
      orderId: 7n,
      owner: OWNER,
      budget: 3_000_000n,
      startTime: 1_800_000_000n,
      endTime: 1_800_086_400n,
    },
  };
}

function settled(
  transactionHash: string,
  logIndex: number,
  nonce: bigint,
  actualInput: bigint,
  actualOutput: bigint,
) {
  return {
    contract: 'KairosPolicy' as const,
    event: 'ExecutionSettled' as const,
    ...metadata(transactionHash, logIndex, 101 + Number(nonce)),
    params: {
      orderId: 7n,
      nonce,
      actualInput,
      actualOutput,
      returnedInput: 0n,
      snapshotId: SNAPSHOT,
    },
  };
}

describe('KairosPolicy HyperIndex handlers', () => {
  it('projects lifecycle and quantity-weighted actual settlement totals', async () => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        [CHAIN_ID]: {
          simulate: [
            created(),
            settled(txHash('2'), 0, 0n, 2_000_000n, 1_000_000_000_000_000_000n),
            settled(txHash('3'), 0, 1n, 1_000_000n, 400_000_000_000_000_000n),
          ],
        },
      },
    });

    const order = await indexer.Order.getOrThrow(orderEntityId(CHAIN_ID, POLICY, 7n));
    expect(order.totalActualInput).toBe(3_000_000n);
    expect(order.totalActualOutput).toBe(1_400_000_000_000_000_000n);
    expect(order.totalReturnedInput).toBe(0n);
    expect(order.fillCount).toBe(2);
    expect(order.weightedAveragePrice).toBe(214_285_715n);
    expect(order.eventStatus).toBe('BUDGET_SPENT');
  });

  it('does not count a duplicate settlement event twice', async () => {
    const indexer = createTestIndexer();
    const duplicate = settled(txHash('4'), 3, 0n, 1_000_000n, 500_000_000_000_000_000n);
    await indexer.process({
      chains: {[CHAIN_ID]: {simulate: [created(), duplicate]}},
    });

    const persistedOrder = await indexer.Order.getOrThrow(orderEntityId(CHAIN_ID, POLICY, 7n));
    const persistedFill = await indexer.Fill.getOrThrow(eventEntityId(CHAIN_ID, txHash('4'), 3));
    const replayIndexer = createTestIndexer();
    replayIndexer.Order.set(persistedOrder);
    replayIndexer.Fill.set(persistedFill);
    await replayIndexer.process({
      chains: {[CHAIN_ID]: {simulate: [duplicate]}},
    });

    const order = await replayIndexer.Order.getOrThrow(orderEntityId(CHAIN_ID, POLICY, 7n));
    expect(order.totalActualInput).toBe(1_000_000n);
    expect(order.fillCount).toBe(1);
  });

  it('records cancellation without inferring time-based expiry', async () => {
    const indexer = createTestIndexer();
    const cancellationHash = txHash('5');
    await indexer.process({
      chains: {
        [CHAIN_ID]: {
          simulate: [
            created(),
            {
              contract: 'KairosPolicy',
              event: 'OrderCancelled',
              ...metadata(cancellationHash, 0, 103),
              params: {orderId: 7n, owner: OWNER},
            },
          ],
        },
      },
    });

    const order = await indexer.Order.getOrThrow(orderEntityId(CHAIN_ID, POLICY, 7n));
    expect(order.eventStatus).toBe('CANCELLED');
    expect(order.lastEventTransactionHash).toBe(cancellationHash);
  });
});

describe('CRE report correlation boundary', () => {
  it('correlates only a receiver-bound settlement with the same transaction and snapshot', async () => {
    const indexer = createTestIndexer();
    const settlementTransaction = txHash('6');
    await indexer.process({
      chains: {
        [CHAIN_ID]: {
          simulate: [
            created(),
            {
              contract: 'KairosCreReceiver',
              event: 'ReceiverActivated',
              ...metadata(txHash('7'), 0, 101),
              srcAddress: RECEIVER,
              params: {
                policy: POLICY,
                workflowId: WORKFLOW_ID,
                workflowName: '0x0102030405060708090a',
                workflowOwner: WORKFLOW_OWNER,
              },
            },
            settled(settlementTransaction, 4, 0n, 1_000_000n, 500_000_000_000_000_000n),
            {
              contract: 'KairosCreReceiver',
              event: 'ReportForwarded',
              ...metadata(settlementTransaction, 5, 102),
              srcAddress: RECEIVER,
              params: {
                reportHash: REPORT_HASH,
                workflowId: WORKFLOW_ID,
                orderId: 7n,
                nonce: 0n,
                snapshotId: SNAPSHOT,
                reportId: '0x1234',
              },
            },
          ],
        },
      },
    });

    const report = await indexer.CreReport.getOrThrow(eventEntityId(CHAIN_ID, settlementTransaction, 5));
    expect(report.settlementCorrelation).toBe('VERIFIED_SAME_TRANSACTION');
    expect(report.fill_id).toBe(eventEntityId(CHAIN_ID, settlementTransaction, 4));
  });

  it('keeps a mismatched snapshot explicitly unverified', async () => {
    const indexer = createTestIndexer();
    const settlementTransaction = txHash('8');
    await indexer.process({
      chains: {
        [CHAIN_ID]: {
          simulate: [
            created(),
            {
              contract: 'KairosCreReceiver',
              event: 'ReceiverActivated',
              ...metadata(txHash('9'), 0, 101),
              srcAddress: RECEIVER,
              params: {
                policy: POLICY,
                workflowId: WORKFLOW_ID,
                workflowName: '0x0102030405060708090a',
                workflowOwner: WORKFLOW_OWNER,
              },
            },
            settled(settlementTransaction, 4, 0n, 1_000_000n, 500_000_000_000_000_000n),
            {
              contract: 'KairosCreReceiver',
              event: 'ReportForwarded',
              ...metadata(settlementTransaction, 5, 102),
              srcAddress: RECEIVER,
              params: {
                reportHash: REPORT_HASH,
                workflowId: WORKFLOW_ID,
                orderId: 7n,
                nonce: 0n,
                snapshotId: `0x${'ee'.repeat(32)}`,
                reportId: '0x1234',
              },
            },
          ],
        },
      },
    });

    const report = await indexer.CreReport.getOrThrow(eventEntityId(CHAIN_ID, settlementTransaction, 5));
    expect(report.settlementCorrelation).toBe('UNVERIFIED');
    expect(report.fill_id).toBeUndefined();
  });
});
