# M3 Privy lifecycle-only testnet evidence

Date: 2026-09-17

This record covers the bounded lifecycle-only sequence authorized for Monad Testnet. It is public testnet evidence, not a Kuru trade, settlement proof, CRE deployment, or mainnet activity.

## Identity and safety boundary

- Chain: Monad Testnet, chain ID `10143`.
- Privy embedded wallet and order owner: `0xa862d3a3FD15314D1632020F22d07d346b73E665`.
- Execution-disabled adapter: `0x2EE968D016bfF614a516E6e1D469769b9a771269`.
- Dead-executor policy: `0x3cBdB8f7D91966AD543982b76CDb71a0283d3213`.
- Lifecycle order: `0` with a `1,000,000` raw-unit (`1 USDC`) budget.
- Policy deployment start block: `63220558`.
- The policy executor reads as `0x000000000000000000000000000000000000dEaD` and its adapter reads as the address above.
- The adapter policy reads as the policy above. Both contracts read the selected Kuru market `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9` and Monad Testnet USDC `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`.
- The policy reads input/output/price decimals `6/18/8`; the adapter reads quote decimals `6`, price precision `100000000`, and size precision `10000000000`.
- No transaction called `KairosPolicy.execute`, `KuruAdapterBoundary.executeBuy`, Kuru, a CRE forwarder, Aurora, or a mainnet contract.

## Confirmed transaction sequence

All six transactions are successful, originate from the same wallet, and occupy nonces `0` through `5` without a duplicate deployment.

| Nonce | Action | Transaction | Block | Block hash | Gas used | Actual cost (MON) |
|---:|---|---|---:|---|---:|---:|
| 0 | Deploy execution-disabled adapter | `0xff0a25e0c3c20541fa0bb0f1b133bc675c0da114e3f7d848a0e4e80d9c33347a` | `63220429` | `0x6dfeee58d4666ef00e4aef32253528ed25f79ea6963c6481460c8a2f35d0beb2` | `320000` | `0.03264` |
| 1 | Deploy dead-executor policy | `0xc4a512b05c622da97a15277f0ad5ad130dcbd640cf3ae70f66f1ce846396d611` | `63220558` | `0x8f638706eb00d9bd62e5ebea7be9bf8517298d9f8887cfdd2f1ec7c65c4e54ea` | `1500000` | `0.153` |
| 2 | Approve `1 USDC` | `0xdcb30e9fb538946728e056abc6ea2b02fafdc8ffc3d2979a9f6f150c949f679d` | `63221139` | `0xaf37c3dff7bda70f5005a557418df04ce334787ebeb9fc99fe4c269b56d2ab32` | `52101` | `0.005314302` |
| 3 | Create order `0` | `0x0a1da531b3a160ca072eb0bc043b39b7ee0afcf999553f9e9b16a5608764ea60` | `63221326` | `0x48cdeef183c095c5592047ea5559f1b9c78a7490edb2c8cb7937222434b3cb42` | `152636` | `0.015568872` |
| 4 | Cancel order `0` | `0x2715db8a6b9783683c356b9d889eeed6d8635e561f47515ddb5ca0de60046cd6` | `63226866` | `0xa8b713d4a0c5f7441515015d623eaa03f80b72ca282ee09881c68237d3253d9c` | `35227` | `0.003593154` |
| 5 | Revoke allowance to `0` | `0x3de58c84ee0ad0be1beb8913873d797adae859ed1a830741a84301d3e11a6d49` | `63226983` | `0x6b0b372242c06ff84a36cbdad907431e56effe26b0c5bafa94902b2d1806f531` | `35031` | `0.003573162` |

The actual total gas cost is `0.21368949 MON`, below the authorized `0.23 MON` cap by `0.01631051 MON`. The gas price recorded for every receipt is `102000000000 wei`.

Before cancellation, a fresh preflight estimated `35227` gas against the `60000` cap. Before revocation, the final preflight estimated `35031` gas against the `70000` cap. Their combined preflight cap was `0.01326 MON`, below the then-remaining authorization.

## Event and state comparison

Receipt decoding against the compiled event ABI produced:

- `OrderCreated(orderId=0, owner=0xa862d3a3FD15314D1632020F22d07d346b73E665, budget=1000000, startTime=1789620060, endTime=1789623660)` from the create receipt.
- `OrderCancelled(orderId=0, owner=0xa862d3a3FD15314D1632020F22d07d346b73E665)` from the cancel receipt.

At comparison block `63227224`, full hash `0xb80d9fb34b0caf3e0b3ea372f1903d6ddc679542575fed902c267711e89f14de`, one pinned RPC snapshot reported:

- `nextOrderId = 1`;
- order `0` owner equals the Privy wallet;
- budget `1000000`, spent `0`, received `0`, and execution nonce `0`;
- `cancelled = true` and `statusOf(0) = 2 (CANCELLED)`;
- USDC allowance from the owner to the policy is `0`.

The zero spend/output/nonce values are expected because this lifecycle-only proof never attempted execution.

A later read-only confirmation at block `63247646`, full hash `0x6a3620464fb83d3602a6b684502422e2e7f017eb9ac42d0381f54778eb2e4ab7`, returned the same final state: order `0` is `CANCELLED`, spent/received/execution nonce remain zero, and allowance remains zero. All six receipts remained successful and their total cost remained `0.21368949 MON`. No transaction was repeated.

## Browser path and verification commands

The adapter deployment, policy deployment, approval, creation, cancellation, and revocation were submitted through the Kairos application using visible Privy confirmations. The final application state showed `CANCELLED`, `0 USDC` policy allowance, and a confirmed revoke receipt. The cleanup panel reads the policy directly at one named block and explicitly identifies itself as a local cleanup control, not an Envio history fallback.

Reproducible receipt/state command:

```text
pnpm --dir apps/web exec tsx scripts/lifecycle-evidence.ts <adapter-tx> <policy-tx> <approve-tx> <create-tx> <cancel-tx> <revoke-tx>
```

Post-change verification:

```text
pnpm web:test       # 16 files, 47 tests passed
pnpm web:typecheck  # exit 0
pnpm web:build      # exit 0; /system/limited-deployment emitted
```

## Envio boundary at lifecycle completion

At the time the lifecycle transactions completed, Envio OAuth had succeeded and GitHub App installation was limited to the single repository `EndPx/kairos`, but installation still awaited user-only GitHub sudo verification. This historical blocker was later resolved without changing repository scope. The resulting live-pipeline evidence is recorded separately in `docs/evidence/M3_ENVIO_LIVE.md`.

At that initial capture:

- the public `OrderCreated` and `OrderCancelled` events now exist and can be backfilled from policy start block `63220558`;
- neither event is yet proven indexed by Envio;
- `/orders`, order detail, and `/reports` are not yet proven to consume this deployment from a live Envio endpoint;
- create/cancel evidence does not prove a fill, settlement aggregate, refund, or CRE report correlation.

Resolved follow-up: the user completed GitHub verification; the free public deployment at commit `c6adc64` indexed both events and the frontend recovered the cancelled order after reload. This lifecycle document retains the earlier blocker wording as chronology and does not claim fill/settlement evidence.
