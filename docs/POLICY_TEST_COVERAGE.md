# M1.8 local policy test coverage

The local suite runs against Hardhat's in-memory chain and explicitly labeled `MockERC20` / `MockVenueAdapter` fixtures. These tests prove Kairos policy logic only; they are not public-chain Kuru evidence.

| Acceptance IDs | Local scenario | Result |
|---|---|---|
| AUTH-01 | Non-owner cancellation and inactive-order rejection | PASS |
| AUTH-02 | Only immutable executor may execute; no per-call target/recipient | PASS |
| POL-01 | Twelve repeated fills: each actual spend remains at or below released and total budget; next release-exceeding attempt rejects | PASS |
| POL-02 | Input above immutable per-fill cap rejects | PASS |
| POL-03 | Order whose end time is in the past derives non-active status and rejects execution | PASS |
| POL-04 | Cancelled order rejects; ERC-20 allowance remains unchanged | PASS |
| POL-05 | Adapter-reported actual input below `minFill` rejects atomically | PASS (fixture and fixed Kuru fork) |
| POL-06 | A remainder below minimum remains in the owner wallet; a sub-minimum follow-up rejects; the order remains active rather than falsely completed | PASS (local policy; UI rendering belongs to a later milestone) |
| PRICE-01/02 | Actual output producing an effective price above limit rejects; USDC-6/MON-18 scaling covered in shared tests | PASS (fixture/local arithmetic and fixed Kuru fork) |
| SET-01 | Actual input/output and unused input are measured/forwarded atomically | PASS (fixture and fixed Kuru fork) |
| SET-02 | Pre-existing adapter balances are not attributed to owner receipt or swept | PASS (fixture and fixed Kuru fork) |
| SET-03/04 | Native MON output, zero new adapter residual, and no active resting taker order | PASS (fixed Kuru fork with controlled liquidity) |
| SEC-01 | Fixture callback cannot reenter `execute` or double spend | PASS |
| SEC-02 | Reused nonce rejects | PASS |
| WAL-01/02 | Insufficient balance and revoked allowance reject before venue call | PASS |
| Accounting hardening | Same-token input/output deployment rejects; decimal exponent is bounded; exact proposed input arrival is required before adapter call | PASS (local policy) |

## Exact command and result

```text
pnpm contracts:compile
$env:RUN_KURU_FORK='1'; pnpm --filter @kairos/contracts kuru:fork:test; Remove-Item Env:RUN_KURU_FORK
pnpm contracts:test
pnpm test
pnpm typecheck
```

The M1 exit run recorded compilation, **5 passing** gated Kuru fork tests, **12 passing** default contract tests with **5 intentionally pending** fork tests, **4 passing** shared tests, and a clean TypeScript typecheck. The 2026-09-18 focused follow-up added the successful FOK full-fill case: compilation exited `0`, the expanded gated fork suite reported **6 passing**, and the current default contract suite reported **16 passing** with **6 intentionally pending** fork tests. Shared tests and typecheck were not rerun for this isolated fork-test change. See `docs/KURU_FORK_SETTLEMENT.md` and `EVIDENCE.md`.

## M1 exit interpretation

The policy-correctness portion and Kuru adapter behavior are evidenced locally against a fixed fork of the selected deployment. `docs/M1_EXIT_REVIEW.md` records M1 as complete because the written `WORKPLAN.md` exit expressly accepts documented-fork adapter evidence and does not require exact source/build equivalence or a public deployment.

Exact deployed-source/build equivalence remains unresolved and is still required before reconsidering the public execution interlock. `KuruAdapterBoundary` remains execution-disabled; the fixed-fork test uses `KuruAdapter` bound to local chain `31337`.
