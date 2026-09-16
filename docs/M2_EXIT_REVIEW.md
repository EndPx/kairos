# M2 exit review

Date: 2026-09-16

Reviewed baseline: `0faa2ad7ca2ffae18aaff7cf57ccc5e94a03c9cf`

Verdict: **M2 COMPLETE**

## Written exit condition

`WORKPLAN.md` defines the M2 exit condition as: the engine produces auditable proposals and wait decisions while the contract remains the final policy authority. M2.6 additionally requires thin/deep book, price-bound, rounding, stale/API failure, capacity-below-minimum, balance-contention, and deterministic-replay tests for ENG-01–03.

The implementation meets that written condition. It does not submit a transaction, bypass the M1 policy, or claim that an estimate guarantees future execution.

## Requirement mapping

| Requirement | Evidence | Status | Limitations |
|---|---|---|---|
| M2.1 — market-data adapter | `packages/engine/src/market/kuruL2.ts`, recorded response in `packages/engine/test/fixtures/kuruFixedSnapshot.ts`, and `kuruL2.test.ts` | PASS | The real fixed replay has an empty manual book. Non-empty books are labeled fixtures. AMM vault liquidity is excluded. |
| M2.2 — liquidity-capacity calculation | `packages/engine/src/capacity/manualBookCapacity.ts`, `manualBookCapacity.test.ts`, and `docs/M2_CAPACITY.md` | PASS | Capacity covers executable manual asks only. Market movement can invalidate it. |
| M2.3 — policy-state reader | `packages/engine/src/policy/policyStateReader.ts`, `policyStateReader.test.ts`, and `docs/M2_POLICY_READER.md` | PASS | The ethers source is production-shaped but tested with a deterministic read source because no public Kairos deployment is authorized. |
| M2.4 — decision engine | `packages/engine/src/decision/decisionEngine.ts`, `decisionEngine.test.ts`, and `docs/M2_DECISION_ENGINE.md` | PASS | EXECUTE means eligible to propose, not guaranteed settlement. The contract rechecks actual values. |
| M2.5 — freshness and retry policy | `packages/engine/src/freshness/*`, `adaptiveEvaluation.ts`, `freshnessRetry.test.ts`, and `docs/M2_FRESHNESS_RETRY.md` | PASS | The 24-block cadence sample is operational evidence, not a network SLA. |
| M2.6 — engine tests | Six engine test files / 24 tests, including `engineAcceptance.test.ts` | PASS | Fixtures cover non-empty liquidity and nonzero fees; replay/fork/live boundaries remain labeled. |

## Acceptance mapping

| ID / scenario | Evidence | Result |
|---|---|---|
| ENG-01 — thin versus deep book | `manualBookCapacity.test.ts` | PASS — the same policy input limit produces `20,000,000` input / `400 MON` output for the thin fixture and `44,000,000` / `800 MON` for the deep fixture. |
| ENG-02 — stale/API failure | `freshnessRetry.test.ts` | PASS — stale, invalid, future-dated, and exhausted-source cases return WAIT with no proposal. |
| ENG-03 — capacity below minimum | `decisionEngine.test.ts` and `engineAcceptance.test.ts` | PASS — below-minimum fixture capacity and the recorded empty Kuru snapshot return WAIT with no proposal or onchain event. |
| Price bound | `manualBookCapacity.test.ts`, `decisionEngine.test.ts` | PASS — cumulative effective-average price is enforced; individual levels are not incorrectly used as the policy rule. |
| Fee and decimal rounding | `manualBookCapacity.test.ts` and M1 shared unit tests | PASS — quote input rounds up, base output rounds down, and Kuru's aggregate output-fee ceiling is applied before price evaluation. |
| Balance contention | `engineAcceptance.test.ts` | PASS — refreshing a shared wallet balance below `minFill` changes EXECUTE to WAIT / `INSUFFICIENT_BALANCE`. |
| Schedule boundary and dust | `decisionEngine.test.ts`, `engineAcceptance.test.ts`, and the M1 policy suite | PASS — the engine consumes contract-derived availability, emits NOT_DUE below `minFill`, executes at the boundary, and does not reimplement schedule arithmetic. |
| Deterministic replay | `decisionEngine.test.ts` and `engineAcceptance.test.ts` | PASS — identical input produces byte-for-byte-equivalent serialized decision data across 25 evaluations. |

## Auditable examples

All example quantities are integer token units. Fixture prices use Kuru price precision `100,000,000`; quote is USDC-6 and base output is MON-18.

### Thin-book EXECUTE

- Manual ask: price `5,000,000`, raw size `4,000,000,000,000`.
- Capacity: input `20,000,000`, output `400,000,000,000,000,000,000`, stop `BOOK_EXHAUSTED`.
- Decision fixture selects `20,000,000`, the smallest of release, remaining budget, maximum fill, shared balance, allowance, and capacity.
- Proposal retains order nonce, snapshot hash, validity, proposed input, and minimum output. The contract remains authoritative.

### Deep-book EXECUTE

- Manual asks: `(5,000,000, 4,000,000,000,000)` and `(6,000,000, 4,000,000,000,000)`.
- Capacity: input `44,000,000`, output `800,000,000,000,000,000,000`, two trace steps.
- The cumulative effective-average rule accepts both levels under the fixture limit. It does not impose a per-match price bound.

### Recorded-snapshot WAIT

- Source: Monad Testnet `10143`, Kuru market `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`, block `62944132`, hash `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`.
- Decoded manual L2: no bid or ask levels; recorded vault sizes were also zero in the separate M1 probe.
- Capacity: input `0`, output `0`, stop `NO_LIQUIDITY`.
- Decision: WAIT / `INSUFFICIENT_LIQUIDITY`; no proposal and no onchain event.

## Authority and safety boundaries

- The engine uses the M1 shared integer types and consumes contract-derived lifecycle, released budget, and available-to-spend values.
- Wallet balance and allowance are observations shared across orders, never offchain reservations.
- Every EXECUTE output is only a proposal. M1 contract checks for nonce, expiry, cancellation, cumulative release, budget, actual input, actual minimum fill, and actual effective price remain final.
- The public execution interlock is unchanged. No public transaction or deployment occurred in M2.
- AMM vault capacity is deliberately excluded until vault and market state can be normalized at one consistent block. This may produce smaller proposals or WAIT even where unmodeled vault liquidity exists.
- The real L2 proof demonstrates decoding/provenance compatibility for an empty snapshot. Non-empty layout, fee, price-bound, and rounding behavior are explicit fixtures, not claims about live liquidity.
- This review is not a source-equivalence proof, security audit, availability guarantee, or public execution proof.

## Exit decision

M2 is **COMPLETE** against the written `WORKPLAN.md` exit and ENG-01–03 acceptance requirements. M3 may begin as a separate milestone, but no M3 implementation is included in this review.
