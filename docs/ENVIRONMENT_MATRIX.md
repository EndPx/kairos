# Environment matrix

Updated: 2026-09-14

This matrix is a compatibility register, not evidence that an integration works. Addresses, package versions, chain IDs, credentials, and service support remain `UNVERIFIED` until a bounded probe records a result in `EVIDENCE.md`.

| Integration | Intended environment | Version / source pin | Credentials needed | Test performed | Result | Artifact / next proof |
|---|---|---|---|---|---|---|
| Monad platform | Monad EVM network; exact network and chain ID `UNVERIFIED` | Official docs: differences, gas pricing, reserve balance, verification, indexers (review date 2026-09-14) | `MONAD_RPC_URL` once a provider is chosen | Documentation source update only | NOT RUN | Read current docs; query `eth_chainId`, then record RPC endpoint provenance and result |
| Kuru | MON/USDC; selected deployment `UNVERIFIED` | Kuru docs plus `monad-developers/kuru-terminal` reference; pin SDK/package and terminal commit before use | `MONAD_RPC_URL`; funded test wallet only if user authorizes test transaction | Documentation source update only | NOT RUN | Verify code, ABI, `getMarketParams`, precision, depth, and settlement/refund behavior on the selected network |
| Privy | Web/PWA embedded wallet; exact Monad configuration `UNVERIFIED` | Official Monad Next.js/Serwist/Privy template is candidate only; inspect dependency versions/license before adoption | Public app ID; server secret only if selected SDK flow needs it | Documentation source update only | NOT RUN | Configure selected chain and demonstrate approve, create, cancel, revoke with embedded wallet |
| CRE | Workflow plus Kairos receiver; target network/forwarder `UNVERIFIED` | Current Chainlink CRE docs and official templates; pin CLI/SDK/template revision before use | CRE account authentication; deployment access if production deployment is attempted | Documentation source update only | NOT RUN | Establish CLI simulation, external market read, chain read, signed report/receiver validation, stale and duplicate tests |
| Aurora Intents | User-wallet funding route; source/destination/token `UNVERIFIED` | Current Aurora Intents product-specific supported-chain and API docs; pin endpoint/API revision before use | `AURORA_API_KEY` if required by selected product | Documentation source update only | NOT RUN | Verify supported route to the exact token accepted by selected Kuru market; authorized small-flow receipt and refund-state test |
| Optional infrastructure | QuickNode, Tenderly, Zerion; none selected | User-provided Metropolis catalog, 2026-09-14 | Voucher/account only after user claims it | None | NOT SELECTED | Confirm entitlement, limits, cost, and Monad support before adding as a dependency |

## Source handling rules

- The Metropolis catalog is user-provided contextual material. It introduces no new sponsor requirement, implementation dependency, or verified capability.
- Do not claim a perk, API, RPC, contract address, network, token, ABI, or transaction until a runtime probe records the exact result in `EVIDENCE.md`.
- Submitted, confirmed, failed, and stale are distinct UI and evidence states. A no-pending-state marketing phrase does not override this.
