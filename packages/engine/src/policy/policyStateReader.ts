import {
  Contract,
  getAddress,
  type Block,
  type BlockTag,
  type Provider,
  type Result,
} from 'ethers';
import {
  priceUnits,
  tokenAmount,
  unixSeconds,
  type Address,
  type ExecutionNonce,
  type OrderId,
  type OrderPolicy,
  type OrderStatus,
} from '@kairos/shared';
import type { Hex, MarketState, PolicyStateSnapshot } from '../types.js';

const POLICY_ABI = [
  'function executor() view returns (address)',
  'function market() view returns (address)',
  'function tokenIn() view returns (address)',
  'function tokenOut() view returns (address)',
  'function getOrder(uint256) view returns ((address owner,uint128 budget,uint128 spent,uint128 received,uint64 startTime,uint64 endTime,uint128 maxPerFill,uint128 minFill,uint128 maxEffectivePrice,uint64 executionNonce,bool cancelled))',
  'function statusOf(uint256) view returns (uint8)',
  'function releasedBudget(uint256,uint256) view returns (uint256)',
  'function availableToSpend(uint256,uint256) view returns (uint256)',
] as const;

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
] as const;

const MARKET_STATE_ABI = ['function marketState() view returns (uint8)'] as const;

export class PolicyReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyReadError';
  }
}

export interface PolicyCoreRead {
  readonly executor: Address;
  readonly market: Address;
  readonly tokenIn: Address;
  readonly tokenOut: Address;
  readonly owner: Address;
  readonly budget: bigint;
  readonly spent: bigint;
  readonly received: bigint;
  readonly startTime: bigint;
  readonly endTime: bigint;
  readonly maxPerFill: bigint;
  readonly minFill: bigint;
  readonly maxEffectivePrice: bigint;
  readonly executionNonce: bigint;
  readonly cancelled: boolean;
  readonly status: OrderStatus;
  readonly releasedBudget: bigint;
  readonly availableToSpend: bigint;
}

export interface PolicyReadSource {
  getBlock(blockTag?: BlockTag): Promise<{ number: bigint; hash: Hex; timestamp: bigint }>;
  readPolicyCore(policy: Address, orderId: bigint, timestamp: bigint, blockNumber: bigint): Promise<PolicyCoreRead>;
  readWalletBalance(token: Address, owner: Address, blockNumber: bigint): Promise<bigint>;
  readAllowance(token: Address, owner: Address, spender: Address, blockNumber: bigint): Promise<bigint>;
  readMarketState(market: Address, blockNumber: bigint): Promise<MarketState>;
}

function asAddress(value: string): Address {
  return getAddress(value) as Address;
}

function decodeOrderStatus(value: bigint): OrderStatus {
  const statuses: readonly OrderStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
  const status = statuses[Number(value)];
  if (status === undefined) throw new PolicyReadError(`Unknown Kairos order status ${value}.`);
  return status;
}

function decodeMarketState(value: bigint): MarketState {
  const states: readonly MarketState[] = ['ACTIVE', 'SOFT_PAUSED', 'HARD_PAUSED'];
  return states[Number(value)] ?? 'UNKNOWN';
}

function requireBlock(block: Block | null): { number: bigint; hash: Hex; timestamp: bigint } {
  if (block === null || block.hash === null) throw new PolicyReadError('Provider did not return a canonical block identity.');
  return { number: BigInt(block.number), hash: block.hash as Hex, timestamp: BigInt(block.timestamp) };
}

export class EthersPolicyReadSource implements PolicyReadSource {
  constructor(private readonly provider: Provider) {}

  async getBlock(blockTag: BlockTag = 'latest') {
    return requireBlock(await this.provider.getBlock(blockTag));
  }

