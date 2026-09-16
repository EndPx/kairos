# Event index and restart recovery

## Production and reference strategies

Kairos now selects Envio HyperIndex as the production mined-history source. The public configuration, schema, handlers, verification command, and live deployment boundary are documented in [ENVIO.md](ENVIO.md).

The direct viem JSON-RPC scanner and atomically replaced JSON projection remain as a local migration oracle. They prove deterministic projection, checkpoint recovery, and reorg rebuild semantics without silently standing in for Envio or public testnet ingestion.

The scanner reads only the configured immutable policy and CRE receiver addresses. It ingests:

- `OrderCreated`;
- `OrderCancelled`;
- `ExecutionSettled`;
- `ReceiverActivated`; and
- `ReportForwarded`.

Logs are sorted by block number, transaction index, and log index before projection. Integer values are stored as decimal strings so persistence never loses precision.

## Recovery model

The state file contains chain ID, policy/receiver identity, deployment block, projected orders/fills/reports, and the last safe block number/hash. Writes use a same-directory temporary file followed by atomic rename.

On process restart, Kairos loads this checkpoint and verifies the cursor block hash before scanning new blocks. An identity mismatch or cursor hash mismatch discards the derived projection and rebuilds from the configured deployment block. No user-edited database row is needed for recovery.

The `ViemChainSource` subtracts a configurable confirmation depth from the latest block. Full rebuild is intentionally conservative for the initial narrow scope. A future high-volume deployment may replace it with bounded block checkpoints without changing projection semantics.

## Provenance boundary

Only decoded contract logs enter `PersistedIndexState`. CRE/engine WAIT and EXECUTE decisions are not chain events. `DecisionJournal` stores them in a separate file and requires `kind: OFFCHAIN_DECISION` plus an explicit `source` on every record. Optional constraint values are persisted as decimal strings for inspectable decision traces. The UI must label those records as offchain decisions and must not display them as receipts or fills.

Executor submission states are a third provenance domain. `ExecutionAttemptJournal` stores `SUBMITTED`, `CONFIRMED`, `FAILED`, and `STALE` transitions keyed by order, nonce, and proposal hash. The application validates every record and presents only the latest transition for a proposal. A submitted or confirmed record requires a public transaction hash; a pre-submission failure may legitimately have none. These records never create a fill or modify indexed spend/output. In the current environment no deployed CRE observer produces this journal, so the boundary is locally tested but not live-populated.

Event-derived `ACTIVE` is not sufficient to infer wall-clock expiry. The application must read `statusOf` from the policy at its current pinned block before presenting current lifecycle state. The index projection preserves mined history; it does not fabricate an expiry event that the contract never emitted.

## Legacy oracle configuration

Only variable names belong in environment files:

- `MONAD_RPC_URL`;
- `NEXT_PUBLIC_MONAD_CHAIN_ID`;
- `NEXT_PUBLIC_KAIROS_POLICY_ADDRESS`;
- `NEXT_PUBLIC_KAIROS_RECEIVER_ADDRESS`;
- `KAIROS_DEPLOYMENT_BLOCK`;
- `KAIROS_INDEX_PATH`; and
- `KAIROS_DECISION_JOURNAL_PATH`; and
- `KAIROS_EXECUTION_ATTEMPT_JOURNAL_PATH`.

These variables apply only to the legacy local projector and offchain journals. The production application history path uses the server-only Envio variables documented in [ENVIO.md](ENVIO.md). No public Kairos policy or receiver deployment exists yet, so neither source has indexed public Kairos events. Local tests use ABI-encoded logs rather than an invented address.

## Verification

```text
pnpm indexer:typecheck
pnpm indexer:test
```

The test suite covers canonical out-of-order ingestion, fill/report/cancellation projection, process restart without replay, block-hash mismatch rebuild, and strict separation of offchain decisions and executor-attempt transitions from confirmed chain state.
