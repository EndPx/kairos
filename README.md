# Kairos

> **Execute within your limits.**

Kairos is a market-aware spot-execution application on Monad. It gradually executes a USDC → MON order through Kuru's onchain order book, sizes each fill to available liquidity, and enforces the user's budget, schedule, price, and lifecycle limits onchain.

## Why Kairos

Large spot orders can consume several order-book price levels. Splitting orders manually is operationally demanding, while fixed-size schedules ignore changing liquidity. Kairos combines cumulative pacing with liquidity-aware sizing so users retain control without continuously monitoring the book.

Unused funds remain in the user's wallet. A token allowance permits narrowly defined execution, while the Kairos policy contract independently enforces the order's limits. Kairos does not custody prefunded user balances and does not require a delegated Privy signer.

## Product flow

```text
Privy embedded wallet
  → approve USDC and create a policy-bound order
  → CRE evaluates current Kuru market conditions
  → signed proposal reaches Kairos through a verified receiver
  → Kairos validates policy and executes atomically on Kuru
  → MON output and unused USDC return to the user wallet
```

Aurora Intents provides the cross-chain funding journey: funds settle to the user's wallet first, then the user explicitly authorizes an order. Cross-chain settlement never creates execution authority by itself.

## Core guarantees

- Wallet-held unused funds; no deposit-to-Kairos escrow model.
- Cumulative linear budget release and per-fill adaptive sizing.
- Onchain enforcement of budget, schedule, price limit, minimum/maximum fill, lifecycle, nonce, and authorized assets/recipient.
- Atomic accounting: actual input spent, actual output received, and unused input returned.
- Transparent `WAIT`, submitted, confirmed, failed, stale, cancelled, expired, and completed states.
- Separate cancellation and token-allowance revocation.

## Integrations

| Integration | Role |
|---|---|
| [Kuru](https://docs.kuru.io/) | Monad order-book market data and real spot execution |
| [Chainlink CRE](https://docs.chain.link/cre) | Market/policy orchestration and signed onchain reports |
| [Privy](https://docs.privy.io/) | Embedded wallet login and user-signed wallet actions |
| [Aurora Intents](https://docs.intents.aurora.dev/) | Cross-chain funding into the user wallet |

## Hackathon submission evidence

Kairos targets Onchain Finance & Trading and the Kuru, Privy, CRE, and Aurora sponsor bounties. The complete proof matrix is in [docs/ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md).

Evidence is recorded separately from documentation claims in [EVIDENCE.md](EVIDENCE.md). The current compatibility register is [docs/ENVIRONMENT_MATRIX.md](docs/ENVIRONMENT_MATRIX.md). A capability is not considered complete until it has reproducible runtime evidence.

## Repository guide

- [Product specification](docs/PRODUCT_SPEC_FINAL.md)
- [Technical decisions](docs/DECISIONS.md)
- [Integration validation](docs/INTEGRATION_VALIDATION.md)
- [Acceptance tests](docs/ACCEPTANCE_TESTS.md)
- [Workplan](WORKPLAN.md)
- [Current status](STATUS.md)
- [Sources and provenance](docs/SOURCES.md)

## Status

M2 is complete: the adaptive engine emits auditable EXECUTE and WAIT decisions from consistent policy and Kuru market snapshots, while the contract remains final policy authority. M3 application and sponsor orchestration have not started. No public deployment or transaction is represented as complete without evidence. See [STATUS.md](STATUS.md) and [docs/M2_EXIT_REVIEW.md](docs/M2_EXIT_REVIEW.md).

## Scope and safety

Kairos initially supports one MON/USDC buy path. It does not add perps, social trading, AI trade decisions, alternate sponsors, or a hidden escrow model. No real-money transaction, production deployment, or public claim is made without explicit authorization and verified evidence.
