# M2 market-data boundary

## Verified manual-L2 format

Kairos follows Kuru SDK revision `636509c2eafd63479d3f399703354e0d09f51e18` and contracts revision `2060bb2736080c175d80d568bfdb6226bb5abd04` for the decoded `getL2Book()` payload:

```text
block number
bid price, bid aggregate size ...
zero-price bid sentinel
ask price, ask aggregate size ... until payload end
```

Every value occupies one 32-byte word. Prices and sizes remain integers. Manual bids must be strictly descending, manual asks strictly ascending, and prices must align to `tickSize`. A malformed payload, identity mismatch, zero-size level, or invalid precision fails closed.

For policy display/comparison units, bid prices round down and ask prices round up. Base size rounds down. Raw price and size remain attached to each normalized level so later capacity traces are reproducible.

## Snapshot identity

Each snapshot records provenance kind, chain ID, market, block number, full block hash, block timestamp, observation timestamp, source revision, market state, parameters, and the original decoded L2 payload. The block number encoded by Kuru must equal the provider block identity supplied to the parser.

The compatibility replay uses Monad Testnet block `62944132`, hash `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`. The recorded raw `eth_call` return is ABI-decoded before parsing and produces the already evidenced empty manual book.

## Estimator coverage

Kuru's `getL2Book()` contains manual order-book levels. Kuru's SDK obtains AMM vault parameters separately and synthesizes additional levels. M2 initially marks AMM vault liquidity as `EXCLUDED`; it is never inferred from the manual payload. This is conservative: Kairos may underestimate available capacity and emit `WAIT` or a smaller proposal, but it will not claim unobserved vault liquidity.

The fixed compatibility snapshot also had zero vault bid/ask sizes, so exclusion does not change that snapshot's zero-capacity result. A future AMM-inclusive estimator requires market and vault reads pinned to the same block plus separate integer validation; it is not silently enabled here.
