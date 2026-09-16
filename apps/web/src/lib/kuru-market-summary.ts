import {formatUnits, mulDivCeil, pow10} from '@kairos/shared/units';
import type {Hex} from 'viem';

import {POLICY_PRICE_DECIMALS} from './order-form';

export interface KuruManualBookSummary {
  readonly askLevels: number;
  readonly bestAskPrice?: string;
  readonly bidLevels: number;
}

/** Display-only summary of the M2-verified manual-L2 layout; never used to size a proposal. */
export function summarizeKuruManualBook(
  payload: Hex,
  expectedBlock: bigint,
  pricePrecision: bigint,
): KuruManualBookSummary {
  const body = payload.slice(2);
  if (body.length < 128 || body.length % 64 !== 0) throw new Error('Invalid Kuru L2 payload length.');
  if (pricePrecision <= 0n) throw new Error('Kuru price precision must be positive.');
  const words: bigint[] = [];
  for (let offset = 0; offset < body.length; offset += 64) {
    words.push(BigInt(`0x${body.slice(offset, offset + 64)}`));
  }
  if (words[0] !== expectedBlock) throw new Error('Kuru L2 payload does not match the pinned block.');

  let cursor = 1;
  let bidLevels = 0;
  let bidSentinel = false;
  while (cursor < words.length) {
    const price = words[cursor++];
    if (price === 0n) {
      bidSentinel = true;
      break;
    }
    if (cursor >= words.length || words[cursor++] === 0n) throw new Error('Invalid Kuru bid level.');
    bidLevels += 1;
  }
  if (!bidSentinel) throw new Error('Kuru L2 bid sentinel is missing.');

  let askLevels = 0;
  let bestAsk: bigint | undefined;
  while (cursor < words.length) {
    const price = words[cursor++];
    if (price === 0n || cursor >= words.length || words[cursor++] === 0n) {
      throw new Error('Invalid Kuru ask level.');
    }
    bestAsk ??= price;
    askLevels += 1;
  }
  return {
    askLevels,
    bidLevels,
    bestAskPrice: bestAsk === undefined
      ? undefined
      : formatUnits(
          mulDivCeil(bestAsk, pow10(POLICY_PRICE_DECIMALS), pricePrecision),
          POLICY_PRICE_DECIMALS,
        ),
  };
}
