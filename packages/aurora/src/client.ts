import {parseSupportedTokensResponse} from './tokens.js';
import type {SupportedTokensResponse} from './types.js';

const DEFAULT_BASE_URL = 'https://intents-api.aurora.dev';

export class AuroraIntentsClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;

  constructor(options: {readonly apiKey: string; readonly baseUrl?: string; readonly fetch?: typeof fetch}) {
    if (options.apiKey.trim().length === 0) throw new Error('AURORA_API_KEY is required.');
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.#fetch = options.fetch ?? fetch;
  }

  async getSupportedTokens(signal?: AbortSignal): Promise<SupportedTokensResponse> {
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}/api/tokens/${encodeURIComponent(this.#apiKey)}`, {
        method: 'GET',
        headers: {accept: 'application/json'},
        ...(signal === undefined ? {} : {signal}),
      });
    } catch {
      throw new Error('Aurora supported-token request failed before a response was received.');
    }
    if (!response.ok) throw new Error(`Aurora supported-token request failed with HTTP ${response.status}.`);
    return parseSupportedTokensResponse(await response.json());
  }
}
