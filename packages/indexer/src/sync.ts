import type { Hex } from 'viem';
import { decodeKairosLog } from './decode.js';
import { emptyIndex, projectEvents, type IndexIdentity } from './projector.js';
import type { IndexStore } from './store.js';
import type { RawChainLog } from './types.js';

export interface ChainSource {
  latestSafeBlock(): Promise<bigint>;
  blockHash(blockNumber: bigint): Promise<Hex>;
  logs(fromBlock: bigint, toBlock: bigint): Promise<readonly RawChainLog[]>;
}

export interface SyncResult {
  readonly rebuilt: boolean;
  readonly fromBlock: bigint;
  readonly toBlock: bigint;
  readonly eventCount: number;
}

function sameIdentity(state: Awaited<ReturnType<IndexStore['load']>>, identity: IndexIdentity): boolean {
  return (
    state !== null &&
    state.chainId === identity.chainId.toString() &&
    state.policyAddress.toLowerCase() === identity.policyAddress.toLowerCase() &&
    state.receiverAddress.toLowerCase() === identity.receiverAddress.toLowerCase() &&
    state.deploymentBlock === identity.deploymentBlock.toString()
  );
}

export async function syncIndex(
  identity: IndexIdentity,
  source: ChainSource,
  store: IndexStore,
): Promise<SyncResult> {
  let state = await store.load();
  let rebuilt = !sameIdentity(state, identity);
  if (rebuilt) state = emptyIndex(identity);
  if (state === null) throw new Error('Index initialization failed.');

  if (!rebuilt && state.cursor !== null) {
    const canonicalHash = await source.blockHash(BigInt(state.cursor.blockNumber));
    if (canonicalHash.toLowerCase() !== state.cursor.blockHash.toLowerCase()) {
      state = emptyIndex(identity);
      rebuilt = true;
    }
  }

  const latest = await source.latestSafeBlock();
  const fromBlock = state.cursor === null ? identity.deploymentBlock : BigInt(state.cursor.blockNumber) + 1n;
  if (fromBlock > latest) return { rebuilt, fromBlock, toBlock: latest, eventCount: 0 };

  const rawLogs = await source.logs(fromBlock, latest);
  const events = rawLogs.map(decodeKairosLog);
  const projected = projectEvents(state, events);
  const cursorHash = await source.blockHash(latest);
  await store.save({
    ...projected,
    cursor: { blockNumber: latest.toString(), blockHash: cursorHash },
  });
  return { rebuilt, fromBlock, toBlock: latest, eventCount: events.length };
}
