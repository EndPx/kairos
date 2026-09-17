import {describe, expect, it} from 'vitest';

import {evaluateRoute, parseSupportedTokensResponse} from '../src/index.js';

const KURU_USDC = '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570';

function token(overrides: Record<string, unknown> = {}) {
  return {
    assetId: 'nep141:example.omft.near',
    decimals: 6,
    blockchain: 'monad',
    symbol: 'USDC',
    price: 1,
    priceUpdatedAt: '2026-09-17T00:00:00.000Z',
    contractAddress: KURU_USDC,
    ...overrides,
  };
}

describe('Aurora route discovery', () => {
  it('requires an exact destination contract and decimals match', () => {
    const response = parseSupportedTokensResponse({asset_stats: [], tokens: [token(), token({blockchain: 'near', assetId: 'nep141:usdc.near'})]});
    const result = evaluateRoute(
      response.tokens,
      {blockchain: 'monad', contractAddress: KURU_USDC.toLowerCase(), decimals: 6},
      {blockchain: 'near', assetId: 'nep141:usdc.near'},
    );
    expect(result.destination.kind).toBe('EXACT_MATCH');
    expect(result.sourceMatches).toHaveLength(1);
  });

  it('does not accept a same-symbol token with a different contract', () => {
    const response = parseSupportedTokensResponse({
      asset_stats: [],
      tokens: [token({contractAddress: '0x0000000000000000000000000000000000000001'})],
    });
    const result = evaluateRoute(
      response.tokens,
      {blockchain: 'monad', contractAddress: KURU_USDC, decimals: 6},
      {blockchain: 'near'},
    );
    expect(result.destination.kind).toBe('CHAIN_WITHOUT_EXACT_TOKEN');
    expect(result.sourceMatches).toHaveLength(0);
  });

  it('distinguishes an undiscovered chain from a missing exact token', () => {
    const response = parseSupportedTokensResponse({asset_stats: [], tokens: [token({blockchain: 'base'})]});
    const result = evaluateRoute(
      response.tokens,
      {blockchain: 'monad', contractAddress: KURU_USDC, decimals: 6},
      {blockchain: 'base'},
    );
    expect(result.destination.kind).toBe('CHAIN_NOT_DISCOVERED');
    expect(result.sourceMatches).toHaveLength(1);
  });

  it('permits destination-only discovery before a source asset is selected', () => {
    const response = parseSupportedTokensResponse({asset_stats: [], tokens: [token()]});
    const result = evaluateRoute(response.tokens, {blockchain: 'monad', contractAddress: KURU_USDC, decimals: 6});
    expect(result.destination.kind).toBe('EXACT_MATCH');
    expect(result.sourceMatches).toEqual([]);
  });

  it('rejects malformed discovery data instead of guessing', () => {
    expect(() => parseSupportedTokensResponse({asset_stats: [], tokens: [{symbol: 'USDC'}]})).toThrow('tokens[0]');
  });
});
