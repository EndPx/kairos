# Kairos Envio HyperIndex

This package projects Kairos onchain history into a GraphQL model using Envio HyperIndex 3.12.0.

## Deployment configurations

- `config.yaml` is the lifecycle-only configuration. It indexes `KairosPolicy` after a real Monad Testnet address and deployment block are supplied.
- `config.execution.yaml` adds `KairosCreReceiver`. It is intentionally separate because a lifecycle-only policy deployment does not prove a CRE receiver or public execution path.
- `schema.graphql` and `src/handlers/kairos.ts` are shared by both configurations.

No deployment address or block is checked in before it is observed onchain. Copy `.env.example` to `.env` and set only the variables for the selected configuration. `.env` is ignored by Git.

## Data boundaries

- `OrderCreated` and `OrderCancelled` provide event history. Current pre-transaction authority still comes from a pinned contract read.
- `ExecutionSettled` is the only source for `Fill` and actual-settlement aggregates.
- `weightedAveragePrice` is computed from cumulative integer input and output, not by averaging per-fill prices.
- Time-based expiry is not inferred by the indexer because no expiry event exists.
- `CreReport` is correlated to a fill only when the activated receiver binds the policy and the report shares the same transaction, order, nonce, and snapshot. Otherwise it remains `UNVERIFIED`.
- WAIT decisions are offchain journal records and do not belong in HyperIndex.

HyperIndex event identity plus deterministic entity IDs make normal processing idempotent. `rollback_on_reorg: true` delegates canonical-chain rollback and replay to HyperIndex. Consumers must also query Envio `_meta` before treating the endpoint as caught up.

## Verification

HyperIndex requires Linux or WSL on Windows. From PowerShell at the repository root:

```powershell
wsl -d Ubuntu-24.04 -- bash "/mnt/d/path/to/kairos/scripts/verify-envio-wsl.sh" "/mnt/d/path/to/kairos/packages/envio-indexer"
```

The script downloads a checksum-pinned Node.js 22 binary into `/tmp`, copies this package to `/tmp`, validates both configurations with sentinel deployment values, runs `createTestIndexer()` handler tests, and type-checks the generated bindings. Sentinel values are configuration tests only and are never deployment evidence.

Live local indexing additionally requires `ENVIO_API_TOKEN`, a confirmed deployment identity, and Docker. Envio Cloud deployment is a separate external action and is not authorized by this package.
