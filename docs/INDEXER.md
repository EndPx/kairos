# Event index and restart recovery

## Selected strategy

Kairos uses a direct viem JSON-RPC log scanner and a local atomically replaced JSON projection. This is one deliberate indexer, not a collection of provider integrations. It fits the initial single-policy/single-market scope and remains replaceable behind `ChainSource` and `IndexStore` interfaces.

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

Only decoded contract logs enter `PersistedIndexState`. CRE/engine WAIT and EXECUTE decisions are not chain events. `DecisionJournal` stores them in a separate file and requires `kind: OFFCHAIN_DECISION` on every record. The UI must label those records as offchain decisions and must not display them as receipts or fills.

Event-derived `ACTIVE` is not sufficient to infer wall-clock expiry. The application must read `statusOf` from the policy at its current pinned block before presenting current lifecycle state. The index projection preserves mined history; it does not fabricate an expiry event that the contract never emitted.

## Configuration

Only variable names belong in environment files:

- `MONAD_RPC_URL`;
- `NEXT_PUBLIC_MONAD_CHAIN_ID`;
- `NEXT_PUBLIC_KAIROS_POLICY_ADDRESS`;
- `NEXT_PUBLIC_KAIROS_RECEIVER_ADDRESS`;
- `KAIROS_DEPLOYMENT_BLOCK`;
- `KAIROS_INDEX_PATH`; and
- `KAIROS_DECISION_JOURNAL_PATH`.

No public Kairos policy or receiver deployment exists yet, so the viem source has not been run against a Kairos public address. Local tests use ABI-encoded logs rather than an invented address.

## Verification

```text
pnpm indexer:typecheck
pnpm indexer:test
```

The test suite covers canonical out-of-order ingestion, fill/report/cancellation projection, process restart without replay, block-hash mismatch rebuild, and strict separation of offchain decisions.
