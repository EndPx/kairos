import {describe, expect, it} from 'vitest';

import {summarizeKuruManualBook} from './kuru-market-summary';

function word(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

describe('summarizeKuruManualBook', () => {
  it('summarizes the verified manual-L2 layout without becoming an estimator', () => {
    const payload = `0x${[
      100n,
      590_000_000n, 10_000_000_000n,
      0n,
      610_000_000n, 20_000_000_000n,
      620_000_000n, 30_000_000_000n,
    ].map(word).join('')}` as const;

    expect(summarizeKuruManualBook(payload, 100n, 100_000_000n)).toEqual({
      bidLevels: 1,
      askLevels: 2,
      bestAskPrice: '6.1',
    });
  });

  it('rejects a cross-block display snapshot', () => {
    const payload = `0x${[99n, 0n].map(word).join('')}` as const;
    expect(() => summarizeKuruManualBook(payload, 100n, 100_000_000n)).toThrow(/pinned block/i);
  });
});
