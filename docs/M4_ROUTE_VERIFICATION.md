# M4 Aurora route verification

Date: 2026-09-17

Status: **PARTIAL / exact Kairos route blocked on authenticated token discovery**

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

The rotated key was not visible to the current process, Windows user/machine environment, root/application environment files, or a discoverable Windows credential-manager label. Only variable names were inspected; no secret value was printed. The previously exposed key was not reused.

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
| Is Monad Testnet chain ID `10143` identified? | NO — not established by docs or runtime |
| Is Kuru testnet USDC `0x3bA3…1570` present in the token catalog? | BLOCKED — authenticated discovery has not run |
| Is a source chain and exact origin asset selected? | BLOCKED — select only from authenticated discovery output |
| Is a non-funding dry quote proven? | NOT RUN — forbidden until both exact assets match |
| Was any deposit address or transfer created? | NO |

## Supported-environment implication

If authenticated discovery exposes `monad` only for a production/mainnet asset rather than chain `10143` and the exact Kuru testnet USDC, Kairos must not relabel that route as testnet support. The genuinely supported option would require a separate Kairos and Kuru deployment on the matching Monad environment and exact token contract. That would be a material deployment change and a mainnet/public action requiring explicit authorization; it is not taken by M4 route verification.

## Next action

Make the rotated key available locally as `AURORA_API_KEY` in the repository root `.env.local` or the launching process environment. Do not send it in chat. The next run will perform supported-token discovery only. If and only if the exact destination exists, Kairos will select an observed source asset and prepare a `dry: true` quote request for review without creating a deposit or moving funds.
