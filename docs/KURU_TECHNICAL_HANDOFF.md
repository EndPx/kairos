# Kuru public-execution handoff

Date: 2026-09-17

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

## Existing behavioral proof

The application path `KairosPolicy → KuruAdapter → selected Kuru proxy` passed five tests against deployed bytecode on a fixed local fork of Monad Testnet block `62944132`, full hash `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`.

The fork proof covers:

- non-FOK partial fill: proposed `30 USDC`, actual input `20 USDC`, refund `10 USDC`;
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
