import {describe, expect, it} from 'vitest';

import {parseDeploymentMode} from './runtime-config';

describe('deployment mode', () => {
  it('fails closed when the mode is absent or unknown', () => {
    expect(parseDeploymentMode(undefined)).toBe('lifecycle-only');
    expect(parseDeploymentMode('enabled')).toBe('lifecycle-only');
  });

  it('requires the explicit execution value to enable writes', () => {
    expect(parseDeploymentMode('execution')).toBe('execution');
  });
});
