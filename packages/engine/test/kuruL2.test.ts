import { describe, expect, it } from 'vitest';
import { decodeAbiBytesReturn, InvalidKuruSnapshotError, parseKuruL2Snapshot } from '../src/index.js';
import { KURU_FIXED_ETH_CALL_RESULT, KURU_FIXED_IDENTITY, KURU_MARKET_PARAMS } from './fixtures/kuruFixedSnapshot.js';

const word = (value: bigint) => value.toString(16).padStart(64, '0');
const payload = (...values: bigint[]) => `0x${values.map(word).join('')}` as const;

describe('Kuru L2 market-data adapter', () => {
  it('parses the recorded fixed-block RPC snapshot with complete provenance', () => {
    const decoded = decodeAbiBytesReturn(KURU_FIXED_ETH_CALL_RESULT);
    const snapshot = parseKuruL2Snapshot({
      payload: decoded,
      identity: KURU_FIXED_IDENTITY,
      marketState: 'ACTIVE',
      params: KURU_MARKET_PARAMS,
      policyPriceDecimals: 8,
    });

    expect(decoded).toBe(
      '0x0000000000000000000000000000000000000000000000000000000003c073840000000000000000000000000000000000000000000000000000000000000000',
    );
    expect(snapshot.identity.blockHash).toBe(
      '0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098',
    );
    expect(snapshot.bids).toEqual([]);
    expect(snapshot.asks).toEqual([]);
    expect(snapshot.coverage.ammVault).toBe('EXCLUDED');
  });

  it('normalizes ordered bid and ask levels with integers only', () => {
    const snapshot = parseKuruL2Snapshot({
      payload: payload(
        KURU_FIXED_IDENTITY.blockNumber,
        4_000_000n,
        3_000_000_000_000n,
        3_000_000n,
        2_000_000_000_000n,
        0n,
        5_000_000n,
        4_000_000_000_000n,
        6_000_000n,
        2_000_000_000_000n,
      ),
      identity: { ...KURU_FIXED_IDENTITY, kind: 'FIXTURE' },
      marketState: 'ACTIVE',
      params: KURU_MARKET_PARAMS,
      policyPriceDecimals: 8,
    });

    expect(snapshot.bids.map((level) => [level.price, level.baseSize])).toEqual([
      [4_000_000n, 300_000_000_000_000_000_000n],
      [3_000_000n, 200_000_000_000_000_000_000n],
    ]);
    expect(snapshot.asks.map((level) => [level.price, level.baseSize])).toEqual([
      [5_000_000n, 400_000_000_000_000_000_000n],
      [6_000_000n, 200_000_000_000_000_000_000n],
    ]);
  });

  it('rejects mismatched identity, malformed pairs, invalid ticks, and unordered levels', () => {
    const base = {
      identity: KURU_FIXED_IDENTITY,
      marketState: 'ACTIVE' as const,
      params: KURU_MARKET_PARAMS,
      policyPriceDecimals: 8,
    };

    expect(() => parseKuruL2Snapshot({ ...base, payload: payload(1n, 0n) })).toThrow(
      'L2 payload block does not match snapshot identity',
    );
    expect(() =>
      parseKuruL2Snapshot({ ...base, payload: payload(KURU_FIXED_IDENTITY.blockNumber, 5_000_000n) }),
    ).toThrow('Bid price is missing its size word');
    expect(() =>
      parseKuruL2Snapshot({
        ...base,
        payload: payload(KURU_FIXED_IDENTITY.blockNumber, 0n, 5_000_001n, 2_000_000_000_000n),
      }),
    ).toThrow('Price is not aligned to market tick size');
    expect(() =>
      parseKuruL2Snapshot({
        ...base,
        payload: payload(
          KURU_FIXED_IDENTITY.blockNumber,
          0n,
          6_000_000n,
          2_000_000_000_000n,
          5_000_000n,
          2_000_000_000_000n,
        ),
      }),
    ).toThrow(InvalidKuruSnapshotError);
  });
});
