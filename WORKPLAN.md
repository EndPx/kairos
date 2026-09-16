# Kairos implementation workplan

This is an execution plan, not a substitute for runtime proof. Each numbered item should normally end in one small, verified commit pushed to `main`. Do not begin the next item until its stated artifact, test result, or explicit blocker is recorded.

## M0 — Repository and compatibility foundation

### M0.1 Repository baseline
Inspect the tracked files, current branch, existing changes, local toolchain, and required documentation. Record the initial status without claiming an application exists.

### M0.2 Monorepo and toolchain decision
Choose contract, web, shared-type, workflow, test, formatter, and package-manager tooling only after current official documentation is checked. Pin versions and record the decision.

### M0.3 Environment and credential inventory
Maintain `docs/ENVIRONMENT_MATRIX.md`. List variable names only: RPC, Privy public/server credentials where applicable, CRE authentication, Aurora API access, and test-only deployer/executor keys. Add `.env.example` only after exact selected SDK requirements are known.

### M0.4 Monad platform probe
Verify selected RPC provenance, `eth_chainId`, block access, gas behavior relevant to transactions, and explorer/source-verification path. Record exact endpoint provenance, not secret values.

### M0.5 Kuru read-only probe
Verify bytecode at the selected MON/USDC market and token addresses; obtain ABI from a primary source; query market parameters and L2 book; determine token orientation, decimals, precision, tick/size bounds, and fee units. No write transaction is implied.

### M0.6 Kuru settlement experiment design
Specify the smallest authorized testnet experiment needed to prove market-order input, `minOut`, FOK, partial-fill, refund recipient, native MON output, and absence of residual venue balance. Do not run it until wallet/funds authorization exists.

### M0.7 CRE capability probe
Pin CRE CLI, SDK, and template versions. Verify authentication, simulation capability, target-network support, forwarder address, receiver requirements, and deployment access. Distinguish simulation proof from a deployed workflow.

### M0.8 Privy capability probe
Verify the selected chain configuration and embedded-wallet transaction path. Establish the exact UI/client flow for approve, create, cancel, and revoke; do not claim sponsorship or batching before proof.

### M0.9 Aurora route probe
Verify a product-specific source chain, destination chain, input asset, exact destination token contract, quotes, status lifecycle, expiry, and refund behavior. Explicitly record a Kuru/Aurora environment mismatch if it exists.

### M0 exit
Every sponsor is either runtime-verified for its narrow probe or precisely blocked with an evidence record and an independent next task.

## M1 — Policy and execution core

### M1.1 Shared domain types and unit conventions
Define order, proposal, decision, receipt, lifecycle, and error types. Establish integer units, decimal conversion, conservative rounding, and explicit effective-price formulas.

### M1.2 Contract access model
Implement immutable or explicitly governed allowed market/token/recipient/executor controls. Define owner authority and ensure no executor can redirect funds or invoke arbitrary calls.

### M1.3 Order creation and lifecycle
Implement owner-only create/cancel behavior, order identifiers, active/completed/cancelled/expired derivation, events, and read methods. Cancellation must not alter ERC-20 allowance.

### M1.4 Cumulative release policy
Implement bounded linear release, remaining-budget calculation, per-fill limit, strict expiry, and documented deadline-boundary rounding. Test repeated fills cannot exceed released budget or total budget.

### M1.5 Proposal provenance and replay protection
Implement proposal expiry, execution nonce, sender verification, replay handling, and idempotent/explicit duplicate rejection.

### M1.6 Kuru adapter boundary
Implement the minimal, ABI-verified Kuru interface and a restricted adapter. Account for the actual token orientation and native-MON path only after M0 evidence supports it.

### M1.7 Atomic settlement accounting
Measure relevant input/output balance deltas, enforce actual `minFill` and effective price, return unused input, forward output, prevent residual balances, and protect reentrancy.

