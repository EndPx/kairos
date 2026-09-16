import {
  isEffectivePriceAtMost,
  mulDivCeil,
  mulDivFloor,
  pow10,
  priceUnits,
  tokenAmount,
  type PriceUnits,
} from '@kairos/shared';
import type { KuruMarketParameters, KuruMarketSnapshot, LiquidityCapacity } from '../types.js';

const BPS_DENOMINATOR = 10_000n;

export interface EstimateManualBuyCapacityInput {
  readonly snapshot: KuruMarketSnapshot;
  readonly inputLimit: bigint;
  readonly maxEffectivePrice: PriceUnits;
}

function quoteUnitsForRawSize(rawPrice: bigint, rawSize: bigint, params: KuruMarketParameters): bigint {
  return mulDivCeil(
    rawPrice * rawSize,
    pow10(params.quoteAssetDecimals),
    params.pricePrecision * params.sizePrecision,
  );
}

function grossBaseUnits(rawSize: bigint, params: KuruMarketParameters): bigint {
  return mulDivFloor(rawSize, pow10(params.baseAssetDecimals), params.sizePrecision);
}

function outputAfterFee(grossOutput: bigint, takerFeeBps: bigint): { fee: bigint; net: bigint } {
  if (grossOutput === 0n) return { fee: 0n, net: 0n };
  const fee = takerFeeBps === 0n ? 0n : mulDivCeil(grossOutput, takerFeeBps, BPS_DENOMINATOR);
  return { fee, net: grossOutput - fee };
}

function maxRawSizeForInput(
  rawPrice: bigint,
  availableRawSize: bigint,
  remainingInput: bigint,
  params: KuruMarketParameters,
): bigint {
  let low = 0n;
  let high = availableRawSize + 1n;
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    if (quoteUnitsForRawSize(rawPrice, middle, params) <= remainingInput) low = middle;
    else high = middle;
  }
  return low;
}

export function estimateManualBuyCapacity(input: EstimateManualBuyCapacityInput): LiquidityCapacity {
  if (input.inputLimit < 0n) throw new RangeError('Input limit cannot be negative.');
  if (input.maxEffectivePrice <= 0n) throw new RangeError('Maximum effective price must be positive.');

  const { snapshot } = input;
  const params = snapshot.params;
  let cumulativeInput = 0n;
  let cumulativeRawSize = 0n;
  const trace: LiquidityCapacity['trace'][number][] = [];
  let stopReason: LiquidityCapacity['stopReason'] = snapshot.asks.length === 0 ? 'NO_LIQUIDITY' : 'BOOK_EXHAUSTED';

  const evaluate = (additionalRawSize: bigint, rawPrice: bigint) => {
    const nextInput = cumulativeInput + quoteUnitsForRawSize(rawPrice, additionalRawSize, params);
    const nextGrossOutput = grossBaseUnits(cumulativeRawSize + additionalRawSize, params);
    const { fee, net } = outputAfterFee(nextGrossOutput, params.takerFeeBps);
    const withinPrice =
      net > 0n &&
      isEffectivePriceAtMost(
        nextInput,
        net,
        priceUnits(input.maxEffectivePrice),
        params.quoteAssetDecimals,
        params.baseAssetDecimals,
        snapshot.policyPriceDecimals,
      );
    return { nextInput, nextGrossOutput, fee, net, withinPrice };
  };

  for (let levelIndex = 0; levelIndex < snapshot.asks.length; levelIndex += 1) {
    const level = snapshot.asks[levelIndex]!;
    const remainingInput = input.inputLimit - cumulativeInput;
    if (remainingInput <= 0n) {
      stopReason = 'INPUT_LIMIT';
      break;
    }

    const inputBoundRawSize = maxRawSizeForInput(level.rawPrice, level.rawSize, remainingInput, params);
    if (inputBoundRawSize === 0n) {
      stopReason = 'INPUT_LIMIT';
      break;
    }

    let takenRawSize = inputBoundRawSize;
    let candidate = evaluate(takenRawSize, level.rawPrice);
    let result: (typeof trace)[number]['result'] =
      inputBoundRawSize < level.rawSize ? 'PARTIAL_INPUT_LIMIT' : 'FULL_LEVEL';

    if (!candidate.withinPrice) {
      let low = 0n;
      let high = takenRawSize + 1n;
      while (low + 1n < high) {
        const middle = (low + high) / 2n;
        if (evaluate(middle, level.rawPrice).withinPrice) low = middle;
        else high = middle;
      }
      takenRawSize = low;
      candidate = evaluate(takenRawSize, level.rawPrice);
      result = takenRawSize === 0n ? 'REJECTED_PRICE_LIMIT' : 'PARTIAL_PRICE_LIMIT';
    }

    if (takenRawSize === 0n) {
      trace.push({
        levelIndex,
        rawPrice: level.rawPrice,
        availableRawSize: level.rawSize,
        takenRawSize: 0n,
        levelInput: tokenAmount(0n),
        cumulativeInput: tokenAmount(cumulativeInput),
        cumulativeGrossOutput: tokenAmount(grossBaseUnits(cumulativeRawSize, params)),
        cumulativeFeeOutput: tokenAmount(outputAfterFee(grossBaseUnits(cumulativeRawSize, params), params.takerFeeBps).fee),
        cumulativeNetOutput: tokenAmount(outputAfterFee(grossBaseUnits(cumulativeRawSize, params), params.takerFeeBps).net),
        result,
      });
      stopReason = 'PRICE_LIMIT';
      break;
    }

    const levelInput = candidate.nextInput - cumulativeInput;
    cumulativeInput = candidate.nextInput;
    cumulativeRawSize += takenRawSize;
    trace.push({
      levelIndex,
      rawPrice: level.rawPrice,
      availableRawSize: level.rawSize,
      takenRawSize,
      levelInput: tokenAmount(levelInput),
      cumulativeInput: tokenAmount(cumulativeInput),
      cumulativeGrossOutput: tokenAmount(candidate.nextGrossOutput),
      cumulativeFeeOutput: tokenAmount(candidate.fee),
      cumulativeNetOutput: tokenAmount(candidate.net),
      result,
    });

    if (takenRawSize < level.rawSize) {
      stopReason = result === 'PARTIAL_PRICE_LIMIT' ? 'PRICE_LIMIT' : 'INPUT_LIMIT';
      break;
    }
  }

  const estimatedGrossOutput = grossBaseUnits(cumulativeRawSize, params);
  const { fee, net } = outputAfterFee(estimatedGrossOutput, params.takerFeeBps);
  return {
    estimatedInput: tokenAmount(cumulativeInput),
    estimatedGrossOutput: tokenAmount(estimatedGrossOutput),
    estimatedFeeOutput: tokenAmount(fee),
    estimatedOutput: tokenAmount(net),
    stopReason,
    trace,
    includedSources: ['MANUAL_L2'],
    excludedSources: ['KURU_AMM_VAULT'],
  };
}
