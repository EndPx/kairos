import { unixSeconds } from '@kairos/shared';
import { decideExecution } from './decisionEngine.js';
import { DEFAULT_RETRY_POLICY, RetryExhaustedError, runWithRetry, type RetryContext, type RetryPolicy } from '../freshness/retry.js';
import type { AdaptiveDecision, KuruMarketSnapshot, PolicyStateSnapshot } from '../types.js';
import type { FreshnessPolicy } from '../freshness/freshnessPolicy.js';

export interface DecisionInputs {
  readonly policy: PolicyStateSnapshot;
  readonly market: KuruMarketSnapshot;
}

export interface EvaluateAdaptiveDecisionInput {
  readonly load: (context: RetryContext) => Promise<DecisionInputs>;
  readonly evaluatedAt: bigint;
  readonly retryPolicy?: RetryPolicy;
  readonly freshnessPolicy?: FreshnessPolicy;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

export async function evaluateAdaptiveDecision(input: EvaluateAdaptiveDecisionInput): Promise<AdaptiveDecision> {
  const retryPolicy = input.retryPolicy ?? DEFAULT_RETRY_POLICY;
  try {
    const loaded = await runWithRetry(input.load, retryPolicy, input.sleep);
    return decideExecution({
      ...loaded.value,
      evaluatedAt: input.evaluatedAt,
      ...(input.freshnessPolicy === undefined ? {} : { freshnessPolicy: input.freshnessPolicy }),
    });
  } catch (error) {
    if (!(error instanceof RetryExhaustedError)) throw error;
    return {
      kind: 'WAIT',
      reason: 'STALE_MARKET_DATA',
      evaluatedAt: unixSeconds(input.evaluatedAt),
      dataStatus: 'UNAVAILABLE',
      attempts: error.attempts,
      retryDelaysMs: error.retryDelaysMs,
    };
  }
}
