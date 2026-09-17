import {AuroraIntentsClient, evaluateRoute} from '../src/index.js';

const KURU_USDC = '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570';
const apiKey = process.env.AURORA_API_KEY;
if (apiKey === undefined || apiKey.length === 0) {
  throw new Error('AURORA_API_KEY is not present in the local process environment.');
}

const sourceBlockchain = process.env.AURORA_SOURCE_BLOCKCHAIN;
const sourceAssetId = process.env.AURORA_SOURCE_ASSET_ID;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);

try {
  const response = await new AuroraIntentsClient({apiKey}).getSupportedTokens(controller.signal);
  const route = evaluateRoute(
    response.tokens,
    {blockchain: 'monad', contractAddress: KURU_USDC, decimals: 6},
    sourceBlockchain === undefined || sourceBlockchain.length === 0
      ? undefined
      : {blockchain: sourceBlockchain, ...(sourceAssetId === undefined ? {} : {assetId: sourceAssetId})},
  );
  const stablecoinCandidates = response.tokens
    .filter((token) => token.symbol.toUpperCase() === 'USDC' || token.symbol.toUpperCase() === 'USDT')
    .map(({assetId, blockchain, symbol, decimals, contractAddress}) => ({
      assetId,
      blockchain,
      symbol,
      decimals,
      ...(contractAddress === undefined ? {} : {contractAddress}),
    }));
  console.log(JSON.stringify({
    tokenCount: response.tokens.length,
    assetStatsCount: response.assetStatsCount,
    destination: route.destination,
    sourceSelection: sourceBlockchain === undefined || sourceBlockchain.length === 0 ? 'NOT_CONFIGURED' : sourceBlockchain,
    sourceMatches: route.sourceMatches,
    stablecoinCandidates,
    routeReadyForDryQuote:
      route.destination.kind === 'EXACT_MATCH' &&
      sourceBlockchain !== undefined &&
      sourceBlockchain.length > 0 &&
      route.sourceMatches.length === 1,
  }, null, 2));
} finally {
  clearTimeout(timeout);
}
