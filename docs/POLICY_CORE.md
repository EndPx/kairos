# M1.2–M1.5 policy core

## Scope and fixture boundary

`packages/contracts/src/KairosPolicy.sol` is a local policy-core implementation for the fixed initial market configuration. Its test venue is `MockVenueAdapter`, explicitly labeled fixture-only. It does not execute against Kuru and is not Kuru settlement evidence.

## Access model

The deployment configuration is immutable: executor, market, input token, output token, adapter, and decimal scales are constructor values. An executor cannot select a target, token, market, or recipient per execution. Each order is created by its owner, and output/refunds are always settled to that same owner. Only the owner may cancel its order.

The contract does not include an arbitrary-call method, a withdrawal method, a mutable recipient, or mutable venue configuration. Cancellation changes only order policy; it never changes a wallet's ERC-20 allowance.

Input and output token addresses must differ, so owner balance deltas remain attributable to one asset. Decimal exponents are bounded to `77` to prevent unsafe `10 ** decimals` arithmetic. Fee-on-transfer input is rejected before any adapter call unless the policy contract receives the exact proposed amount; the selected USDC route is therefore treated as an exact-transfer requirement.

## Lifecycle and scheduling

An order holds owner, budget/spent/received, start/end, fill bounds, price limit, nonce, and cancellation state. Derived status is `ACTIVE`, `COMPLETED`, `CANCELLED`, or `EXPIRED`. At `endTime` and later, execution is rejected strictly. `releasedBudget` floors linear cumulative release; `availableToSpend` subtracts actual previous spend. Deferred release remains available without allowing a single execution above `maxPerFill`.

## Proposal and replay controls

Only the immutable executor can submit a proposal. The proposal carries its order ID, expected nonce, expiry, requested input, minimum output, and snapshot ID. The contract rejects stale proposals, duplicate nonces, over-release, over-budget, invalid fill bounds, cancelled orders, and expired orders.

## Settlement accounting

During an execution, the policy contract pulls only the proposed ERC-20 input from the owner. The immutable adapter is approved only for that transaction's amount and its approval is reset to zero after the call. The contract measures the owner's pre/post input and output balances, requires the policy's input balance to return to its pre-call value, then records measured actual input/output—not requested input or an adapter estimate.

The fixture supplies unused input back to the owner and output directly to the owner in the same transaction. Kairos rejects mismatched adapter reports, actual input below `minFill`, output below proposal minimum, price-limit failure, and reentrant callbacks. The production Kuru adapter must reproduce these measured-delta guarantees, including native MON output, before this policy core can be considered integrated.

## Compiler configuration

Hardhat `3.16.0` uses solc `0.8.28`, optimizer runs `200`, EVM target `cancun`, and `viaIR: true`. `viaIR` was enabled after an initial `stack too deep` compile error in settlement; it is a recorded reproducibility requirement, not an optimizer claim about deployed Kuru code.
