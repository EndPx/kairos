# Kairos — Final Product Specification

> Controlled English submission translation. The product contract is unchanged.

**Kairos is a Monad spot-execution app that splits large orders into transactions, adapts each size to market liquidity, and enforces user limits through a smart contract.** Users set a buy target, budget, duration, and price limit; Kairos evaluates and executes while unused funds remain in the user's wallet.

## 1. Identity
**Name:** Kairos · **Description:** Market-aware spot execution on Monad · **Tagline:** **Execute within your limits.**

Kairos automatically sizes and executes spot orders according to available liquidity and trading limits. It does not promise best price or completion before deadline; it promises transparent, consistent execution control.

## 2. Problem and user
Large orders relative to book depth sweep price levels. Manual splitting requires constant monitoring, while fixed sizing ignores current liquidity. Kairos combines time-based pacing, liquidity-aware sizing, and onchain policy enforcement for Monad spot traders who need controlled gradual execution. Testnet use is product testing, not economic-volume evidence.

## 3. Scope
Initial scope: one Kuru MON/USDC market, USDC→MON buys, linear cumulative scheduling, adaptive fills, wallet-held unused funds, onchain policy, CRE automation, Privy embedded wallet, Aurora Intents funding, and decisions/fills/fees/progress/receipts. No perps, social trading, token discovery, or AI trading decisions.

## 4. UX
Privy login exposes embedded-wallet address, input balance, gas/sponsorship status if available, and network. Funding is either existing Monad USDC or Aurora settlement to the same user wallet; exact supported route must be proven. The create form captures budget, duration, maximum effective buy price, maximum-per-fill, and minimum fill. It explicitly states funds are not locked, partial completion is possible, and allowance/balance must stay sufficient. Approval and creation are separate unless supported batching is proven.

Orders show spent, MON received, remaining budget, wallet balance, limits, market condition, latest decision, and history. Users can cancel an order or separately revoke token approval. There is no withdrawal action for funds never pulled.

## 5. Authorization and policy
`allowance`, owner-approved order policy, and executor authorization are distinct. Allowance alone does not encode schedule or price. Delegated Privy signing is not required: an authorized executor may call an allowance-based contract without a user signature per fill.

Order data: `owner`, `market`, `tokenIn`, `tokenOut`, `budget`, `spent`, `received`, `startTime`, `endTime`, `maxPerFill`, `minFill`, `priceLimit`, `status`, and `executionNonce`. Values use integer token units; UI dollars are estimates. Budget includes every charged input-token debit; gas is separate; a future protocol fee must be explicit (hackathon fee may be zero).

## 6. Scheduling and sizing
```text
releasedBudget(t) = budget × elapsedTime / duration
availableToSpend = max(0, releasedBudget(t) - spent)
proposedFill = min(availableToSpend, remainingBudget, maxPerFill,
                   walletBalance, tokenAllowance, estimatedLiquidityCapacity)
```
Time is clamped to the order period and expiry rejects execution. If proposal is below `minFill`, wait. Deferred budget may catch up. `maxPerFill` limits one transaction only; execution spacing requires an explicit `minExecutionInterval`.

## 7. Liquidity, price, settlement
The engine records market/snapshot identity, capacity, estimated output/fee, proposal, and wait/execute reason; stale data cannot create a proposal. BUY price policy is the actual effective average (`actual input / actual output`), not a per-match price guarantee.

An execution atomically validates order/sender/nonce/schedule/budget; pulls input; executes the proven Kuru path; computes actual deltas; validates actual minimum fill and price; updates accounting; forwards output and unused input to the user; and emits an event. Violation reverts all. Do not attribute pre-existing adapter balance to a fill or leave a resting venue balance. Kuru partial-fill/refund behavior must be directly tested.

## 8. Lifecycle and decisions
States: `ACTIVE`, `COMPLETED`, `EXPIRED`, `CANCELLED`; partial fill is progress. Timestamp expiry is enforced without a separate storage update. Reasons: `NOT_DUE`, `INSUFFICIENT_LIQUIDITY`, `PRICE_OUT_OF_BOUNDS`, `INSUFFICIENT_BALANCE`, `INSUFFICIENT_ALLOWANCE`, `STALE_MARKET_DATA`, `REMAINDER_BELOW_MIN_FILL`, `EXPIRED`, `CANCELLED`. `WAIT` is not a transaction revert. Dust is not forced; cancel does not revoke allowance.

## 9. Integrations and architecture
Kuru supplies real order-book data/execution; CRE reads policy and data, calculates proposals, and submits reports; Privy signs approval/create/cancel/revoke; Aurora funds the user wallet. CRE writes follow `workflow → signed report → Chainlink forwarder → Kairos receiver → policy validation → Kuru`; receiver validates provenance, expiry, and nonce. Aurora arrival grants no order authority.

Frontend: wallet, create, funding, orders, reports. Contracts: registry, policy, accounting, CRE receiver, Kuru adapter. Indexer: events, receipts, offchain decisions. Onchain events are truth for fills/lifecycle; offchain `WAIT` records are clearly labeled.

## 10. Technical and proof standard
Restrict market/token/recipient; prevent reentrancy; handle decimals, rounding, fees, native MON output, partial fills, replay, stale data, retry, and restart recovery. The executor cannot select arbitrary assets/routes/recipients or withdraw freely. Test cumulative budget, max/budget/schedule rejection, expiry, cancel, actual min fill, dust, price, partial input/refund, pre-existing balance, venue leftovers, reentrancy, stale/duplicate report, balance/allowance changes, thin/deep books, and stale data.

## 11. Demo, submission, and build order
Demo Privy wallet transactions, adaptive fills, wait conditions, cancellation/completion, receipts, price failure, partial fill, revoked approval, real Aurora funding/use, and verifiable CRE simulation/deployment. Label testnet, fixture, replay, and real evidence honestly.

Submission includes public repository, run/test instructions, architecture, deployed addresses/transactions, technical and pitch videos, live link, sponsor contribution, and limitations. Build in order: compatibility → execution core → adaptive engine → CRE/UI → Aurora → full proof.

## 12. Definition of done
Ready only when users manage orders; unused funds are never pre-funded to Kairos; adaptive Kuru fills and all policy limits are proven; partial settlement returns correctly; CRE, Privy, and Aurora work in proven environments; dashboard matches settlement; and claims do not exceed evidence.

**Kairos is a complete inspectable execution product: user limits, market-capacity calculation, onchain authority enforcement, and results returned to the user's wallet.**
