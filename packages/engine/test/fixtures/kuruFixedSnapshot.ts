import { unixSeconds } from '@kairos/shared';
import type { KuruMarketParameters, SnapshotIdentity } from '../../src/index.js';

export const KURU_FIXED_ETH_CALL_RESULT =
  '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000003c073840000000000000000000000000000000000000000000000000000000000000000' as const;

export const KURU_FIXED_IDENTITY: SnapshotIdentity = {
  kind: 'FIXED_REPLAY',
  chainId: 10_143n,
  market: '0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9',
  blockNumber: 62_944_132n,
  blockHash: '0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098',
  blockTimestamp: unixSeconds(1_789_535_885n),
  observedAt: unixSeconds(1_789_543_686n),
  sourceRevision: 'Kuru SDK 636509c2eafd63479d3f399703354e0d09f51e18',
};

export const KURU_MARKET_PARAMS: KuruMarketParameters = {
  pricePrecision: 100_000_000n,
  sizePrecision: 10_000_000_000n,
  baseAsset: '0x0000000000000000000000000000000000000000',
  baseAssetDecimals: 18,
  quoteAsset: '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570',
  quoteAssetDecimals: 6,
  tickSize: 100n,
  minSize: 2_000_000_000_000n,
  maxSize: 2_000_000_000_000_000_000n,
  takerFeeBps: 0n,
  makerFeeBps: 0n,
};
