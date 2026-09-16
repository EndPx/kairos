import { indexer } from 'envio';
import { eventEntityId, orderEntityId, receiverEntityId, settlementKeyId } from '../ids.js';
import { weightedAveragePrice } from '../math.js';

const provenanceFields = {
  transaction: ['hash'],
  block: ['hash', 'timestamp'],
} as const;

indexer.onEvent(
  {contract: 'KairosPolicy', event: 'OrderCreated', fields: provenanceFields},
  async ({event, context}) => {
    const id = orderEntityId(event.chainId, event.srcAddress, event.params.orderId);
    if ((await context.Order.get(id)) !== undefined) return;

    const blockNumber = BigInt(event.block.number);
    const blockTimestamp = BigInt(event.block.timestamp);
    context.Order.set({
      id,
      chainId: event.chainId,
      policy: event.srcAddress,
      orderId: event.params.orderId,
      owner: event.params.owner,
      budget: event.params.budget,
      startTime: event.params.startTime,
      endTime: event.params.endTime,
      eventStatus: 'CREATED',
      totalActualInput: 0n,
      totalActualOutput: 0n,
      totalReturnedInput: 0n,
      fillCount: 0,
      weightedAveragePrice: undefined,
      createdBlockNumber: blockNumber,
      createdBlockHash: event.block.hash,
      createdTimestamp: blockTimestamp,
      createdTransactionHash: event.transaction.hash,
      lastEventBlockNumber: blockNumber,
      lastEventBlockHash: event.block.hash,
      lastEventTimestamp: blockTimestamp,
      lastEventTransactionHash: event.transaction.hash,
    });
  },
);

indexer.onEvent(
  {contract: 'KairosPolicy', event: 'OrderCancelled', fields: provenanceFields},
  async ({event, context}) => {
    const id = orderEntityId(event.chainId, event.srcAddress, event.params.orderId);
    const order = await context.Order.getOrThrow(id);
    context.Order.set({
      ...order,
      eventStatus: 'CANCELLED',
      lastEventBlockNumber: BigInt(event.block.number),
      lastEventBlockHash: event.block.hash,
      lastEventTimestamp: BigInt(event.block.timestamp),
      lastEventTransactionHash: event.transaction.hash,
    });
  },
);

indexer.onEvent(
  {contract: 'KairosPolicy', event: 'ExecutionSettled', fields: provenanceFields},
  async ({event, context}) => {
    const fillId = eventEntityId(event.chainId, event.transaction.hash, event.logIndex);
    if ((await context.Fill.get(fillId)) !== undefined) return;

    const orderId = orderEntityId(event.chainId, event.srcAddress, event.params.orderId);
    const order = await context.Order.getOrThrow(orderId);
    const totalActualInput = order.totalActualInput + event.params.actualInput;
    const totalActualOutput = order.totalActualOutput + event.params.actualOutput;
    const fill = {
      id: fillId,
      order_id: orderId,
      chainId: event.chainId,
      policy: event.srcAddress,
      orderId: event.params.orderId,
      nonce: event.params.nonce,
      actualInput: event.params.actualInput,
      actualOutput: event.params.actualOutput,
      returnedInput: event.params.returnedInput,
      snapshotId: event.params.snapshotId,
      transactionHash: event.transaction.hash,
      logIndex: event.logIndex,
      blockNumber: BigInt(event.block.number),
      blockHash: event.block.hash,
      blockTimestamp: BigInt(event.block.timestamp),
    };

    context.Fill.set(fill);
    context.SettlementKey.set({
      id: settlementKeyId(event.chainId, event.srcAddress, event.params.orderId, event.params.nonce),
      fill_id: fillId,
    });
    context.Order.set({
      ...order,
      eventStatus: totalActualInput === order.budget ? 'BUDGET_SPENT' : 'CREATED',
      totalActualInput,
      totalActualOutput,
      totalReturnedInput: order.totalReturnedInput + event.params.returnedInput,
      fillCount: order.fillCount + 1,
      weightedAveragePrice: weightedAveragePrice(totalActualInput, totalActualOutput),
      lastEventBlockNumber: BigInt(event.block.number),
      lastEventBlockHash: event.block.hash,
      lastEventTimestamp: BigInt(event.block.timestamp),
      lastEventTransactionHash: event.transaction.hash,
    });
  },
);

indexer.onEvent(
  {contract: 'KairosCreReceiver', event: 'ReceiverActivated', fields: provenanceFields},
  async ({event, context}) => {
    const id = receiverEntityId(event.chainId, event.srcAddress);
    if ((await context.ReceiverIdentity.get(id)) !== undefined) return;
    context.ReceiverIdentity.set({
      id,
      chainId: event.chainId,
      receiver: event.srcAddress,
      policy: event.params.policy,
      workflowId: event.params.workflowId,
      workflowName: event.params.workflowName,
      workflowOwner: event.params.workflowOwner,
      activationBlockNumber: BigInt(event.block.number),
      activationBlockHash: event.block.hash,
      activationTransactionHash: event.transaction.hash,
    });
  },
);

indexer.onEvent(
  {contract: 'KairosCreReceiver', event: 'ReportForwarded', fields: provenanceFields},
  async ({event, context}) => {
    const id = eventEntityId(event.chainId, event.transaction.hash, event.logIndex);
    if ((await context.CreReport.get(id)) !== undefined) return;

    const receiverId = receiverEntityId(event.chainId, event.srcAddress);
    const receiver = await context.ReceiverIdentity.get(receiverId);
    const settlementKey = receiver
      ? await context.SettlementKey.get(
          settlementKeyId(event.chainId, receiver.policy, event.params.orderId, event.params.nonce),
        )
      : undefined;
    const fill = settlementKey ? await context.Fill.get(settlementKey.fill_id) : undefined;
    const correlationVerified =
      fill !== undefined &&
      fill.transactionHash.toLowerCase() === event.transaction.hash.toLowerCase() &&
      fill.snapshotId.toLowerCase() === event.params.snapshotId.toLowerCase();

    context.CreReport.set({
      id,
      receiverIdentity_id: receiver?.id,
      fill_id: correlationVerified ? fill.id : undefined,
      chainId: event.chainId,
      receiver: event.srcAddress,
      reportHash: event.params.reportHash,
      workflowId: event.params.workflowId,
      orderId: event.params.orderId,
      nonce: event.params.nonce,
      snapshotId: event.params.snapshotId,
      reportId: event.params.reportId,
      settlementCorrelation: correlationVerified ? 'VERIFIED_SAME_TRANSACTION' : 'UNVERIFIED',
      transactionHash: event.transaction.hash,
      logIndex: event.logIndex,
      blockNumber: BigInt(event.block.number),
      blockHash: event.block.hash,
      blockTimestamp: BigInt(event.block.timestamp),
    });
  },
);
