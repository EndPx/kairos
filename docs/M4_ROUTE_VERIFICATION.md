# M4 Aurora route verification

Date: 2026-09-17

Status: **PARTIAL / authenticated discovery proves the exact Kairos destination is unsupported**

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

- `https://docs.intents.aurora.dev/intents-deposits/supported-chains.md`
- `https://docs.intents.aurora.dev/api-reference/swap-api-reference/get-supported-tokens.md`
- `https://docs.intents.aurora.dev/api-reference/swap-api-reference/request-a-quote.md`
- `https://docs.intents.aurora.dev/intents-deposits/quickstart/api-integration`
- `https://docs.intents.aurora.dev/getting-started/api-keys-and-fees.md`

## Runtime credential boundary

During the original verification, the rotated key was not visible to the current process, Windows user/machine environment, root/application environment files, or a discoverable Windows credential-manager label. Only variable names were inspected; no secret value was printed, and the previously exposed key was not reused in that run.

The user subsequently authorized reuse of the existing key instead of another rotation. Its value is still absent from local environment/file storage. A masked interactive prompt now provides a process-only path: it sets `AURORA_API_KEY` only for `pnpm aurora:probe`, clears the variable afterward, and does not copy the value into Git, command text, or evidence. Authenticated discovery remains blocked until that local prompt receives the key.

That follow-up is now complete. The Aurora portal already contained one active key named `Kairos`; no new key was created. The portal copied the existing key to the local clipboard, the probe consumed it only through the child process environment, and both the environment variable and clipboard were cleared after the request. The key value is not stored in the repository or evidence.

## Authenticated discovery result

`pnpm aurora:probe` exited `0` and parsed `195` tokens plus `197` asset-stat records. The returned `monad` catalog contained exactly these destination-chain entries:

| Symbol | Decimals | Contract | Asset ID |
|---|---:|---|---|
| MON | 18 | Native / omitted | `nep245:v2_1.omni.hot.tg:143_11111111111111111111` |
| USDT0 | 6 | `0xe7cd86e13ac4309349f30b3435a9d337750fc82d` | `nep245:v2_1.omni.hot.tg:143_4EJiJxSALvGoTZbnc8K7Ft9533et` |
| USDC | 6 | `0x754704bc059f8c67012fed69bc8a327a5aafb603` | `nep245:v2_1.omni.hot.tg:143_2dmLwYWkCQKyTjeUPAsGJuiVLbFx` |

The required Kuru Testnet USDC is `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`, so the result is `CHAIN_WITHOUT_EXACT_TOKEN`. The catalog's internal `143` identifier is not treated as EVM chain ID `10143`; the response still does not state a Monad chain ID or testnet/mainnet label.

The catalog also exposed possible source assets such as Ethereum USDC `nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near` and Base USDC `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`. These are discovery candidates only, not a selected or quoted source route. Kairos does not select a source `assetId` while the destination is incompatible.

The probe reads `AURORA_API_KEY` from the process or ignored root `.env.local`. Aurora's current documentation describes the application key as public-facing, but Kairos still keeps it outside Git and redacts it from errors and evidence.

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

Without a source selection, the authenticated probe may be run once to enumerate public USDC/USDT candidates and verify the exact destination. `routeReadyForDryQuote` remains false until both the exact destination and exactly one configured source asset match.

## Current verdict

| Question | Result |
|---|---|
| Is Monad named as an Aurora Intents source and destination? | YES — official documentation |
| Is Monad Testnet chain ID `10143` identified? | NO — the catalog says only `monad`; internal asset identifier `143` is not assumed to be an EVM chain ID |
| Is Kuru testnet USDC `0x3bA3…1570` present in the token catalog? | NO — discovered `monad` USDC is `0x7547…b603` |
| Is a source chain and exact origin asset selected? | NO — source selection is intentionally withheld because the destination fails exact matching |
| Is a non-funding dry quote proven? | NOT RUN — the precondition failed, so no quote request was constructed or sent |
| Was any deposit address or transfer created? | NO |

## Supported-environment implication

Authenticated discovery exposes a different `monad` USDC contract and does not identify chain `10143`. Kairos must not relabel that route as testnet support. The only compatible product option would require confirming the catalog's exact Monad network and deploying Kairos/Kuru against its observed USDC contract, or Aurora adding the existing Kuru Testnet USDC. Either path is an external/environment change and any public or mainnet deployment requires separate authorization.

## Next action

Do not request a dry quote for the current Kairos deployment. The next external dependency is authoritative Aurora confirmation of which EVM chain ID the returned `monad` assets map to, or catalog support for Monad Testnet `10143` and exact Kuru USDC `0x3bA3…1570`. If a future catalog returns an exact destination match, rerun discovery, select one exact source asset from that same response, and only then prepare a reviewed `dry: true` quote without creating a deposit or moving funds.
