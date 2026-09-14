# Evidence ledger
No application tests, sponsor transactions or deployments have been performed by this handoff.

Add records:
- ID and requirement:
- Date:
- Environment and chain ID:
- Version/commit/source URL:
- Command or reproducible steps:
- Result (PASS / FAIL / BLOCKED):
- Artifact / receipt / transaction hash:
- Limitations (fixture, fork, testnet, simulation, live):
- Next action:

Documentation reads are context evidence only. Keep runtime proof separate.

---

- ID and requirement: M0-01 / Repository baseline
- Date: 2026-09-15
- Environment and chain ID: Windows 11; Node.js v24.18.0; npm 11.8.0; pnpm 10.21.0; Git 2.42.0.windows.2; no chain accessed
- Version/commit/source URL: Repository `EndPx/kairos`, baseline commit `54c728f`
- Command or reproducible steps: `git status --short --branch`; `git remote -v`; `git log -3 --oneline`; local tool command inventory.
- Result (PASS / FAIL / BLOCKED): PASS — `main` was clean and tracked `origin/main`; handoff-only repository contains no application source, package manifest, lockfile, or contract toolchain.
- Artifact / receipt / transaction hash: Command output in this goal turn; Git history beginning at `01ad36d`.
- Limitations (fixture, fork, testnet, simulation, live): No sponsor, RPC, contract, or application runtime was accessed.
- Next action: M0.2 — select and pin the monorepo/toolchain after official documentation review.

---

- ID and requirement: M0-02 / Monorepo and toolchain decision
- Date: 2026-09-15
- Environment and chain ID: Node.js v24.18.0; pnpm 10.21.0; no chain accessed
- Version/commit/source URL: Next.js official installation documentation; Monad official Privy template; npm registry metadata recorded in `docs/TOOLCHAIN.md`.
- Command or reproducible steps: `npm view next@16.3.5 version engines --json`; `npm view react/typescript/viem/wagmi/@privy-io/react-auth/hardhat/@openzeppelin/contracts/vitest/prettier version --json`; `pnpm --version`; `node --version`.
- Result (PASS / FAIL / BLOCKED): PASS — selected a pnpm workspace and pinned the initial web, EVM-client, contract, test, and formatter versions without installing packages.
- Artifact / receipt / transaction hash: `docs/TOOLCHAIN.md`.
- Limitations (fixture, fork, testnet, simulation, live): Kuru, CRE, Privy, Aurora, RPC, and indexer packages are deliberately unpinned pending their probes.
- Next action: M0.3 — inventory required environment variables without recording credentials.

---

- ID and requirement: M0-03 / Environment and credential inventory
- Date: 2026-09-15
- Environment and chain ID: Local environment presence check; no chain accessed
- Version/commit/source URL: Monad Privy template documents `NEXT_PUBLIC_PRIVY_APP_ID` and optional `NEXT_PUBLIC_PRIVY_CLIENT_ID`.
- Command or reproducible steps: PowerShell presence-only check of named variables; `Get-ChildItem -Force -Name .env*`.
- Result (PASS / FAIL / BLOCKED): PASS — `.env.example` and credential inventory created without values. BLOCKED configuration: Monad RPC, Privy app identifiers, CRE credentials, Aurora API credentials, and test signers are absent.
- Artifact / receipt / transaction hash: `.env.example`; `docs/CREDENTIALS.md`.
- Limitations (fixture, fork, testnet, simulation, live): Presence checks do not verify validity; CRE and Aurora variable names remain provisional pending official API probes.
- Next action: M0.4 — locate and probe an official/public Monad RPC without a transaction.

---

- ID and requirement: M0-04 / Monad platform probe
- Date: 2026-09-15
- Environment and chain ID: Monad Testnet, `10143` / `0x279f`; Foundation RPC `https://rpc-testnet.monadinfra.com`
- Version/commit/source URL: Official Monad Testnet, Differences, Gas Pricing, Reserve Balance, and Block Explorers documentation reviewed 2026-09-15.
- Command or reproducible steps: POST JSON-RPC `eth_chainId`, `eth_blockNumber`, `eth_gasPrice`, and `eth_getCode(0xcA11bde05977b3631167028862bE2a173976CA11, latest)` to the Foundation endpoint.
- Result (PASS / FAIL / BLOCKED): PASS — returned `0x279f`, `0x3ba6463`, `0x17bfac7c00`, and non-empty canonical Multicall3 bytecode.
- Artifact / receipt / transaction hash: Raw JSON-RPC output in this goal turn; no transaction submitted.
- Limitations (fixture, fork, testnet, simulation, live): Testnet read evidence only. Gas behavior documentation must still be applied to measured Kairos calls.
- Next action: M0.5 — verify Kuru testnet market bytecode, tokens, parameters, and L2 book through this RPC.

