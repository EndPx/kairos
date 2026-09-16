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

### Follow-up AMM-vault read

The same pinned SDK ABI declares `getVaultParams()`. A follow-up `eth_call` using selector `0x88bb4f60` returned eight ABI words:

| Field | Value |
|---|---:|
| `kuruAmmVault` | `0xfCd4C42d772e63Db2E09e87dC42010C8973a9B0f` |
| `vaultBestBid` | `0` |
| `bidPartiallyFilledSize` | `0` |
| `vaultBestAsk` | `uint256.max` sentinel |
| `askPartiallyFilledSize` | `0` |
| `vaultBidOrderSize` | `0` |
| `vaultAskOrderSize` | `0` |
| `spread` | `100` |

Together with the L2 payload, this snapshot contains no manual levels and no active vault bid/ask size. It is a point-in-time read, not a statement that the market cannot later have liquidity. The adaptive engine must treat this state as no executable capacity rather than constructing a trade.

## Explorer and implementation identity result

The MonadScan Testnet implementation page returned HTTP 200 but describes `0x72cae...c9374` as **Contract: Unverified** and presents "Verify and Publish". The proxy page is likewise a proxy page, but does not establish that the pinned GitHub revision compiled to the deployed implementation.

An unauthenticated Etherscan V2 `getsourcecode` request for chain `10143` returned `status: 0`, `message: NOTOK`; it did not supply source or ABI. This is an access limitation, not proof that no verification source exists elsewhere.

Additional source-verification paths were checked after the initial investigation:

| Path | Result | Consequence |
|---|---|---|
| Sourcify v2 contract endpoint | HTTP `404` for chain `10143` / implementation | No verified Sourcify artifact is available at that path. |
| Sourcify full-match metadata | HTTP `404` | No full-match metadata at that path. |
| Sourcify partial-match metadata | HTTP `404` | No partial-match metadata at that path. |
| Pinned Kuru repository build configuration | Current revision selects solc `0.8.30`, optimizer runs `1000`, `viaIR: true`, and Prague EVM | This is useful source provenance but cannot be equated to the unverified deployed implementation without a deployment manifest or verification metadata. |

No bytecode equivalence claim is made from the current repository. The source contract itself declares `pragma ^0.8.20`, while the repository configuration selects a specific newer compiler profile; the missing deployment build metadata is material.

### Runtime bytecode metadata follow-up

The implementation runtime bytecode is 35,548 bytes and ends with a 51-byte Solidity CBOR metadata segment. It identifies:

| Metadata field | Observed value |
|---|---|
| Compiler version bytes | `0x00081e` → solc `0.8.30` |
| IPFS metadata CID | `Qmejh4dRV4xZGQwU9asEepspYaALt2eodjoRegaJRe9tT7` |

The compiler value aligns with the pinned repository configuration (`0.8.30`), which is useful corroboration but still not proof that the current GitHub revision is the deployed build. Attempts to retrieve that CID's metadata from public gateways were rate-limited (`429`) or denied/not found (`403`/`404`) during this probe. The CID should be retried from a reliable gateway or supplied by Kuru alongside the full compiler input and deployment manifest.

### Reproducible local fork probe

On 2026-09-16, `packages/contracts/scripts/kuru-fork-probe.ts` successfully created a local Hardhat EDR fork from the public Foundation RPC at source block `62944132` (`0x3c07384`), hash `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`. The source chain is Monad Testnet `10143`; the isolated local execution chain is `31337`.

Hardhat initially rejected the fork because chain `10143` had no configured hardfork activation history. Adding an explicit generic-chain descriptor with Prague active from block zero made the bytecode readable and executable by EDR. This is a local execution-engine configuration, not a claim about Monad's complete hardfork history.

The fixed-block probe reproduced the selected proxy parameters, 35,548-byte implementation runtime, native-MON/USDC orientation, empty 64-byte L2 payload, and zero vault bid/ask sizes. It also confirmed that the current official Testnet Margin Account `0xd029C2D98ff85D8F64799017fE00a59B1159CE02` recognizes the selected market. No fork state was changed by this probe.

The implementation metadata CID was retried through ipfs.io, dweb.link, Pinata, w3s.link, and 4everland on 2026-09-16. The tested gateways returned HTTP `403` or timed out, so compiler-input/source equivalence remains unproven.

## Compatibility conclusion

**Partially verified.** The official SDK ABI is behaviorally compatible with the selected proxy for both essential read functions, and the returned parameters establish native-MON/USDC orientation, precisions, bounds, and current fee values. The exact deployed implementation source/bytecode equivalence and all write-path settlement semantics remain unproven. Kairos must not mark the Kuru adapter integrated or execute market orders from this evidence alone.

## Remaining blocker and mentor request

Before M1.6 can be treated as a real adapter proof, obtain one of the following from Kuru:

1. A canonical release tag/commit and deployment manifest tying this Testnet proxy implementation to the exact `OrderBook.sol` build, including compiler/version/optimizer settings; or
2. Verified implementation source/ABI on a public explorer plus deployment/upgrade provenance; and
3. Authorization and a funded Testnet wallet for the bounded cases in `docs/KURU_SETTLEMENT_EXPERIMENT.md`: full fill, `minOut` revert, FOK revert, non-FOK partial fill, native output forwarding, and zero residual venue/adapter balances.

The next independent M1 action is generic policy/core implementation with explicitly labeled test fixtures. The adapter will retain the verified interface boundary but stay blocked from live claims until this evidence exists.
