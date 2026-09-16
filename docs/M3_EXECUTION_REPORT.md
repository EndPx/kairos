# M3 execution-report accounting

## Evidence sources

The report page combines three sources without merging their authority:

- `ExecutionSettled` events provide actual input, actual output, returned input, nonce, and snapshot identity.
- The current policy read provides authoritative cumulative spent and received totals. A mismatch is shown as index lag, not silently reconciled.
- Each indexed fill transaction is enriched from its public transaction, successful receipt, canonical block, and Kuru `getMarketParams()` read at that fill block.

The page does not infer a failed transaction from an absent settlement event. Privy wallet attempts are stored in a versioned browser-local journal and remain labeled `LOCAL WALLET`; malformed local data fails closed. This journal survives a page or application restart on the same browser profile, but it is not trusted as onchain evidence.

## Integer accounting

- Actual input/output totals are sums of indexed settlement integers.
- Weighted average BUY price is calculated from aggregate input and output with USDC-6, MON-18, and policy-price-8 scales. The displayed integer price rounds upward so the UI does not understate effective cost.
- A trading fee is reported as exact zero only when every fill-block Kuru parameter read returns `takerFeeBps == 0`. Kairos records net output, so a nonzero venue fee is not reconstructed from the settlement event and remains explicitly unavailable.
- Monad network gas is reported separately as submitted gas limit multiplied by the receipt effective gas price, following the documented Monad charging rule. Receipt `gasUsed` remains diagnostic data and is not substituted into charged-gas accounting.
- Duration is the timestamp span from the first to the last enriched fill block. A single fill has a zero-second fill span.

## Failure and freshness behavior

If a transaction, receipt, block, or historical market-parameter read cannot be matched to the indexed successful fill block, that fill remains visible but receipt enrichment is marked incomplete. The application does not fabricate a block hash, fee, duration, or gas value.

Explorer links are derived from the pinned viem Monad Testnet chain definition. A rejected wallet request has no explorer link because no public transaction hash exists.

## Current boundary

The calculation and restart behavior are covered by local tests and the missing-configuration route is visually inspected. No public Kairos deployment or real indexed fill exists in the current environment, so this is not a live execution-report proof. Public execution remains interlocked by the M1 boundary.
