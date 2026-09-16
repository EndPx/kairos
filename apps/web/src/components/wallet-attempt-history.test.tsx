import {cleanup, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {WALLET_ATTEMPT_STORAGE_KEY, type WalletAttemptRecord} from '@/lib/wallet-attempt-history';

import {WalletAttemptHistory} from './wallet-attempt-history';

const attempt: WalletAttemptRecord = {
  action: 'create',
  address: '0x3000000000000000000000000000000000000003',
  chainId: 10_143,
  detail: 'The wallet request was rejected or the transaction could not be submitted.',
  phase: 'failed',
  recordedAt: '2026-09-16T10:00:00.000Z',
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('WalletAttemptHistory', () => {
  it('recovers a failed wallet attempt after a component restart without inventing a hash', async () => {
    window.localStorage.setItem(WALLET_ATTEMPT_STORAGE_KEY, JSON.stringify([attempt]));
    const first = render(<WalletAttemptHistory />);

    expect(await screen.findByText('create · failed')).toBeInTheDocument();
    expect(screen.getByText(attempt.detail)).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: /explorer/i})).not.toBeInTheDocument();

    first.unmount();
    render(<WalletAttemptHistory />);
    expect(await screen.findByText('create · failed')).toBeInTheDocument();
  });

  it('fails closed when local browser history is malformed', async () => {
    window.localStorage.setItem(WALLET_ATTEMPT_STORAGE_KEY, JSON.stringify([{...attempt, chainId: '10143'}]));
    render(<WalletAttemptHistory />);

    await waitFor(() => expect(screen.getByText('No local wallet attempts')).toBeInTheDocument());
    expect(screen.queryByText('create · failed')).not.toBeInTheDocument();
  });
});
