# M3 acceptance review

Date: 2026-09-16  
Reviewed revision: `3f9019bcf4ac63aed74c1e080d8c9759c4379ee5`

## Decision

**M3 PARTIAL.** All M3.1–M3.9 code and locally available verification are implemented, but the written M3 exit requires real Privy actions plus inspectable CRE proof and restart recovery. Restart behavior is locally evidenced; real Privy actions and deployed CRE-to-Kairos execution are not. Local fixtures, replays, simulations, and compiled provider boundaries do not replace those missing proofs.

The M1 public-execution interlock remains unchanged. No deployment, broadcast, wallet action, or public transaction was performed during this review.

## Workplan mapping

| Item | Implementation and evidence | Status | Limitation / next proof |
|---|---|---|---|
| M3.1 CRE receiver | Immutable forwarder/workflow/policy identity, report expiry/hash replay protection, ERC-165, and unchanged policy execution path; 4 receiver tests in the contract suite | PASS — local | Deploy only after forwarder/workflow identity and authorization are available |
| M3.2 CRE workflow | Same-block Kuru/policy acquisition, unchanged M2 engine, exact report encoding, single guarded submission attempt | PASS — local | No deployed workflow or public receiver call |
| M3.3 CRE simulation | Real Kuru fixed-block stale WAIT and explicit fixture EXECUTE/report simulations; `submitted:false` | PARTIAL | Real read is inspectable but no deployed external-to-chain execution; fixture execution is not CRE-01 completion |
| M3.4 Indexer | Canonical event projection, atomic checkpoint, restart, cursor-hash rebuild, separate decision provenance, and separate executor-attempt transitions | PASS — local | No public Kairos address or verified deployed CRE execution-history producer exists for live ingestion |
| M3.5 Privy integration | Real pinned SDK boundary, embedded EVM wallet configuration, chain switch, balance/allowance reads, user-confirmed approve/create/cancel/revoke calls, and honest missing-config gate | PARTIAL | No configured App ID/origin/test account/public contracts; no actual wallet action |
| M3.6 Create-order page | Integer-safe USDC/policy-price fields, cumulative schedule, separate approval, risk/custody disclosure | PASS — local | Transaction submission remains blocked by M3.5 external configuration |
| M3.7 Orders/detail | Restarted index history plus current pinned policy lifecycle, manual-L2 display boundary, decision provenance, cancel/allowance controls | PASS — local / PARTIAL live | Runtime shows configuration blocker without deployed addresses/index file |
| M3.8 Execution report | Actual settlement aggregation, weighted price, fill count/duration, separate venue fee/gas, fill-block receipt/market enrichment, explorer links, local wallet history, and server-side executor-attempt states | PASS — local / PARTIAL live | No public indexed fill or live attempt producer; nonzero venue fee cannot be reconstructed exactly from net output |
| M3.9 Application tests | Restart/reorg tests, wallet-journal restart tests, status/unit tests, and one explicitly labeled form-to-report fixture journey; full local regression recorded in `EVIDENCE.md` | PARTIAL | Real Privy, deployed CRE, and complete public journey tests are externally blocked |

## Acceptance mapping

| ID | Evidence | Status | Reason |
|---|---|---|---|
| UI-01 | Atomic index restart without replay, cursor-hash rebuild, server reread design, and browser wallet-attempt restart test | PARTIAL | Recovery semantics pass locally, but no public onchain Kairos order/fill state exists to recover in the application |
| UI-02 | Shared integer units; submitted/confirmed/failed/stale components; WAIT separated from receipts; actual input/output, fee and gas report tests | PASS — implementation | The UI never uses fixture values when runtime configuration is absent. Live values remain blocked with the deployment. |
| PRIVY-01 | Real SDK transaction boundary and decoded calldata tests | BLOCKED | Required actual approval/create/cancel/revoke wallet demonstration did not occur |
| CRE-01 | Pinned workflow compiles/tests; CLI simulations include a real Kuru read and an explicit fixture report | PARTIAL | No deployed workflow-to-receiver-to-policy transaction; fixture report is not external chain integration |
| DEMO-01 | Labeled fixture journey covers draft, calldata, recovered fill/WAIT, and report | BLOCKED | The required user-operated real product journey cannot complete without Privy/deployment/CRE access |
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
- Web: 14 files / 36 tests.
- All five TypeScript checks passed and the Next build emitted dynamic `/orders`, `/orders/[orderId]`, and `/reports` routes.

## Required external action

To convert M3 from PARTIAL to COMPLETE, configure the Privy public App ID/client ID locally, allow the exact application origin and embedded EVM wallet in the Privy dashboard, provide a test account, and supply deployed Kairos policy/receiver plus token/market addresses. CRE deploy access and verified forwarder/workflow identity are also required. Deployment and transaction broadcasts still require specific user authorization; secrets must be supplied through local environment configuration, never chat or version control.
