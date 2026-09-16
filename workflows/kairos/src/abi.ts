export const KURU_MARKET_ABI = [
  {
    type: 'function',
    name: 'getL2Book',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes' }],
  },
  {
    type: 'function',
    name: 'getMarketParams',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'pricePrecision', type: 'uint32' },
          { name: 'sizePrecision', type: 'uint96' },
          { name: 'baseAsset', type: 'address' },
          { name: 'baseAssetDecimals', type: 'uint256' },
          { name: 'quoteAsset', type: 'address' },
          { name: 'quoteAssetDecimals', type: 'uint256' },
          { name: 'tickSize', type: 'uint32' },
          { name: 'minSize', type: 'uint96' },
          { name: 'maxSize', type: 'uint96' },
          { name: 'takerFeeBps', type: 'uint256' },
          { name: 'makerFeeBps', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'marketState',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export const KAIROS_POLICY_ABI = [
  {
    type: 'function',
    name: 'getOrder',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'budget', type: 'uint128' },
          { name: 'spent', type: 'uint128' },
          { name: 'received', type: 'uint128' },
          { name: 'startTime', type: 'uint64' },
          { name: 'endTime', type: 'uint64' },
          { name: 'maxPerFill', type: 'uint128' },
          { name: 'minFill', type: 'uint128' },
          { name: 'maxEffectivePrice', type: 'uint128' },
          { name: 'executionNonce', type: 'uint64' },
          { name: 'cancelled', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'statusOf',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'releasedBudget',
    stateMutability: 'view',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'availableToSpend',
    stateMutability: 'view',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  ...(['executor', 'market', 'tokenIn', 'tokenOut'] as const).map((name) => ({
    type: 'function' as const,
    name,
    stateMutability: 'view' as const,
    inputs: [],
    outputs: [{ name: '', type: 'address' as const }],
  })),
  {
    type: 'function',
    name: 'priceDecimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export const ERC20_READ_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
