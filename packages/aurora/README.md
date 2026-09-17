# Kairos Aurora Intents route probe

This package verifies route compatibility before Kairos creates a quote or funding flow.

It calls only Aurora Intents supported-token discovery, validates the response, and requires the destination to match Monad Testnet Kuru USDC by exact contract address and decimals. A same-symbol token is not accepted. The application key is read from the process or ignored repository-root `.env.local`; it is never printed or committed.

```text
AURORA_API_KEY=<local rotated key>
AURORA_SOURCE_BLOCKCHAIN=<optional discovered chain label>
AURORA_SOURCE_ASSET_ID=<optional exact discovered asset ID>
```

```powershell
pnpm aurora:test
pnpm aurora:typecheck
pnpm aurora:probe
```

The probe does not request a quote, create a deposit address, query wallet history, or move funds. `routeReadyForDryQuote` becomes true only when the exact Kairos destination and exactly one configured source asset are present in the same live catalog response.
