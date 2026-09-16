import { mulDivCeil, mulDivFloor, pow10, priceUnits, tokenAmount } from '@kairos/shared';
import type {
  Hex,
  KuruMarketParameters,
  KuruMarketSnapshot,
  MarketState,
  NormalizedLevel,
  SnapshotIdentity,
} from '../types.js';

const WORD_HEX_LENGTH = 64;
const BPS_DENOMINATOR = 10_000n;

export class InvalidKuruSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidKuruSnapshotError';
  }
}

function assertHex(value: string, label: string): asserts value is Hex {
  if (!/^0x[0-9a-fA-F]*$/.test(value) || (value.length - 2) % 2 !== 0) {
    throw new InvalidKuruSnapshotError(`${label} must be an even-length hex value.`);
  }
}

function readWord(hexWithoutPrefix: string, wordIndex: number): bigint {
  const start = wordIndex * WORD_HEX_LENGTH;
  const word = hexWithoutPrefix.slice(start, start + WORD_HEX_LENGTH);
  if (word.length !== WORD_HEX_LENGTH) throw new InvalidKuruSnapshotError('L2 payload ended inside a word.');
  return BigInt(`0x${word}`);
}

/** Decodes the ABI `bytes` return value from a raw `eth_call` response. */
export function decodeAbiBytesReturn(encoded: string): Hex {
  assertHex(encoded, 'ABI return value');
  const body = encoded.slice(2);
  if (body.length < WORD_HEX_LENGTH * 2 || body.length % WORD_HEX_LENGTH !== 0) {
    throw new InvalidKuruSnapshotError('ABI bytes return must contain a complete offset and length header.');
  }
  const offset = readWord(body, 0);
  if (offset !== 32n) throw new InvalidKuruSnapshotError('ABI bytes offset must be 32 bytes.');
  const byteLength = readWord(body, 1);
  if (byteLength > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InvalidKuruSnapshotError('ABI bytes payload is too large to decode safely.');
  }
  const payloadHexLength = Number(byteLength) * 2;
  const start = WORD_HEX_LENGTH * 2;
  if (start + payloadHexLength > body.length) throw new InvalidKuruSnapshotError('ABI bytes payload is truncated.');
  return `0x${body.slice(start, start + payloadHexLength)}`;
}

function validateParameters(params: KuruMarketParameters): void {
  if (params.pricePrecision <= 0n || params.sizePrecision <= 0n || params.tickSize <= 0n) {
    throw new InvalidKuruSnapshotError('Market precisions and tick size must be positive.');
  }
  if (params.minSize <= 0n || params.maxSize < params.minSize) {
    throw new InvalidKuruSnapshotError('Market size bounds are invalid.');
  }
  if (params.takerFeeBps < 0n || params.takerFeeBps >= BPS_DENOMINATOR) {
    throw new InvalidKuruSnapshotError('Taker fee must be in [0, 10000).');
  }
  pow10(params.baseAssetDecimals);
  pow10(params.quoteAssetDecimals);
}

function normalizeLevel(
  side: 'BID' | 'ASK',
  rawPrice: bigint,
  rawSize: bigint,
  params: KuruMarketParameters,
  policyPriceDecimals: number,
): NormalizedLevel {
  if (rawPrice <= 0n || rawSize <= 0n) throw new InvalidKuruSnapshotError('Price and size must be positive.');
  if (rawPrice % params.tickSize !== 0n) throw new InvalidKuruSnapshotError('Price is not aligned to market tick size.');

  const priceScale = pow10(policyPriceDecimals);
  const normalizedPrice =
    side === 'ASK'
      ? mulDivCeil(rawPrice, priceScale, params.pricePrecision)
      : mulDivFloor(rawPrice, priceScale, params.pricePrecision);
  const normalizedSize = mulDivFloor(rawSize, pow10(params.baseAssetDecimals), params.sizePrecision);
  if (normalizedPrice <= 0n || normalizedSize <= 0n) {
    throw new InvalidKuruSnapshotError('Level becomes zero after conservative integer normalization.');
  }

  return {
    side,
    source: 'MANUAL_L2',
    rawPrice,
    rawSize,
    price: priceUnits(normalizedPrice),
    baseSize: tokenAmount(normalizedSize),
  };
}

