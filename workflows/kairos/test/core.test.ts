import { decodeAbiParameters, encodeFunctionResult, type Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import { KURU_MARKET_ABI } from '../src/abi.js';
import type { SerializedAcquisition } from '../src/acquisition.js';
import { workflowConfigSchema, type WorkflowConfig } from '../src/config.js';
import { evaluateAcquisition, serializableTrace } from '../src/core.js';

const MARKET = '0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9';
const TOKEN_IN = '0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570';
const BLOCK_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const word = (value: bigint) => value.toString(16).padStart(64, '0');

function config(overrides: Partial<WorkflowConfig> = {}): WorkflowConfig {
  return workflowConfigSchema.parse({
    schedule: '0 */5 * * * *',
    chainSelectorName: 'monad-testnet',
    chainId: '10143',
    rpcUrl: 'https://rpc.example.test',
    blockTag: '0x64',
    marketAddress: MARKET,
    policyAddress: '0x1000000000000000000000000000000000000001',
    receiverAddress: '0x2000000000000000000000000000000000000002',
    orderId: '1',
    gasLimit: '750000',
    marketDataSource: 'RPC_L2',
    policySource: 'FIXTURE_POLICY',
    fixturePolicy: {
      owner: '0x3000000000000000000000000000000000000003',
      executor: '0x2000000000000000000000000000000000000002',
      tokenIn: TOKEN_IN,
      tokenOut: '0x0000000000000000000000000000000000000000',
      recipient: '0x3000000000000000000000000000000000000003',
      budget: '100000000',
      spent: '0',
      received: '0',
      startTime: '900',
      endTime: '2000',
      maxPerFill: '10000000',
      minFill: '5000000',
      maxEffectivePrice: '10000000',
      executionNonce: '7',
      cancelled: false,
      releasedBudget: '100000000',
      availableToSpend: '100000000',
      walletBalance: '100000000',
      tokenAllowance: '100000000',
    },
    submitReports: false,
    sourceRevision: 'test fixture',
    ...overrides,
  });
}

function acquisition(asks: ReadonlyArray<readonly [bigint, bigint]>, observedAt = 1_001n): string {
  const payload = `0x${[100n, 0n, ...asks.flatMap(([price, size]) => [price, size])].map(word).join('')}` as Hex;
  const marketParams = {
    pricePrecision: 100_000_000,
    sizePrecision: 10_000_000_000n,
    baseAsset: '0x0000000000000000000000000000000000000000',
    baseAssetDecimals: 18n,
    quoteAsset: TOKEN_IN,
    quoteAssetDecimals: 6n,
    tickSize: 100,
    minSize: 2_000_000_000_000n,
    maxSize: 2_000_000_000_000_000_000n,
    takerFeeBps: 0n,
    makerFeeBps: 0n,
  } as const;
  const value: SerializedAcquisition = {
    proofKind: 'LIVE_RPC_WITH_FIXTURE_POLICY',
    block: { number: '0x64', hash: BLOCK_HASH, timestamp: '0x3e8' },
    observedAt: observedAt.toString(),
    l2Result: encodeFunctionResult({ abi: KURU_MARKET_ABI, functionName: 'getL2Book', result: payload }),
    marketParamsResult: encodeFunctionResult({
      abi: KURU_MARKET_ABI,
      functionName: 'getMarketParams',
      result: marketParams,
    }),
    marketStateResult: encodeFunctionResult({ abi: KURU_MARKET_ABI, functionName: 'marketState', result: 0 }),
  };
  return JSON.stringify(value);
}

describe('Kairos CRE workflow core', () => {
  it('reuses the M2 engine to produce an ABI-exact executable report', () => {
    const result = evaluateAcquisition(config(), acquisition([[5_000_000n, 4_000_000_000_000n]]), 1_002n);

    expect(result.proofKind).toBe('LIVE_RPC_WITH_FIXTURE_POLICY');
    expect(result.decision.kind).toBe('EXECUTE');
    expect(result.decision.proposal?.nonce).toBe(7n);
    expect(result.reportPayload).toHaveLength(2 + 192 * 2);
    const decoded = decodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint128' },
        { type: 'uint128' },
        { type: 'bytes32' },
      ],
      result.reportPayload!,
    );
    expect(decoded[0]).toBe(1n);
    expect(decoded[1]).toBe(7n);
    expect(decoded[3]).toBe(10_000_000n);
    expect(decoded[5]).toBe(BLOCK_HASH);
  });

  it('returns WAIT and no report for an empty manual book', () => {
    const result = evaluateAcquisition(config(), acquisition([]), 1_002n);
    expect(result.decision.kind).toBe('WAIT');
    expect(result.decision.reason).toBe('INSUFFICIENT_LIQUIDITY');
    expect(result.reportPayload).toBeUndefined();
  });

  it('fails closed on stale RPC data', () => {
    const result = evaluateAcquisition(config(), acquisition([[5_000_000n, 4_000_000_000_000n]], 1_001n), 1_011n);
    expect(result.decision.kind).toBe('WAIT');
    expect(result.decision.reason).toBe('STALE_MARKET_DATA');
    expect(result.reportPayload).toBeUndefined();
  });

  it('serializes deterministic evidence with explicit estimator coverage', () => {
    const result = evaluateAcquisition(config(), acquisition([]), 1_002n);
    const traces = Array.from({ length: 10 }, () => serializableTrace(result, 120, false));
    expect(new Set(traces).size).toBe(1);
    expect(JSON.parse(traces[0]!)).toMatchObject({
      proofKind: 'LIVE_RPC_WITH_FIXTURE_POLICY',
      submitted: false,
      estimatorCoverage: { manualL2: 'INCLUDED', ammVault: 'EXCLUDED' },
    });
  });

  it('rejects malformed addresses before a workflow can start', () => {
    expect(() => config({ marketAddress: 'not-an-address' })).toThrow();
  });
});
