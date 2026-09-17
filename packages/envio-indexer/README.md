# Kairos Envio HyperIndex

This package projects Kairos onchain history into a GraphQL model using Envio HyperIndex 3.12.0.

## Deployment configurations

- `config.yaml` is the lifecycle-only Cloud configuration. It pins the verified Monad Testnet policy `0x3cBdB8f7D91966AD543982b76CDb71a0283d3213` from deployment block `63220558`; see `docs/evidence/M3_PRIVY_LIFECYCLE.md`.
- `config.execution.yaml` adds `KairosCreReceiver`. It is intentionally separate because a lifecycle-only policy deployment does not prove a CRE receiver or public execution path.
- `schema.graphql` and `src/handlers/kairos.ts` are shared by both configurations.

The lifecycle identity is public, receipt-verified deployment metadata and is checked in so the free Envio Cloud plan does not require paid custom environment variables. `config.execution.yaml` remains environment-bound and must not be deployed until a receiver identity is independently proven. Copy `.env.example` to `.env` only for configurations that still require variables; `.env` is ignored by Git.

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