### M1.8 Core test suite
Add unit/property/invariant tests for AUTH-01/02, POL-01–06, PRICE-01/02, SET-01–04, SEC-01/02, and WAL-01/02. Fixtures remain explicitly labeled.

### M1 exit
Policy correctness is independently proven in local tests and Kuru adapter behavior is evidenced against the selected deployment or a documented fork.

## M2 — Adaptive execution engine

### M2.1 Market-data adapter
Parse the verified Kuru L2 format and market params into normalized integer-price/size levels. Preserve snapshot time and source identity.

### M2.2 Liquidity-capacity calculation
Walk executable levels within the user’s effective-price limit; incorporate fee/precision rules only when verified. Produce estimated input, output, capacity, and calculation trace.

### M2.3 Policy-state reader
Read order state, released budget, wallet balance, allowance, lifecycle, and market status without assuming funds are reserved among multiple orders.

### M2.4 Decision engine
Calculate the minimum of release, remaining budget, max fill, balance, allowance, and capacity. Emit `EXECUTE` or an explicit reason: not due, liquidity, price, balance, allowance, stale data, dust, expired, or cancelled.

### M2.5 Freshness and retry policy
Set an evidence-backed maximum snapshot age, failure behavior, retry/backoff, and proposal validity window. Missing/stale data must produce `WAIT`, never a blind transaction.

### M2.6 Engine tests
Implement thin/deep book, price-bound, rounding, stale/API failure, capacity-below-minimum, balance contention, and deterministic replay tests for ENG-01–03.

### M2 exit
The engine produces auditable proposals and wait decisions while the contract remains the final policy authority.

## M3 — CRE, Privy, indexer, and application

### M3.1 CRE receiver
Implement the documented receiver interface, forwarder restriction, workflow identity validation, report decoding, expiry, nonce, and eventing. Test stale and duplicate reports.

### M3.2 CRE workflow
Build workflow steps for policy read, external/market data acquisition, deterministic proposal computation, report generation, and retry-safe submission. Pin the template/SDK revision.

### M3.3 CRE simulation and deployment proof
Run the smallest valid simulation, capture artifact output, then separately perform deployment only if account/network access permits. Never describe simulation as continuous live automation.

### M3.4 Event index and recovery
Choose one indexer strategy; ingest orders, fills, cancellation, and reports; recover chain state after refresh/restart; keep offchain decisions clearly separate from events.

### M3.5 Privy application integration
Implement embedded login, network display, balances, approval, create, cancel, and revoke transactions. Surface wallet transaction states truthfully.

### M3.6 Create-order page
Validate fields client-side using integer conversion rules; show authorization, schedule, and risk summary. Never promise a guarantee of completion or best price.

### M3.7 Orders and detail pages
Render onchain lifecycle/progress, wallet availability, market snapshot, decision trace, receipt history, cancellation, and allowance management.

### M3.8 Execution-report page
Show actual input/output, weighted average price, trading fee and gas separately, fill count, duration, failed transactions, and explorer links.

### M3.9 Application tests
Implement refresh/restart, unit/status clarity, and complete-user-journey tests for UI-01/02, PRIVY-01, CRE-01, and DEMO-01/02 where environment access permits.

### M3 exit
Users can complete the policy-authorized journey with real Privy actions and inspectable CRE proof; state survives application restart.

## M3-Envio — HyperIndex onchain history and aggregates

This sponsor-specific submilestone extends M3 without changing the status or exit criteria of M1, M2, or the existing M3 items. Envio becomes the production source for mined onchain history; the policy contract remains the authority for current transaction-critical state.

### M3-E.1 Event and deployment identity
Derive indexed events from the compiled policy and receiver ABIs. Bind the indexer to Monad Testnet `10143`, explicit deployed contract addresses, and their actual deployment start blocks. Keep lifecycle-only and execution-capable deployments as separate evidence identities.

