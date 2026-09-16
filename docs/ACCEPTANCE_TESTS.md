# Acceptance and proof matrix
All statuses start NOT RUN. Each item must point to EVIDENCE.md before claiming completion.

| ID | Scenario | Required result |
|---|---|---|
| AUTH-01 | Non-owner create/update/cancel | Cannot spend another user's funds or change their policy |
| AUTH-02 | Malicious executor assets/recipient/route | Cannot redirect output or call arbitrary target |
| POL-01 | Repeated fills | Actual spend never exceeds cumulative release or budget |
| POL-02 | Proposed above max/budget/schedule | Rejected independently of offchain engine |
| POL-03 | At/beyond expiry | Execution rejected; UI derived expiry correct |
| POL-04 | Cancel mined then execute | Rejected; cancellation not falsely equal allowance revocation |
| POL-05 | Actual below minFill | Transaction reverted per specification |
| POL-06 | Dust below minimum | Stays in wallet; no false fully-completed status |
| PRICE-01 | Actual output below price constraint | Entire operation reverts |
| PRICE-02 | Decimals/rounding/fees | Effective input/output constraint correct with conservative rounding |
| SET-01 | Partial input consumed | Actual accounting, leftover returned, user output delivered atomically |
| SET-02 | Pre-existing adapter balance | Not attributed to current order or swept as current refund |
| SET-03 | Native MON output | Correct forwarding and gas-independent accounting |
| SET-04 | Venue leftovers | No unintended resting order or venue balance |
| SEC-01 | Reentrant callback | No double-spend/state corruption |
| SEC-02 | Duplicate/stale report | Rejected or safely idempotent, no extra execution |
| WAL-01 | Balance spent elsewhere | Clear insufficient balance; no reserved-funds assumption |
| WAL-02 | Allowance revoked | Execution blocked, user can see cause |
| ENG-01 | Thin versus deep book | Different proposed sizes under identical remaining policy |
| ENG-02 | Stale/API failure | No blind proposal from stale/missing data |
| ENG-03 | Capacity below minimum | WAIT recorded without fake onchain event |
| CRE-01 | Real workflow | External API + chain integration, successful CLI simulation/deployment evidence |
| PRIVY-01 | Beyond login | Actual approval/create/cancel/revoke wallet transaction demonstration |
| AUR-01 | Cross-chain use | Real supported flow arrives and is used in Kairos, receipts linked |
| AUR-02 | Failure/refund states | UI accurately follows statuses; no duplicate order on retry |
| UI-01 | Refresh/restart | Onchain order/fill state recovered correctly |
| UI-02 | Units/status | Token quantities, estimated USD, gas/trading fees, WAIT/revert clearly separated |
| DEMO-01 | Complete journey | User can operate product without manual database edits |
| DEMO-02 | Evidence provenance | Real transactions, fixtures and replays labeled separately |
| ENVIO-01 | Public HyperIndex implementation | Repository contains pinned `config.yaml`, `schema.graphql`, and typed handlers derived from actual contract events |
| ENVIO-02 | Real testnet ingestion | Pipeline indexes real events from explicit Monad Testnet contract addresses and deployment start blocks |
| ENVIO-03 | Core application consumption | `/orders`, order detail, and `/reports` use Envio history/aggregates while transaction-critical current state remains pinned contract reads |
| ENVIO-04 | Settlement aggregate correctness | Integer actual input/output/refund and quantity-weighted effective price match named receipts and contract state at a comparison block |
| ENVIO-05 | Recovery and unavailable states | Duplicate processing, ordering, reorgs, indexing lag, and endpoint failure are handled without silent fixture fallback |

### M3-Envio implementation status — 2026-09-17

| ID | Status | Current evidence boundary |
|---|---|---|
| ENVIO-01 | PASS (repository implementation) | `envio` `3.12.0` is pinned; public lifecycle/execution configs, exact event ABIs, `schema.graphql`, typed handlers, and generated-type verification are committed |
| ENVIO-02 | BLOCKED | No authorized public Kairos deployment, actual address/start block, API token, or live indexed event exists |
| ENVIO-03 | PASS (implementation), BLOCKED (live query) | Application routes use the server-only Envio GraphQL boundary and pinned comparison-block reads; runtime endpoint evidence awaits ENVIO-02 |
| ENVIO-04 | PARTIAL | Fixture handler tests prove integer cumulative accounting and weighted price; named public receipts/state comparison does not exist |
| ENVIO-05 | PARTIAL | Handler replay guard, Envio reorg configuration, `_meta` lag state, endpoint-failure tests, and no-fixture UI states pass; live reorg/restart behavior awaits a pipeline |

M3-Envio remains **PARTIAL** because its exit requires real Monad Testnet ingestion and reproducible end-to-end evidence.

Use unit/property or invariant tests for accounting and policy; adapter integration tests on the selected deployment/fork; E2E tests for user journeys.
Fix failures before broadening features. Do not equate test mocks with completed sponsor acceptance.
Final definition of done remains section 19 of PRODUCT_SPEC_FINAL.md.
