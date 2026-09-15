# M1 Kuru compatibility investigation

Investigation date: 2026-09-15  
Chain: Monad Testnet `10143`  
Market proxy: `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`  
EIP-1967 implementation: `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`

## Primary repository and ABI evidence

| Source | Immutable revision inspected | Relevant artifact | Finding |
|---|---|---|---|
| [Kuru contracts](https://github.com/Kuru-Labs/Kuru-contracts-dex-public) | `2060bb2736080c175d80d568bfdb6226bb5abd04` (`main` at probe time) | `contracts/OrderBook.sol`, `contracts/interfaces/IOrderBook.sol` | Defines `getMarketParams`, `getL2Book`, and `placeAndExecuteMarketBuy/Sell` with `uint256` minimum output. |
| [Kuru SDK](https://github.com/Kuru-Labs/kuru-sdk) | `636509c2eafd63479d3f399703354e0d09f51e18` (`main` at probe time) | `abi/OrderBook.json`, `src/market/marketParams.ts`, `src/market/orderBook.ts` | ABI and decoder provide an independently readable client reference. |

The current SDK ABI declares these read functions, and both succeeded against the selected proxy:

```text
getMarketParams() ->
  (uint32 pricePrecision, uint96 sizePrecision, address baseAsset,
   uint256 baseAssetDecimals, address quoteAsset, uint256 quoteAssetDecimals,
   uint32 tickSize, uint96 minSize, uint96 maxSize,
   uint256 takerFeeBps, uint256 makerFeeBps)

getL2Book() -> bytes
```

The repository's market-execution ABI uses:

```text
placeAndExecuteMarketBuy(uint96 quoteSize, uint256 minAmountOut, bool isMargin, bool isFillOrKill)
placeAndExecuteMarketSell(uint96 size, uint256 minAmountOut, bool isMargin, bool isFillOrKill)
```

This corrects the earlier documentation-only uncertainty: `minAmountOut` is `uint256` in the pinned official source/SDK ABI, not a guessed narrow integer type.

## Read-only runtime probe

Command technique: a Python standard-library JSON-RPC `eth_call` helper with Keccak selectors and the official SDK output layout. No account, private key, gas, value, or transaction was used.

| Call | Selector | Result |
|---|---|---|
| `getMarketParams()` | `0x90c9427c` | Returned and ABI-decoded successfully |
| `getL2Book()` | `0x46fdfbb1` | Returned and ABI-decoded successfully |

Decoded market parameters:

| Field | Value | Interpretation |
|---|---:|---|
| `pricePrecision` | `100000000` | Price unit scale: `10^8` |
| `sizePrecision` | `10000000000` | Base-size unit scale: `10^10` |
| `baseAsset` | `0x0000000000000000000000000000000000000000` | Native MON base asset |
| `baseAssetDecimals` | `18` | MON base decimal metadata |
| `quoteAsset` | `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570` | Selected USDC quote asset |
| `quoteAssetDecimals` | `6` | USDC quote decimal metadata |
| `tickSize` | `100` | Raw price tick; `100 / 10^8 = 0.000001` quote per base |
| `minSize` | `2000000000000` | Raw base size; `200` MON at the reported size scale |
| `maxSize` | `2000000000000000000` | Raw base size; `200,000,000` MON at the reported size scale |
| `takerFeeBps` | `0` | Current returned taker fee value |
| `makerFeeBps` | `0` | Current returned maker fee value |

The native base plus USDC quote establishes the initial Kairos direction: a market buy accepts quote-sized USDC input and credits native MON output. A contract adapter must forward native output safely and account for native gas independently.

`getL2Book()` returned an ABI-encoded dynamic byte payload of 64 bytes at the probed block `62636237`: the block number followed by a zero bid sentinel. Decoding with the pinned SDK layout yielded zero manual bid and ask levels. This only proves the wire format and this snapshot's manual-level payload; it does **not** prove executable liquidity, because the SDK combines manual levels with AMM-vault data through additional reads.

## Explorer and implementation identity result

The MonadScan Testnet implementation page returned HTTP 200 but describes `0x72cae...c9374` as **Contract: Unverified** and presents "Verify and Publish". The proxy page is likewise a proxy page, but does not establish that the pinned GitHub revision compiled to the deployed implementation.

An unauthenticated Etherscan V2 `getsourcecode` request for chain `10143` returned `status: 0`, `message: NOTOK`; it did not supply source or ABI. This is an access limitation, not proof that no verification source exists elsewhere.

## Compatibility conclusion

**Partially verified.** The official SDK ABI is behaviorally compatible with the selected proxy for both essential read functions, and the returned parameters establish native-MON/USDC orientation, precisions, bounds, and current fee values. The exact deployed implementation source/bytecode equivalence and all write-path settlement semantics remain unproven. Kairos must not mark the Kuru adapter integrated or execute market orders from this evidence alone.

## Remaining blocker and mentor request

Before M1.6 can be treated as a real adapter proof, obtain one of the following from Kuru:

1. A canonical release tag/commit and deployment manifest tying this Testnet proxy implementation to the exact `OrderBook.sol` build, including compiler/version/optimizer settings; or
2. Verified implementation source/ABI on a public explorer plus deployment/upgrade provenance; and
3. Authorization and a funded Testnet wallet for the bounded cases in `docs/KURU_SETTLEMENT_EXPERIMENT.md`: full fill, `minOut` revert, FOK revert, non-FOK partial fill, native output forwarding, and zero residual venue/adapter balances.

The next independent M1 action is generic policy/core implementation with explicitly labeled test fixtures. The adapter will retain the verified interface boundary but stay blocked from live claims until this evidence exists.
