import type {Address, Hex} from 'viem';

import type {IndexedOrder, OffchainDecisionRecord, PersistedIndexState} from '../../../../packages/indexer/src/types';

export type PolicyLifecycle = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED' | 'UNKNOWN';

export interface LivePolicyOrder {
  readonly availableToSpend: string;
  readonly budget: string;
  readonly endTime: string;
  readonly executionNonce: string;
  readonly maxEffectivePrice: string;
  readonly maxPerFill: string;
  readonly minFill: string;
  readonly owner: Address;
  readonly received: string;
  readonly releasedBudget: string;
  readonly spent: string;
  readonly startTime: string;
  readonly status: PolicyLifecycle;
}

export interface MarketSnapshotView {
  readonly askLevels: number;
  readonly bestAskPrice?: string;
  readonly bidLevels: number;
  readonly blockHash: Hex;
  readonly blockNumber: string;
  readonly blockTimestamp: string;
  readonly coverage: 'MANUAL_L2_ONLY';
  readonly readStatus: 'AVAILABLE';
}

export interface OrderViewModel extends LivePolicyOrder {
  readonly fills: IndexedOrder['fills'];
  readonly indexStatus: IndexedOrder['status'];
  readonly latestDecision?: OffchainDecisionRecord;
  readonly orderId: string;
  readonly reports: IndexedOrder['reports'];
}

export interface OrdersReadModel {
  readonly cursor?: {readonly blockHash: Hex; readonly blockNumber: string};
  readonly market?: MarketSnapshotView;
  readonly marketError?: string;
  readonly orders: readonly OrderViewModel[];
  readonly policyBlock?: {readonly blockHash: Hex; readonly blockNumber: string; readonly blockTimestamp: string};
  readonly state: 'CONFIG_REQUIRED' | 'EMPTY' | 'READY' | 'READ_FAILED';
  readonly message?: string;
}

function latestDecisionFor(
  orderId: string,
  decisions: readonly OffchainDecisionRecord[],
): OffchainDecisionRecord | undefined {
  return decisions
    .filter((record) => record.kind === 'OFFCHAIN_DECISION' && record.orderId === orderId)
    .sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt))[0];
}

export function mergeIndexedOrders(
  state: PersistedIndexState,
  liveOrders: Readonly<Record<string, LivePolicyOrder>>,
  decisions: readonly OffchainDecisionRecord[],
): readonly OrderViewModel[] {
  return Object.values(state.orders)
    .map((indexed) => {
      const live = liveOrders[indexed.orderId];
      if (!live) throw new Error(`Missing current chain state for order ${indexed.orderId}.`);
      if (
        live.owner.toLowerCase() !== indexed.owner.toLowerCase() ||
        live.budget !== indexed.budget ||
        live.startTime !== indexed.startTime ||
        live.endTime !== indexed.endTime
      ) {
        throw new Error(`Indexed identity does not match current chain state for order ${indexed.orderId}.`);
      }
      return {
        ...live,
        orderId: indexed.orderId,
        indexStatus: indexed.status,
        fills: indexed.fills,
        reports: indexed.reports,
        latestDecision: latestDecisionFor(indexed.orderId, decisions),
      };
    })
    .sort((left, right) => (BigInt(left.orderId) > BigInt(right.orderId) ? -1 : 1));
}

export function progressBasisPoints(spent: string, budget: string): bigint {
  const spentUnits = BigInt(spent);
  const budgetUnits = BigInt(budget);
  if (spentUnits < 0n || budgetUnits <= 0n) throw new RangeError('Progress requires unsigned spend and positive budget.');
  const value = (spentUnits * 10_000n) / budgetUnits;
  return value > 10_000n ? 10_000n : value;
}
