# M3 acceptance review

Date: 2026-09-17
Reviewed revision before this evidence update: `ef35f29cc1dbe1c3702477ca42f2a9a76bd43b09`

## Decision

**M3 COMPLETE against the written M3 requirements.** M3.1–M3.9 implementation, the lifecycle-only Privy approve/create/cancel/revoke proof, the written CRE simulation alternative, and live Envio-backed lifecycle recovery are evidenced. The M3 exit text requires a policy-authorized journey with real Privy actions, inspectable CRE proof, and restart survival; it does not require a public Kuru settlement or production CRE deployment.

`WORKPLAN.md` M3.3 requires the smallest valid simulation and makes deployment conditional on account/network access. `docs/ACCEPTANCE_TESTS.md` CRE-01 accepts successful CLI simulation/deployment evidence. Therefore a CRE deployment is not added as an M3 exit criterion. The absence of a deployed forwarder-to-receiver transaction remains a separately recorded limitation, not a reason to invalidate the simulation proof.

The M1 public-execution interlock remains unchanged. The only public actions added after the original review are the bounded lifecycle-only transactions documented in `docs/evidence/M3_PRIVY_LIFECYCLE.md`; they cannot execute through Kuru.

This requirements-based closure supersedes the earlier conservative M3-partial verdict, not its evidence limitations. A public adaptive settlement is still required by the final product definition of done and M5 proof package. It remains unresolved and must not be inferred from lifecycle completion, fixture EXECUTE simulation, local receiver tests, or the fixed fork.

## Workplan mapping

| Item | Implementation and evidence | Status | Limitation / next proof |
|---|---|---|---|
| M3.1 CRE receiver | Immutable forwarder/workflow/policy identity, report expiry/hash replay protection, ERC-165, and unchanged policy execution path; 4 receiver tests in the contract suite | PASS — local | Deploy only after forwarder/workflow identity and authorization are available |
| M3.2 CRE workflow | Same-block Kuru/policy acquisition, unchanged M2 engine, exact report encoding, single guarded submission attempt | PASS — local | No deployed workflow or public receiver call |
| M3.3 CRE simulation | Authenticated CLI: real Kuru fixed-block stale WAIT, explicit fixture EXECUTE/report, and real lifecycle policy + Kuru same-block `WAIT/CANCELLED`; all `submitted:false` | PASS — simulation | Deployment is conditional in M3.3; no forwarder/receiver delivery or continuous automation is claimed |
| M3.4 Indexer | Active Envio HyperIndex deployment plus canonical local recovery oracle, restart/reorg tests, separate decision provenance, and executor-attempt transitions | PASS — live lifecycle | Deployment `c6adc64` indexed two real events at 100% sync. No public fill, receiver event, or deployed CRE execution-history producer exists. |
| M3.5 Privy integration | Real pinned SDK boundary, embedded EVM wallet configuration, chain switch, balance/allowance reads, user-confirmed approve/create/cancel/revoke calls, honest missing-config gate, and an artifact-pinned lifecycle-only deployment path with two independent execution locks | PASS — lifecycle proof | Six public Monad Testnet receipts prove deployment, approve, create, cancel, and revoke through the Privy UI. Final state is `CANCELLED` with allowance zero; no execute or Kuru trade occurred. |
| M3.6 Create-order page | Integer-safe USDC/policy-price fields, cumulative schedule, separate approval, risk/custody disclosure | PASS — local and lifecycle transaction | The lifecycle create path is proven; adaptive execution remains interlocked. |
| M3.7 Orders/detail | Live Envio history plus current pinned policy lifecycle, manual-L2 display boundary, decision provenance, cancel/allowance controls | PASS — live lifecycle | Order `0` remained `CANCELLED` after full reload and matched the comparison-block contract read. No fill exists to render. |
| M3.8 Execution report | Actual settlement aggregation, weighted price, fill count/duration, separate venue fee/gas, fill-block receipt/market enrichment, explorer links, local wallet history, and server-side executor-attempt states | PASS — local / PARTIAL live | No public indexed fill or live attempt producer; nonzero venue fee cannot be reconstructed exactly from net output |
| M3.9 Application tests | Restart/reorg tests, wallet-journal restart tests, status/unit tests, one explicitly labeled form-to-report fixture journey, and a real lifecycle-only browser journey; full local regression recorded in `EVIDENCE.md` | PASS at written environment boundary | Public adaptive settlement remains final-product evidence, not a written M3 exit condition. |

