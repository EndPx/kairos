# M1.8 local policy test coverage

The local suite runs against Hardhat's in-memory chain and explicitly labeled `MockERC20` / `MockVenueAdapter` fixtures. These tests prove Kairos policy logic only; they are not public-chain Kuru evidence.

| Acceptance IDs | Local scenario | Result |
|---|---|---|
| AUTH-01 | Non-owner cancellation and inactive-order rejection | PASS |
| AUTH-02 | Only immutable executor may execute; no per-call target/recipient | PASS |
| POL-01 | Twelve repeated fills: each actual spend remains at or below released and total budget; next release-exceeding attempt rejects | PASS |
| POL-02 | Input above immutable per-fill cap rejects | PASS |
| POL-03 | Order whose end time is in the past derives non-active status and rejects execution | PASS |
| POL-04 | Cancelled order rejects; ERC-20 allowance remains unchanged | PASS |
| POL-05 | Adapter-reported actual input below `minFill` rejects atomically | PASS (fixture) |
| POL-06 | A remainder below minimum is not forced by the policy; no completion is inferred | PARTIAL — covered by fill lower-bound rejection, no dedicated dust UI yet |
| PRICE-01/02 | Actual output producing an effective price above limit rejects; USDC-6/MON-18 scaling covered in shared tests | PASS (fixture/local arithmetic) |
| SET-01 | Actual input/output and unused input are measured/forwarded in one fixture transaction | PASS (fixture) |
| SET-02 | Pre-existing adapter balances are not attributed to owner receipt | PASS (fixture) |
| SET-03/04 | Native MON output and real venue leftovers | BLOCKED — requires Kuru source/settlement proof |
| SEC-01 | Fixture callback cannot reenter `execute` or double spend | PASS |
| SEC-02 | Reused nonce rejects | PASS |
| WAL-01/02 | Insufficient balance and revoked allowance reject before venue call | PASS |

## Exact command and result

```text
pnpm contracts:compile
pnpm contracts:test
pnpm test
pnpm typecheck
```

At the recorded run, Solidity compilation passed; `pnpm contracts:test` reported **10 passing** tests; shared Vitest reported **4 passing** tests; and TypeScript typecheck passed.

## Remaining M1 exit gap

The M1 policy-correctness portion is locally evidenced. M1 as a whole remains partial because Kuru adapter behavior has not been evidenced against the selected deployment or a documented fork. `KuruAdapterBoundary` intentionally prevents any misleading execution claim.
