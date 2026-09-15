# Environment matrix

Updated: 2026-09-15

This matrix is a compatibility register, not evidence that an integration works. Addresses, package versions, chain IDs, credentials, and service support remain `UNVERIFIED` until a bounded probe records a result in `EVIDENCE.md`.

| Integration | Intended environment | Version / source pin | Credentials needed | Test performed | Result | Artifact / next proof |
|---|---|---|---|---|---|---|
| Monad platform | Monad Testnet, chain ID `10143` (`0x279f`) | Foundation RPC `https://rpc-testnet.monadinfra.com`; official docs reviewed 2026-09-15 | No credential required for bounded public reads | `eth_chainId`, `eth_blockNumber`, `eth_gasPrice`, `eth_getCode` on canonical Multicall3 | VERIFIED | 2026-09-15 JSON-RPC responses: `0x279f`, `0x3ba6463`, `0x17bfac7c00`, non-empty Multicall3 bytecode; next: use an app-configured RPC before UI work |
| Kuru | Monad Testnet MON-USDC market `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`; USDC `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570` | Contracts `2060bb2736080c175d80d568bfdb6226bb5abd04`; SDK/ABI `636509c2eafd63479d3f399703354e0d09f51e18`; deployed implementation remains source-unverified | Public Foundation RPC used; funded test wallet required only for later authorized write | ABI-compatible market params, L2, and vault-params reads; explorer/source probe | BLOCKED (narrow read ABI verified) | Native MON base, USDC quote, scales/bounds/current fees; snapshot had zero manual levels and zero vault size. Exact build/settlement behavior remains blocked |
| Privy | Web/PWA embedded wallet; exact Monad configuration `UNVERIFIED` | Privy React transaction docs and Monad template reviewed; SDK pin in `docs/TOOLCHAIN.md` | `NEXT_PUBLIC_PRIVY_APP_ID` and optional client ID missing locally; dashboard configuration unavailable | Current primary docs plus M0.3 presence-only inventory | BLOCKED | Configure Web App ID, origins, login and user-owned EVM wallet; verify Monad chain support; then prove user-confirmed approve/create/cancel/revoke |
| CRE | Workflow plus Kairos receiver; Monad Testnet/forwarder `UNVERIFIED` | CLI `v1.0.10` installed but reports `v1.34.0` latest; npm `@chainlink/cre-sdk` `1.21.1` | Authorized CRE account/key missing | `cre --help`, `cre version`, `cre whoami`, `cre workflow --help` | BLOCKED | Update/pin CLI, authenticate/link a key, verify Monad forwarder/network, then run minimal workflow simulation |
| Aurora Intents | User-wallet funding route; Monad Testnet/Kuru-USDC route `UNVERIFIED` | Current API guide documents app-key token discovery, dry quote, deposit, lifecycle and refund fields | `AURORA_API_KEY` missing locally | Current primary docs and M0.3 presence-only inventory; no API request made | BLOCKED | Authenticate, discover exact supported assets/networks, then perform a non-funding dry quote before any separately authorized test flow |
| Optional infrastructure | QuickNode, Tenderly, Zerion; none selected | User-provided Metropolis catalog, 2026-09-14 | Voucher/account only after user claims it | None | NOT SELECTED | Confirm entitlement, limits, cost, and Monad support before adding as a dependency |

## Source handling rules

- The Metropolis catalog is user-provided contextual material. It introduces no new sponsor requirement, implementation dependency, or verified capability.
- Do not claim a perk, API, RPC, contract address, network, token, ABI, or transaction until a runtime probe records the exact result in `EVIDENCE.md`.
- Submitted, confirmed, failed, and stale are distinct UI and evidence states. A no-pending-state marketing phrase does not override this.
