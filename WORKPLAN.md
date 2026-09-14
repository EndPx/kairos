# Implementation workplan
One primary Codex task owns architecture and acceptance. This packet does not create or dispatch a new task.
If user later authorizes parallel agents: separate contracts, integrations and UI after agreeing typed interfaces; primary agent owns integration and verification. Avoid multiple agents editing the same files.

## M0 — Repository and compatibility
Inspect existing code, tooling and instructions. Select a maintainable stack based on environment; record decisions, no arbitrary version assumptions.
Deliver environment matrix and runnable integration probes. Preserve all four sponsor targets.
Exit: each integration verified or precisely blocked with evidence and independent work identified.

## M1 — Execution core
Order lifecycle, owner authorization, allowance pull, release schedule, actual accounting, price limits, Kuru adapter, atomic returns, nonce.
Exit: policy/invariant tests plus actual adapter integration evidence, not only a fake DEX.

## M2 — Adaptive engine
Market snapshot parsing, capacity with fee/precision handling, cumulative available budget, proposed fill, stale-data policy and decision reasons.
Exit: thin/deep/invalid-data scenarios and contract checks independently tested.

## M3 — CRE and application
Receiver/report verification, workflow, retries, Privy user signing, four UI pages, event indexing and resume.
Exit: user journey plus CRE simulation/deployment and duplicate-proof execution.

## M4 — Aurora
Validated source/destination route, funding status/refunds and actual subsequent Kairos use.
Exit: working flow and receipts. Environment mismatch explicitly resolved.

## M5 — Finish
Meaningful regression suite, UI verification, deterministic labeled replay if used, actual sponsor proof, docs and submission materials.
Exit: all required acceptance items and spec definition of done satisfied.

## Milestone report format
Outcome; files changed; tests and artifacts; unresolved blockers; next executable step.
Continue authorized implementation across milestones; don't ask user to reconfirm every milestone.

