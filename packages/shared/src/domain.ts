import type { PriceUnits, TokenAmount, UnixSeconds } from './units.js';

export type Address = `0x${string}`;
export type OrderId = bigint & { readonly __brand: 'OrderId' };
export type ExecutionNonce = bigint & { readonly __brand: 'ExecutionNonce' };

export type OrderStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type DecisionReason =
  | 'EXECUTE'
  | 'NOT_DUE'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'PRICE_OUT_OF_BOUNDS'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_ALLOWANCE'
  | 'STALE_MARKET_DATA'
  | 'REMAINDER_BELOW_MIN_FILL'
  | 'EXPIRED'
  | 'CANCELLED';

export interface OrderPolicy {
  readonly id: OrderId;
  readonly owner: Address;
  readonly executor: Address;
  readonly market: Address;
  readonly tokenIn: Address;
  readonly tokenOut: Address;
  readonly recipient: Address;
  readonly budget: TokenAmount;
  readonly spent: TokenAmount;
  readonly received: TokenAmount;
  readonly startTime: UnixSeconds;
  readonly endTime: UnixSeconds;
  readonly maxPerFill: TokenAmount;
  readonly minFill: TokenAmount;
  readonly maxEffectivePrice: PriceUnits;
  readonly executionNonce: ExecutionNonce;
  readonly cancelled: boolean;
}

export interface ExecutionProposal {
  readonly orderId: OrderId;
  readonly nonce: ExecutionNonce;
  readonly validUntil: UnixSeconds;
  readonly proposedInput: TokenAmount;
  readonly minOutput: TokenAmount;
  readonly snapshotId: string;
}

export interface ExecutionReceipt {
  readonly orderId: OrderId;
  readonly nonce: ExecutionNonce;
  readonly actualInput: TokenAmount;
  readonly actualOutput: TokenAmount;
  readonly returnedInput: TokenAmount;
  readonly timestamp: UnixSeconds;
  readonly transactionHash: `0x${string}`;
}

export interface Decision {
  readonly orderId: OrderId;
  readonly reason: DecisionReason;
  readonly evaluatedAt: UnixSeconds;
  readonly proposal?: ExecutionProposal;
}

export interface ContractError {
  readonly code:
    | 'UNAUTHORIZED'
    | 'INVALID_ORDER'
    | 'ORDER_NOT_ACTIVE'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'REPLAY'
    | 'PROPOSAL_STALE'
    | 'RELEASE_EXCEEDED'
    | 'BUDGET_EXCEEDED'
    | 'MIN_FILL_NOT_MET'
    | 'PRICE_LIMIT_EXCEEDED'
    | 'SETTLEMENT_MISMATCH';
  readonly message: string;
}
