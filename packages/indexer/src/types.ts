import type { Address, Hex } from 'viem';

export interface ChainPosition {
  readonly blockNumber: bigint;
  readonly blockHash: Hex;
  readonly transactionHash: Hex;
  readonly transactionIndex: number;
  readonly logIndex: number;
}

export type KairosChainEvent =
  | (ChainPosition & {
      readonly type: 'ORDER_CREATED';
      readonly orderId: bigint;
      readonly owner: Address;
      readonly budget: bigint;
      readonly startTime: bigint;
      readonly endTime: bigint;
    })
  | (ChainPosition & {
      readonly type: 'ORDER_CANCELLED';
      readonly orderId: bigint;
      readonly owner: Address;
    })
  | (ChainPosition & {
      readonly type: 'EXECUTION_SETTLED';
      readonly orderId: bigint;
      readonly nonce: bigint;
      readonly actualInput: bigint;
      readonly actualOutput: bigint;
      readonly returnedInput: bigint;
      readonly snapshotId: Hex;
    })
  | (ChainPosition & {
      readonly type: 'RECEIVER_ACTIVATED';
      readonly policy: Address;
      readonly workflowId: Hex;
      readonly workflowName: Hex;
      readonly workflowOwner: Address;
    })
  | (ChainPosition & {
      readonly type: 'REPORT_FORWARDED';
      readonly reportHash: Hex;
      readonly workflowId: Hex;
      readonly orderId: bigint;
      readonly nonce: bigint;
      readonly snapshotId: Hex;
      readonly reportId: Hex;
    });

export interface IndexedFill {
  readonly nonce: string;
  readonly actualInput: string;
  readonly actualOutput: string;
  readonly returnedInput: string;
  readonly snapshotId: Hex;
  readonly transactionHash: Hex;
  readonly blockNumber: string;
}

export interface IndexedReport {
  readonly reportHash: Hex;
  readonly workflowId: Hex;
  readonly nonce: string;
  readonly snapshotId: Hex;
  readonly reportId: Hex;
  readonly transactionHash: Hex;
  readonly blockNumber: string;
}

export interface IndexedOrder {
  readonly orderId: string;
  readonly owner: Address;
  readonly budget: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED_UNKNOWN_UNTIL_READ';
  readonly spent: string;
  readonly received: string;
  readonly fills: readonly IndexedFill[];
  readonly reports: readonly IndexedReport[];
}

export interface ReceiverIdentity {
  readonly policy: Address;
  readonly workflowId: Hex;
  readonly workflowName: Hex;
  readonly workflowOwner: Address;
  readonly transactionHash: Hex;
}

export interface PersistedIndexState {
  readonly schemaVersion: 1;
  readonly chainId: string;
  readonly policyAddress: Address;
  readonly receiverAddress: Address;
  readonly deploymentBlock: string;
  readonly cursor: { readonly blockNumber: string; readonly blockHash: Hex } | null;
  readonly orders: Readonly<Record<string, IndexedOrder>>;
  readonly receiver: ReceiverIdentity | null;
}

export interface RawChainLog extends ChainPosition {
  readonly address: Address;
  readonly data: Hex;
  readonly topics: [Hex, ...Hex[]];
}

export interface OffchainDecisionRecord {
  readonly kind: 'OFFCHAIN_DECISION';
  readonly recordedAt: string;
  readonly orderId: string;
  readonly decision: 'EXECUTE' | 'WAIT';
  readonly reason: string;
  readonly snapshotId?: Hex;
  readonly proposalHash?: Hex;
}