function assertBookOrdering(levels: readonly NormalizedLevel[], side: 'BID' | 'ASK'): void {
  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1]!;
    const current = levels[index]!;
    const correctlyOrdered = side === 'BID' ? previous.rawPrice > current.rawPrice : previous.rawPrice < current.rawPrice;
    if (!correctlyOrdered) throw new InvalidKuruSnapshotError(`${side} levels are not strictly ordered.`);
  }
}

export interface ParseKuruL2Input {
  readonly payload: Hex;
  readonly identity: SnapshotIdentity;
  readonly marketState: MarketState;
  readonly params: KuruMarketParameters;
  readonly policyPriceDecimals: number;
}

/**
 * Parses Kuru's decoded `getL2Book()` bytes without floating-point conversion.
 * Layout: block number, bid price/size pairs, zero bid sentinel, then ask pairs to the end.
 */
export function parseKuruL2Snapshot(input: ParseKuruL2Input): KuruMarketSnapshot {
  assertHex(input.payload, 'L2 payload');
  validateParameters(input.params);
  pow10(input.policyPriceDecimals);

  const body = input.payload.slice(2);
  if (body.length < WORD_HEX_LENGTH * 2 || body.length % WORD_HEX_LENGTH !== 0) {
    throw new InvalidKuruSnapshotError('L2 payload must contain whole words and a bid sentinel.');
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.identity.blockHash)) {
    throw new InvalidKuruSnapshotError('Snapshot block hash must be a full 32-byte hash.');
  }

  const wordCount = body.length / WORD_HEX_LENGTH;
  const payloadBlock = readWord(body, 0);
  if (payloadBlock !== input.identity.blockNumber) {
    throw new InvalidKuruSnapshotError('L2 payload block does not match snapshot identity.');
  }

  let cursor = 1;
  const bids: NormalizedLevel[] = [];
  let bidSentinelFound = false;
  while (cursor < wordCount) {
    const rawPrice = readWord(body, cursor);
    cursor += 1;
    if (rawPrice === 0n) {
      bidSentinelFound = true;
      break;
    }
    if (cursor >= wordCount) throw new InvalidKuruSnapshotError('Bid price is missing its size word.');
    const rawSize = readWord(body, cursor);
    cursor += 1;
    bids.push(normalizeLevel('BID', rawPrice, rawSize, input.params, input.policyPriceDecimals));
  }
  if (!bidSentinelFound) throw new InvalidKuruSnapshotError('L2 payload is missing the bid sentinel.');

  const asks: NormalizedLevel[] = [];
  while (cursor < wordCount) {
    const rawPrice = readWord(body, cursor);
    cursor += 1;
    if (rawPrice === 0n) throw new InvalidKuruSnapshotError('Ask price cannot be zero.');
    if (cursor >= wordCount) throw new InvalidKuruSnapshotError('Ask price is missing its size word.');
    const rawSize = readWord(body, cursor);
    cursor += 1;
    asks.push(normalizeLevel('ASK', rawPrice, rawSize, input.params, input.policyPriceDecimals));
  }

  assertBookOrdering(bids, 'BID');
  assertBookOrdering(asks, 'ASK');

  return {
    identity: input.identity,
    marketState: input.marketState,
    policyPriceDecimals: input.policyPriceDecimals,
    params: input.params,
    bids,
    asks,
    coverage: {
      manualL2: 'INCLUDED',
      ammVault: 'EXCLUDED',
      reason: 'getL2Book contains manual levels only; vault liquidity requires a separately consistent vault snapshot.',
    },
    rawPayload: input.payload,
  };
}
