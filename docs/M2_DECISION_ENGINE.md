# M2 deterministic decision engine

The decision engine consumes one consistent policy snapshot and one matching market snapshot. It rejects mismatched block, market, or asset identity before considering execution.

For an active order and market, it computes:

```text
preLiquidityLimit = min(contract availableToSpend,
                        remaining budget,
                        maxPerFill,
                        wallet balance,
                        token allowance)

proposedInput = min(preLiquidityLimit, estimated manual-L2 capacity)
```

The trace retains every input constraint and the capacity calculation. Identical inputs produce identical decisions and proposals.

## WAIT precedence

Lifecycle and snapshot validity are evaluated first, followed by market activity, remaining-budget dust, schedule release, wallet balance, allowance, and then liquidity/price capacity. A WAIT decision has no proposal and creates no onchain event.

Reasons include the specification's schedule, liquidity, price, balance, allowance, stale, dust, expired, and cancelled outcomes. `COMPLETED`, `MARKET_NOT_ACTIVE`, and `INCONSISTENT_SNAPSHOT` make otherwise ambiguous terminal/safety states explicit.

## Partial-fill-compatible minimum output

Kuru's `minAmountOut` is absolute while Kairos permits non-FOK partial input. Setting it from the full proposed input would accidentally require a full fill. Kairos instead derives proposal `minOutput` from the policy `minFill` at the maximum effective price. Any valid partial fill must consume at least `minFill`; the policy contract then enforces the price again using the complete actual input/output pair. This preserves partial fills without weakening final onchain authority.

Market movement can invalidate an estimate. The engine does not guarantee execution or output; every submitted proposal remains subject to contract nonce, schedule, lifecycle, balance, allowance, actual-minimum-fill, and actual-price checks.
