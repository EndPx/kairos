# CRE adaptive execution workflow

## Boundary

`workflows/kairos` is the M3 CRE workflow. It does not reimplement sizing logic. It imports the M2 Kuru parser and decision engine, obtains a single pinned block, and feeds one consistent policy/market snapshot into `decideExecution`.

The contract remains the final authority. A workflow proposal can become stale or lose a balance/allowance race before execution; `KairosPolicy` still enforces lifecycle, nonce, cumulative release, total budget, actual minimum fill, actual effective price, and atomic settlement.

## Pinned sources

| Component | Pin |
|---|---|
| CRE CLI | `v1.34.0` |
| `@chainlink/cre-sdk` | `1.21.1` |
| SDK source inspected | `smartcontractkit/cre-sdk-typescript@8a9e735c9046fef4356046b0d4b4c760089630df` |
| Template source inspected | `smartcontractkit/cre-templates@d0223f31182c76bc36b1cc9d47b13b18efcf2bf6` |
| Chain selectors | `smartcontractkit/chain-selectors@425da86147b75ee0fdd0d95d840a0966b837056b` |
| Workflow TypeScript | `5.9.3`, isolated from the repository's TypeScript `7.0.2` |
| Kuru SDK / contracts | `636509c2eafd63479d3f399703354e0d09f51e18` / `2060bb2736080c175d80d568bfdb6226bb5abd04` |

The root pnpm `packageExtensions` entry gives the CRE compiler its required TypeScript `5.9.3` dependency. It does not change the TypeScript version used by the other workspaces.

## Acquisition modes

- `RPC_POLICY` reads `getOrder`, `statusOf`, contract-derived release/availability, immutable market/token/executor configuration, wallet balance, allowance, and policy price decimals from one block.
- `FIXTURE_POLICY` exists only for local simulation before a public Kairos policy deployment. Every output is labeled `LIVE_RPC_WITH_FIXTURE_POLICY`; it is not onchain policy evidence.
- `RPC_L2` reads Kuru `getL2Book`, `getMarketParams`, and `marketState` from the same block.
- `FIXTURE_L2` exists only to exercise the executable report path in CRE without inventing public liquidity. Every output is labeled with `FIXTURE_POLICY_AND_L2` or `FIXTURE_L2`.

The production-intent configuration is `RPC_POLICY + RPC_L2`. It is implemented but cannot be truthfully simulated until Kairos policy and receiver addresses exist. The checked-in staging replay uses `FIXTURE_POLICY + RPC_L2`; the executable-path test uses both fixtures while still reading the live block, market parameters, and market state.

## Determinism and freshness

All JSON-RPC calls are individual requests because the tested Foundation RPC rejects batch calls. The acquisition result is serialized and uses CRE identical consensus aggregation. Calls are pinned to the returned block number. Runtime evaluation time is the later of DON consensus time and the pinned chain timestamp, which tolerates a bounded chain-clock lead without accepting old data. The unchanged M2 policy rejects snapshots older than `10s` and gives reports a `5s` validity window.

Kuru manual L2 is the only capacity source. AMM vault liquidity remains explicitly excluded.

## Report and retry safety

An executable decision ABI-encodes exactly:

```text
(uint256 orderId, uint64 nonce, uint64 validUntil, uint128 proposedInput,
 uint128 minimumOutput, bytes32 snapshotId)
```

The resulting payload is exactly 192 bytes, matching `KairosCreReceiver`. CRE signs the report. `submitReports` defaults to `false`; only an explicitly configured production run can call `EVMClient.writeReport`.

Kairos deliberately performs one submission attempt per workflow execution. Blind write retries are unsafe because transaction outcome can be ambiguous. A later workflow run recomputes the current nonce and snapshot. The receiver rejects identical report hashes and the policy rejects replayed nonces, making reruns fail closed rather than double-spend.

## Commands

```text
pnpm workflow:typecheck
pnpm workflow:test
cre workflow simulate workflows/kairos -T staging-settings
cre workflow simulate workflows/kairos -T fixture-execute-settings
```

On the current Windows machine, CRE CLI `v1.34.0` does not quote a repository path containing spaces when spawning `cre-compile.cmd`. A local `subst` drive is required for simulation. This is a CLI/path workaround only; it does not alter workflow code or evidence semantics.

Never add `--broadcast` without separate authorization, deployed addresses, funded signer constraints, and a reviewed transaction budget.
