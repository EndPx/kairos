import type { IndexedOrder, KairosChainEvent, PersistedIndexState } from './types.js';

export interface IndexIdentity {
  readonly chainId: bigint;
  readonly policyAddress: PersistedIndexState['policyAddress'];
  readonly receiverAddress: PersistedIndexState['receiverAddress'];
  readonly deploymentBlock: bigint;
}

export function emptyIndex(identity: IndexIdentity): PersistedIndexState {
  return {
    schemaVersion: 1,
    chainId: identity.chainId.toString(),
    policyAddress: identity.policyAddress,
    receiverAddress: identity.receiverAddress,
    deploymentBlock: identity.deploymentBlock.toString(),
    cursor: null,
    orders: {},
    receiver: null,
  };
}

function requireOrder(state: PersistedIndexState, orderId: bigint): IndexedOrder {
  const order = state.orders[orderId.toString()];
  if (order === undefined) throw new Error(`Event references unknown order ${orderId}.`);
  return order;
}

export function applyChainEvent(state: PersistedIndexState, event: KairosChainEvent): PersistedIndexState {
  if (event.type === 'ORDER_CREATED') {
    const key = event.orderId.toString();
    if (state.orders[key] !== undefined) throw new Error(`Duplicate order ${key}.`);
    return {
      ...state,
      orders: {
        ...state.orders,
        [key]: {
          orderId: key,
          owner: event.owner,
          budget: event.budget.toString(),
          startTime: event.startTime.toString(),
          endTime: event.endTime.toString(),
          status: 'ACTIVE',
          spent: '0',
          received: '0',
          fills: [],
          reports: [],
        },
      },
    };
  }
  if (event.type === 'RECEIVER_ACTIVATED') {
    return {
      ...state,
      receiver: {
        policy: event.policy,
        workflowId: event.workflowId,
        workflowName: event.workflowName,
        workflowOwner: event.workflowOwner,
        transactionHash: event.transactionHash,
      },
    };
  }

  const current = requireOrder(state, event.orderId);
  let order: IndexedOrder;
  if (event.type === 'ORDER_CANCELLED') {
    order = { ...current, status: 'CANCELLED' };
  } else if (event.type === 'EXECUTION_SETTLED') {
    const spent = BigInt(current.spent) + event.actualInput;
    order = {
      ...current,
      status: spent >= BigInt(current.budget) ? 'COMPLETED' : current.status,
      spent: spent.toString(),
      received: (BigInt(current.received) + event.actualOutput).toString(),
      fills: [
        ...current.fills,
        {
          nonce: event.nonce.toString(),
          actualInput: event.actualInput.toString(),
          actualOutput: event.actualOutput.toString(),
          returnedInput: event.returnedInput.toString(),
          snapshotId: event.snapshotId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber.toString(),
        },
      ],
    };
  } else {
    order = {
      ...current,
      reports: [
        ...current.reports,
        {
          reportHash: event.reportHash,
          workflowId: event.workflowId,
          nonce: event.nonce.toString(),
          snapshotId: event.snapshotId,
          reportId: event.reportId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber.toString(),
        },
      ],
    };
  }
  return { ...state, orders: { ...state.orders, [order.orderId]: order } };
}

export function projectEvents(initial: PersistedIndexState, events: readonly KairosChainEvent[]): PersistedIndexState {
  const sorted = [...events].sort(
    (left, right) => {
      if (left.blockNumber < right.blockNumber) return -1;
      if (left.blockNumber > right.blockNumber) return 1;
      return left.transactionIndex - right.transactionIndex || left.logIndex - right.logIndex;
    },
  );
  return sorted.reduce(applyChainEvent, initial);
}
