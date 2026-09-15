# M1.6 Kuru adapter boundary

`IKuruOrderBook.sol` is limited to the ABI surface recorded in `docs/KURU_COMPATIBILITY_INVESTIGATION.md`:

- `getMarketParams()`;
- `getL2Book()`; and
- `placeAndExecuteMarketBuy(uint96,uint256,bool,bool)`.

The buy function's `uint256 minAmountOut` type and quote conversion follow the pinned official Kuru contracts/SDK revisions and successful read-only proxy calls. For the selected USDC-6 market with `pricePrecision = 10^8`, `2,000,000` USDC smallest units map exactly to Kuru quote size `200,000,000`.

## Deliberate execution interlock

`KuruAdapterBoundary` binds an intended policy address, market, quote token, decimals, and precision values immutably. It has no arbitrary target, route, recipient, token, or mutable configuration. Its `executeBuy` method intentionally reverts with `KuruSettlementUnverified` even for its authorized policy.

This is a safety gate, not a stub presented as integration. The contract prevents a future caller from accidentally using a documentation/ABI match as evidence that Kuru's deployed write path will correctly consume input, return partial input, credit native MON, or leave no venue balance.

Replacing the interlock requires all evidence in the Kuru mentor request: implementation build provenance or verified source tied to the selected proxy, plus the authorized settlement experiment covering full/FOK/partial/minimum-output/native-output/residual-balance cases. That change must be separately reviewed, tested, and committed.
