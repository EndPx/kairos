# M3 gap audit

Date: 2026-09-17

Reviewed repository revision: `ef35f29cc1dbe1c3702477ca42f2a9a76bd43b09`

## Verdict

**M3 is COMPLETE against the written M3 requirements.** The public lifecycle journey proves real Privy approve/create/cancel/revoke actions, the authenticated CRE CLI provides inspectable WAIT and EXECUTE/report simulations, and the live Envio-backed application recovers the cancelled order after a full reload without a manual database edit or fixture fallback.

This verdict does not mark Kairos complete. A public Kuru settlement, exact Kuru deployed-source/build equivalence, live fill analytics, CRE-to-settlement correlation, and Aurora funding remain outside the evidence currently available. They remain product/submission work and must not be inferred from M3 closure.

The M3-Envio lifecycle scope is also complete under its explicitly accepted create/cancel minimum proof. Nonzero settlement aggregates and CRE correlation remain conditional follow-up work after a real `ExecutionSettled` event exists. An observed public reorg is not a written exit requirement; deterministic handler IDs, `rollback_on_reorg: true`, cursor-hash recovery tests, and controlled replay/rebuild tests are the current evidence.

## Read-only lifecycle confirmation

The following command was rerun without a wallet signature or broadcast:

```text
pnpm --filter @kairos/web exec tsx scripts/lifecycle-evidence.ts <six recorded transaction hashes>
```

At Monad Testnet block `63247646`, hash `0x6a3620464fb83d3602a6b684502422e2e7f017eb9ac42d0381f54778eb2e4ab7`:

- order `0` returned `statusOf = 2 (CANCELLED)`, `cancelled = true`, `spent = 0`, `received = 0`, and `executionNonce = 0`;
- owner-to-policy USDC allowance returned `0`;
- all six recorded receipts remained successful at wallet nonces `0` through `5`;
- total actual cost remained `0.21368949 MON`, below the authorized `0.23 MON` cap by `0.01631051 MON`.

No revoke retry or other transaction was required.

## Written M3 requirements

| Requirement | Evidence | Status | Boundary |
|---|---|---|---|
| M3.1 CRE receiver | `KairosCreReceiver` restricts the forwarder and workflow identity, decodes the 192-byte proposal, rejects stale/duplicate reports, and forwards valid reports to the unchanged policy path; 4 targeted tests pass | PASS — local | Not a public forwarder delivery |
| M3.2 CRE workflow | Pinned CRE SDK workflow performs one-block policy/market acquisition, invokes the M2 engine, generates the exact report payload, and permits at most one guarded submission attempt | PASS — local/simulation | Checked-in targets keep `submitReports: false` |
| M3.3 simulation/deployment proof | Authenticated CLI simulations prove real Kuru reads and stale WAIT, fixture EXECUTE/report generation, and a fresh real-policy `WAIT/CANCELLED`; deployment is conditional on account/network access | PASS — simulation | No CRE deployment or public receiver call claimed |
| M3.4 event index/recovery | Envio live lifecycle index, deterministic local projector, restart recovery, cursor-hash rebuild, handler replay guard, and explicit offchain journals | PASS — live lifecycle + controlled tests | No public reorg was observed |
| M3.5 Privy integration | Embedded-wallet login/network/balance plus six successful lifecycle transactions and final read-only state | PASS — public testnet lifecycle | Deployment is deliberately execution-disabled |
| M3.6 create page | Integer-safe inputs, separate approval, schedule/risk/custody disclosure, and real create transaction | PASS | Does not promise completion or reserve funds |
| M3.7 orders/detail | Live Envio order history plus pinned current-state reads, cancellation and allowance controls, decision provenance, and reload recovery | PASS — live lifecycle | No public fill exists |
| M3.8 report page | Actual-settlement-only integer aggregation, weighted price, fee/gas separation, failed-attempt states, and explicit unavailable fields | PASS — implementation/empty live state | Nonzero values await a real settlement event |
| M3.9 application tests | Real lifecycle browser E2E, reload without manual database edits, labeled fixture adaptive journey, status tests, controlled recovery/reorg tests, and CRE/receiver tests | PASS at the written environment boundary | Not a public adaptive settlement journey |

The controlling M3 exit says users can complete the policy-authorized journey with real Privy actions and inspectable CRE proof, and that state survives application restart. It does not require a production CRE deployment or a public Kuru settlement. `CRE-01` expressly accepts successful CLI **simulation/deployment** evidence, and `M3.3` makes deployment conditional. `DEMO-01` requires product operation without manual database edits; the lifecycle journey and Envio reload meet that wording. Public settlement remains required by the final product definition of done, not by the written M3 exit.

## CRE proof added in this audit

