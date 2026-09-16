# Current status
Updated: 2026-09-16
Stage: M2 adaptive execution engine — in progress; M2.1 market-data adapter implemented and locally verified.

Completed:
- Final user specification copied unchanged.
- Requirements, decisions, official source index, validation checklist, acceptance tests and starting prompt prepared.
- Public GitHub repository initialized at https://github.com/EndPx/kairos (commit `01ad36d`).
- User-provided Metropolis resource update incorporated into implementation references and environment matrix; no sponsor runtime capability is implied.
- Submission-facing repository documentation translated to English; user communication remains Indonesian per `AGENTS.md`.
- M0.1 repository baseline: clean `main` tracking `origin/main`; repository currently contains handoff documentation only.
- M0.2 toolchain selection and M0.3 credential inventory recorded without installing packages or storing secrets.
- M0.4 Monad Testnet public-read probe and M0.5 Kuru deployment/token reads recorded; Kuru write compatibility remains blocked on source ABI and funded test authorization.
- M0.6 Kuru settlement experiment design and M0.7 CRE runtime capability probe recorded.
- M0.8 Privy client capability and configuration probe recorded; no user, wallet, or transaction was accessed.
- M0.9 Aurora Intents API capability probe recorded; no key, quote, deposit address, funding transfer, or lifecycle lookup was requested.
- M0 exit review completed: every required sponsor is either runtime-probed and precisely blocked, with separate evidence and a next task. No sponsor has been replaced by a mock or alternative service.
- M1 Kuru investigation: official contract/SDK revisions pinned; read-only `getMarketParams` and `getL2Book` calls are ABI-compatible with the selected proxy. Exact implementation source equivalence and write-path settlement remain blocked.
- M1.1 shared domain types and integer-unit conventions implemented and locally tested. The effective-price rule explicitly handles USDC-6 and MON-18 scales without division.
- M1.2–M1.5 generic Solidity policy core implemented and locally tested with a fixture-only venue: immutable access controls, owner lifecycle, cumulative release, proposal expiry/nonce, actual balance-delta accounting, price/minimum-fill enforcement, and reentrancy protection.
- M1.6 Kuru ABI boundary implemented with exact read-verified parameter types and quote conversion. The boundary deliberately rejects execution until Kuru deployment/source and settlement evidence is available.
- M1.8 local core suite expanded: 12 default Hardhat tests (11 fixture-policy tests plus one guarded Kuru-boundary test), 5 separately gated Kuru fork tests, and 4 shared unit tests cover access, lifecycle, cumulative release, replay, dust, price, measured settlement, reentrancy, balance, allowance, and Kuru behavior.
- Limited readiness follow-up: CRE CLI updated to `v1.34.0` and local authentication confirmed; Privy and Aurora configuration/route requirements restated without storing credentials. No M3/M4 work started.
- Kuru source-provenance follow-up: Explorer/Sourcify source paths remain unavailable, but implementation bytecode carries solc `0.8.30` metadata and an IPFS CID. The CID content was unavailable through tested public gateways, so exact build identity remains unverified.
- Policy accounting hardening: same-token input/output configurations, unsafe decimal exponents, and non-exact input receipt are rejected before an adapter can run.
- Regression history: the constructor-revert unhandled rejection did not reproduce during the `b8cac49` baseline, then reproduced after the fork suite in a longer verification sequence. Commit `166498a` resolves the race by obtaining the contract factory before starting the expected-revert deployment; it retains `InvalidAddress` and adds the previously missing `InvalidDecimals` assertion. The complete post-fix sequence is clean.
- Kuru fixed-block fork foundation: a read-only Hardhat EDR fork of Monad Testnet block `62944132` now reproduces the selected proxy, implementation bytecode, market parameters, empty source book/vault state, and official Margin Account linkage. No settlement or source-equivalence claim is made yet.
- Kuru behavioral settlement on the fixed fork: 5 adapter tests prove partial actual input/output, refund, native MON forwarding, Kuru minOut/FOK reverts, policy minFill/effective-price rollback, nonce/allowance behavior, pre-existing balance isolation, zero new residual, and no active resting taker order. All liquidity/balance mutations are local-only and documented.
- M1 local acceptance closure: a dedicated dust test proves a remainder below `minFill` stays in the owner wallet, cannot be force-filled, and does not create a false completed status.
- M1 exit review: all M1.1–M1.8 requirements and the M1-scoped acceptance IDs map to local policy evidence or the documented fixed-fork Kuru proof. `WORKPLAN.md` allows selected-deployment or documented-fork adapter evidence and does not require exact deployed-source/build equivalence for M1 closure. M1 is COMPLETE; the stronger source-equivalence/public-deployment gate remains unchanged.
- M2.1 market-data adapter: the engine package decodes ABI `bytes`, parses Kuru's integer L2 layout, preserves full snapshot provenance, validates identity/tick/order invariants, and conservatively excludes separately sourced AMM vault liquidity. A recorded raw RPC response from fixed block `62944132` is covered by a replay test.
- M2.2 liquidity capacity: the manual-ask estimator walks integer levels, applies conservative quote/output rounding and Kuru's aggregate output-fee ceiling, enforces cumulative effective-average price, and emits an auditable per-level trace. Thin/deep, partial input, average-price, and nonzero-fee fixtures pass.

Unverified:
- Exact Kuru deployed-source/build equivalence, a public Kairos adapter deployment, and any public Kuru execution transaction.
- M2.3–M2.6 policy reader, decisions, freshness/retry, and engine acceptance behavior; plus the CRE, Privy, Aurora, UI, and end-to-end groups assigned to later milestones.
- Full primary-track rules and prize-stacking.
- Submission visual design and the final deployed-product evidence package.

Next:
Implement M2.3 policy-state reader with one pinned block identity for order, lifecycle, release, balance, allowance, and market-state reads; do not reserve wallet capacity per order.

Do not report product ready, integration passed or tests passed based on this file.
