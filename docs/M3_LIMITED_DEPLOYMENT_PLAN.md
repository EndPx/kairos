# M3 limited Privy lifecycle deployment plan

Status: prepared only; **not authorized and not executed**.

Purpose: provide a real Monad Testnet target for the PRIVY-01 approve/create/cancel/revoke wallet demonstration without enabling Kairos execution or a public Kuru trade.

## Network and wallet role

- Network: Monad Testnet, chain ID `10143` (`0x279f`).
- Wallet: one user-controlled Privy embedded EVM wallet acts as contract deployer and order owner.
- Required native balance: enough testnet MON for bounded deployment and lifecycle gas.
- Required USDC movement: none. Approval is capped at `1,000,000` USDC-6 units (`1 USDC`), but no transfer or execution is planned.
- No CRE owner key, workflow deployment, receiver activation, delegated signer, sponsorship, or Aurora route is part of this plan.

## Contracts and immutable configuration

Only two contracts are required for the limited lifecycle proof:

1. `KuruAdapterBoundary`
   - `policy_`: the precomputed address of the immediately following `KairosPolicy` deployment;
   - `market_`: selected Kuru MON-USDC market `0xa241896A7Dbe8a550D2E5fF7A914bB1989ceD2D9`;
   - `quoteToken_`: Monad Testnet USDC `0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`;
   - `quoteTokenDecimals_`: `6`;
   - `pricePrecision_`: `100000000`;
   - `sizePrecision_`: `10000000000`.

2. `KairosPolicy`
   - `executor_`: `0x000000000000000000000000000000000000dEaD`, making public execution unreachable;
   - `market_`: the selected Kuru market above;
   - `tokenIn_`: the selected USDC above;
   - `tokenOut_`: `0x0000000000000000000000000000000000000000`, representing native MON;
   - `adapter_`: the deployed execution-disabled `KuruAdapterBoundary`;
   - `inputDecimals_`: `6`;
   - `outputDecimals_`: `18`;
   - `priceDecimals_`: `8`.

The deploy script must read the wallet nonce, precompute both CREATE addresses, and abort if the actual adapter or policy address differs. The policy's immutable executor cannot call `execute`, and the adapter independently reverts every `executeBuy` with `KuruSettlementUnverified`. This deployment cannot trade through Kuru even if the owner has allowance.

`KairosCreReceiver` is deliberately excluded. The written CRE criterion is already met by simulation, and receiver deployment without a deployed workflow identity would add gas without improving the Privy lifecycle proof.

## Planned user-confirmed transactions

Every transaction remains visible in the Privy wallet and requires user confirmation:

1. Deploy `KuruAdapterBoundary` with the predicted policy address.
2. Deploy `KairosPolicy` with the dead executor and deployed disabled adapter.
3. Approve the policy for at most `1 USDC`.
4. Create one one-hour policy order:
   - budget `1,000,000` USDC-6 units;
   - maximum per fill `1,000,000`;
   - minimum fill `100,000`;
   - maximum effective price `100,000,000,000` price-8 units (`1000 USDC/MON`);
   - start and end derived from the canonical chain timestamp at preparation time.
5. Cancel the created order.
6. Revoke allowance with `approve(policy, 0)`.

No transaction calls `KairosPolicy.execute`, `KuruAdapterBoundary.executeBuy`, a CRE forwarder, or the Kuru market. No USDC or MON is intentionally transferred except network gas.

## Measured gas and authorization cap

Local Hardhat EDR measurements on the pinned build:

| Action | Measured gas | Proposed transaction gas-limit cap |
|---|---:|---:|
| Deploy disabled adapter | `257283` | `320000` |
| Deploy policy | `1323216` | `1500000` |
| Approve `1 USDC` | fixture ERC-20 `44088` | `70000` |
| Create order | `159497` | `190000` |
| Cancel order | `34875` | `60000` |
| Revoke allowance | fixture ERC-20 `44088` | `70000` |
| **Total cap** | — | **`2210000`** |

The bounded Monad Testnet read on 2026-09-17 returned `eth_gasPrice = 102000000000 wei` (`102 gwei`). Because Monad charges the submitted gas limit, the cap above would cost at most `0.22542 MON` at that gas price. Before authorization is consumed, each public transaction must be freshly estimated, must not exceed its per-transaction cap, and must be abandoned if gas price would make the aggregate worst-case cost exceed `0.23 MON`. Local EDR measurements and the current gas-price read are estimates, not a fee guarantee.

## Evidence to capture

- compiler version/settings and source revision;
- wallet address and pre-deployment nonce without private-key material;
- predicted and actual contract addresses plus deployed bytecode hashes;
- transaction hashes, submitted gas limits, effective gas prices, receipts, block numbers/hashes, and logs;
- `executor`, `adapter`, market, token, decimals, and precision reads;
- approve, create, cancel, and revoke wallet states and receipts;
- post-revoke allowance `0`, cancelled order lifecycle, unchanged USDC balance apart from no intended token movement, and no call to Kuru;
- confirmation that both execution locks still revert on local/fork replay of the deployed bytecode configuration.

## Authorization boundary

A future authorization request should cover exactly the six transactions above on Monad Testnet from the selected Privy embedded wallet, with allowance capped at `1 USDC`, aggregate gas limit capped at `2,210,000`, worst-case gas spend capped at `0.23 MON`, and zero intentional token transfer. It must not authorize receiver activation, CRE deployment, policy execution, Kuru trading, Aurora funding, mainnet activity, or publication.
