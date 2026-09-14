# Source map and provenance
Prepared 2026-09-14 from this conversation's official-document reads and user-provided materials.
This is a curated source index, not a vendored copy of all sponsor docs. Re-fetch relevant pages and pin versions before coding.
Do not treat documentation descriptions as proof of deployed behavior.

## Local authoritative sources
- PRODUCT_SPEC_FINAL.md: byte-for-byte copy of final user attachment.
- ../sources/TRACKS_RAW.txt: complete user-provided track/bounty list.
- ../sources/AURORA_RAW.txt: complete user-provided Aurora details.
- HACKATHON_REQUIREMENTS.md: normalized other sponsor details transcribed from user message; not raw portal HTML.
Older design drafts intentionally excluded to prevent resurrecting escrow or mandatory delegation.

## Metropolis resource update (user-provided, 2026-09-14)
- Full portal catalog was supplied by the user as `sources/METROPOLIS_RESOURCES_RAW.md`; it is contextual portal material, not a verified API reference or a new product requirement. The raw catalog has not yet been added to this repository.
- Highest-priority references for Kairos are the official Monad pages for EVM differences, gas pricing, reserve balance, contract verification, indexers, and the Next.js/Serwist/Privy embedded-wallet template.
- `https://github.com/monad-developers/kuru-terminal` is a reference for Kuru event ingestion and recovery only. Inspect its license and pin a commit before any reuse; do not adopt its entire provider set or mistake it for Kairos's adaptive engine.
- The resource catalog's “Execution-Aware Trading Interfaces” category supports thematic alignment only. It does not establish novelty, eligibility, sponsor capability, or an award.
- Do not replace the required Kuru order-book path with the catalogue's 0x/Privy example. Do not interpret “no pending states” as a UI requirement: Kairos must show submitted, confirmed, failed, and stale states honestly.
- QuickNode, Tenderly, and Zerion references are optional unclaimed team perks. Eligibility, limits, and Monad support must be confirmed before use; they are not cash prizes or required integrations.

## Kuru
- https://docs.kuru.io/ — official overview.
- https://docs.kuru.io/llms.txt — documentation index.
- https://docs.kuru.io/contracts/OrderBook — market functions, minOut, FOK, view functions, events. Read in conversation.
- https://docs.kuru.io/contracts/Router — routed swaps. Read in conversation.
- https://docs.kuru.io/contracts/Contract-addresses — mainnet/testnet markets and tokens. Read; reverify chain/code/ABI.
- https://docs.kuru.io/contracts/Architecture-overview — architecture reference from index.
- https://docs.kuru.io/contracts/MarginAccount — balance model reference from index.
- https://docs.kuru.io/sdk/orderbook-sdk — SDK reference from index.
- https://kuru-testnet-docs.mintlify.site/ — bounty-provided link; web fetch failed in this session.
Do not substitute aggregator routes that bypass the required order book. Fetch verified contract source/ABI from official references and record revision. Faucet gist URL was not provided in full.

## CRE
- https://docs.chain.link/cre — overview, simulation versus deployment access. Read.
- https://docs.chain.link/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts — signed report, forwarder, onReport receiver. Read.
- https://docs.chain.link/cre/guides/operations/simulating-workflows — simulation reference. Opened.
- https://github.com/smartcontractkit/cre-templates/ — official templates from bounty.
- https://smartcontractkit.github.io/cre-bootcamp-2026/ — bounty learning resource.
Use current supported-networks, forwarder-directory, service-quotas and SDK docs linked from overview. Prior mainnet support announcement does not establish testnet availability or tenant access.

## Privy
- https://docs.privy.io/ — docs.
- https://docs.privy.io/llms.txt — index.
- https://docs.privy.io/controls/overview — ownership, policies, signing controls. Read.
- https://docs.privy.io/wallets/using-wallets/ethereum/send-a-transaction — transaction signing/broadcast. Read.
- https://docs.privy.io/basics/react/quickstart.md — index-discovered quickstart.
- https://docs.privy.io/wallets/overview/chains.md — index-discovered chain support.
Do not assume sponsorship/batching on selected network. If a .md URL fails, try the normal page. Delegated signing optional, never grant arbitrary wallet authority for convenience.

## Aurora
- https://docs.intents.aurora.dev/ — official products overview. Read.
- https://docs.intents.aurora.dev/intents-deposits/quickstart/api-integration — recipient/refund/status flow. Read.
- https://docs.intents.aurora.dev/intents-deposits/quickstart — quickstart index. Read.
- https://docs.intents.aurora.dev/intents-connect/supported-chains — linked from docs; failed retrieval in session.
- https://docs.intents.aurora.dev/intents-deposits/supported-chains — linked from docs; re-fetch.
- https://docs.intents.aurora.dev/getting-started/api-keys-and-fees — linked from docs; re-fetch.
- https://intents.aurora.dev/ — product overview. Read.
API examples require revalidation against endpoint reference, not blind copying. Exact token IDs, route, account key, destination, and refund handling remain unproven. Do not assume Connect and Deposits share support matrices.

## Monad and event
- https://docs.monad.xyz/developer-essentials/getting-started — official starting point supplied by bounty.
- https://developers.monad.xyz/ — developer portal.
- https://hackathon.monad.xyz/ — public page opened; login required for full details.
- https://hackathon.monad.xyz/resources — bounty link; fetch failed.
User-provided deadline is precise local time; do not infer a different deadline from marketing dates.

Additional current-primary-doc checks before implementation:
- https://docs.monad.xyz/developer-essentials/differences — verify deviations from Ethereum before applying tooling or execution assumptions.
- https://docs.monad.xyz/developer-essentials/gas-pricing — verify current gas behavior.
- https://docs.monad.xyz/developer-essentials/reserve-balance — account for native gas reservation separately from Kairos's input/output accounting.
- https://docs.monad.xyz/guides/verify-smart-contract/index — deployment verification procedure.
- https://docs.monad.xyz/guides/indexers/index — indexer selection and recovery reference.
- https://docs.monad.xyz/templates/next-serwist-privy-embedded-wallet — candidate scaffold only; inspect dependencies and license before adoption.

## Standards and agent setup
- https://eips.ethereum.org/EIPS/eip-20 — allowance/transferFrom standard. Read.
- https://learn.chatgpt.com/docs/agent-configuration/agents-md — official AGENTS.md guidance, opened via developers.openai.com/codex/guides/agents-md.

## Evidence discipline
For each integration save date, URL, package version/commit, chain ID, contract code/ABI verification, transaction/log or test artifact.
Source statuses: user-final / user-rules / docs-read / discovered-not-verified / runtime-verified.
No runtime-verified sponsor integration currently exists in this package.
