import type { Address, OrderPolicy, OrderStatus, PriceUnits, TokenAmount, UnixSeconds } from '@kairos/shared';

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

export type CapacityStopReason = 'BOOK_EXHAUSTED' | 'INPUT_LIMIT' | 'PRICE_LIMIT' | 'NO_LIQUIDITY';

export interface CapacityTraceStep {
  readonly levelIndex: number;
  readonly rawPrice: bigint;
  readonly availableRawSize: bigint;
  readonly takenRawSize: bigint;
  readonly levelInput: TokenAmount;
  readonly cumulativeInput: TokenAmount;
  readonly cumulativeGrossOutput: TokenAmount;
  readonly cumulativeFeeOutput: TokenAmount;
  readonly cumulativeNetOutput: TokenAmount;
  readonly result: 'FULL_LEVEL' | 'PARTIAL_INPUT_LIMIT' | 'PARTIAL_PRICE_LIMIT' | 'REJECTED_PRICE_LIMIT';
}

export interface LiquidityCapacity {
  readonly estimatedInput: TokenAmount;
  readonly estimatedGrossOutput: TokenAmount;
  readonly estimatedFeeOutput: TokenAmount;
  readonly estimatedOutput: TokenAmount;
  readonly stopReason: CapacityStopReason;
  readonly trace: readonly CapacityTraceStep[];
  readonly includedSources: readonly ['MANUAL_L2'];
  readonly excludedSources: readonly ['KURU_AMM_VAULT'];
}

export interface PolicyStateSnapshot {
  readonly policy: Address;
  readonly blockNumber: bigint;
  readonly blockHash: Hex;
  readonly blockTimestamp: UnixSeconds;
  readonly order: OrderPolicy;
  readonly status: OrderStatus;
  readonly releasedBudget: TokenAmount;
  readonly availableToSpend: TokenAmount;
  readonly remainingBudget: TokenAmount;
  readonly walletBalance: TokenAmount;
  readonly tokenAllowance: TokenAmount;
  readonly marketState: MarketState;
  readonly balanceScope: 'WALLET_SHARED_NOT_RESERVED';
}