  async readPolicyCore(policyAddress: Address, orderId: bigint, timestamp: bigint, blockNumber: bigint) {
    const policy = new Contract(policyAddress, POLICY_ABI, this.provider);
    const overrides = { blockTag: blockNumber };
    const [orderResult, statusValue, releasedBudget, availableToSpend, executor, market, tokenIn, tokenOut] =
      await Promise.all([
        policy.getFunction('getOrder')(orderId, overrides) as Promise<Result>,
        policy.getFunction('statusOf')(orderId, overrides) as Promise<bigint>,
        policy.getFunction('releasedBudget')(orderId, timestamp, overrides) as Promise<bigint>,
        policy.getFunction('availableToSpend')(orderId, timestamp, overrides) as Promise<bigint>,
        policy.getFunction('executor')(overrides) as Promise<string>,
        policy.getFunction('market')(overrides) as Promise<string>,
        policy.getFunction('tokenIn')(overrides) as Promise<string>,
        policy.getFunction('tokenOut')(overrides) as Promise<string>,
      ]);
    const order = orderResult[0] as Result;
    return {
      executor: asAddress(executor),
      market: asAddress(market),
      tokenIn: asAddress(tokenIn),
      tokenOut: asAddress(tokenOut),
      owner: asAddress(order.owner as string),
      budget: order.budget as bigint,
      spent: order.spent as bigint,
      received: order.received as bigint,
      startTime: order.startTime as bigint,
      endTime: order.endTime as bigint,
      maxPerFill: order.maxPerFill as bigint,
      minFill: order.minFill as bigint,
      maxEffectivePrice: order.maxEffectivePrice as bigint,
      executionNonce: order.executionNonce as bigint,
      cancelled: order.cancelled as boolean,
      status: decodeOrderStatus(statusValue),
      releasedBudget,
      availableToSpend,
    } satisfies PolicyCoreRead;
  }

  async readWalletBalance(token: Address, owner: Address, blockNumber: bigint) {
    return (await new Contract(token, ERC20_ABI, this.provider).getFunction('balanceOf')(owner, {
      blockTag: blockNumber,
    })) as bigint;
  }

  async readAllowance(token: Address, owner: Address, spender: Address, blockNumber: bigint) {
    return (await new Contract(token, ERC20_ABI, this.provider).getFunction('allowance')(owner, spender, {
      blockTag: blockNumber,
    })) as bigint;
  }

  async readMarketState(market: Address, blockNumber: bigint) {
    try {
      const value = (await new Contract(market, MARKET_STATE_ABI, this.provider).getFunction('marketState')({
        blockTag: blockNumber,
      })) as bigint;
      return decodeMarketState(value);
    } catch {
      return 'UNKNOWN';
    }
  }
}

export interface ReadPolicyStateInput {
  readonly source: PolicyReadSource;
  readonly policy: Address;
  readonly orderId: bigint;
  readonly blockTag?: BlockTag;
}

export async function readPolicyState(input: ReadPolicyStateInput): Promise<PolicyStateSnapshot> {
  const block = await input.source.getBlock(input.blockTag);
  const core = await input.source.readPolicyCore(input.policy, input.orderId, block.timestamp, block.number);
  const [walletBalance, tokenAllowance, marketState] = await Promise.all([
    input.source.readWalletBalance(core.tokenIn, core.owner, block.number),
    input.source.readAllowance(core.tokenIn, core.owner, input.policy, block.number),
    input.source.readMarketState(core.market, block.number),
  ]);

  if (core.spent > core.budget) throw new PolicyReadError('Onchain spent exceeds order budget.');
  const remainingBudget = core.budget - core.spent;
  if (core.releasedBudget > core.budget || core.availableToSpend > remainingBudget) {
    throw new PolicyReadError('Onchain release or availability is inconsistent with order budget.');
  }
  if (core.status === 'ACTIVE' && core.cancelled) {
    throw new PolicyReadError('Active status conflicts with cancelled order storage.');
  }

  const order: OrderPolicy = {
    id: input.orderId as OrderId,
    owner: core.owner,
    executor: core.executor,
    market: core.market,
    tokenIn: core.tokenIn,
    tokenOut: core.tokenOut,
    recipient: core.owner,
    budget: tokenAmount(core.budget),
    spent: tokenAmount(core.spent),
    received: tokenAmount(core.received),
    startTime: unixSeconds(core.startTime),
    endTime: unixSeconds(core.endTime),
    maxPerFill: tokenAmount(core.maxPerFill),
    minFill: tokenAmount(core.minFill),
    maxEffectivePrice: priceUnits(core.maxEffectivePrice),
    executionNonce: core.executionNonce as ExecutionNonce,
    cancelled: core.cancelled,
  };

  return {
    policy: input.policy,
    blockNumber: block.number,
    blockHash: block.hash,
    blockTimestamp: unixSeconds(block.timestamp),
    order,
    status: core.status,
    releasedBudget: tokenAmount(core.releasedBudget),
    availableToSpend: tokenAmount(core.availableToSpend),
    remainingBudget: tokenAmount(remainingBudget),
    walletBalance: tokenAmount(walletBalance),
    tokenAllowance: tokenAmount(tokenAllowance),
    marketState,
    balanceScope: 'WALLET_SHARED_NOT_RESERVED',
  };
}
