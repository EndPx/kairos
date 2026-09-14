# Environment matrix

Updated: 2026-09-15

This matrix is a compatibility register, not evidence that an integration works. Addresses, package versions, chain IDs, credentials, and service support remain `UNVERIFIED` until a bounded probe records a result in `EVIDENCE.md`.

| Integration | Intended environment | Version / source pin | Credentials needed | Test performed | Result | Artifact / next proof |
|---|---|---|---|---|---|---|
| Monad platform | Monad Testnet, chain ID `10143` (`0x279f`) | Foundation RPC `https://rpc-testnet.monadinfra.com`; official docs reviewed 2026-09-15 | No credential required for bounded public reads | `eth_chainId`, `eth_blockNumber`, `eth_gasPrice`, `eth_getCode` on canonical Multicall3 | VERIFIED | 2026-09-15 JSON-RPC responses: `0x279f`, `0x3ba6463`, `0x17bfac7c00`, non-empty Multicall3 bytecode; next: use an app-configured RPC before UI work |
| Kuru | Monad Testnet MON-USDC market `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`; USDC `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570` | Kuru official addresses docs; runtime proxy implementation `0x72cae0a99c19b574e8a6de558f43fc1d019c9374` | Public Foundation RPC used; funded test wallet required only for later authorized write | `eth_getCode`, ERC-20 metadata calls, EIP-1967 implementation-slot read | PARTIALLY VERIFIED | Market proxy code 141 bytes; USDC code 1737 bytes; `USDC Coin`, `USDC`, 6 decimals. BLOCKED: source ABI, market params/L2 decoding, fee/precision and settlement behavior |
| Privy | Web/PWA embedded wallet; exact Monad configuration `UNVERIFIED` | Official Monad Next.js/Serwist/Privy template is candidate only; inspect dependency versions/license before adoption | `NEXT_PUBLIC_PRIVY_APP_ID` missing locally; optional `NEXT_PUBLIC_PRIVY_CLIENT_ID` missing locally | Environment presence check | BLOCKED | Obtain Privy app configuration, then configure selected chain and demonstrate approve, create, cancel, revoke |
| CRE | Workflow plus Kairos receiver; Monad Testnet/forwarder `UNVERIFIED` | CLI `v1.0.10` installed but reports `v1.34.0` latest; npm `@chainlink/cre-sdk` `1.21.1` | Authorized CRE account/key missing | `cre --help`, `cre version`, `cre whoami`, `cre workflow --help` | BLOCKED | Update/pin CLI, authenticate/link a key, verify Monad forwarder/network, then run minimal workflow simulation |
| Aurora Intents | User-wallet funding route; source/destination/token `UNVERIFIED` | Current Aurora Intents product-specific supported-chain and API docs; pin endpoint/API revision before use | `AURORA_API_KEY` if required by selected product | Documentation source update only | NOT RUN | Verify supported route to the exact token accepted by selected Kuru market; authorized small-flow receipt and refund-state test |
| Optional infrastructure | QuickNode, Tenderly, Zerion; none selected | User-provided Metropolis catalog, 2026-09-14 | Voucher/account only after user claims it | None | NOT SELECTED | Confirm entitlement, limits, cost, and Monad support before adding as a dependency |

## Source handling rules

- The Metropolis catalog is user-provided contextual material. It introduces no new sponsor requirement, implementation dependency, or verified capability.
- Do not claim a perk, API, RPC, contract address, network, token, ABI, or transaction until a runtime probe records the exact result in `EVIDENCE.md`.
- Submitted, confirmed, failed, and stale are distinct UI and evidence states. A no-pending-state marketing phrase does not override this.
