# M2 freshness and retry policy

## Evidence basis

On 2026-09-16, a read-only sample of 24 recent Monad Testnet blocks from the Foundation RPC produced 23 timestamp intervals: minimum `0s`, median `0s`, p95 `1s`, and maximum `1s`. Multiple blocks may share a one-second timestamp. The RPC rejected a JSON-RPC batch request with `Restricted JSON RPC method`; 24 bounded individual block reads succeeded.

The measured sample is operational evidence, not a network SLA. Kairos therefore uses a fail-closed margin rather than assuming every future block follows this cadence.

## Selected policy

| Setting | Value | Rationale |
|---|---:|---|
| Maximum snapshot age | `10s` | Ten times the observed maximum timestamp interval; stale enough to avoid blind execution while allowing bounded transport variance. |
| Proposal validity | `5s` | Half the freshness window and multiple observed block intervals; the contract still checks nonce, lifecycle, and release at execution. |
| Request timeout | `2000ms` | Individual sample reads completed well below this bound; a hung source is aborted rather than awaited indefinitely. |
| Maximum attempts | `3` | One initial request plus two bounded retries. |
| Backoff | `250ms`, then `500ms` | Deterministic exponential backoff, capped at `1000ms`; avoids immediate retry pressure. |

Freshness uses the canonical block timestamp, not only client receipt time. Policy and market block timestamps must agree, observation time cannot precede the block or exceed evaluation time, and age above `10s` yields `STALE_MARKET_DATA` with no proposal.

Every successful retry path is freshness-checked after data acquisition. Exhausted retries return an auditable `WAIT / STALE_MARKET_DATA` record with attempt count and delays, but without raw provider error text or a proposal. Missing, stale, future-dated, or inconsistent data can never produce blind execution.
