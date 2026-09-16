# M3 CRE simulation artifacts

Date: 2026-09-16

Environment: Windows, CRE CLI `v1.34.0`, Bun `1.3.8`, `@chainlink/cre-sdk` `1.21.1`, workflow TypeScript `5.9.3`

Network reads: Monad Testnet chain ID `10143` through the public Foundation RPC

Broadcast: disabled; no public transaction or deployment

## Historical failures retained

1. Running from the repository's path with spaces failed while spawning `cre-compile.cmd`: the unquoted path prefix was treated as a command. A local `R:` `subst` mapping was used for the successful runs.
2. The first mapped-path compile failed because the CRE validator resolved repository TypeScript `7.0.2`; `ts.ScriptTarget` was undefined. The workflow now pins TypeScript `5.9.3`, matching the official SDK package, and root `pnpm.packageExtensions` makes that dependency available to the compiler without downgrading other workspaces.
3. The next compile succeeded, but WASM config validation rejected `z.string().url()` for the valid HTTPS RPC URL. The schema now uses a bounded HTTPS regex compatible with the CRE runtime.
4. The first executable fixture simulation returned `WAIT / STALE_MARKET_DATA` with freshness `INVALID` because the latest chain block timestamp led the first DON timestamp sample. Observation/evaluation now use the later of DON consensus time and the pinned block timestamp; old blocks remain stale.

## Real Kuru RPC replay / WAIT

Command:

```text
cre workflow simulate workflows/kairos -T staging-settings
```

Result: PASS, exit `0`.

```text
Binary hash: bbdff3d5dfa03450836e5d87355b3944f04d3719c4c132824571f496028e36b9
Config hash: c0fd465851d260f47aac1ba1f31b622ee7f9f383fe54dc80b6c686b88d14fb38
proofKind: LIVE_RPC_WITH_FIXTURE_POLICY
decision: WAIT / STALE_MARKET_DATA
blockHash: 0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098
ageSeconds: 11288
maxAgeSeconds: 10
elapsedMs: 915
submitted: false
manualL2: INCLUDED
KURU_AMM_VAULT: EXCLUDED
```

This run proves CRE compilation, external JSON-RPC acquisition, real Kuru ABI decoding at the recorded block, identical-consensus transport, M2 decision invocation, and fail-closed stale behavior. Policy state is a fixture and no report was generated.

## Executable fixture / report generation

Command:

```text
cre workflow simulate workflows/kairos -T fixture-execute-settings
```

Result: PASS, exit `0`.

```text
Binary hash: bbdff3d5dfa03450836e5d87355b3944f04d3719c4c132824571f496028e36b9
Config hash: cbabf468ac53db4679e6870d1ba11e3a5728a917cc675702917a7d81af5a3c07
proofKind: LIVE_RPC_WITH_FIXTURE_POLICY_AND_L2
decision: EXECUTE / EXECUTE
blockHash: 0xb264c95d62bfe7095f6e0121e08d7fd433e0e9c106abca66db061fc4583fc496
freshness: FRESH, ageSeconds 0, maxAgeSeconds 10
proposedInput: 10000000
minimumOutput: 50000000000000000000
validitySeconds: 5
reportPayloadBytes: 192
elapsedMs: 753
submitted: false
manualL2: INCLUDED
KURU_AMM_VAULT: EXCLUDED
```

The simulator log states `CRE report generated for an executable proposal`. This proves the CRE runtime report-generation path and shows measured handler latency below the five-second proposal window. It does not prove public liquidity, onchain policy reads, receiver execution, settlement, deployment, continuous automation, or a public transaction because policy and L2 are fixtures and broadcasting was disabled.