### M3-E.2 HyperIndex schema and handlers
Pin the Envio version and add public `config.yaml`, `schema.graphql`, and typed handlers. Model Order, Fill, and integer execution aggregates from event fields that actually exist. Add CRE report entities or correlations only when the receiver events contain sufficient identity fields.

### M3-E.3 Deterministic aggregation
Compute cumulative actual input, actual output, returned input, fill count, and quantity-weighted effective price from `ExecutionSettled` integer units. Preserve block, transaction, log, nonce, and snapshot provenance. Never derive settlement facts from a report alone.

### M3-E.4 Ordering, duplicates, reorgs, and lag
Use verified HyperIndex ordering, entity IDs, and reorg behavior. Make event processing idempotent, expose index health/head metadata, and render lag or unavailable-data states instead of substituting fixtures.

### M3-E.5 Application data boundary
Replace the production JSON event-history source for `/orders`, `/orders/[orderId]`, and `/reports` with the Envio query boundary. Retain pinned contract reads for current lifecycle, release, wallet balance, allowance, and other values required before transactions. Keep WAIT decisions and execution-attempt records in explicitly offchain journals.

### M3-E.6 Deployment and live proof
Run locally or deploy to Envio Cloud only with an approved free plan and credential kept outside Git. Index real Monad Testnet events from a valid Kairos deployment, compare aggregates with receipts and contract state at a named block, and capture a reproducible frontend query path.

### M3-E.7 End-to-end tests and demo evidence
Test handlers, duplicate delivery, out-of-order fixtures, integer aggregation, endpoint failure, indexing lag, and frontend empty/error/ready states. Record a real create/cancel flow as the minimum initial proof; do not claim fill analytics or CRE correlation until those events exist publicly.

### M3-Envio exit
The public repository contains the Envio configuration, schema, and handlers; a live or reproducibly self-hosted pipeline indexes real Monad Testnet Kairos events; core application history consumes it; integer aggregates match named receipts and contract state; and an end-to-end demo is reproducible without fixture substitution.

## M4 — Aurora funding journey

### M4.1 Funding API integration
Implement quote/deposit-address/order creation only for a verified Aurora product and route. Persist idempotency/reference identifiers without secrets.

### M4.2 Funding state machine
Represent quoted, pending, settled, failed, expired, and refunded states. Refreshing or retrying cannot create duplicate funding orders or Kairos orders.

### M4.3 Wallet-arrival verification
Verify actual destination token balance and exact contract before enabling it for Kairos. Arrival does not auto-create approval or execution authority.

### M4.4 Cross-chain proof
With explicit authorization for a real transfer, capture source/destination receipts, actual amount, status history, and subsequent Kairos use. Otherwise retain a clearly labeled blocked test plan.

### M4 exit
A real supported Aurora route funds the user wallet and its settlement/refund state is accurately represented before use in Kairos.

## M5 — Verification and submission readiness

### M5.1 Full regression and security review
Run the acceptance matrix, contract tests, adapter tests, workflow tests, and E2E journeys. Resolve failures before adding features.

### M5.2 Deployment and verification
Deploy only with explicit authorization; verify source and record chain, contract addresses, and immutable/admin controls. Do not spend real money without approval.

### M5.3 Evidence audit
Link every acceptance item to a reproducible `EVIDENCE.md` record. Separate live, testnet, simulation, fork, fixture, and replay evidence.

### M5.4 UX and demo rehearsal
Validate loading, submitted, confirmed, failed, stale, cancellation, expiry, and insufficient-funds states. Rehearse the complete and failure journeys against evidence.

### M5.5 Submission package
Prepare English README, architecture, runbook, deployment/transaction references, technical video, pitch video, live link, sponsor explanations, limitations, and continuation plan.

### M5 exit
Every section-19 requirement and all required acceptance criteria are proven or transparently documented as unresolved; Kairos is never labeled complete with a sponsor requirement unproven.

## Milestone report format

For every completed item: outcome; files changed; exact test command/result/artifact; unresolved blocker; next numbered action; commit SHA and confirmed `main` push.
