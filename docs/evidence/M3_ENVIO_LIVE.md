# M3-Envio live pipeline evidence

Date: 2026-09-17

This record proves real Monad Testnet lifecycle ingestion and application consumption through Envio HyperIndex. It does not prove a fill, Kuru settlement, refund, or CRE report correlation.

## Cloud deployment identity

- Envio organization/project: `endpx/kairos`.
- Repository access: GitHub App installation restricted to `EndPx/kairos`.
- Plan: `Development` / free; no paid service was selected.
- Visibility: public, explicitly authorized by the user before project creation.
- Repository branch: `main`.
- Indexer root: `packages/envio-indexer`.
- Config: `config.yaml`, lifecycle-only.
- HyperIndex version: `3.12.0`.
- Deployment commit: `c6adc6416124d1428196a2d6b9ffc74866f5940e` (`c6adc64`).
- Network: Monad Testnet `10143`.
- Policy: `0x3cBdB8f7D91966AD543982b76CDb71a0283d3213`.
- Start block: `63220558`.
- Public GraphQL endpoint: `https://indexer.dev.hyperindex.xyz/f319caf/v1/graphql`.
- Metrics endpoint: `https://indexer.dev.hyperindex.xyz/f319caf/hyperindex/metrics`.

The free plan does not expose custom environment variables. The policy address and start block are public, receipt-verified deployment identity, so the lifecycle-only `config.yaml` pins them directly. The separate execution/receiver configuration remains environment-bound and undeployed.

## Build and indexing result

The pushed `main` commit triggered the Envio deployment. The dashboard reported:

- status `Active`;
- historical sync time `1 minute`;
- `Synced: 100%`;
- `Events Processed: 2`;
- `Addresses: 1`;
- source `HyperSync`.

A direct query through the application parser returned:

```json
{
  "meta": {
    "chainId": 10143,
    "progressBlock": "63246005",
    "eventsProcessed": "2",
    "bufferBlock": "63246005",
    "firstEventBlock": "63221326",
    "sourceBlock": "63246005",
    "readyAt": "2026-09-17T06:46:05.908+00:00",
    "isReady": true,
    "startBlock": "63220558"
  },
  "orders": [{
    "orderId": "0",
    "owner": "0xa862d3a3fd15314d1632020f22d07d346b73e665",
    "budget": "1000000",
    "startTime": "1789620060",
    "endTime": "1789623660",
    "status": "CANCELLED",
    "spent": "0",
    "received": "0",
    "fills": [],
    "reports": []
  }]
}
```

Reproducible command:

```text
pnpm --dir apps/web exec tsx -e "import {fetchEnvioHistory} from './src/lib/envio-history'; fetchEnvioHistory('<endpoint>','0x3cBdB8f7D91966AD543982b76CDb71a0283d3213').then(x=>console.log(JSON.stringify(x,null,2)))"
```

## Receipt and contract comparison

The indexed data matches the independently recorded public evidence in `docs/evidence/M3_PRIVY_LIFECYCLE.md`:

- `OrderCreated` transaction `0x0a1da531b3a160ca072eb0bc043b39b7ee0afcf999553f9e9b16a5608764ea60`, block `63221326`;
- `OrderCancelled` transaction `0x2715db8a6b9783683c356b9d889eeed6d8635e561f47515ddb5ca0de60046cd6`, block `63226866`;
- policy order `0`, owner, budget, start/end timestamps, and final `CANCELLED` status match;
- pinned contract snapshot block `63227224` reported spent `0`, received `0`, execution nonce `0`, and allowance `0`.

There is no `ExecutionSettled` event. The empty fills/reports arrays and zero aggregates are therefore the correct result, not missing-data substitution.

## Frontend E2E

The ignored local web configuration points `ENVIO_GRAPHQL_URL` to the public deployment endpoint. No token or admin secret is required or committed.

Browser verification through the real application showed:

1. `/orders` rendered order `0` from Envio as `CANCELLED`, budget `1 USDC`, actual spend `0 USDC`, and zero confirmed fills.
2. `/orders/0` combined Envio history with a contract read at the Envio comparison block. Owner, lifecycle, immutable limits, spend/output/nonce, and allowance were correct.
3. A full page reload preserved order `0` from the live pipeline; no fixture or database edit was used.
4. `/reports` consumed the same endpoint, reported lag `0`, matched live policy totals, and displayed zero fills/zero settlement values with weighted price unavailable.
5. The browser wallet journal remained visibly labeled `LOCAL WALLET`, separate from Envio chain history.

Browser console noise was limited to injected wallet-extension warnings and a development hydration warning caused by an extension-added `body.style`. No Envio query, parsing, route, or contract-read failure occurred.

## Verification before deployment

The disposable WSL/Linux verification ran both lifecycle and execution configuration code generation, two test files / seven tests, and generated TypeScript typecheck with exit code `0`. Secret scanning found no credential value in tracked files; the only matching file was the variable-name-only root `.env.example`.

## Acceptance boundary

- ENVIO-01: PASS — public config, schema, ABI, and typed handlers are committed.
- ENVIO-02: PASS — real Monad Testnet create/cancel events are indexed by a live public pipeline.
- ENVIO-03: PASS for lifecycle history — `/orders`, detail, and `/reports` consume the endpoint and retain pinned contract reads.
- ENVIO-04: PARTIAL — zero-fill lifecycle aggregates match receipts/state, but no real settlement event exists to prove nonzero actual input/output/refund/weighted price.
- ENVIO-05: PARTIAL — live readiness/lag and reload behavior are proven; duplicate/reorg behavior remains test evidence rather than an observed public reorg.

M3-Envio remains PARTIAL until real `ExecutionSettled` data proves nonzero settlement aggregates. This deployment must not be presented as Kuru execution, a CRE delivery, or an audit.