---

- ID and requirement: M0-05 / Kuru read-only deployment probe
- Date: 2026-09-15
- Environment and chain ID: Monad Testnet `10143`, Foundation RPC
- Version/commit/source URL: Kuru official Contract Addresses page; no source ABI pinned yet.
- Command or reproducible steps: `eth_getCode` for market and USDC; ERC-20 `decimals()`, `symbol()`, `name()` calls; `eth_getStorageAt` at EIP-1967 implementation slot.
- Result (PASS / FAIL / BLOCKED): PARTIAL PASS — official market/token addresses contain code; USDC metadata is `USDC Coin` / `USDC` / 6 decimals; market is an EIP-1967 proxy whose implementation is `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`.
- Artifact / receipt / transaction hash: Raw JSON-RPC responses in this goal turn; no transaction submitted.
- Limitations (fixture, fork, testnet, simulation, live): ABI, `getMarketParams`, L2 encoding, token orientation, fee units, and settlement/refund behavior remain unverified; do not implement adapter from function names alone.
- Next action: M0.6 — write the smallest authorized Kuru settlement experiment design while source ABI retrieval continues.

---

- ID and requirement: M0-06 / Kuru settlement experiment design
- Date: 2026-09-15
- Environment and chain ID: Planned Monad Testnet `10143`; no transaction submitted
- Version/commit/source URL: `docs/KURU_SETTLEMENT_EXPERIMENT.md`; selected Kuru proxy and implementation recorded in M0-05.
- Command or reproducible steps: Design review against the M0.6 requirements and acceptance cases SET-01–04 and PRICE-01.
- Result (PASS / FAIL / BLOCKED): PASS — six bounded test cases and required artifacts are specified. BLOCKED execution: source ABI/deployment match, decoded market params/L2, authorized funded test wallet, and an authorized test adapter deployment.
- Artifact / receipt / transaction hash: `docs/KURU_SETTLEMENT_EXPERIMENT.md`; no hash because no transaction was authorized.
- Limitations (fixture, fork, testnet, simulation, live): This is an experiment design, not Kuru execution evidence.
- Next action: M0.7 — probe CRE CLI, SDK, network/forwarder support, and account access.

---

- ID and requirement: DOC-03 / English submission documentation
- Date: 2026-09-15
- Environment and chain ID: Documentation-only; no chain or runtime accessed
- Version/commit/source URL: Controlled translation of user-final specification and handoff instructions
- Command or reproducible steps: Translated `README.md`, `CODEX_START_PROMPT.md`, and `docs/PRODUCT_SPEC_FINAL.md`; updated source provenance.
- Result (PASS / FAIL / BLOCKED): PASS — repository-facing documentation is English; no product behavior changed or integration claimed.
- Artifact / receipt / transaction hash: Git history for the documentation update
- Limitations (fixture, fork, testnet, simulation, live): English document is a controlled translation; resolve ambiguity against the user-final Indonesian source.
- Next action: Continue M0 compatibility validation from the English documentation set.

---

- ID and requirement: DOC-02 / M0 implementation-source update
- Date: 2026-09-14
- Environment and chain ID: Documentation-only; no chain or runtime accessed
- Version/commit/source URL: User-provided Metropolis resource update, stated source https://hackathon.monad.xyz/resources
- Command or reproducible steps: Reviewed supplied resource update; updated `docs/SOURCES.md`, `docs/HACKATHON_REQUIREMENTS.md`, and `docs/INTEGRATION_VALIDATION.md`.
- Result (PASS / FAIL / BLOCKED): PASS — references and prize interpretation recorded; no runtime integration claim.
- Artifact / receipt / transaction hash: Git history for the updated documentation
- Limitations (fixture, fork, testnet, simulation, live): User-provided portal content; external API support, entitlements, and current docs remain unverified.
- Next action: Use current primary documentation and executable probes to validate Monad/Kuru/CRE/Privy/Aurora compatibility.
