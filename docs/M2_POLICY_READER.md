# M2 policy-state reader

The reader obtains one canonical block number, hash, and timestamp, then pins every subsequent call to that block. It reads the Kairos order, derived status, released budget, available-to-spend value, immutable executor/market/token configuration, owner token balance, owner-to-policy allowance, and Kuru market state.

The reader calls the contract's `releasedBudget` and `availableToSpend` methods at the selected block timestamp rather than independently recreating scheduling semantics. It derives only `remainingBudget = budget - spent` and rejects internally inconsistent values. The policy contract remains the final authority.

## Shared wallet capacity

Wallet balance and allowance are account-wide observations. Every order sees the same values at a given block; the reader never subtracts another order's unexecuted budget or creates an offchain reservation. Concurrent proposals can therefore contend, and the later transaction may revert or require a fresh decision.

## Market status

The pinned Kuru source declares the public `marketState()` getter with `ACTIVE`, `SOFT_PAUSED`, and `HARD_PAUSED`. A read-only runtime probe returned `ACTIVE` at the fixed M1 block and at the probe-time latest block. If this optional getter fails on another deployment, the reader records `UNKNOWN`; the decision engine must fail closed rather than infer activity.

No transaction, deployment, signer, or public execution interlock is involved in this reader.
