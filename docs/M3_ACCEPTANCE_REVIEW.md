# M3 acceptance review

Date: 2026-09-17
Reviewed revision before this evidence update: `1f4dbab68088d30242cf4898a8cd460dbd8c0536`

## Decision

**M3 PARTIAL.** All M3.1–M3.9 code and locally available verification are implemented. The lifecycle-only Privy approve/create/cancel/revoke proof, restart behavior, and the written CRE simulation alternative are now evidenced. The complete adaptive-execution journey and live Envio-backed application recovery are not yet proven, so lifecycle completion does not make the broader M3 or DEMO-01 complete.

`WORKPLAN.md` M3.3 requires the smallest valid simulation and makes deployment conditional on account/network access. `docs/ACCEPTANCE_TESTS.md` CRE-01 accepts successful CLI simulation/deployment evidence. Therefore a CRE deployment is not added as an M3 exit criterion. The absence of a deployed forwarder-to-receiver transaction remains a separately recorded limitation, not a reason to invalidate the simulation proof.

The M1 public-execution interlock remains unchanged. The only public actions added after the original review are the bounded lifecycle-only transactions documented in `docs/evidence/M3_PRIVY_LIFECYCLE.md`; they cannot execute through Kuru.

## Workplan mapping

| Item | Implementation and evidence | Status | Limitation / next proof |
|---|---|---|---|
| M3.1 CRE receiver | Immutable forwarder/workflow/policy identity, report expiry/hash replay protection, ERC-165, and unchanged policy execution path; 4 receiver tests in the contract suite | PASS — local | Deploy only after forwarder/workflow identity and authorization are available |
| M3.2 CRE workflow | Same-block Kuru/policy acquisition, unchanged M2 engine, exact report encoding, single guarded submission attempt | PASS — local | No deployed workflow or public receiver call |
| M3.3 CRE simulation | Authenticated CLI rerun: real Kuru fixed-block stale WAIT plus explicit fixture EXECUTE/report; `submitted:false`; handler latency `927ms` and `647ms` | PASS — simulation | Deployment was not performed because account access is unavailable and is conditional in M3.3; no forwarder/receiver delivery or continuous automation is claimed |
| M3.4 Indexer | Canonical event projection, atomic checkpoint, restart, cursor-hash rebuild, separate decision provenance, and separate executor-attempt transitions | PASS — local / PARTIAL live | A lifecycle policy and real create/cancel events exist, but Envio installation/pipeline deployment is blocked on the user-only GitHub verification step. No deployed CRE execution-history producer exists. |
| M3.5 Privy integration | Real pinned SDK boundary, embedded EVM wallet configuration, chain switch, balance/allowance reads, user-confirmed approve/create/cancel/revoke calls, honest missing-config gate, and an artifact-pinned lifecycle-only deployment path with two independent execution locks | PASS — lifecycle proof | Six public Monad Testnet receipts prove deployment, approve, create, cancel, and revoke through the Privy UI. Final state is `CANCELLED` with allowance zero; no execute or Kuru trade occurred. |
| M3.6 Create-order page | Integer-safe USDC/policy-price fields, cumulative schedule, separate approval, risk/custody disclosure | PASS — local and lifecycle transaction | The lifecycle create path is proven; adaptive execution remains interlocked. |
| M3.7 Orders/detail | Restarted index history plus current pinned policy lifecycle, manual-L2 display boundary, decision provenance, cancel/allowance controls | PASS — local / PARTIAL live | Runtime shows the truthful Envio endpoint blocker; the real lifecycle events are not yet indexed. |
| M3.8 Execution report | Actual settlement aggregation, weighted price, fill count/duration, separate venue fee/gas, fill-block receipt/market enrichment, explorer links, local wallet history, and server-side executor-attempt states | PASS — local / PARTIAL live | No public indexed fill or live attempt producer; nonzero venue fee cannot be reconstructed exactly from net output |
| M3.9 Application tests | Restart/reorg tests, wallet-journal restart tests, status/unit tests, one explicitly labeled form-to-report fixture journey, and a real lifecycle-only browser journey; full local regression recorded in `EVIDENCE.md` | PARTIAL | Live Envio recovery and a complete adaptive-execution public journey remain unproven. |

## Acceptance mapping

| ID | Evidence | Status | Reason |
|---|---|---|---|
| UI-01 | Atomic index restart without replay, cursor-hash rebuild, server reread design, and browser wallet-attempt restart test | PARTIAL | A public lifecycle order exists, but Envio-backed reload/recovery is not yet available; no public fill exists. |
| UI-02 | Shared integer units; submitted/confirmed/failed/stale components; WAIT separated from receipts; actual input/output, fee and gas report tests | PASS — implementation | The UI never uses fixture values when runtime configuration is absent. Live history remains blocked on the Envio endpoint. |
| PRIVY-01 | Real SDK transaction boundary, decoded calldata tests, authenticated embedded wallet, correct network display, and six public lifecycle receipts | PASS — lifecycle proof | Approve/create/cancel/revoke were confirmed through Privy on Monad Testnet; the final order is `CANCELLED` and allowance is zero. This does not prove settlement or Kuru execution. |
| CRE-01 | Pinned workflow compiles/tests; authenticated CLI simulation performs external Foundation JSON-RPC and real Kuru chain reads for fail-closed WAIT, plus a separately labeled fixture EXECUTE/report path | PASS — simulation | The slash-delimited simulation/deployment criterion is satisfied by simulation. No deployed workflow-to-receiver-to-policy transaction, public automation, or Kuru settlement is claimed. |
| DEMO-01 | Real lifecycle-only journey plus labeled fixture adaptive journey | PARTIAL | The user-operated deployment/approve/create/cancel/revoke path is real, but live Envio recovery and an adaptive Kuru settlement/report journey are not proven. |
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

## Required external action

To continue M3, complete the user-only GitHub sudo verification step, deploy the already repository-scoped free Envio pipeline, and prove create/cancel backfill plus frontend recovery against the named receipts and contract state. The lifecycle transactions are complete and must not be repeated. CRE deployment is not required by the written simulation alternative; it becomes relevant only for optional deployed-delivery evidence and requires a workflow identity, linked owner/access, exact receiver configuration, and separate broadcast authorization. Secrets must remain in local secret storage and never enter chat or version control.
