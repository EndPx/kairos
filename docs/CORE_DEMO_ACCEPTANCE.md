# Core acceptance demo map

Date: 2026-09-17

The single acceptance demo remains:

```text
create order → automation → Kuru fill → output to wallet
→ ExecutionSettled indexed by Envio → result shown in the frontend
```

## Evidence by step

| Step | Evidence available | Status for the single continuous demo | Missing proof |
|---|---|---|---|
| Create order | Real Privy UI transaction created order `0` on Monad Testnet; receipt and contract state match; Envio indexed `OrderCreated` | PROVEN for lifecycle-only deployment | The proven policy has a dead executor and cannot continue into settlement |
| Automation | M2 engine produces deterministic EXECUTE/WAIT traces. Authenticated CRE simulation read real Kuru and the real lifecycle policy and returned `WAIT/CANCELLED`; a separate fixture path produced an EXECUTE report | BLOCKED for the demo | No public execution-capable policy/receiver/workflow delivery exists. Fixture EXECUTE is not a transaction |
| Kuru fill | The production-shaped Kairos adapter path settled against deployed Kuru bytecode in five fixed-fork tests | PROVEN on controlled local fork only | No authorized public execution-capable deployment or public Kuru settlement |
| Output to wallet | The fixed-fork partial fill forwarded `400 MON` to the owner and returned `10 USDC`; accounting used actual deltas | PROVEN on controlled local fork only | No public wallet receipt demonstrates settlement output |
| `ExecutionSettled` indexed by Envio | Execution schema, handlers, replay guard, integer aggregates, and execution config are tested. The live lifecycle indexer is Active and synced | BLOCKED for live data | No public `ExecutionSettled` event exists; live fill and aggregate arrays correctly remain empty |
| Frontend result | `/orders`, `/orders/0`, and `/reports` consume the real lifecycle Envio endpoint and survive reload. Receipt-enriched settlement rendering is tested | PARTIAL | No public settlement event exists to render end to end |

## Verdict

**The continuous acceptance demo is BLOCKED.** Its components have lifecycle, simulation, implementation, and fixed-fork evidence, but no single order crosses every boundary on a public testnet. These boundaries must not be collapsed:

- CRE `WAIT/CANCELLED` simulation proves fail-closed automation behavior, not an executed trade.
- Fixture EXECUTE proves report construction, not Kuru liquidity or forwarder delivery.
- Fixed-fork settlement proves deployed-bytecode behavior under documented local mutations, not a public transaction.
- Live Envio create/cancel history proves lifecycle ingestion, not fill analytics or CRE correlation.
- Submission or acquisition strategy documents are not evidence of user demand.

The shortest valid completion path is to satisfy the Kuru public-execution handoff, deploy an execution-capable but narrowly bounded adapter/policy under separate authorization, run one bounded public-testnet order through the approved automation path, and let the existing Envio execution configuration backfill the resulting settlement before verifying the frontend against the same receipt and comparison block.
