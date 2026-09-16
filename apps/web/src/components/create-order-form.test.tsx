import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {UnconfiguredWalletBridge} from '@/wallet/wallet-context';

import {CreateOrderForm} from './create-order-form';

describe('CreateOrderForm', () => {
  it('shows policy risk and blocks wallet actions when sponsor configuration is absent', () => {
    render(
      <UnconfiguredWalletBridge>
        <CreateOrderForm />
      </UnconfiguredWalletBridge>,
    );

    expect(screen.getByRole('heading', {name: /execution is conditional/i})).toBeInTheDocument();
    expect(screen.getByText(/funds remain spendable elsewhere/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /approve exact amount/i})).toBeDisabled();
    expect(screen.getByRole('button', {name: /review in wallet/i})).toBeDisabled();
    expect(screen.getByText(/transactions unavailable/i)).toBeInTheDocument();
  });
});
