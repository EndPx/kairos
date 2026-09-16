import { decodeEventLog } from 'viem';
import { KAIROS_EVENTS_ABI } from './abi.js';
import type { KairosChainEvent, RawChainLog } from './types.js';

export function decodeKairosLog(log: RawChainLog): KairosChainEvent {
  const decoded = decodeEventLog({ abi: KAIROS_EVENTS_ABI, data: log.data, topics: log.topics, strict: true });
  const position = {
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
    transactionHash: log.transactionHash,
    transactionIndex: log.transactionIndex,
    logIndex: log.logIndex,
  };
  switch (decoded.eventName) {
    case 'OrderCreated':
      return { type: 'ORDER_CREATED', ...position, ...decoded.args };
    case 'OrderCancelled':
      return { type: 'ORDER_CANCELLED', ...position, ...decoded.args };
    case 'ExecutionSettled':
      return { type: 'EXECUTION_SETTLED', ...position, ...decoded.args };
    case 'ReceiverActivated':
      return { type: 'RECEIVER_ACTIVATED', ...position, ...decoded.args };
    case 'ReportForwarded':
      return { type: 'REPORT_FORWARDED', ...position, ...decoded.args };
  }
}
