# Envio HyperIndex integration

## Current boundary

Kairos uses Envio HyperIndex as the production boundary for mined order, fill, cancellation, and optional CRE receiver history. The earlier viem/JSON projector remains a local migration oracle and recovery test fixture; the application no longer treats it as the production history source.

The repository implementation is complete through code generation, typed handler simulation, GraphQL parsing, and frontend unavailable/sync states. It has **not** indexed a public Kairos deployment because no Kairos policy has been deployed on Monad Testnet and no public deployment transaction is authorized by the Envio scope decision.

## Version and source identity

- HyperIndex package: `envio` `3.12.0`, pinned in `packages/envio-indexer/package.json` and `pnpm-lock.yaml`.
- Network: Monad Testnet, chain ID `10143`.
- Official HyperSync support: `https://envio.dev/chains/monad-testnet`.
- Event ABIs: exact event-only copies of the compiled Hardhat artifacts for `KairosPolicy` and `KairosCreReceiver`.
- Deployment identity: supplied at runtime through environment variables; no sentinel or predicted address is accepted as live evidence.

## Configurations

`packages/envio-indexer/config.yaml` is lifecycle-only. It binds `KairosPolicy` through:

- `ENVIO_KAIROS_POLICY_ADDRESS`;
- `ENVIO_KAIROS_POLICY_START_BLOCK`; and
- `ENVIO_API_TOKEN` for HyperSync access.

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

## Live pipeline procedure

After an authorized deployment produces a confirmed policy address and deployment block:

1. Record the deployment transaction, receipt, block number/hash, bytecode, and immutable configuration.
2. Set the lifecycle environment variables and `ENVIO_API_TOKEN` locally; never commit `.env`.
3. Run `pnpm envio:codegen` in Linux/WSL.
4. Start self-hosted development with `pnpm --filter @kairos/envio-indexer dev`, or deploy the same Git revision to an approved free Envio Cloud project.
5. Query `_meta`, `Order`, `Fill`, and `CreReport`; record endpoint revision, progress/source blocks, and event count.
6. Configure the web server with `ENVIO_GRAPHQL_URL` and, only when required, its server-side admin secret.
7. Compare HyperIndex actual totals with transaction receipts and `getOrder` at the Envio progress block.
8. Capture create/cancel as the minimum real lifecycle proof. Do not claim fill analytics or CRE correlation until those public events exist.

No paid Envio plan, Cloud deployment, public contract deployment, or transaction is authorized by this document.
