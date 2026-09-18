# Kairos hackathon submission brief

Updated: 2026-09-17

## One-line description

Kairos automatically sizes and executes spot orders on Monad based on available liquidity and user-defined limits.

## The problem

An onchain buyer who wants to accumulate a meaningful spot position has two poor choices: watch the book and split the order manually, or hand control to fixed-size automation that ignores current executable liquidity. A large marketable order can consume multiple price levels, while an inflexible schedule can either over-trade a thin book or underuse a deep one.

Existing automation also tends to blur three different authorities: the user's wallet permission, the automation's proposal, and the venue execution. That makes it difficult to answer basic questions such as how much was actually spent, which limit authorized it, whether unused funds were ever custodied, and whether a displayed decision became a confirmed settlement.

## The user

The initial customer profile is an active Monad spot buyer who:

- wants to accumulate MON from USDC over a bounded time window;
- understands wallet approvals but does not want to monitor Kuru continuously;
- cares more about a hard effective-average-price ceiling and wallet custody than guaranteed completion;
- needs a recoverable audit trail for orders, automation decisions, wallet attempts, and fills.

This is intentionally narrower than "all crypto users." The first market and buy direction let Kairos make units, venue behavior, and risk limits exact before broadening coverage.

## The solution

The user creates an onchain policy defining the market, assets, recipient, total budget, schedule, maximum and minimum fill, expiry, and maximum effective average price. Unused funds stay in the wallet under a separate ERC-20 allowance.

Kairos then:

1. reads Kuru L2 market data and policy/wallet capacity at a named snapshot;
2. calculates executable capacity in integer units, including fees and conservative rounding;
3. emits a deterministic `EXECUTE` proposal or a reasoned `WAIT` trace;
4. passes an executable report through the CRE receiver;
5. lets the policy contract revalidate every bound and settle atomically through Kuru;
6. indexes confirmed lifecycle/fill events through Envio for recovery and reporting.

The offchain engine can size a proposal but cannot grant itself more budget, choose another recipient, change the market, bypass cancellation, or turn stale data into authority.

## Why it is technically differentiated

- **Wallet-held funds:** the policy pulls only the authorized execution amount; there is no prefunded Kairos escrow.
- **Cumulative pacing:** released budget is cumulative, so missed intervals do not become forced trades and repeated fills cannot outspend the schedule.
- **Liquidity-aware sizing:** capacity comes from executable Kuru levels rather than a fixed interval amount.
- **Actual-delta accounting:** the contract enforces limits using measured input/output and returns unused input atomically.
- **Average-price semantics:** the ceiling applies to the effective aggregate price, not as an accidentally stricter per-match limit.
- **Evidence-aware UI:** simulation, replay, fork, local wallet state, onchain history, and confirmed receipts remain visibly distinct.

## Integration depth

### Kuru

Kairos parses the verified L2 encoding, token orientation, decimals, precisions, market bounds, and fee units. A fixed-block fork calls the selected Kuru proxy through the same adapter path used by the application and covers partial input, FOK/minimum-output reverts, native MON forwarding, refunds, zero residuals, and no resting taker order. This is behavioral fork evidence, not a public trade or source-build equivalence claim.

### Chainlink CRE

The CRE workflow combines external JSON-RPC acquisition with same-block policy and Kuru reads, invokes the deterministic engine, and encodes the production receiver report. Authenticated CLI simulations prove a real-chain WAIT path and a separately labeled fixture-backed EXECUTE/report path. Deployment and forwarder delivery are not claimed.

### Privy

The embedded wallet completed six authorized Monad Testnet transactions through the application: two bounded lifecycle-only deployments, a 1 USDC approval, order creation, cancellation, and allowance revocation. All receipts succeeded, the final order is `CANCELLED`, the allowance is zero, and total gas cost was `0.21368949 MON` testnet.

### Envio

The public HyperIndex deployment starts at the verified policy deployment block and indexed the real `OrderCreated` and `OrderCancelled` events. The application consumes that endpoint for `/orders`, order detail, and `/reports`, exposes index readiness/lag, and preserves data after reload without a fixture fallback. No nonzero fill aggregate is claimed before a real `ExecutionSettled` event exists.

