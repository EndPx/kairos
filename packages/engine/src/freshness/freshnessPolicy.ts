import type { KuruMarketSnapshot, PolicyStateSnapshot, SnapshotFreshness } from '../types.js';

export interface FreshnessPolicy {
  readonly maxSnapshotAgeSeconds: bigint;
  readonly proposalValiditySeconds: bigint;
}

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  maxSnapshotAgeSeconds: 10n,
  proposalValiditySeconds: 5n,
};

export function evaluateSnapshotFreshness(
  policy: PolicyStateSnapshot,
  market: KuruMarketSnapshot,
  evaluatedAt: bigint,
  config: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
): SnapshotFreshness {
  if (config.maxSnapshotAgeSeconds <= 0n || config.proposalValiditySeconds <= 0n) {
    throw new RangeError('Freshness and proposal validity windows must be positive.');
  }
  const timestampsAgree = policy.blockTimestamp === market.identity.blockTimestamp;
  const observationValid =
    market.identity.observedAt >= market.identity.blockTimestamp && market.identity.observedAt <= evaluatedAt;
  if (!timestampsAgree || !observationValid || evaluatedAt < policy.blockTimestamp) {
    return { status: 'INVALID', ageSeconds: 0n, maxAgeSeconds: config.maxSnapshotAgeSeconds };
  }
  const ageSeconds = evaluatedAt - policy.blockTimestamp;
  return {
    status: ageSeconds > config.maxSnapshotAgeSeconds ? 'STALE' : 'FRESH',
    ageSeconds,
    maxAgeSeconds: config.maxSnapshotAgeSeconds,
  };
}
