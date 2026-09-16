import type { Address, PriceUnits, TokenAmount, UnixSeconds } from '@kairos/shared';

export type Hex = `0x${string}`;
export type SnapshotKind = 'FIXED_REPLAY' | 'LIVE_READ' | 'FORK' | 'FIXTURE';
export type MarketState = 'ACTIVE' | 'SOFT_PAUSED' | 'HARD_PAUSED' | 'UNKNOWN';

export interface KuruMarketParameters {
  readonly pricePrecision: bigint;
  readonly sizePrecision: bigint;
  readonly baseAsset: Address;
  readonly baseAssetDecimals: number;
  readonly quoteAsset: Address;
  readonly quoteAssetDecimals: number;
  readonly tickSize: bigint;
  readonly minSize: bigint;
  readonly maxSize: bigint;
  readonly takerFeeBps: bigint;
  readonly makerFeeBps: bigint;
}

export interface SnapshotIdentity {
  readonly kind: SnapshotKind;
  readonly chainId: bigint;
  readonly market: Address;
  readonly blockNumber: bigint;
  readonly blockHash: Hex;
  readonly blockTimestamp: UnixSeconds;
  readonly observedAt: UnixSeconds;
  readonly sourceRevision: string;
}

export interface NormalizedLevel {
  readonly side: 'BID' | 'ASK';
  readonly source: 'MANUAL_L2';
  readonly rawPrice: bigint;
  readonly rawSize: bigint;
  readonly price: PriceUnits;
  readonly baseSize: TokenAmount;
}

export interface KuruMarketSnapshot {
  readonly identity: SnapshotIdentity;
  readonly marketState: MarketState;
  readonly policyPriceDecimals: number;
  readonly params: KuruMarketParameters;
  readonly bids: readonly NormalizedLevel[];
  readonly asks: readonly NormalizedLevel[];
  readonly coverage: {
    readonly manualL2: 'INCLUDED';
    readonly ammVault: 'EXCLUDED';
    readonly reason: string;
  };
  readonly rawPayload: Hex;
}
