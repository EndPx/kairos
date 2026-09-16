# Kuru fixed-fork settlement evidence

Evidence date: 2026-09-16

Source chain: Monad Testnet `10143`

Local execution chain: Hardhat EDR `31337`

Source block: `62944132` (`0x3c07384`)

Source block hash: `0xb5a5a55678513ced1b7a43da8bed39a2d3b3e9284c34c0dc6e033ed12c914098`

## Deployed targets and source inputs

- Kuru market proxy: `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`.
- EIP-1967 implementation: `0x72cae0a99c19b574e8a6de558f43fc1d019c9374` (35,548 runtime bytes).
- Quote token: `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570` (USDC, 6 decimals).
- Margin Account: `0xd029C2D98ff85D8F64799017fE00a59B1159CE02`.
- Kuru contracts source revision: `2060bb2736080c175d80d568bfdb6226bb5abd04`.
- Kuru SDK/ABI revision: `636509c2eafd63479d3f399703354e0d09f51e18`.

The official ABI's read and write selectors were exercised against the deployed proxy bytecode. This is behavioral compatibility evidence, not source/deployment equivalence.

## Local-only state changes

The fixed source state contained no manual order-book levels and no vault bid/ask size. The test therefore made the following isolated fork-only changes; none were broadcast:

1. Traced `balanceOf(owner)` with `debug_traceCall` and used `hardhat_setStorageAt` to assign the test owner `101,000,000` USDC units. This changes a local token balance without changing total supply.
2. Deposited `500 MON` from a pre-funded Hardhat account into the deployed Kuru Margin Account for the controlled maker.
3. Added one real Kuru post-only ask at raw price `5,000,000` (`0.05` USDC/MON) and raw size `4,000,000,000,000` (`400 MON`).
4. Seeded the Kairos adapter with unrelated pre-existing balances of `1 USDC` and `2 MON` to verify balance isolation.
5. Deployed the same `KuruAdapter` settlement implementation intended for the application, but bound it to local chain `31337`. A later public deployment would require chain `10143` and a separate review; no public adapter was deployed or enabled here.

## Reproducible command

PowerShell:

```powershell
$env:RUN_KURU_FORK='1'
pnpm --filter @kairos/contracts kuru:fork:test
Remove-Item Env:RUN_KURU_FORK
```

`MONAD_RPC_URL` may override the documented public endpoint when a local authenticated archive endpoint is required. Do not store its value in version control.

Final result: **5 passing fork tests**.

## Observed settlement

The non-FOK Kairos proposal supplied `30,000,000` USDC units against `20,000,000` units of controlled capacity. The deployed Kuru bytecode and Kairos adapter produced:

| Observation | Result |
|---|---:|
| Actual USDC input | `20,000,000` |
| Native MON output | `400,000,000,000,000,000,000` wei |
| USDC returned to owner | `10,000,000` |
| Order `spent` / `received` | Exact match to actual deltas |
| Execution nonce | `0 → 1` only on success |
| Policy USDC residual | `0` |
| New adapter USDC/MON residual | `0 / 0` |
| Pre-existing adapter balances | Preserved exactly |
| Adapter Kuru allowance | Reset to `0` |
| Active L2 payload after fill | 64 bytes: block identity plus empty-book sentinel |
| Taker resting order | None |

Kuru's public `s_orders(id).size` retained the old `400 MON` value after an overfilling market buy even though the order was removed from the active tree and `getL2Book()` was empty. Kairos therefore uses active L2 state and trade/settlement deltas as the no-resting-order proof; the historical mapping alone is not a valid active-order indicator.

## Revert and rollback cases

- FOK with `30 USDC` against `20 USDC` capacity bubbled Kuru `InsufficientLiquidity()`.
- `minimumOutput = 400 MON + 1 wei` bubbled Kuru `SlippageExceeded()`.
- Policy `minFill = 25 USDC` reverted after Kuru reported only `20 USDC` actual input.
- Policy maximum effective price `0.04 USDC/MON` reverted the `0.05` settlement.

Every revert kept nonce, owner allowance/balances, and normalized active L2 levels unchanged. The L2 block-number prefix naturally advanced when a reverted transaction occupied a local block, so the test compares the encoded price/size levels rather than requiring the snapshot-identity word to remain constant.

## Allowance interpretation

The owner-to-policy ERC-20 allowance decreases by the proposed `30 USDC`, while the owner's balance and Kairos order accounting decrease by the actual `20 USDC`; the venue refund does not restore ERC-20 allowance. Allowance remains an independent authorization ceiling, not an accounting measure. A UI using exact finite approvals must surface that partial fills can require a later re-approval; unlimited approval is not assumed.

## Remaining proof boundary

The deployed bytecode behavior is now proven on a documented fork, but exact source equivalence is still blocked. The public repository specifies solc `0.8.30`, Prague, optimizer `1000`, and viaIR, matching the bytecode compiler metadata. It does not include tracked dependency gitlinks, and `foundry.lock` does not pin Solady even though `OrderBook.sol` imports it. The implementation metadata CID is still unavailable through tested gateways. Reconstructing an exact compiler input from this repository alone would require guessing a dependency revision and therefore cannot establish equivalence.

Required external artifact: Kuru's exact standard-JSON compiler input/output or deployment manifest, including the Solady revision and source hashes for implementation `0x72cae0a99c19b574e8a6de558f43fc1d019c9374`.
