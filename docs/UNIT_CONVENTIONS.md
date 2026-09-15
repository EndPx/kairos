# M1.1 domain and integer-unit conventions

## Rule

All policy and settlement values use non-negative integer smallest units. Frontend decimal input is parsed exactly or rejected; it is never silently rounded. Floating-point values are not accepted at the contract or shared-domain boundary.

## Initial MON/USDC convention

The read-only Kuru probe establishes this selected market's current metadata:

| Value | Unit convention |
|---|---|
| USDC input/budget/spend/minimum fill | 6-decimal USDC smallest units |
| MON output/received | 18-decimal native MON smallest units |
| Kuru raw market price | `pricePrecision = 10^8` |
| Kuru raw market size | `sizePrecision = 10^10` |
| Kairos effective buy-price limit | quote tokens per base token, scaled by an explicit `priceDecimals` value |

The shared effective-price guard does not divide. For actual quote input `q`, actual base output `b`, price limit `p`, quote decimals `dq`, base decimals `db`, and price decimals `dp`, it accepts only:

```text
q × 10^db × 10^dp <= p × b × 10^dq
```

This avoids floor/rounding bypasses across USDC and MON scales. The contract implementation must apply the same inequality using checked arithmetic or an overflow-safe full-precision equivalent.

## Rounding rules

- Budget, spent, received, release, and remaining values are integers.
- Cumulative release uses floor division: no execution may spend a fraction that has not yet been released.
- A UI decimal with excess precision is rejected rather than rounded.
- Calculations requiring a user debit use explicit ceiling division only when the venue's verified semantics require it; the reason and exact inputs must be recorded.
- Actual settlement accounting uses observed balance deltas, not a requested trade size or estimate.

## Shared-domain boundary

`@kairos/shared` defines branded integer types for amounts, price units, timestamps, order IDs, and execution nonces plus immutable shapes for orders, proposals, decisions, receipts, and normalized contract errors. These are generic Kairos policy types, not an assertion that the Kuru write adapter is complete.
