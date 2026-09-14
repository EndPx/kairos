# M0 toolchain decision

Decision date: 2026-09-15

Kairos will use one `pnpm` workspace with `apps/web` (Next.js application), `packages/contracts` (Hardhat Solidity project), `packages/shared` (shared TypeScript domain types), and `workflows/cre` (CRE workflow). This structure keeps policy logic, the application, and CRE automation independently testable while sharing types without publishing an internal package.

## Pinned selection

| Concern | Selection | Verified source/result |
|---|---|---|
| Node runtime | Node.js `24.18.0` locally; require `>=20.9.0` for web app | Next.js `16.3.5` npm metadata reports `engines.node >=20.9.0` |
| Package manager | pnpm `10.21.0` | Local `pnpm --version` |
| Web | Next.js `16.3.5`, React `19.3.0`, TypeScript `7.0.2` | npm registry probe on 2026-09-15 |
| EVM client | viem `2.56.5`, wagmi `3.7.7` | npm registry probe on 2026-09-15 |
| Embedded wallet | `@privy-io/react-auth` `3.42.0` | npm registry probe on 2026-09-15 |
| Contracts | Hardhat `3.16.0`, OpenZeppelin Contracts `5.6.1` | npm registry probe on 2026-09-15 |
| Unit tests | Vitest `5.0.0` | npm registry probe on 2026-09-15 |
| Formatting | Prettier `3.9.6` | npm registry probe on 2026-09-15 |

The Monad template confirms Next.js, Serwist, and Privy embedded wallets as a supported candidate and requires Node.js 18 or higher. Kairos adopts its wallet direction, not its 0x route, notification stack, or dependency graph. Hardhat is selected over unavailable local Foundry so contract and TypeScript testing share one reproducible Node toolchain.

## Deferred choices

- Serwist is deferred until PWA/offline requirements are implemented; it is not required for M0–M2.
- Indexer, CRE SDK, Kuru SDK, Aurora SDK/API client, and exact RPC provider remain unpinned until their compatibility probes establish supported versions and network access.
- No packages have been installed and no code has been scaffolded by this decision.
