# M0.6 Kuru settlement experiment design

Status: designed; **not executed**. This experiment sends testnet transactions only after explicit authorization for the selected wallet and test funds.

## Objective

Prove, against the selected Kuru MON-USDC deployment, the actual behavior that Kairos's restricted adapter must enforce: input transfer, minimum output, FOK, partial fills, refund destination, native MON forwarding, and post-call residual balances.

## Preconditions

1. Pin a source ABI and verify that its market-order selector, arguments, and return/event semantics match the deployed proxy implementation.
2. Read and record `getMarketParams` and a decoded L2 snapshot; derive input/output orientation, price/size units, tick/min/max size, and fee units.
3. Deploy the Kairos test adapter only after authorization, or use a separately labeled minimal inspection adapter whose source and address are recorded.
4. Use a new testnet owner wallet with known USDC and MON balances. Record starting balances for owner, adapter, market, and recipient.
5. Capture pre-transaction transaction count and block number. Use a bounded gas limit based on a prior estimate because Monad charges gas limit rather than gas used.

## Test cases

| Case | Setup | Expected observation | Acceptance mapping |
|---|---|---|---|
| S1 full fill | Order-book capacity exceeds a deliberately small proposed input | Actual input/output deltas, recipient, fee, and all event logs reconcile | SET-01, SET-03, SET-04 |
| S2 `minOut` failure | Set `minOut` one unit above a quoted achievable output | Whole call reverts; no input/accounting/output movement except gas | PRICE-01 |
| S3 FOK failure | Request an input known to exceed capacity with FOK enabled | Whole call reverts; establish whether no input leaves adapter | SET-01, SET-04 |
| S4 non-FOK partial | Request input above currently executable capacity with FOK disabled | Measure actual consumed input, output, unused input destination, and whether any order/balance remains | SET-01, SET-04 |
| S5 adapter balance isolation | Seed an unrelated, labeled adapter token balance before execution | Current-fill accounting uses balance deltas; unrelated balance is neither credited nor swept | SET-02 |
| S6 native output | Execute the verified USDC→MON path through adapter | Native MON reaches fixed owner/recipient; adapter residual is zero; gas is separately reported | SET-03 |

## Required capture per transaction

- Chain ID, RPC provenance, market/proxy and implementation address, ABI source revision, token addresses, and decimals.
- Owner, adapter, recipient, and market balances before/after in integer units.
- Exact calldata fields, transaction hash, receipt status, gas limit, gas price, gas charged, logs, and block number.
- Decoded market events and any adapter events.
- L2 snapshot identity/time used to construct the transaction.
- Whether Kuru pulls input, accepts value, refunds value/tokens, or credits an internal/margin/resting balance.

## Stop conditions

Do not submit S1–S6 if ABI/deployment compatibility is unproven, token orientation is ambiguous, wallet funding is not authorized, or the test transaction would use real funds. A failed preflight is evidence and must be recorded; it is not permission to substitute a mock as sponsor proof.

## Decision rule

M1 may implement only the behavior directly confirmed by this experiment or a source-verified equivalent. Any non-FOK residual, refund, native-value, or margin-account behavior not measured here remains blocked and must be guarded conservatively.
