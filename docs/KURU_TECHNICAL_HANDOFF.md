# Kuru public-execution handoff

Date: 2026-09-18

This is an internal technical handoff. It has not been sent to Kuru or any external party.

## Exact selected deployment

- Network: Monad Testnet, chain ID `10143`.
- Market proxy: `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`.
- EIP-1967 implementation: `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`.
- Implementation runtime: 35,548 bytes; metadata identifies solc `0.8.30` and IPFS CID `Qmejh4dRV4xZGQwU9asEepspYaALt2eodjoRegaJRe9tT7`.
- Quote asset: USDC `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`, 6 decimals.
- Base asset: native MON, 18 decimals.
- Kuru contracts source reviewed: `2060bb2736080c175d80d568bfdb6226bb5abd04`.
- Kuru SDK/ABI reviewed: `636509c2eafd63479d3f399703354e0d09f51e18`.

## Artifact needed from Kuru

Provide the exact standard-JSON compiler input/output or deployment manifest for implementation `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`, including:

- every source file and source hash;
- the exact Solady revision used by `OrderBook.sol`;
- solc version, optimizer settings/runs, `viaIR`, EVM version, and metadata settings;
- library addresses, link references, and immutable references;
- the proxy deployment/upgrade transaction or manifest tying the implementation to the selected market.

The public repository profile (solc `0.8.30`, optimizer `1000`, `viaIR`, Prague) and bytecode metadata are corroborating evidence only. They do not establish exact build equivalence without the missing dependency/source inputs.

### Minimum artifact that can clear the Kuru provenance gate

The minimum acceptable external evidence is one complete, reproducible provenance bundle for implementation `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`:

1. exact compiler input and settings sufficient to rebuild the implementation runtime, including every source hash and the Solady revision; either canonical standard-JSON input/output or explorer-verified build metadata may supply this; and
2. a deployment or upgrade transaction/manifest that ties that exact implementation to proxy `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`.

A current ABI, repository commit, compiler version alone, metadata CID alone, or source-profile similarity is insufficient. The rule comes from the repository's explicit public-safety gate, not the written M1 exit criterion:

- `docs/KURU_ADAPTER_BOUNDARY.md`, “Deliberate public execution interlock,” requires build provenance or verified source tied to the proxy plus settlement evidence;
- `docs/M1_EXIT_REVIEW.md`, “Source-equivalence requirement review,” preserves that gate for public enablement while confirming it was not an M1 exit criterion; and
- this handoff's “Why the public interlock remains active” section requires runtime comparison and a separate deployment review before public use.

The documented fixed-fork suite now supplies the required behavioral settlement evidence, including successful full/FOK and partial paths. The missing external item is therefore the provenance bundle above; receiving it is necessary but does not itself authorize deployment or a trade.

## Existing behavioral proof

The application path `KairosPolicy → KuruAdapter → selected Kuru proxy` passed six tests against deployed bytecode on a fixed local fork of Monad Testnet block `62944132`, full hash `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`.

The fork proof covers:

- non-FOK partial fill: proposed `30 USDC`, actual input `20 USDC`, refund `10 USDC`;
- successful FOK full fill: proposed/actual input `20 USDC`, output `400 MON`, refund `0`;
- native output forwarding: `400 MON` to the owner;
- actual-delta accounting and success-only nonce increment;
- Kuru FOK and `minOut` reverts;
- Kairos actual `minFill` and effective-average-price rollback;
- owner allowance behavior, zero new adapter/policy residual, preservation of pre-existing adapter balances, and no active resting taker level.

The source fork had no executable liquidity. The test assigned a local-only USDC balance, funded a maker through the deployed Margin Account, and placed one controlled post-only ask. Nothing was broadcast. Full mutation and command details are in `docs/KURU_FORK_SETTLEMENT.md`.

## Why the public interlock remains active

M1 accepted documented-fork behavioral evidence and did not require exact source/build equivalence for milestone closure. Public execution has a stronger gate:

1. exact deployed build provenance remains unavailable;
2. the only public Kairos adapter is deliberately execution-disabled;
3. the only public policy uses a dead executor and its sole order is cancelled;
4. no execution-capable public adapter/policy configuration, bounded settlement transaction plan, or transaction authorization exists;
5. current Envio history contains lifecycle events only and cannot validate a settlement that has never occurred.

Do not remove the interlock based on ABI compatibility, source-profile similarity, or the local fork alone. After the requested artifact is obtained, compare the compiled runtime to the implementation, review any differences, then prepare a separately authorized minimal public-testnet settlement with explicit token/gas limits and rollback checks.

## Implementation work still possible without the artifact

The production-shaped policy, restricted Kuru adapter, CRE receiver, adaptive engine, CRE workflow, Envio execution configuration, and settlement UI path already exist and have their stated local/fork/simulation coverage. No additional trade-path feature can make the public Kuru call safe or clear the provenance gate without the external artifact.

Three no-broadcast operational harnesses can still be prepared independently:

1. an execution-deployment planner that predicts and validates the receiver, adapter, and policy addresses plus every immutable value without sending a transaction;
2. a read-only post-deployment verifier for bytecode, chain ID, market/token orientation, precision, executor/receiver bindings, start blocks, allowances, and execution interlock state; and
3. an evidence collector that correlates the fill receipt, `ExecutionSettled`, owner balance deltas, Kuru active L2 state, Envio entities, and frontend comparison block.

These harnesses improve operational safety but do not replace Kuru provenance, CRE delivery access, transaction authorization, live liquidity, or funding. The current repository has lifecycle-only deployment tooling, not an execution-capable public deployment script. Building these no-broadcast tools is useful independent work, but it cannot produce the requested public fill while the gate remains closed.

## Concrete sequence toward one public fill

No step below is authorization to broadcast:

1. Obtain the minimum Kuru provenance bundle above.
2. Rebuild with the supplied compiler/dependency settings, normalize link/immutable references where applicable, compare the resulting runtime with implementation `0x72ca…c9374`, and document every difference.
3. Reconfirm the proxy implementation, market parameters, exact USDC/native-MON orientation, fee values, executable L2 liquidity, and gas conditions at a fresh named block.
4. Complete the no-broadcast deployment plan for an execution-capable chain-`10143` `KuruAdapter`, a `KairosPolicy` bound to a proven executor path, and—if the continuous automation demo is required—a `KairosCreReceiver` bound to the verified production forwarder and real workflow identity.
5. Submit one explicit authorization request covering every deployment/call, wallet role, maximum USDC approval/order/fill, maximum aggregate testnet MON gas, expiry, price/minimum-output limits, cancellation/revocation cleanup, and abort conditions.
6. After authorization only, deploy and verify immutables/code, create the bounded order, obtain one CRE-delivered execution through the receiver, and stop after the first confirmed fill.
7. Verify actual input/output/refund, nonce/accounting, owner balances, zero new adapter/policy residual, no resting taker order, and final allowance/order cleanup at named blocks.
8. Let the existing Envio execution configuration index `ExecutionSettled`, compare it with the receipt and contract state, then verify the same fill and sync state in the frontend.

The provenance bundle is the immediate Kuru action. A real workflow identity/delivery path and explicit transaction authorization are additional necessary conditions for the complete continuous demo; neither is inferred from the Kuru artifact.
