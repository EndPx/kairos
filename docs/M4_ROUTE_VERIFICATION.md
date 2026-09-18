# M4 Aurora route verification

Date: 2026-09-18

Status: **PARKED / M4 exit unmet — no direct funding route matches the current Kairos deployment**

No quote, deposit address, transfer, transaction-history lookup, or public transaction was created during this verification.

## Required Kairos destination

- Application network: Monad Testnet, chain ID `10143`.
- User wallet recipient: the user's Privy wallet on that network.
- Required destination asset: the exact Kuru market quote token, USDC `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`, 6 decimals.
- Arrival alone grants no allowance, order policy, or execution authority.

Same-symbol USDC, generic Monad support, or a Monad mainnet asset is not compatible unless the returned token contract and the Kairos/Kuru deployment environment match exactly.

## Official capability evidence

Primary Aurora Intents documentation reviewed on 2026-09-17 records:

- Intents Deposits supports chain label `Monad` as both a source and a destination.
- `GET https://intents-api.aurora.dev/api/tokens/{apiKey}` is the authoritative supported-token discovery endpoint.
- Its current OpenAPI schema includes `monad` in the token `blockchain` enum and returns `assetId`, decimals, symbol, and optional contract address.
- `POST /api/quote/{apiKey}` accepts `dry: true`; a dry response omits deposit-address and activation fields.
- Quote requests require exact origin/destination asset IDs, smallest-unit amount, recipient, refund recipient, address types, slippage, and swap type.
- The documented status lifecycle includes `PENDING_DEPOSIT`, `KNOWN_DEPOSIT_TX`, `PROCESSING`, `SUCCESS`, `INCOMPLETE_DEPOSIT`, `REFUNDED`, and `FAILED`.

The supported-chains table does not publish a chain ID or distinguish Monad mainnet from Monad Testnet. The OpenAPI token schema also uses only the `monad` label. Therefore these documents prove generic Monad capability but do **not** prove support for Monad Testnet `10143` or the exact Kuru testnet USDC contract.

Sources:

- `https://docs.intents.aurora.dev/intents-connect/supported-chains`
- `https://docs.intents.aurora.dev/intents-deposits/supported-chains.md`
- `https://docs.intents.aurora.dev/api-reference/swap-api-reference/get-supported-tokens.md`
- `https://docs.intents.aurora.dev/api-reference/swap-api-reference/request-a-quote.md`
- `https://docs.intents.aurora.dev/intents-deposits/quickstart/api-integration`
- `https://docs.intents.aurora.dev/getting-started/api-keys-and-fees.md`

### User-relayed Aurora team confirmation

On 2026-09-18, the user relayed this response from the Aurora team through Telegram: “Please check here for the list of supported chains. Also, there is no separate testnet.” The linked page was `https://docs.intents.aurora.dev/intents-connect/supported-chains`.

This is recorded as a **user-relayed team confirmation**, not a message independently observed by Kairos. No Telegram permalink, sender identity, or message metadata was supplied, so none is invented. A separate read-only fetch of the linked page's Markdown representation returned HTTP `200`, listed Monad as supported for both source and destination, and contained no Testnet/Mainnet environment label. The page corroborates the supported-chain list; the statement that there is no separate testnet comes from the user-relayed team response.

## Runtime credential boundary

During the original verification, the rotated key was not visible to the current process, Windows user/machine environment, root/application environment files, or a discoverable Windows credential-manager label. Only variable names were inspected; no secret value was printed, and the previously exposed key was not reused in that run.

Before the later historical probe, the user authorized reuse of the existing key instead of another rotation. A masked interactive prompt was prepared to set `AURORA_API_KEY` only for `pnpm aurora:probe`, clear the variable afterward, and avoid copying the value into Git, command text, or evidence. At that point authenticated discovery remained blocked until a value was supplied locally.

That historical follow-up completed once. The Aurora portal already contained one active key named `Kairos`; no new key was created. The portal copied the existing key to the local clipboard, the probe consumed it only through the child process environment, and both the environment variable and clipboard were cleared after the request. The key value is not stored in the repository or evidence.

The credential used for that historical probe had previously been exposed. Clearing the process environment and clipboard reduced local persistence but did **not** rotate or revoke the credential. It is now retired for Kairos and must not be reused. Any future authenticated Aurora request requires a newly rotated credential supplied through local secret storage, never chat or Git.

## Authenticated discovery result

`pnpm aurora:probe` exited `0` and parsed `195` tokens plus `197` asset-stat records. The returned `monad` catalog contained exactly these destination-chain entries:

| Symbol | Decimals | Contract | Asset ID |
|---|---:|---|---|
| MON | 18 | Native / omitted | `nep245:v2_1.omni.hot.tg:143_11111111111111111111` |
| USDT0 | 6 | `0xe7cd86e13ac4309349f30b3435a9d337750fc82d` | `nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et` |
| USDC | 6 | `0x754704bc059f8c67012fed69bc8a327a5aafb603` | `nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx` |