Target `live-lifecycle-wait-settings` uses the actual lifecycle policy and order `0`, the selected Kuru market, `RPC_POLICY`, and `RPC_L2`. Its receiver field is the policy's actual dead executor, not a deployable receiver placeholder, and `submitReports` is false.

```text
cre workflow simulate workflows/kairos -T live-lifecycle-wait-settings
```

The authenticated CLI `v1.34.0` run exited `0` with binary hash `bbdff3d5dfa03450836e5d87355b3944f04d3719c4c132824571f496028e36b9`, config hash `39142b01c984976d5eec043536eddc71cbcd770a85560872c059471f5933a95b`, and `proofKind: LIVE_RPC_POLICY`. Policy and market reads shared block `63248233`, hash `0x8cb7f22dfd01e8b01583e0f79a47e941ece483bd52e448456ab0439b327d6181`. Freshness was `3s` against the `10s` limit; the deterministic decision was `WAIT/CANCELLED`; handler time was `3486ms`; `submitted` was false.

The earlier authenticated EXECUTE simulation remains a fixture-policy/fixture-L2 proof of report generation, not public liquidity or settlement. The receiver path remains local contract evidence. Production delivery is optional strengthening, not a retroactive M3 requirement.

## Envio bounty boundary

The bounty-facing lifecycle proof satisfies the accepted initial scope:

- the public repository contains `config.yaml`, `schema.graphql`, typed handlers, tests, and deterministic integer aggregation code;
- the free Envio Cloud pipeline indexes real Monad Testnet `OrderCreated` and `OrderCancelled` events;
- `/orders`, `/orders/0`, and `/reports` consume the live GraphQL endpoint and expose readiness/lag without fixture substitution;
- order `0` and its zero settlement aggregates match the named receipts and pinned contract state;
- duplicate handling, out-of-order/replay behavior, endpoint failure, lag, and controlled reorg/rebuild behavior are tested.

The following are not claimed: a public fill, nonzero cumulative input/output, refund inference, weighted-price runtime proof, or CRE report correlation. Those are enabled only after the corresponding public events exist.

## Public Kuru execution interlock

The fixed fork already proves the application settlement path against the selected deployed Kuru bytecode under documented local balance and liquidity mutations. It proves actual partial input/output, native MON forwarding, refund, FOK/minimum-output rollback, policy minimum-fill/effective-price rollback, nonce and allowance behavior, pre-existing balance isolation, no new residual, and no active resting taker order.

The public interlock remains locked by repository policy, not by an M3 exit clause. Before any public execution-capable journey:

1. obtain Kuru's exact compiler input/deployment manifest or verified source tied to implementation `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`, including the Solady revision and source hashes;
2. review an execution-capable `KuruAdapter` deployment bound to Monad Testnet `10143`, the selected market/token/precision, one policy, one owner-recipient path, and the chosen FOK mode;
3. configure a real authorized executor, or separately deploy and activate a receiver using a verified Chainlink forwarder and workflow identity;
4. obtain explicit authorization for the deployment and bounded public test transaction, including wallet role, token amount, gas cap, and stop conditions;
5. reconcile receipts/events with actual input/output, minimum output, partial/FOK behavior, refund, native MON delivery, nonce, allowance, policy/adapter residuals, and active Kuru state.

The existing lifecycle policy cannot satisfy these steps: it has a dead executor and an execution-disabled adapter.

## Verification performed

| Command | Result |
|---|---|
| lifecycle evidence script with six recorded hashes | exit `0`; final `CANCELLED`, allowance `0`, total `0.21368949 MON` |
| `pnpm workflow:typecheck` | exit `0` |
| `pnpm workflow:test` | 1 file / 5 tests passed |
| live lifecycle CRE simulation | exit `0`; `LIVE_RPC_POLICY`, `WAIT/CANCELLED`, `submitted:false` |
| `pnpm --filter @kairos/contracts exec hardhat test test/KairosCreReceiver.ts` | 4 passing |
| `pnpm indexer:test` | 1 file / 5 tests passed |
| WSL `scripts/verify-envio-wsl.sh` | codegen for both configs; 2 files / 7 tests passed; generated typecheck exit `0` |

The first targeted Hardhat invocation passed an extra `--` through pnpm and failed by treating `--grep` as a file. The direct-file command above then passed. Native Windows `pnpm envio:test` reproduced the known uninitialized generated-runtime failure (`getConfigJson` on null); the documented WSL/Linux verification path passed all seven tests. Neither failure was a product assertion failure.

## Remaining work after M3

- Required for final product/submission: resolve the Kuru public interlock and prove a bounded public settlement; then prove nonzero Envio fill aggregates and any valid CRE correlation. Aurora remains M4.
- Optional strengthening: production CRE deployment/delivery and observation of a naturally occurring public reorg.
- Prohibited inference: lifecycle create/cancel, fixture EXECUTE, local receiver tests, and fixed-fork settlement must not be relabeled as a public adaptive trade.