### Aurora Intents

The integration begins with strict supported-token discovery. It requires the exact destination chain, token contract, and decimals to match the Kuru market before a route can become usable. Authenticated discovery maps the available Monad USDC to Mainnet chain `143`, not the current Monad Testnet `10143` Kuru token. A user-relayed Aurora team response says there is no separate testnet. M4 is unmet and parked before quote creation or value movement, pending an explicit Mainnet-scope decision or an official support change.

## Measured validation

| Measurement | Result | Boundary |
|---|---:|---|
| Public Privy lifecycle transactions | `6 / 6` successful | Monad Testnet; no trade |
| Lifecycle gas cost | `0.21368949 MON` | Testnet MON |
| Envio events processed | `2` | Real create/cancel events |
| Envio application lag during E2E | `0` blocks | Named E2E observation |
| CRE real-Kuru stale WAIT handler | `927 ms` | Simulation; fixture policy |
| CRE executable report handler | `647 ms` | Simulation; fixture policy and L2 |
| CRE real-policy cancelled WAIT handler | `3486 ms` | Simulation; real same-block reads |
| Adaptive engine tests | `24` passing | Replay and fixtures |
| Web tests after M3 recovery work | `39` passing | Local component/journey tests |
| Aurora route-boundary tests | `8` passing | Authenticated discovery; no route matching the current deployment and no quote |

These are engineering-validation measurements, not user adoption or trading-performance claims. Kairos has not published ROI, price-improvement, or user-growth numbers.

## Three-minute demo path

1. Log in with Privy and show the embedded wallet, Monad Testnet identity, balance, and explicit transaction boundary.
2. Open the create-order form and explain wallet-held budget, cumulative release, maximum effective average price, and separate approval.
3. Show the CRE decision trace: snapshot identity, capacity inputs, and why a proposal is `EXECUTE` or `WAIT`.
4. Open `/orders/0`, reload, and show that the real cancelled order is recovered from Envio while current state comes from a pinned contract read.
5. Open `/reports` and show sync health, zero confirmed fills, and unavailable weighted price—demonstrating that the UI does not invent settlement data.
6. Close with the fixed-fork Kuru settlement evidence and the explicit interlock preventing it from being mislabeled as a public trade.

## Adoption wedge

1. **Technical pilot:** recruit Kuru power users already splitting MON/USDC orders manually; validate whether the policy limits and WAIT explanations match their execution workflow.
2. **Trust before breadth:** publish named receipts, deterministic traces, and contract/fork verification for one market before adding more assets.
3. **Distribution through integrations:** surface Kairos to Monad/Kuru communities as a transparent execution-control layer, with Privy reducing wallet friction and Envio making history independently inspectable.
4. **Expansion:** add markets only after their ABI, units, fees, liquidity sources, and settlement behavior pass the same adapter evidence gates.

No user-count, partnership, or conversion claim is made yet. This is the proposed path to first users, not evidence that distribution has already occurred.

## Judge verification

- Start with the public deployment table and local quickstart in [`README.md`](../README.md).
- Inspect actual acceptance status in [`ACCEPTANCE_TESTS.md`](ACCEPTANCE_TESTS.md).
- Follow exact commands, commits, blocks, receipts, and limitations in [`EVIDENCE.md`](../EVIDENCE.md).
- Review live lifecycle evidence in [`evidence/M3_PRIVY_LIFECYCLE.md`](evidence/M3_PRIVY_LIFECYCLE.md) and [`evidence/M3_ENVIO_LIVE.md`](evidence/M3_ENVIO_LIVE.md).
- Review the fixed-fork boundary in [`KURU_FORK_SETTLEMENT.md`](KURU_FORK_SETTLEMENT.md).
- Review unresolved product requirements in [`STATUS.md`](../STATUS.md).

## Remaining submission assets

The repository and public index endpoint are available. A hosted frontend URL, recorded end-to-end demo video, and pitch deck are not yet linked from the repository. They should be produced from the evidence above without upgrading simulations, forks, or lifecycle-only actions into broader claims.
