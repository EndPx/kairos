# M0.9 Aurora Intents capability probe

Probe date: 2026-09-15

## Confirmed API workflow

Aurora's current Intents deposits API documentation describes the following user-wallet flow:

1. Use an app API key to retrieve supported assets and their `assetId` values.
2. Request a quote for exact origin asset, destination asset, recipient, refund recipient, and deadline. A `dry: true` request validates parameters and returns a quote without executing a swap.
3. Transfer tokens to the returned deposit address; processing starts after that transfer.
4. Track the result as `PENDING_DEPOSIT`, `KNOWN_DEPOSIT_TX`, `PROCESSING`, `SUCCESS`, `INCOMPLETE_DEPOSIT`, `REFUNDED`, or `FAILED`.

The documentation explicitly requires an API key to interact with the API. It also defines a refund destination in the quote request, which matches Kairos's requirement to report funding state honestly and preserve user control; the funding route must never be represented as Kuru settlement or escrow.

Sources reviewed: [Aurora API integration guide](https://docs.intents.aurora.dev/intents-deposits/quickstart/api-integration) and [Aurora supported-chains page](https://docs.intents.aurora.dev/intents-deposits/supported-chains).

## Compatibility result

`AURORA_API_KEY` is absent according to M0.3's presence-only inventory. The publicly rendered supported-chains page identifies the product as NEAR Intents-powered but does not expose a machine-readable list in the reviewed output. No authenticated supported-token request, dry quote, deposit address, transfer, status lookup, or refund test was run.

Therefore, no evidence establishes that Aurora Intents supports Monad Testnet `10143`, the exact Kuru testnet USDC contract, or a route to the selected Kuru market. Aurora compatibility must not be inferred from Kuru's Monad deployment or from a mainnet-only Aurora route.

## Blockers and next action

1. Obtain an authorized Aurora Intents API key and retain it only in local secret configuration.
2. Use `GET /api/tokens/{appKey}` to capture supported source assets and determine whether the exact Monad destination asset/network is present.
3. If the destination is available, make an authorized `dry: true` quote using integer smallest units, a user-owned recipient, a user-owned refund address, and a short deadline. Record response schema, quote expiration, and route identifiers without funding it.
4. Only after explicit authorization, run the smallest testnet funding transaction, persist the origin transaction hash and Aurora lifecycle status, and exercise a refund/failure path if the product supports it.

This is a documentation and configuration probe. It does not claim a live or testnet funding route.
