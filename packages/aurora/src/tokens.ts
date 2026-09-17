import type {AuroraToken, RouteProbeResult, SupportedTokensResponse} from './types.js';

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
}

function parseToken(value: unknown, index: number): AuroraToken {
  const token = record(value, `tokens[${index}]`);
  const decimals = finiteNumber(token.decimals, `tokens[${index}].decimals`);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error(`tokens[${index}].decimals is outside the supported integer range.`);
  }
  const contractAddress = token.contractAddress;
  if (contractAddress !== undefined && contractAddress !== null && typeof contractAddress !== 'string') {
    throw new Error(`tokens[${index}].contractAddress must be a string when present.`);
  }
  return {
    assetId: stringField(token.assetId, `tokens[${index}].assetId`),
    decimals,
    blockchain: stringField(token.blockchain, `tokens[${index}].blockchain`).toLowerCase(),
    symbol: stringField(token.symbol, `tokens[${index}].symbol`),
    price: finiteNumber(token.price, `tokens[${index}].price`),
    priceUpdatedAt: stringField(token.priceUpdatedAt, `tokens[${index}].priceUpdatedAt`),
    ...(typeof contractAddress === 'string' && contractAddress.length > 0 ? {contractAddress} : {}),
  };
}

export function parseSupportedTokensResponse(value: unknown): SupportedTokensResponse {
  const response = record(value, 'supported-token response');
  if (!Array.isArray(response.tokens)) throw new Error('supported-token response.tokens must be an array.');
  if (!Array.isArray(response.asset_stats)) throw new Error('supported-token response.asset_stats must be an array.');
  return {
    tokens: response.tokens.map(parseToken),
    assetStatsCount: response.asset_stats.length,
  };
}

function sameEvmAddress(left: string | undefined, right: string): boolean {
  return left !== undefined && EVM_ADDRESS.test(left) && EVM_ADDRESS.test(right) && left.toLowerCase() === right.toLowerCase();
}

export function evaluateRoute(
  tokens: readonly AuroraToken[],
  expectedDestination: {readonly blockchain: string; readonly contractAddress: string; readonly decimals: number},
  expectedSource?: {readonly blockchain: string; readonly assetId?: string},
): RouteProbeResult {
  if (!EVM_ADDRESS.test(expectedDestination.contractAddress)) throw new Error('Expected destination contract is not an EVM address.');
  const destinationChain = expectedDestination.blockchain.toLowerCase();
  const chainTokens = tokens.filter((token) => token.blockchain === destinationChain);
  const exactToken = chainTokens.find(
    (token) =>
      token.decimals === expectedDestination.decimals &&
      sameEvmAddress(token.contractAddress, expectedDestination.contractAddress),
  );
  const sourceMatches =
    expectedSource === undefined
      ? []
      : tokens.filter(
          (token) =>
            token.blockchain === expectedSource.blockchain.toLowerCase() &&
            (expectedSource.assetId === undefined || token.assetId === expectedSource.assetId),
        );
  return {
    destination:
      exactToken !== undefined
        ? {kind: 'EXACT_MATCH', token: exactToken}
        : chainTokens.length > 0
          ? {kind: 'CHAIN_WITHOUT_EXACT_TOKEN', chainTokens}
          : {kind: 'CHAIN_NOT_DISCOVERED'},
    sourceMatches,
  };
}