## Acceptance mapping

| ID | Evidence | Status | Reason |
|---|---|---|---|
| UI-01 | Active Envio endpoint, full browser reload, pinned policy reread, atomic local restart tests, and cursor-hash rebuild tests | PASS — lifecycle recovery | The real cancelled order recovers correctly after reload; no public fill exists, so nonempty fill recovery is not claimed. |
| UI-02 | Shared integer units; submitted/confirmed/failed/stale components; WAIT separated from receipts; actual input/output, fee and gas report tests | PASS — live lifecycle / implementation | Live history is available; unavailable settlement fields remain explicit because no fill exists. The UI does not substitute fixtures. |
| PRIVY-01 | Real SDK transaction boundary, decoded calldata tests, authenticated embedded wallet, correct network display, and six public lifecycle receipts | PASS — lifecycle proof | Approve/create/cancel/revoke were confirmed through Privy on Monad Testnet; the final order is `CANCELLED` and allowance is zero. This does not prove settlement or Kuru execution. |
| CRE-01 | Pinned workflow compiles/tests; authenticated CLI simulation performs external Foundation JSON-RPC and real Kuru chain reads for fail-closed WAIT, plus a separately labeled fixture EXECUTE/report path | PASS — simulation | The slash-delimited simulation/deployment criterion is satisfied by simulation. No deployed workflow-to-receiver-to-policy transaction, public automation, or Kuru settlement is claimed. |
| DEMO-01 | Real lifecycle-only journey and Envio recovery plus labeled fixture adaptive journey | PASS for M3 | The user operated the lifecycle without manual database edits. No adaptive public Kuru settlement is claimed. |
| DEMO-02 | `ONCHAIN`, `LIVE READ`, `CRE SIMULATION`, `CRE WORKFLOW`, `REPLAY`, `FIXTURE`, and `LOCAL WALLET` provenance boundaries plus tests | PASS — implementation | Public artifacts must retain the same labels once available |

## Regression result

The following sequence completed with exit code `0` at every command:

```text
pnpm contracts:compile
pnpm contracts:test
pnpm test
pnpm typecheck
pnpm engine:test
pnpm engine:typecheck
pnpm workflow:test
pnpm workflow:typecheck
pnpm indexer:test
pnpm indexer:typecheck
pnpm web:test
pnpm web:typecheck
pnpm web:build
```

- Contract output listed 16 passing Mocha cases and 5 intentionally pending gated fixed-fork cases; Hardhat's final summary reported 21 Mocha cases.
- Shared: 1 file / 4 tests.
- Engine: 6 files / 24 tests.
- CRE workflow: 1 file / 5 tests.
- Indexer: 1 file / 4 tests.
- Web: the original acceptance run reported 14 files / 36 tests; the latest unchanged-code verification reported 14 files / 39 tests.
- All five TypeScript checks passed and the Next build emitted dynamic `/orders`, `/orders/[orderId]`, and `/reports` routes.

The 2026-09-17 targeted rerun additionally completed `pnpm workflow:typecheck`, `pnpm workflow:test`, both CRE simulations, web typecheck, 14 files / 39 web tests, and the production web build with exit `0`. Local gas-stat tests reported 5 passing cases. No source file changed before those test runs.

## Remaining external action outside M3 closure

The free Envio lifecycle pipeline and frontend recovery are complete and recorded in `docs/evidence/M3_ENVIO_LIVE.md`; the lifecycle transactions must not be repeated. To satisfy the final product definition of done and unlock live fill evidence, a separately authorized execution-capable deployment/transaction must produce a real settlement without weakening the public execution interlock. CRE deployment is optional strengthening under the written simulation alternative and still requires separate authorization. Secrets must remain in local secret storage and never enter chat or version control.
