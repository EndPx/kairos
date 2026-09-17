# Envio HyperIndex integration

## Current boundary

Kairos uses Envio HyperIndex as the production boundary for mined order, fill, cancellation, and optional CRE receiver history. The earlier viem/JSON projector remains a local migration oracle and recovery test fixture; the application no longer treats it as the production history source.

The lifecycle-only Envio Cloud deployment is live on the free Development plan. It indexes the public Monad Testnet policy from its deployment block, has processed the real create/cancel events, and is consumed by `/orders`, order detail, and `/reports`. No `ExecutionSettled` or receiver event exists, so fill analytics and CRE correlation remain unproven.

## Version and source identity

- HyperIndex package: `envio` `3.12.0`, pinned in `packages/envio-indexer/package.json` and `pnpm-lock.yaml`.
- Network: Monad Testnet, chain ID `10143`.
- Official HyperSync support: `https://envio.dev/chains/monad-testnet`.
- Event ABIs: exact event-only copies of the compiled Hardhat artifacts for `KairosPolicy` and `KairosCreReceiver`.
- Lifecycle deployment identity: policy `0x3cBdB8f7D91966AD543982b76CDb71a0283d3213`, start block `63220558`, pinned in `config.yaml` only after receipt and immutable-configuration verification.
- Live deployment commit and endpoint: `c6adc6416124d1428196a2d6b9ffc74866f5940e`; `https://indexer.dev.hyperindex.xyz/f319caf/v1/graphql`.

## Configurations

`packages/envio-indexer/config.yaml` is lifecycle-only. It pins the verified public policy address and start block so the free Cloud plan does not depend on paid custom environment variables. The hosted public endpoint does not require an application API token.

`packages/envio-indexer/config.execution.yaml` additionally binds `KairosCreReceiver` through:

- `ENVIO_KAIROS_CRE_RECEIVER_ADDRESS`; and
- `ENVIO_KAIROS_CRE_RECEIVER_START_BLOCK`.

The receiver configuration must not be used to imply CRE delivery or Kuru execution unless the receiver deployment, activation identity, and public events are independently proven.

## Data model and semantics

- `Order` is created only from `OrderCreated` and updated by `OrderCancelled` and `ExecutionSettled`.
- `Fill` is created only from `ExecutionSettled` and retains block, transaction, log, nonce, and snapshot identity.
- Order aggregates store cumulative actual input, actual output, returned input, fill count, and an upward-rounded quantity-weighted price computed from cumulative integer totals.
- `ReceiverIdentity` comes only from `ReceiverActivated`.
- `CreReport` comes only from `ReportForwarded`. It links to a fill only when receiver-to-policy binding, order, nonce, transaction, and snapshot all match; otherwise the correlation remains `UNVERIFIED`.
- No time-based expiry is inferred because the contracts emit no expiry event.
- WAIT decisions and executor attempt states stay in explicit offchain journals.

HyperIndex entity IDs are deterministic and handlers return early for an already-stored event ID. `rollback_on_reorg: true` retains Envio's canonical rollback/replay behavior. The application queries official `_meta` progress and withholds partial history until `isReady` is true.

## Application query boundary

The server-only application variables are:

- `ENVIO_GRAPHQL_URL`;
- optional `ENVIO_GRAPHQL_ADMIN_SECRET` for a protected local/self-hosted Hasura endpoint.

No GraphQL credential uses a `NEXT_PUBLIC_` prefix. `/orders`, `/orders/[orderId]`, and `/reports` fail closed when the endpoint is missing, unavailable, malformed, or still syncing. They do not substitute fixture data. The application reads policy and Kuru state at the Envio progress block to compare event aggregates against a named canonical block. Transaction builders retain their independent latest-state simulation and wallet confirmation boundary.

## Local verification

HyperIndex requires Linux/WSL on Windows. The repository verification script creates a disposable WSL copy, uses checksum-pinned Node.js `v22.23.2`, validates both configurations with clearly labeled sentinel values, generates types, runs `createTestIndexer()` handlers, and type-checks generated bindings:

```powershell
wsl -d Ubuntu-24.04 -- bash "/mnt/d/path/to/kairos/scripts/verify-envio-wsl.sh" "/mnt/d/path/to/kairos/packages/envio-indexer"
```

Sentinel values test interpolation only. They are not written to Git, used for live indexing, or presented as deployment evidence.

## Live pipeline result

The authorized free Cloud setup completed on 2026-09-17:

1. GitHub App access was restricted to `EndPx/kairos`.
2. Project `endpx/kairos` uses branch `main`, root `packages/envio-indexer`, public visibility, and the Development/free plan.
3. Deployment `c6adc64` reached Active and 100% sync with two lifecycle events.
4. `_meta` returned `isReady: true`, start block `63220558`, first event block `63221326`, and two processed events.
5. Order `0` matched the create/cancel receipts and pinned contract state.
6. The application consumed the public endpoint after reload with no fixture substitution.

Full runtime evidence is in `docs/evidence/M3_ENVIO_LIVE.md`. Do not claim fill analytics or CRE correlation until those public events exist. No paid plan was selected, and no transaction beyond the previously authorized lifecycle sequence occurred.
