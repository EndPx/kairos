import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import HomePage from './page';

describe('HomePage', () => {
  it('identifies the application while product screens are assembled', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', {level: 1, name: 'Kairos'})).toBeInTheDocument();
    expect(screen.getByText(/verified primitives/i)).toBeInTheDocument();
  });
});
