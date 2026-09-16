# M2 manual-book liquidity capacity

Kairos walks the normalized manual ask side from best to worst price. It produces estimated input, gross output, output-denominated taker fee, net output, a stop reason, and one integer trace step per considered level.

## Effective-average price

The user limit applies to cumulative effective average price after fee. A level above the limit may still be included when better earlier levels keep the cumulative average within policy. Kairos does not replace this rule with a per-level cutoff.

Each candidate uses the same cross-multiplied USDC/MON inequality as the shared M1 policy helpers. The contract remains final authority and rechecks actual settlement amounts.

## Fee and rounding

The pinned Kuru source charges market-buy taker fees from aggregate base output with ceiling division by `10,000`. The estimator therefore computes gross aggregate output, applies one aggregate ceiling fee, and evaluates price using net output. The selected fixed snapshot currently reports a zero taker fee; nonzero fee fixtures protect the general rule.

Manual-level quote cost rounds up and base output rounds down. This is intentionally conservative where a level is not exactly aligned to token decimals. It can produce a smaller proposal than the venue might fill, but cannot claim more capacity from rounding.

## Trace and scope

Trace steps record raw level price/size, raw size taken, incremental input, cumulative gross output, cumulative fee, cumulative net output, and whether the level was full, input-limited, price-limited, or rejected.

Only `MANUAL_L2` is included. `KURU_AMM_VAULT` remains listed as excluded, so the result may underestimate real executable capacity when a vault is active. Market movement after the snapshot can still reduce actual fill; the policy contract's atomic actual-value checks remain authoritative.
