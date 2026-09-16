# M1 exit review — policy and execution core

Review date: 2026-09-16

Reviewed repository revision: `2135f0e5cce07f5a3df4445a01b18318b9fccf2a`

Decision: **M1 COMPLETE**

This decision applies only to the written M1 exit criteria in `WORKPLAN.md`. It does not authorize a public adapter deployment, prove exact Kuru source/build equivalence, constitute a security audit, or claim a public transaction. The public execution interlock remains in force.

## Controlling exit criteria

`WORKPLAN.md` defines M1 exit as:

1. policy correctness independently proven in local tests; and
2. Kuru adapter behavior evidenced against the selected deployment or a documented fork.

`WORKPLAN.md` M1.8 names the acceptance scope for this milestone as `AUTH-01/02`, `POL-01–06`, `PRICE-01/02`, `SET-01–04`, `SEC-01/02`, and `WAL-01/02`. The `ENG`, `CRE`, `PRIVY`, `AUR`, `UI`, and `DEMO` acceptance groups belong to later milestones and are not added to the M1 exit decision.

## M1.1–M1.8 mapping

| Workplan item | Requirement | Evidence | Status | Limitations |
|---|---|---|---|---|
| M1.1 | Shared domain types, integer units, conversions, rounding, and effective-price formula | `packages/shared/src/domain.ts`, `packages/shared/src/units.ts`, four unit tests, and `docs/UNIT_CONVENTIONS.md` | PASS | Local shared-code proof; it is not venue evidence. |
| M1.2 | Immutable/governed market, asset, recipient, and executor controls; no arbitrary redirection | Immutable `executor`, `market`, `tokenIn`, `tokenOut`, and `adapter` in `KairosPolicy`; recipient is always the order owner; `KuruAdapter` binds policy, market, quote token, precision, FOK mode, and chain | PASS | The fixed-fork adapter is bound to local chain `31337`; public deployment remains disabled. |
| M1.3 | Owner creation/cancellation, identifiers, lifecycle, events, reads, and allowance separation | `createOrder`, `cancelOrder`, `statusOf`, `getOrder`, lifecycle events, and AUTH/POL tests | PASS | There is no mutable order-update surface. Cancellation deliberately does not revoke ERC-20 allowance. |
| M1.4 | Linear cumulative release, total/remaining budget, per-fill limit, strict expiry, and floor rounding | `releasedBudget`, `availableToSpend`, execution checks, repeated-fill invariant, expiry and dust tests | PASS | Timestamp behavior is local-chain tested; UI derivation belongs to M3. |
| M1.5 | Proposal expiry, nonce, sender verification, and replay/duplicate rejection | Immutable executor check, `validUntil`, `executionNonce`, replay and stale-proposal tests | PASS | CRE forwarder/workflow identity verification is M3.1; M1 proves the core proposal boundary only. |
| M1.6 | Minimal ABI-verified restricted Kuru adapter for the evidenced token orientation and native-MON path | Pinned official ABI/revisions, read probes, `IKuruOrderBook`, `KuruAdapter`, and five tests against the selected proxy bytecode on a fixed fork | PASS | Behavioral compatibility only. No exact source equivalence, public deployment, or public transaction is claimed. |
| M1.7 | Atomic delta accounting, actual `minFill`/price, refund/output forwarding, residual isolation, and reentrancy protection | `KairosPolicy`, `KuruAdapter`, fixture tests, invariant tests, and fixed-fork partial/revert tests | PASS | Controlled fork liquidity is not evidence of live market depth or production safety. |
| M1.8 | Required M1 acceptance suite | 12 passing default contract tests, 5 passing gated fixed-fork tests, and 4 passing shared tests recorded in `EVIDENCE.md` | PASS | Existing results were inspected, not rerun for this documentation-only review. |

## Acceptance mapping

| ID | Evidence and result | Status |
|---|---|---|
| AUTH-01 | An order is owned by its creator; a non-owner cannot cancel it or spend through it. There is no update method that could mutate another owner's policy. | PASS |
| AUTH-02 | Executor, market, tokens, adapter, and chain are immutable; the execution call exposes no arbitrary target, route, token, or recipient. | PASS |
| POL-01 | Twelve repeated fills stay within cumulative release and total budget; the next excess attempt reverts. | PASS |
| POL-02 | Proposed input above the per-fill cap, released amount, or remaining budget is rejected onchain. | PASS |
| POL-03 | Strict expiry derives `EXPIRED` and rejects execution at or beyond the deadline. | PASS |
| POL-04 | A cancelled order rejects execution while ERC-20 allowance remains a separate control. | PASS |
| POL-05 | Actual input below `minFill` reverts atomically in fixture and fixed-fork tests. | PASS |
| POL-06 | A sub-minimum remainder stays in the owner's wallet and does not falsely complete the order. | PASS |
| PRICE-01 | A fixed-fork settlement above the policy's effective-price limit rolls back Kuru and Kairos state. | PASS |
| PRICE-02 | USDC-6/MON-18 scaling and conservative no-division price arithmetic are unit- and contract-tested. | PASS |
| SET-01 | The fixed fork proves partial actual input, actual output, unused-input refund, and atomic owner delivery. | PASS |
| SET-02 | Pre-existing adapter USDC and MON balances are preserved and not attributed to the fill. | PASS |
| SET-03 | Native MON output is forwarded and measured independently of the executor's gas balance. | PASS |
| SET-04 | Adapter and policy gain no new residual; adapter-to-Kuru allowance is zero; active L2 has no resting taker order after settlement. | PASS |
| SEC-01 | A fixture callback cannot reenter `execute` or double-spend. | PASS |
| SEC-02 | Duplicate nonce and expired proposal are rejected at the M1 policy boundary without extra execution. CRE report provenance remains M3.1. | PASS for M1 scope |
| WAL-01 | Spending wallet balance elsewhere produces `InsufficientBalance`; funds are not modeled as reserved. | PASS |
| WAL-02 | Revoked allowance produces `InsufficientAllowance` before the venue call. | PASS |

