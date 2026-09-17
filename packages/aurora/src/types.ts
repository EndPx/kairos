export interface AuroraToken {
  readonly assetId: string;
  readonly decimals: number;
  readonly blockchain: string;
  readonly symbol: string;
  readonly price: number;
  readonly priceUpdatedAt: string;
  readonly contractAddress?: string;
}

export interface SupportedTokensResponse {
  readonly tokens: readonly AuroraToken[];
  readonly assetStatsCount: number;
}

export type DestinationCompatibility =
  | {
      readonly kind: 'EXACT_MATCH';
      readonly token: AuroraToken;
    }
  | {
      readonly kind: 'CHAIN_WITHOUT_EXACT_TOKEN';
      readonly chainTokens: readonly AuroraToken[];
    }
  | {
      readonly kind: 'CHAIN_NOT_DISCOVERED';
    };

export interface RouteProbeResult {
  readonly destination: DestinationCompatibility;
  readonly sourceMatches: readonly AuroraToken[];
}
