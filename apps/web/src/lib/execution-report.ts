import {mulDivCeil, pow10} from '@kairos/shared/units';
import type {Hex} from 'viem';

import type {IndexedFill} from '../../../../packages/indexer/src/types';

export interface FillChainEvidence {
  readonly blockHash: Hex;
  readonly blockTimestamp: string;
  readonly effectiveGasPrice: string;
  readonly gasLimit: string;
  readonly gasUsed: string;
  readonly takerFeeBps: string;
  readonly transactionHash: Hex;
}

export interface ExecutionReportFill extends IndexedFill {
  readonly chainEvidence?: FillChainEvidence;
}

export interface ExecutionReportView {
  readonly actualInput: string;
  readonly actualOutput: string;
  readonly chargedGas: string;
  readonly durationSeconds?: string;
  readonly evidenceComplete: boolean;
  readonly fillCount: number;
  readonly fills: readonly ExecutionReportFill[];
  readonly indexMatchesPolicy: boolean;
  readonly submittedGasLimit: string;
  readonly tradingFee:
    | {readonly status: 'EXACT_ZERO'; readonly amount: '0'}
    | {readonly status: 'UNAVAILABLE'; readonly reason: string};
  readonly weightedAveragePrice?: string;
}

const INPUT_DECIMALS = 6;
const OUTPUT_DECIMALS = 18;
const PRICE_DECIMALS = 8;

function unsigned(value: string, field: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error(`${field} must be an unsigned decimal string.`);
  return BigInt(value);
}

function sum(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

export function buildExecutionReport(
  fills: readonly IndexedFill[],
  chainEvidence: readonly FillChainEvidence[],
  policySpent: string,
  policyReceived: string,
): ExecutionReportView {
  const evidenceByHash = new Map(chainEvidence.map((evidence) => [evidence.transactionHash.toLowerCase(), evidence]));
  if (evidenceByHash.size !== chainEvidence.length) throw new Error('Chain evidence contains a duplicate transaction hash.');

  const reportFills = fills.map((fill) => ({
    ...fill,
    chainEvidence: evidenceByHash.get(fill.transactionHash.toLowerCase()),
  }));
  const actualInput = sum(fills.map((fill) => unsigned(fill.actualInput, 'actualInput')));
  const actualOutput = sum(fills.map((fill) => unsigned(fill.actualOutput, 'actualOutput')));
  const evidenceComplete = reportFills.every((fill) => fill.chainEvidence !== undefined);
  const evidence = reportFills.flatMap((fill) => (fill.chainEvidence ? [fill.chainEvidence] : []));
  const submittedGasLimit = sum(evidence.map((item) => unsigned(item.gasLimit, 'gasLimit')));
  const chargedGas = sum(
    evidence.map((item) => unsigned(item.gasLimit, 'gasLimit') * unsigned(item.effectiveGasPrice, 'effectiveGasPrice')),
  );
  const timestamps = evidence.map((item) => unsigned(item.blockTimestamp, 'blockTimestamp'));
  const durationSeconds =
    evidenceComplete && timestamps.length > 0
      ? (
          timestamps.reduce((maximum, value) => (value > maximum ? value : maximum)) -
          timestamps.reduce((minimum, value) => (value < minimum ? value : minimum))
        ).toString()
      : undefined;
  const tradingFee =
    evidenceComplete && evidence.every((item) => unsigned(item.takerFeeBps, 'takerFeeBps') === 0n)
      ? ({status: 'EXACT_ZERO', amount: '0'} as const)
      : ({
          status: 'UNAVAILABLE',
          reason: evidenceComplete
            ? 'Kairos records net output; a nonzero venue fee cannot be reconstructed exactly from the settlement event.'
            : 'One or more fill transactions could not be enriched with pinned market parameters.',
        } as const);
  const weightedAveragePrice =
    actualOutput > 0n
      ? mulDivCeil(
          actualInput,
          pow10(OUTPUT_DECIMALS + PRICE_DECIMALS),
          actualOutput * pow10(INPUT_DECIMALS),
        ).toString()
      : undefined;

  return {
    actualInput: actualInput.toString(),
    actualOutput: actualOutput.toString(),
    chargedGas: chargedGas.toString(),
    durationSeconds,
    evidenceComplete,
    fillCount: fills.length,
    fills: reportFills,
    indexMatchesPolicy:
      actualInput === unsigned(policySpent, 'policySpent') && actualOutput === unsigned(policyReceived, 'policyReceived'),
    submittedGasLimit: submittedGasLimit.toString(),
    tradingFee,
    weightedAveragePrice,
  };
}