The required Kuru Testnet USDC is `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`, so the strict probe result is `CHAIN_WITHOUT_EXACT_TOKEN`. This establishes only that no direct funding route matches the current Kairos deployment; it is not a claim that Aurora is incompatible with Monad generally.

The catalog also exposed possible source assets such as Ethereum USDC `nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near` and Base USDC `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`. These are discovery candidates only, not a selected or quoted source route. Kairos does not select a source `assetId` while no exact destination matches the current deployment.

The probe reads `AURORA_API_KEY` from the process or ignored root `.env.local`. Aurora's current documentation describes the application key as public-facing, but Kairos still keeps it outside Git and redacts it from errors and evidence.

## Official Monad environment verification

The Aurora response itself used the generic `monad` label, so Kairos verified the returned contract against official Monad metadata instead of inferring an environment from ticker, decimals, or the asset ID:

- Monad's official network documentation identifies Mainnet as chain ID `143` and Testnet as chain ID `10143`.
- The official `monad-crypto/token-list` repository separates Mainnet and Testnet lists. At pinned revision `3a34e9b761422f52c7386ac2714f2d366c841ab9`, address `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` occurs once in `tokenlist-mainnet.json` as USDC with chain ID `143` and 6 decimals.
- The same address has zero matches in `tokenlist-testnet.json`, whose network is Monad Testnet.

Reproducible read-only verification:

```powershell
git ls-remote https://github.com/monad-crypto/token-list.git HEAD
# Fetch tokenlist-mainnet.json and tokenlist-testnet.json at the returned revision,
# then compare the exact contract address in both lists.
```

Pinned sources:

- `https://docs.monad.xyz/developer-essentials/changelog`
- `https://docs.monad.xyz/developer-essentials/network-information`
- `https://docs.monad.xyz/developer-essentials/testnet`
- `https://github.com/monad-crypto/token-list/blob/3a34e9b761422f52c7386ac2714f2d366c841ab9/tokenlist-mainnet.json`
- `https://github.com/monad-crypto/token-list/blob/3a34e9b761422f52c7386ac2714f2d366c841ab9/tokenlist-testnet.json`

Therefore the Aurora-returned USDC is verified as a Monad Mainnet chain `143` asset. Kairos does not replace its configured Testnet token with this asset: identical ticker and decimals do not establish contract or deployment compatibility.

## Reproducible probe

`packages/aurora` contains a strict read-only client and route evaluator. It:

1. calls only the supported-token discovery endpoint;
2. validates the response shape;
3. compares the destination contract case-insensitively and decimals exactly;
4. distinguishes missing chain, wrong token on an available chain, and an exact match;
5. optionally pins one source blockchain and exact source `assetId`;
6. never logs the API key and replaces transport/HTTP errors with sanitized messages;
7. does not request a quote or deposit address.

Local configuration, never committed:

```text
AURORA_API_KEY=<rotated local application key>
AURORA_SOURCE_BLOCKCHAIN=<selected source after discovery>
AURORA_SOURCE_ASSET_ID=<exact discovered origin asset ID>
```

Commands:

```text
pnpm aurora:test
pnpm aurora:typecheck
pnpm aurora:probe
```

This probe capability is retained for a future scope change, but it must not be rerun while M4 is parked. `routeReadyForDryQuote` remains false for the current deployment.

## Current verdict

| Question | Result |
|---|---|
| Is Monad named as an Aurora Intents source and destination? | YES — official documentation |
| Which environment contains the returned USDC contract? | Monad Mainnet, chain ID `143` — exact match in the pinned official Mainnet token list and absent from the Testnet list |
| Is Monad Testnet chain ID `10143` represented by that returned asset? | NO |
| Does Aurora provide a separate testnet? | NO according to the user-relayed Aurora team response; this was not independently observed in Telegram |
| Is Kuru testnet USDC `0x3bA3…1570` present in the token catalog? | NO — discovered `monad` USDC is `0x7547…b603` |
| Is a source chain and exact origin asset selected? | NO — source selection is intentionally withheld because the destination fails exact matching |
| Is a non-funding dry quote proven? | NOT RUN — the precondition failed, so no quote request was constructed or sent |
| Was any deposit address or transfer created? | NO |

## Supported-environment implication

Authenticated discovery exposes Monad Mainnet USDC, while the current Kairos policy, Kuru market, Privy lifecycle proof, and Envio indexer are on Monad Testnet `10143` with a different token contract. The available choices are therefore:

1. preserve the current Testnet deployment and keep Aurora parked; or
2. evaluate a separate Mainnet Kairos/Kuru deployment only after an explicit scope decision, compatible Kuru market evidence, complete redeployment/reconfiguration review, and new authorization.

An official future change that adds a route matching the current deployment can also reopen M4. No Mainnet evaluation or migration was started. No current choice authorizes bridging, swapping, funding, token substitution, or another credential request.

## Next action

Park Aurora work. Do not repeat token discovery, request another credential, ask the same Testnet-support question, request a quote, or build a funding workaround. Reopen M4 only after either (a) an explicit decision to evaluate Mainnet under a separately authorized scope or (b) a verified official support change that supplies a route matching the current Kairos deployment. The M4 exit criterion remains unmet.
