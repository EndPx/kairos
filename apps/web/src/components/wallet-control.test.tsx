import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {UnconfiguredWalletBridge} from '@/wallet/wallet-context';

import {WalletControl} from './wallet-control';

describe('WalletControl', () => {
  it('reports missing local configuration without pretending login is available', () => {
    render(
      <UnconfiguredWalletBridge>
        <WalletControl />
      </UnconfiguredWalletBridge>,
    );

    expect(screen.getByText('Wallet not configured')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /connect with privy/i})).not.toBeInTheDocument();
  });
});