## Fork-path and guardrail review

The gated test uses the application settlement path:

```text
owner allowance → KairosPolicy.execute → KuruAdapter.executeBuy
→ selected deployed Kuru proxy → refund/native output → order owner
```

It does not substitute a mock for Kuru. The execution reaches the selected proxy `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9` and its implementation `0x72cae0a99c19b574e8a6de558f43fc1d019c9374` on a fixed fork of Monad Testnet.

The following guardrails remain active in the fork test:

- immutable executor, market, input/output assets, adapter, and owner recipient;
- cumulative release, total budget, per-fill cap, proposal expiry, and nonce;
- owner balance and allowance checks;
- exact input receipt, per-call adapter allowance, and allowance reset;
- adapter-only policy caller, chain binding, verified market configuration, and non-margin buy path;
- actual input/output deltas, actual minimum fill, proposal minimum output, effective price, refund/output forwarding, residual isolation, and reentrancy protection.

The test intentionally deploys executable `KuruAdapter` on local chain `31337` instead of calling the execution-disabled `KuruAdapterBoundary`. This bypasses only the public-deployment interlock so behavior can be tested locally; it does not bypass the policy or adapter settlement guardrails. A public chain-`10143` deployment remains prohibited pending its separate review.

### Fork identity and state changes

- Source chain: Monad Testnet `10143`.
- Local execution chain: Hardhat EDR `31337`.
- Source block: `62944132` (`0x3c07384`).
- Full source block hash: `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`.
- The source book and vault had no executable liquidity.
- `hardhat_setStorageAt` assigned the test owner `101,000,000` USDC units without changing total supply.
- A pre-funded local signer deposited `500 MON` into the deployed Kuru Margin Account.
- The test placed one real Kuru post-only ask at raw price `5,000,000` and raw size `4,000,000,000,000` (`400 MON`).
- The adapter was seeded with unrelated pre-existing balances of `1 USDC` and `2 MON`.
- Kairos policy and adapter contracts were deployed only inside the fork; no state change was broadcast publicly.

The fork therefore proves behavior of the selected deployed bytecode under controlled local state. It does not prove existing public liquidity, a public transaction, exact deployed-source/build equivalence, production deployment safety, or audit-grade security.

## Source-equivalence requirement review

No clause in `WORKPLAN.md` M1.1–M1.8, the `M1 exit` paragraph, `docs/ACCEPTANCE_TESTS.md`, or `docs/PRODUCT_SPEC_FINAL.md` makes exact deployed-source/build equivalence a condition for closing M1. The controlling M1 exit text expressly allows adapter evidence against either the selected deployment **or a documented fork**.

Repository documents do impose a narrower safety gate:

- `docs/KURU_ADAPTER_BOUNDARY.md` says replacing the public execution interlock requires implementation build provenance or verified source tied to the proxy, plus settlement evidence.
- `docs/DECISIONS.md` lists exact deployed-source/build equivalence and public adapter deployment authorization as unresolved items that must be resolved with evidence.
- `docs/KURU_COMPATIBILITY_INVESTIGATION.md` required source/deployment provenance and settlement proof before treating the earlier read-only boundary as real adapter proof. The later fixed-fork evidence resolves the behavioral settlement part, not source identity.
- `docs/POLICY_TEST_COVERAGE.md` previously kept M1 conservatively partial because it treated the public-deployment gate as an additional milestone-exit condition.

Those clauses remain binding for public enablement, but they do not amend the written `WORKPLAN.md` M1 exit or acceptance matrix. The prior conservative M1-partial interpretation is therefore superseded by this requirements-based exit review, while the public gate itself remains unchanged.

## Decision and next boundary

Both written M1 exit conditions are satisfied, so **M1 is COMPLETE**.

Kairos is ready to begin M2 planning and implementation, but this review does not start M2. Exact Kuru deployed-source/build equivalence remains an unresolved verification item. `KuruAdapterBoundary` remains execution-disabled, and no public adapter deployment or public transaction is authorized by this milestone decision.
