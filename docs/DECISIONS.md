# Decisions and interpretation boundaries
Authoritative product text: PRODUCT_SPEC_FINAL.md.

## Locked
- Kairos: Execute within your limits. Spot execution, not price prediction.
- Initial Kuru MON/USDC market, USDC input buy direction.
- Cumulative linear budget release plus liquidity-adaptive sizing.
- Funds stay in user wallet between execution transactions; no Kairos prefunding.
- ERC20 allowance and per-order policy are separate controls.
- Owner authorizes policy; executor cannot freely select destination, recipient, limits or assets.
- Onchain effective average buy-price bound uses actual settlement amounts, with explicit fees and decimals.
- Atomic settlement returns unused input and routes output to user. No residual resting order is acceptable under the agreed flow.
- Actual input accounting, minFill checked against actual fill.
- Lifecycle ACTIVE/COMPLETED/EXPIRED/CANCELLED; partial fill is progress.
- Deadline blocks execution based on timestamp even without storage update.
- Cancel order does not revoke allowance. Revoke is a separate token action.
- Remainder below minFill is not force-filled.
- Kuru real integration, CRE meaningful workflow, Privy wallet transactions, Aurora real cross-chain flow.
- No fabricated traction; testnet testing is legitimate evidence, not economic mainnet volume.

## Not yet locked / must resolve with evidence
- Language/library versions, repository structure, indexer implementation and UI visual style.
- Kuru deployed ABI, native MON handling, exact market precision, fee and refund behavior.
- CRE available networks/forwarders and account access.
- Aurora source/destination environment, asset contract, settlement/refund behavior.
- Optional minExecutionInterval. maxPerFill alone does not cap transaction frequency.
- Future multiple orders: one wallet allowance/balance is shared, not reserved per order.
- Deadline boundary: linear release plus strict expiry can leave a final remainder; test discrete units and boundary semantics. Do not claim guaranteed completion or silently introduce early-release grace.
- Price semantics are effective average price, not a guarantee for every individual match.
- Protocol fee may be zero for hackathon; do not silently introduce fees.
- Contract mutability/admin privileges: document chosen controls and their effect on wallet permissions.

## M0 recorded decisions
- 2026-09-15 — Monad Testnet (`chainId` 10143 / `0x279f`) is the selected compatibility-probe environment because the official Monad documentation lists the Foundation RPC endpoint and Kuru publishes a MON-USDC testnet market. This is not an Aurora compatibility claim.
- 2026-09-15 — Kairos must model native gas independently from USDC budget, MON output, trading fees, and actual settlement. Monad charges `gas_limit × price_per_gas`, not gas used; all user and executor transaction paths must use an explicitly bounded gas limit after measurement. Reserve-balance failures remain transaction failures, never token-budget spending.
- 2026-09-15 — M0 closes with Kuru, CRE, Privy, and Aurora precisely blocked rather than substituted or mocked. M1 may use generic, clearly labeled fixtures for policy correctness only; no sponsor-specific ABI, forwarder, route, chain support, or transaction claim may be inferred until its independent blocker is resolved.
- 2026-09-15 — M1 policy values use exact unsigned integer units. Decimal input with unsupported precision is rejected; cumulative release floors; effective BUY price is enforced with a cross-multiplied inequality that includes input, output, and price decimal scales. This protects USDC-6/MON-18 accounting from floating-point or truncation bypasses.
- 2026-09-15 — The initial policy deployment configuration is immutable: executor, market, input/output tokens, adapter, and decimal scales. Per-order recipient is fixed to its owner. This is deliberately narrower than an arbitrary routing registry so the executor cannot redirect funds. The local fixture adapter is a test double only and cannot satisfy the Kuru adapter proof gate.
- 2026-09-15 — Local policy compilation uses solc `0.8.28` with optimizer runs `200` and `viaIR: true`. `viaIR` is required by the current settlement-function structure after a documented stack-depth compiler error.

## Superseded
Escrow/deposit-to-Kairos proposals, unconditional no-custody claims, mandatory Privy session signing, forced Intents Connect, guaranteed completion/better price, and $48K as a confirmed obtainable prize are not current requirements.

## Change log
Add date, proposed change, evidence, product impact and user decision for material deviations.
