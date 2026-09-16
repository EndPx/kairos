import {parseAbi} from 'viem';

export const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export const kairosPolicyAbi = parseAbi([
  'function cancelOrder(uint256 orderId)',
  'function createOrder(uint128 budget, uint64 startTime, uint64 endTime, uint128 maxPerFill, uint128 minFill, uint128 maxEffectivePrice) returns (uint256 orderId)',
  'function getOrder(uint256 orderId) view returns ((address owner, uint128 budget, uint128 spent, uint128 received, uint64 startTime, uint64 endTime, uint128 maxPerFill, uint128 minFill, uint128 maxEffectivePrice, uint64 executionNonce, bool cancelled))',
  'function nextOrderId() view returns (uint256)',
  'function releasedBudget(uint256 orderId, uint256 timestamp) view returns (uint256)',
  'function availableToSpend(uint256 orderId, uint256 timestamp) view returns (uint256)',
  'function statusOf(uint256 orderId) view returns (uint8)',
]);

export const kuruReadAbi = parseAbi([
  'function getL2Book() view returns (bytes)',
  'function getMarketParams() view returns (uint32 pricePrecision, uint96 sizePrecision, address baseAsset, uint256 baseAssetDecimals, address quoteAsset, uint256 quoteAssetDecimals, uint32 tickSize, uint96 minSize, uint96 maxSize, uint256 takerFeeBps, uint256 makerFeeBps)',
]);
