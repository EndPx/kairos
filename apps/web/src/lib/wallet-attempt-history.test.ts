import {describe, expect, it} from 'vitest';

import {
  WALLET_ATTEMPT_STORAGE_KEY,
  mergeWalletAttempt,
  parseWalletAttemptHistory,
  persistWalletAttempt,
  type WalletAttemptRecord,
} from './wallet-attempt-history';

const HASH = `0x${'1'.repeat(64)}` as const;
const attempt: WalletAttemptRecord = {
  action: 'create',
  address: '0x3000000000000000000000000000000000000003',
  chainId: 10_143,
  detail: 'Submitted onchain; waiting for a receipt.',
  hash: HASH,
  phase: 'submitted',
  recordedAt: '2026-09-16T10:00:00.000Z',
};

describe('wallet attempt history', () => {
  it('replaces the status of the same public hash instead of duplicating it', () => {
    const merged = mergeWalletAttempt([attempt], {
      ...attempt,
      phase: 'confirmed',
      detail: 'Confirmed with one block receipt.',
      recordedAt: '2026-09-16T10:00:10.000Z',
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]?.phase).toBe('confirmed');
  });

  it('persists rejected requests without inventing a transaction hash', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    };
    persistWalletAttempt(storage, {...attempt, hash: undefined, phase: 'failed'});

    const parsed = parseWalletAttemptHistory(memory.get(WALLET_ATTEMPT_STORAGE_KEY) ?? null);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).not.toHaveProperty('hash');
    expect(parsed[0]?.phase).toBe('failed');
  });

  it('fails closed for malformed or tampered browser data', () => {
    expect(parseWalletAttemptHistory('{bad json')).toEqual([]);
    expect(parseWalletAttemptHistory(JSON.stringify([{...attempt, chainId: '10143'}]))).toEqual([]);
    expect(parseWalletAttemptHistory(JSON.stringify([{...attempt, hash: 'not-a-hash'}]))).toEqual([]);
  });
});
