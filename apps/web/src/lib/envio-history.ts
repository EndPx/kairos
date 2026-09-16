import {isAddress, isHash, type Address, type Hex} from 'viem';

import type {IndexedFill, IndexedOrder, IndexedReport} from '../../../../packages/indexer/src/types';

const MONAD_TESTNET_CHAIN_ID = 10_143;
const REQUEST_TIMEOUT_MS = 8_000;

export const KAIROS_HISTORY_QUERY = `
  query KairosHistory {
    _meta(where: {chainId: {_eq: 10143}}) {
      chainId
      progressBlock
      eventsProcessed
      bufferBlock
      firstEventBlock
      sourceBlock
      readyAt
      isReady
      startBlock
      endBlock
    }
    Order(order_by: {orderId: desc}) {
      chainId
      policy
      orderId
      owner
      budget
      startTime
      endTime
      eventStatus
      totalActualInput
      totalActualOutput
      fills(order_by: [{blockNumber: asc}, {logIndex: asc}]) {
        nonce
        actualInput
        actualOutput
        returnedInput
        snapshotId
        transactionHash
        blockNumber
      }
    }
    CreReport(order_by: [{blockNumber: asc}, {logIndex: asc}]) {
      reportHash
      workflowId
      orderId
      nonce
      snapshotId
      reportId
      transactionHash
      blockNumber
    }
  }
`;

export interface EnvioSyncMetadata {
  readonly chainId: number;
  readonly progressBlock?: string;
  readonly eventsProcessed: string;
  readonly bufferBlock?: string;
  readonly firstEventBlock?: string;
  readonly sourceBlock?: string;
  readonly readyAt?: string;
  readonly isReady: boolean;
  readonly startBlock: string;
  readonly endBlock?: string;
}

export interface EnvioHistorySnapshot {
  readonly meta: EnvioSyncMetadata;
  readonly orders: readonly IndexedOrder[];
}

interface GraphqlEnvelope {
  readonly data?: unknown;
  readonly errors?: readonly {readonly message?: unknown}[];
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value;
}

function integer(value: unknown, field: string): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value.toString();
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return value;
  throw new Error(`${field} must be an unsigned integer.`);
}

function optionalInteger(value: unknown, field: string): string | undefined {
  return value === null || value === undefined ? undefined : integer(value, field);
}

function address(value: unknown, field: string): Address {
  if (typeof value !== 'string' || !isAddress(value)) throw new Error(`${field} must be an address.`);
  return value;
}

function hash(value: unknown, field: string): Hex {
  if (typeof value !== 'string' || !isHash(value)) throw new Error(`${field} must be a 32-byte hash.`);
  return value;
}

function hex(value: unknown, field: string): Hex {
  if (typeof value !== 'string' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new Error(`${field} must be even-length hex.`);
  }
  return value as Hex;
}

function parseMeta(value: unknown): EnvioSyncMetadata {
  const item = record(value, '_meta item');
  const chainId = Number(integer(item.chainId, '_meta.chainId'));
  if (chainId !== MONAD_TESTNET_CHAIN_ID) throw new Error('Envio metadata is not for Monad Testnet.');
  if (typeof item.isReady !== 'boolean') throw new Error('_meta.isReady must be boolean.');
  return {
    chainId,
    progressBlock: optionalInteger(item.progressBlock, '_meta.progressBlock'),
    eventsProcessed: integer(item.eventsProcessed, '_meta.eventsProcessed'),
    bufferBlock: optionalInteger(item.bufferBlock, '_meta.bufferBlock'),
    firstEventBlock: optionalInteger(item.firstEventBlock, '_meta.firstEventBlock'),
    sourceBlock: optionalInteger(item.sourceBlock, '_meta.sourceBlock'),
    readyAt: typeof item.readyAt === 'string' ? item.readyAt : undefined,
    isReady: item.isReady,
    startBlock: integer(item.startBlock, '_meta.startBlock'),
    endBlock: optionalInteger(item.endBlock, '_meta.endBlock'),
  };
}

