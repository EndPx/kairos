import {describe, expect, it, vi} from 'vitest';

import {AuroraIntentsClient} from '../src/index.js';

describe('AuroraIntentsClient', () => {
  it('fetches supported tokens without logging or returning the API key', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({asset_stats: [], tokens: []}), {status: 200}));
    const client = new AuroraIntentsClient({apiKey: 'local-test-key', baseUrl: 'https://example.invalid', fetch: fetchMock});
    const result = await client.getSupportedTokens();
    expect(result.tokens).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('https://example.invalid/api/tokens/local-test-key', expect.any(Object));
    expect(JSON.stringify(result)).not.toContain('local-test-key');
  });

  it('reports only the HTTP status when discovery fails', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('credential details', {status: 404}));
    const client = new AuroraIntentsClient({apiKey: 'must-not-leak', baseUrl: 'https://example.invalid', fetch: fetchMock});
    await expect(client.getSupportedTokens()).rejects.toThrow('HTTP 404');
    await expect(client.getSupportedTokens()).rejects.not.toThrow('must-not-leak');
  });

  it('redacts the request URL when transport fails', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('https://example.invalid/api/tokens/must-not-leak'));
    const client = new AuroraIntentsClient({apiKey: 'must-not-leak', baseUrl: 'https://example.invalid', fetch: fetchMock});
    await expect(client.getSupportedTokens()).rejects.toThrow('failed before a response');
    await expect(client.getSupportedTokens()).rejects.not.toThrow('must-not-leak');
  });
});
