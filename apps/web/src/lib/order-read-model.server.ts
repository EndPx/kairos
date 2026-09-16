import 'server-only';

import {readFile} from 'node:fs/promises';

import {createPublicClient, http, type Hex} from 'viem';

import type {OffchainDecisionRecord, PersistedIndexState} from '../../../../packages/indexer/src/types';

import {kairosPolicyAbi, kuruReadAbi} from './abi';
import {DEFAULT_MONAD_RPC_URL, monadTestnet} from './chain';
import {
  buildExecutionReport,
  type ExecutionReportsReadModel,
  type FillChainEvidence,
} from './execution-report';
import {summarizeKuruManualBook} from './kuru-market-summary';
import {
  mergeIndexedOrders,
  type LivePolicyOrder,
  type MarketSnapshotView,
  type OrdersReadModel,
  type PolicyLifecycle,
} from './order-read-model';
import {runtimeConfig} from './runtime-config';

const lifecycle: Record<number, PolicyLifecycle> = {
  0: 'ACTIVE',
  1: 'COMPLETED',
  2: 'CANCELLED',
  3: 'EXPIRED',
};

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function readOptionalJson<T>(path: string | undefined, fallback: T): Promise<T> {
  if (!path) return fallback;
  try {
    return await readJson<T>(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

function validateDecisionJournal(value: unknown): OffchainDecisionRecord[] {
  if (!Array.isArray(value)) throw new Error('Decision journal must be an array.');
  const sources = new Set(['CRE_SIMULATION', 'CRE_WORKFLOW', 'LOCAL_ENGINE', 'REPLAY']);
  const decisions = new Set(['EXECUTE', 'WAIT']);
  for (const record of value) {
    if (
      typeof record !== 'object' ||
      record === null ||
      !('kind' in record) ||
      record.kind !== 'OFFCHAIN_DECISION' ||
      !('source' in record) ||
      typeof record.source !== 'string' ||
      !sources.has(record.source) ||
      !('decision' in record) ||
      typeof record.decision !== 'string' ||
      !decisions.has(record.decision) ||
      !('orderId' in record) ||
      typeof record.orderId !== 'string' ||
      !/^(0|[1-9][0-9]*)$/.test(record.orderId) ||
      !('recordedAt' in record) ||
      typeof record.recordedAt !== 'string' ||
      !Number.isFinite(Date.parse(record.recordedAt)) ||
      !('reason' in record) ||
      typeof record.reason !== 'string'
    ) {
      throw new Error('Decision journal record has invalid provenance or identity.');
    }
    if ('constraints' in record && record.constraints !== undefined) {
      if (typeof record.constraints !== 'object' || record.constraints === null) {
        throw new Error('Decision constraint trace must be an object.');
      }
      const fields = [
        'releasedAvailable',
        'remainingBudget',
        'maxPerFill',
        'walletBalance',
        'tokenAllowance',
        'estimatedLiquidityCapacity',
        'selectedInput',
      ];
      const constraints = record.constraints as Record<string, unknown>;
      if (fields.some((field) => !(field in constraints) || !/^(0|[1-9][0-9]*)$/.test(String(constraints[field])))) {
        throw new Error('Decision constraint trace must contain unsigned decimal strings.');
      }
    }
  }
  return value as OffchainDecisionRecord[];
}

async function readMarketSnapshot(
  client: ReturnType<typeof createPublicClient>,
  blockNumber: bigint,
  blockHash: Hex,
  blockTimestamp: bigint,
): Promise<MarketSnapshotView> {
  if (!runtimeConfig.marketAddress) throw new Error('Market address is unavailable.');
  const [payload, params] = await Promise.all([
    client.readContract({
      address: runtimeConfig.marketAddress,
      abi: kuruReadAbi,
      functionName: 'getL2Book',
      blockNumber,
    }),
    client.readContract({
      address: runtimeConfig.marketAddress,
      abi: kuruReadAbi,
      functionName: 'getMarketParams',
      blockNumber,
    }),
  ]);
  const pricePrecision = BigInt(params[0]);
  const book = summarizeKuruManualBook(payload, blockNumber, pricePrecision);
  return {
    askLevels: book.askLevels,
    bestAskPrice: book.bestAskPrice,
    bidLevels: book.bidLevels,
    blockHash,
    blockNumber: blockNumber.toString(),
    blockTimestamp: blockTimestamp.toString(),
    coverage: 'MANUAL_L2_ONLY',
    readStatus: 'AVAILABLE',
  };
}

async function readLiveOrder(
  client: ReturnType<typeof createPublicClient>,
  orderId: string,
  blockNumber: bigint,
  blockTimestamp: bigint,
): Promise<LivePolicyOrder> {
  if (!runtimeConfig.policyAddress) throw new Error('Policy address is unavailable.');
  const id = BigInt(orderId);
  const [order, status, releasedBudget, availableToSpend] = await Promise.all([
    client.readContract({
      address: runtimeConfig.policyAddress,
      abi: kairosPolicyAbi,
      functionName: 'getOrder',
      args: [id],
      blockNumber,
    }),
    client.readContract({
      address: runtimeConfig.policyAddress,
      abi: kairosPolicyAbi,
      functionName: 'statusOf',
      args: [id],
      blockNumber,
    }),
    client.readContract({
      address: runtimeConfig.policyAddress,
      abi: kairosPolicyAbi,
      functionName: 'releasedBudget',
      args: [id, blockTimestamp],
      blockNumber,
    }),
    client.readContract({
      address: runtimeConfig.policyAddress,
      abi: kairosPolicyAbi,
      functionName: 'availableToSpend',
      args: [id, blockTimestamp],
      blockNumber,
    }),
  ]);
  return {
    owner: order.owner,
    budget: order.budget.toString(),
    spent: order.spent.toString(),
    received: order.received.toString(),
    startTime: order.startTime.toString(),
    endTime: order.endTime.toString(),
    maxPerFill: order.maxPerFill.toString(),
    minFill: order.minFill.toString(),
    maxEffectivePrice: order.maxEffectivePrice.toString(),
    executionNonce: order.executionNonce.toString(),
    releasedBudget: releasedBudget.toString(),
    availableToSpend: availableToSpend.toString(),
    status: lifecycle[Number(status)] ?? 'UNKNOWN',
  };
}

export async function loadOrdersReadModel(): Promise<OrdersReadModel> {
  const indexPath = process.env.KAIROS_INDEX_PATH;
  if (!indexPath || !runtimeConfig.policyAddress || !runtimeConfig.receiverAddress || !runtimeConfig.marketAddress) {
    return {
      state: 'CONFIG_REQUIRED',
      orders: [],
      message: 'Index path and public policy, receiver, and market addresses must be configured.',
    };
  }

  try {
    const state = await readJson<PersistedIndexState>(indexPath);
    if (
      state.schemaVersion !== 1 ||
      state.chainId !== String(monadTestnet.id) ||
      state.policyAddress.toLowerCase() !== runtimeConfig.policyAddress.toLowerCase() ||
      state.receiverAddress.toLowerCase() !== runtimeConfig.receiverAddress.toLowerCase()
    ) {
      return {state: 'READ_FAILED', orders: [], message: 'The persisted index identity does not match application configuration.'};
    }

    const decisionPath = process.env.KAIROS_DECISION_JOURNAL_PATH;
    const decisions = validateDecisionJournal(await readOptionalJson<unknown>(decisionPath, []));
    const rpcUrl = process.env.MONAD_RPC_URL || process.env.NEXT_PUBLIC_MONAD_RPC_URL || DEFAULT_MONAD_RPC_URL;
    const client = createPublicClient({chain: monadTestnet, transport: http(rpcUrl)});
    const block = await client.getBlock();
    if (!block.hash) throw new Error('Latest block has no hash.');
    const entries = await Promise.all(
      Object.keys(state.orders).map(async (orderId) => [orderId, await readLiveOrder(client, orderId, block.number, block.timestamp)] as const),
    );
    const liveOrders = Object.fromEntries(entries);
    let market: MarketSnapshotView | undefined;
    let marketError: string | undefined;
    try {
      market = await readMarketSnapshot(client, block.number, block.hash, block.timestamp);
    } catch {
      marketError = 'The manual Kuru L2 snapshot could not be read at the pinned policy block.';
    }
    const orders = mergeIndexedOrders(state, liveOrders, decisions);
    return {
      state: orders.length === 0 ? 'EMPTY' : 'READY',
      orders,
      cursor: state.cursor ?? undefined,
      market,
      marketError,
      policyBlock: {
        blockHash: block.hash,
        blockNumber: block.number.toString(),
        blockTimestamp: block.timestamp.toString(),
      },
    };
  } catch {
    return {
      state: 'READ_FAILED',
      orders: [],
      message: 'Indexed state or the pinned onchain read could not be recovered. No stale lifecycle is shown.',
    };
  }
}

async function readFillEvidence(
  client: ReturnType<typeof createPublicClient>,
  transactionHash: Hex,
  expectedBlockNumber: bigint,
): Promise<FillChainEvidence> {
  if (!runtimeConfig.marketAddress) throw new Error('Market address is unavailable.');
  const [transaction, receipt, block, params] = await Promise.all([
    client.getTransaction({hash: transactionHash}),
    client.getTransactionReceipt({hash: transactionHash}),
    client.getBlock({blockNumber: expectedBlockNumber}),
    client.readContract({
      address: runtimeConfig.marketAddress,
      abi: kuruReadAbi,
      functionName: 'getMarketParams',
      blockNumber: expectedBlockNumber,
    }),
  ]);
  if (
    receipt.status !== 'success' ||
    receipt.blockNumber !== expectedBlockNumber ||
    transaction.blockNumber !== expectedBlockNumber ||
    receipt.blockHash !== block.hash
  ) {
    throw new Error('Fill transaction evidence does not match the indexed successful block.');
  }
  return {
    blockHash: receipt.blockHash,
    blockTimestamp: block.timestamp.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    gasLimit: transaction.gas.toString(),
    gasUsed: receipt.gasUsed.toString(),
    takerFeeBps: params[9].toString(),
    transactionHash,
  };
}

export async function loadExecutionReportsReadModel(): Promise<ExecutionReportsReadModel> {
  const ordersModel = await loadOrdersReadModel();
  if (ordersModel.state !== 'READY') return {ordersModel, reports: []};

  const rpcUrl = process.env.MONAD_RPC_URL || process.env.NEXT_PUBLIC_MONAD_RPC_URL || DEFAULT_MONAD_RPC_URL;
  const client = createPublicClient({chain: monadTestnet, transport: http(rpcUrl)});
  const reports = await Promise.all(
    ordersModel.orders.map(async (order) => {
      const evidence = (
        await Promise.all(
          order.fills.map(async (fill) => {
            try {
              return await readFillEvidence(client, fill.transactionHash, BigInt(fill.blockNumber));
            } catch {
              return undefined;
            }
          }),
        )
      ).filter((item): item is FillChainEvidence => item !== undefined);
      return {
        order,
        report: buildExecutionReport(order.fills, evidence, order.spent, order.received),
      };
    }),
  );
  return {ordersModel, reports};
}