function parseFill(value: unknown, index: number): IndexedFill {
  const item = record(value, `Fill[${index}]`);
  return {
    nonce: integer(item.nonce, `Fill[${index}].nonce`),
    actualInput: integer(item.actualInput, `Fill[${index}].actualInput`),
    actualOutput: integer(item.actualOutput, `Fill[${index}].actualOutput`),
    returnedInput: integer(item.returnedInput, `Fill[${index}].returnedInput`),
    snapshotId: hash(item.snapshotId, `Fill[${index}].snapshotId`),
    transactionHash: hash(item.transactionHash, `Fill[${index}].transactionHash`),
    blockNumber: integer(item.blockNumber, `Fill[${index}].blockNumber`),
  };
}

function parseReport(value: unknown, index: number): IndexedReport & {readonly orderId: string} {
  const item = record(value, `CreReport[${index}]`);
  return {
    orderId: integer(item.orderId, `CreReport[${index}].orderId`),
    reportHash: hash(item.reportHash, `CreReport[${index}].reportHash`),
    workflowId: hash(item.workflowId, `CreReport[${index}].workflowId`),
    nonce: integer(item.nonce, `CreReport[${index}].nonce`),
    snapshotId: hash(item.snapshotId, `CreReport[${index}].snapshotId`),
    reportId: hex(item.reportId, `CreReport[${index}].reportId`),
    transactionHash: hash(item.transactionHash, `CreReport[${index}].transactionHash`),
    blockNumber: integer(item.blockNumber, `CreReport[${index}].blockNumber`),
  };
}

function indexedStatus(value: unknown): IndexedOrder['status'] {
  if (value === 'CREATED') return 'ACTIVE';
  if (value === 'BUDGET_SPENT') return 'COMPLETED';
  if (value === 'CANCELLED') return 'CANCELLED';
  throw new Error('Order.eventStatus is unsupported.');
}

export function parseEnvioHistory(payload: unknown, expectedPolicy: Address): EnvioHistorySnapshot {
  const root = record(payload, 'GraphQL data');
  const metadata = array(root._meta, '_meta');
  if (metadata.length !== 1) throw new Error('Expected one Monad Testnet _meta record.');
  const meta = parseMeta(metadata[0]);

  const reportsByOrder = new Map<string, IndexedReport[]>();
  array(root.CreReport, 'CreReport').forEach((value, index) => {
    const report = parseReport(value, index);
    const reports = reportsByOrder.get(report.orderId) ?? [];
    reports.push(report);
    reportsByOrder.set(report.orderId, reports);
  });

  const orders = array(root.Order, 'Order').map((value, index): IndexedOrder => {
    const item = record(value, `Order[${index}]`);
    const chainId = Number(integer(item.chainId, `Order[${index}].chainId`));
    const policy = address(item.policy, `Order[${index}].policy`);
    if (chainId !== MONAD_TESTNET_CHAIN_ID || policy.toLowerCase() !== expectedPolicy.toLowerCase()) {
      throw new Error('Envio order identity does not match the configured Monad Testnet policy.');
    }
    const orderId = integer(item.orderId, `Order[${index}].orderId`);
    return {
      orderId,
      owner: address(item.owner, `Order[${index}].owner`),
      budget: integer(item.budget, `Order[${index}].budget`),
      startTime: integer(item.startTime, `Order[${index}].startTime`),
      endTime: integer(item.endTime, `Order[${index}].endTime`),
      status: indexedStatus(item.eventStatus),
      spent: integer(item.totalActualInput, `Order[${index}].totalActualInput`),
      received: integer(item.totalActualOutput, `Order[${index}].totalActualOutput`),
      fills: array(item.fills, `Order[${index}].fills`).map(parseFill),
      reports: reportsByOrder.get(orderId) ?? [],
    };
  });

  return {meta, orders};
}

export async function fetchEnvioHistory(
  endpoint: string,
  expectedPolicy: Address,
  adminSecret?: string,
): Promise<EnvioHistorySnapshot> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(adminSecret ? {'x-hasura-admin-secret': adminSecret} : {}),
    },
    body: JSON.stringify({query: KAIROS_HISTORY_QUERY}),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Envio GraphQL returned HTTP ${response.status}.`);
  const envelope = (await response.json()) as GraphqlEnvelope;
  if (envelope.errors && envelope.errors.length > 0) {
    throw new Error('Envio GraphQL returned query errors.');
  }
  if (envelope.data === undefined) throw new Error('Envio GraphQL response has no data.');
  return parseEnvioHistory(envelope.data, expectedPolicy);
}
