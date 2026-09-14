# M0 exit review — repository and compatibility foundation

Review date: 2026-09-15

M0 is complete as a compatibility foundation. It does **not** prove a working Kairos application, a sponsor integration, a contract adapter, automation, a funding route, or a production/testnet transaction.

## Sponsor gate

| Sponsor | M0 result | Evidence | Precise blocker | Independent next task |
|---|---|---|---|---|
| Kuru | BLOCKED, with bounded deployment/token reads verified | M0-05, M0-06 | Primary ABI tied to proxy implementation, decoded market parameters/L2 format, token orientation, fee/precision, and settlement/refund behavior remain unverified; test writer/funded wallet has not been authorized | Obtain and pin primary ABI/source for `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`; perform read-only params/L2 calls; then run the designed authorized settlement experiment |
| CRE | BLOCKED | M0-07 | Local CLI is stale; no authenticated organization/key, Monad support, forwarder, or deployment access evidenced | Update and pin CLI; authenticate; validate supported network/forwarder; initialize and simulate a minimal workflow |
| Privy | BLOCKED | M0-08 | Privy App ID, dashboard configuration, allowed origins, user test account, and exact Monad chain configuration unavailable | Configure the application; confirm chain support; run user-confirmed approve/create/cancel/revoke browser tests |
| Aurora Intents | BLOCKED | M0-09 | API key absent; no authenticated asset discovery or proof of a Monad Testnet/Kuru-USDC route | Discover supported assets/networks with an authorized key; request a non-funding dry quote; only then seek authorization for a smallest test transfer |

## Platform and engineering baseline

- Monad Testnet `10143` is runtime-probed for public JSON-RPC reads (M0-04); this must not be mistaken for any Aurora compatibility statement.
- The selected toolchain is documented and version-pinned, but no packages were installed and no application source was scaffolded (M0-02).
- Environment variable names and absent configuration are documented without secrets (M0-03).
- The Kuru settlement test design specifies the minimum evidence needed before an execution claim (M0-06).

## M1 entry rule

M1 policy logic may begin independently only after the next task authorizes it. It must use verified generic interfaces and test fixtures until Kuru's deployed ABI and behavior are evidenced. No Kuru adapter signature, Aurora route, CRE receiver configuration, or Privy network support may be invented from this review.
