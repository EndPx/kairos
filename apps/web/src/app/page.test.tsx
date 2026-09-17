import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import HomePage from './page';

vi.mock('next/navigation', () => ({usePathname: () => '/'}));

describe('HomePage', () => {
  it('presents the product boundary and routes evaluators to real evidence', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', {level: 1, name: /execute within your limits/i})).toBeInTheDocument();
    expect(screen.getByText(/unused funds stay in your wallet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: /create bounded order/i})).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name: /lifecycle-only public deployment/i})).toBeInTheDocument();
    expect(screen.getByText(/wallet writes and Kuru execution remain disabled/i)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /open order 0/i})).toHaveAttribute('href', '/orders/0');
    expect(screen.getByText(/public Kuru trades/i)).toBeInTheDocument();
    expect(screen.getByText('Not claimed')).toBeInTheDocument();
  });
});
