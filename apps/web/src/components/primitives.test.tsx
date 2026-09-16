import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {DecisionTrace, SourceBadge, StatusPill, TransactionState} from './primitives';

describe('application primitives', () => {
  it('renders lifecycle state with text rather than color alone', () => {
    render(<StatusPill status="stale" />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('labels fixture provenance explicitly', () => {
    render(<SourceBadge source="FIXTURE" />);
    expect(screen.getByText('FIXTURE')).toBeInTheDocument();
  });

  it('distinguishes a submitted wallet transaction from confirmation', () => {
    render(
      <TransactionState
        status="submitted"
        title="Approval submitted onchain"
        detail="Waiting for a receipt."
      />,
    );

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
  });

  it('explains why a deterministic decision waits', () => {
    render(
      <DecisionTrace
        decision="WAIT"
        reason="Capacity is below the minimum fill."
        source="CRE SIMULATION"
        snapshot={`0x${'9a'.repeat(32)}`}
        items={[{label: 'Capacity', value: '7.25 USDC'}]}
      />,
    );

    expect(screen.getByRole('heading', {level: 3, name: 'WAIT'})).toBeInTheDocument();
    expect(screen.getByText('Capacity is below the minimum fill.')).toBeInTheDocument();
    expect(screen.getByText('CRE SIMULATION')).toBeInTheDocument();
  });
});
