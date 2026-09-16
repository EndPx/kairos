import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { encodeAbiParameters, encodeEventTopics, type Address, type Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  DecisionJournal,
  ExecutionAttemptJournal,
  JsonIndexStore,
  KAIROS_EVENTS_ABI,
  emptyIndex,
  projectEvents,
  syncIndex,
  type ChainSource,
  type IndexIdentity,
  type RawChainLog,
} from '../src/index.js';

const POLICY = '0x1000000000000000000000000000000000000001' as Address;
const RECEIVER = '0x2000000000000000000000000000000000000002' as Address;
const OWNER = '0x3000000000000000000000000000000000000003' as Address;
const HASH_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const HASH_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;
const TX_A = '0x1111111111111111111111111111111111111111111111111111111111111111' as Hex;
const TX_B = '0x2222222222222222222222222222222222222222222222222222222222222222' as Hex;
const SNAPSHOT = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as Hex;
const WORKFLOW = '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' as Hex;
const REPORT = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as Hex;

const identity: IndexIdentity = {
  chainId: 10_143n,
  policyAddress: POLICY,
  receiverAddress: RECEIVER,
  deploymentBlock: 10n,
};

function topics(value: ReturnType<typeof encodeEventTopics>): [Hex, ...Hex[]] {
  if (value.length === 0 || value.some((topic) => topic === null || Array.isArray(topic))) {
    throw new Error('Test event topics must be fully specified.');
  }
  return value as unknown as [Hex, ...Hex[]];
}

function baseLog(overrides: Partial<RawChainLog> = {}): RawChainLog {
  return {
    address: POLICY,
    blockNumber: 10n,
    blockHash: HASH_A,
    transactionHash: TX_A,
    transactionIndex: 0,
    logIndex: 0,
    data: '0x',
    topics: [HASH_A],
    ...overrides,
  };
}

function orderCreated(budget = 100n, blockHash = HASH_A): RawChainLog {
  return baseLog({
    blockHash,
    topics: topics(encodeEventTopics({
      abi: KAIROS_EVENTS_ABI,
      eventName: 'OrderCreated',
      args: { orderId: 1n, owner: OWNER },
    })),
    data: encodeAbiParameters(
      [{ type: 'uint128' }, { type: 'uint64' }, { type: 'uint64' }],
      [budget, 1_000n, 2_000n],
    ),
  });
}

function executionSettled(): RawChainLog {
  return baseLog({
    blockNumber: 11n,
    transactionHash: TX_B,
    logIndex: 1,
    topics: topics(encodeEventTopics({
      abi: KAIROS_EVENTS_ABI,
      eventName: 'ExecutionSettled',
      args: { orderId: 1n, nonce: 0n },
    })),
    data: encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' }],
      [40n, 8n, 10n, SNAPSHOT],
    ),
  });
}

function reportForwarded(): RawChainLog {
  return baseLog({
    address: RECEIVER,
    blockNumber: 11n,
    transactionHash: TX_B,
    logIndex: 0,
    topics: topics(encodeEventTopics({
      abi: KAIROS_EVENTS_ABI,
      eventName: 'ReportForwarded',
      args: { reportHash: REPORT, workflowId: WORKFLOW, orderId: 1n },
    })),
    data: encodeAbiParameters([{ type: 'uint64' }, { type: 'bytes32' }, { type: 'bytes2' }], [0n, SNAPSHOT, '0x1234']),
  });
}

function cancelled(): RawChainLog {
  return baseLog({
    blockNumber: 12n,
    logIndex: 0,
    topics: topics(encodeEventTopics({
      abi: KAIROS_EVENTS_ABI,
      eventName: 'OrderCancelled',
      args: { orderId: 1n, owner: OWNER },
    })),
  });
}

class MemorySource implements ChainSource {
  constructor(
    public head: bigint,
    public readonly hashes: Map<bigint, Hex>,
    public currentLogs: RawChainLog[],
  ) {}

  async latestSafeBlock() {
    return this.head;
  }

  async blockHash(blockNumber: bigint) {
    const hash = this.hashes.get(blockNumber);
    if (hash === undefined) throw new Error(`Missing block ${blockNumber}.`);
    return hash;
  }

  async logs(fromBlock: bigint, toBlock: bigint) {
    return this.currentLogs.filter((log) => log.blockNumber >= fromBlock && log.blockNumber <= toBlock);
  }
}

