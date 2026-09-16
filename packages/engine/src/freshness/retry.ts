export interface RetryPolicy {
  readonly requestTimeoutMs: number;
  readonly maxAttempts: number;
  readonly initialBackoffMs: number;
  readonly backoffMultiplier: number;
  readonly maxBackoffMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  requestTimeoutMs: 2_000,
  maxAttempts: 3,
  initialBackoffMs: 250,
  backoffMultiplier: 2,
  maxBackoffMs: 1_000,
};

export interface RetryContext {
  readonly attempt: number;
  readonly signal: AbortSignal;
}

export interface RetryResult<T> {
  readonly value: T;
  readonly attempts: number;
  readonly retryDelaysMs: readonly number[];
}

export class RetryExhaustedError extends Error {
  readonly attempts: number;
  readonly retryDelaysMs: readonly number[];

  constructor(attempts: number, retryDelaysMs: readonly number[]) {
    super('Data source failed after the configured retry attempts.');
    this.name = 'RetryExhaustedError';
    this.attempts = attempts;
    this.retryDelaysMs = retryDelaysMs;
  }
}

function validatePolicy(policy: RetryPolicy): void {
  if (
    !Number.isSafeInteger(policy.requestTimeoutMs) ||
    policy.requestTimeoutMs <= 0 ||
    !Number.isSafeInteger(policy.maxAttempts) ||
    policy.maxAttempts <= 0 ||
    !Number.isSafeInteger(policy.initialBackoffMs) ||
    policy.initialBackoffMs < 0 ||
    !Number.isFinite(policy.backoffMultiplier) ||
    policy.backoffMultiplier < 1 ||
    !Number.isSafeInteger(policy.maxBackoffMs) ||
    policy.maxBackoffMs < 0
  ) {
    throw new RangeError('Retry policy contains invalid values.');
  }
}

const defaultSleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function runWithRetry<T>(
  operation: (context: RetryContext) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  sleep: (milliseconds: number) => Promise<void> = defaultSleep,
): Promise<RetryResult<T>> {
  validatePolicy(policy);
  const retryDelaysMs: number[] = [];

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout.'));
      }, policy.requestTimeoutMs);
    });

    try {
      const value = await Promise.race([operation({ attempt, signal: controller.signal }), timeout]);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      return { value, attempts: attempt, retryDelaysMs };
    } catch {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      controller.abort();
      if (attempt === policy.maxAttempts) throw new RetryExhaustedError(attempt, retryDelaysMs);
      const delay = Math.min(
        policy.maxBackoffMs,
        Math.floor(policy.initialBackoffMs * policy.backoffMultiplier ** (attempt - 1)),
      );
      retryDelaysMs.push(delay);
      await sleep(delay);
    }
  }

  throw new RetryExhaustedError(policy.maxAttempts, retryDelaysMs);
}