describe('Kairos event index and recovery', () => {
  it('projects orders, fills, reports, and cancellation in canonical log order', async () => {
    const decoded = [cancelled(), executionSettled(), orderCreated(), reportForwarded()].map((log) =>
      // Use sync's decoder path through a one-shot source below.
      log,
    );
    const directory = await mkdtemp(join(tmpdir(), 'kairos-index-'));
    const store = new JsonIndexStore(join(directory, 'index.json'));
    const source = new MemorySource(12n, new Map([[12n, HASH_A]]), decoded);
    const result = await syncIndex(identity, source, store);
    const state = await store.load();

    expect(result).toMatchObject({ rebuilt: true, fromBlock: 10n, toBlock: 12n, eventCount: 4 });
    expect(state?.orders['1']).toMatchObject({
      status: 'CANCELLED',
      spent: '40',
      received: '8',
    });
    expect(state?.orders['1']?.fills).toHaveLength(1);
    expect(state?.orders['1']?.reports).toHaveLength(1);
    expect(state?.orders['1']?.reports[0]?.reportHash).toBe(REPORT);
  });

  it('restores the persisted checkpoint after a process restart without replaying logs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kairos-restart-'));
    const path = join(directory, 'index.json');
    const source = new MemorySource(10n, new Map([[10n, HASH_A]]), [orderCreated()]);
    await syncIndex(identity, source, new JsonIndexStore(path));

    const restartedStore = new JsonIndexStore(path);
    const second = await syncIndex(identity, source, restartedStore);
    expect(second.eventCount).toBe(0);
    expect(second.rebuilt).toBe(false);
    expect((await restartedStore.load())?.orders['1']?.budget).toBe('100');
  });

  it('detects a cursor hash mismatch and rebuilds from the deployment block', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kairos-reorg-'));
    const store = new JsonIndexStore(join(directory, 'index.json'));
    const hashes = new Map<bigint, Hex>([[10n, HASH_A]]);
    const source = new MemorySource(10n, hashes, [orderCreated(100n, HASH_A)]);
    await syncIndex(identity, source, store);

    hashes.set(10n, HASH_B);
    source.currentLogs = [orderCreated(250n, HASH_B)];
    const result = await syncIndex(identity, source, store);
    expect(result.rebuilt).toBe(true);
    expect((await store.load())?.orders['1']?.budget).toBe('250');
    expect((await store.load())?.cursor?.blockHash).toBe(HASH_B);
  });

  it('persists offchain decisions in a separate provenance-typed journal', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kairos-decisions-'));
    const index = new JsonIndexStore(join(directory, 'index.json'));
    await index.save(emptyIndex(identity));
    const journal = new DecisionJournal(join(directory, 'decisions.json'));
    await journal.append({
      kind: 'OFFCHAIN_DECISION',
      source: 'REPLAY',
      recordedAt: '2026-09-16T00:00:00Z',
      orderId: '1',
      decision: 'WAIT',
      reason: 'STALE_MARKET_DATA',
      snapshotId: SNAPSHOT,
    });

    expect(await journal.load()).toHaveLength(1);
    expect((await journal.load())[0]?.source).toBe('REPLAY');
    expect(JSON.stringify(await index.load())).not.toContain('STALE_MARKET_DATA');
  });

  it('persists execution attempt transitions separately from confirmed chain events', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kairos-attempts-'));
    const path = join(directory, 'attempts.json');
    const journal = new ExecutionAttemptJournal(path);
    await journal.append({
      kind: 'EXECUTION_ATTEMPT',
      source: 'CRE_WORKFLOW',
      recordedAt: '2026-09-16T10:00:00Z',
      orderId: '1',
      nonce: '0',
      proposalHash: REPORT,
      status: 'SUBMITTED',
      reason: 'REPORT_ACCEPTED_FOR_SUBMISSION',
      transactionHash: TX_B,
    });
    await journal.append({
      kind: 'EXECUTION_ATTEMPT',
      source: 'CRE_WORKFLOW',
      recordedAt: '2026-09-16T10:00:01Z',
      orderId: '1',
      nonce: '0',
      proposalHash: REPORT,
      status: 'FAILED',
      reason: 'POLICY_REVERTED',
      transactionHash: TX_B,
    });

    const restarted = new ExecutionAttemptJournal(path);
    expect(await restarted.load()).toHaveLength(2);
    expect((await restarted.load())[1]).toMatchObject({status: 'FAILED', reason: 'POLICY_REVERTED'});
    expect(JSON.stringify(emptyIndex(identity))).not.toContain('POLICY_REVERTED');
  });
});
