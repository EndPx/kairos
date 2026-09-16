import {cleanup, render, screen} from '@testing-library/react';
import {decodeFunctionData} from 'viem';
import {afterEach, describe, expect, it} from 'vitest';

import type {PersistedIndexState} from '../../../../packages/indexer/src/types';
import {ExecutionReportsView} from '@/components/execution-reports-view';
import {OrderDetail} from '@/components/orders-view';
import {erc20Abi, kairosPolicyAbi} from '@/lib/abi';
import {buildExecutionReport, type ExecutionReportsReadModel} from '@/lib/execution-report';
import {validateApprovalAmount, validateOrderDraft} from '@/lib/order-form';
import {mergeIndexedOrders, type LivePolicyOrder, type OrdersReadModel} from '@/lib/order-read-model';
import {buildApprovalTransaction, buildCreateOrderTransaction} from '@/lib/transactions';

const POLICY = '0x1000000000000000000000000000000000000001' as const;
const RECEIVER = '0x2000000000000000000000000000000000000002' as const;
const OWNER = '0x3000000000000000000000000000000000000003' as const;
const TOKEN = '0x4000000000000000000000000000000000000004' as const;
const TX = `0x${'1'.repeat(64)}` as const;
const BLOCK = `0x${'2'.repeat(64)}` as const;
const SNAPSHOT = `0x${'3'.repeat(64)}` as const;

afterEach(cleanup);

describe('M3 labeled fixture journey', () => {
  it('preserves one policy from form integers through recovered settlement and report UI', () => {
    const approval = validateApprovalAmount('100');
    const draft = validateOrderDraft({
      approval: '100',
      budget: '100',
      startTime: '2026-09-16T10:00',
      endTime: '2026-09-16T11:00',
      maxPerFill: '40',
      minFill: '5',
      maxEffectivePrice: '6.25',
    });
    expect(approval.value).toBe(100_000_000n);
    expect(draft.errors).toEqual({});
    const orderArguments = draft.value!.order;

    const approvalCall = decodeFunctionData({
      abi: erc20Abi,
      data: buildApprovalTransaction(TOKEN, POLICY, approval.value!).data,
    });
    const createCall = decodeFunctionData({
      abi: kairosPolicyAbi,
      data: buildCreateOrderTransaction(POLICY, orderArguments).data,
    });
    expect(approvalCall.args).toEqual([POLICY, 100_000_000n]);
    expect(createCall.args).toEqual([
      100_000_000n,
      orderArguments.startTime,
      orderArguments.endTime,
      40_000_000n,
      5_000_000n,
      625_000_000n,
    ]);

    const persisted: PersistedIndexState = {
      schemaVersion: 1,
      chainId: '10143',
      policyAddress: POLICY,
      receiverAddress: RECEIVER,
      deploymentBlock: '10',
      cursor: {blockNumber: '12', blockHash: BLOCK},
      receiver: null,
      orders: {
        '1': {
          orderId: '1',
          owner: OWNER,
          budget: '100000000',
          startTime: orderArguments.startTime.toString(),
          endTime: orderArguments.endTime.toString(),
          status: 'ACTIVE',
          spent: '40000000',
          received: '8000000000000000000',
          fills: [{
            nonce: '0',
            actualInput: '40000000',
            actualOutput: '8000000000000000000',
            returnedInput: '10000000',
            snapshotId: SNAPSHOT,
            transactionHash: TX,
            blockNumber: '11',
          }],
          reports: [],
        },
      },
    };
    const live: LivePolicyOrder = {
      owner: OWNER,
      budget: '100000000',
      spent: '40000000',
      received: '8000000000000000000',
      startTime: orderArguments.startTime.toString(),
      endTime: orderArguments.endTime.toString(),
      maxPerFill: '40000000',
      minFill: '5000000',
      maxEffectivePrice: '625000000',
      executionNonce: '1',
      releasedBudget: '50000000',
      availableToSpend: '10000000',
      status: 'ACTIVE',
    };
    const orders = mergeIndexedOrders(persisted, {'1': live}, [{
      kind: 'OFFCHAIN_DECISION',
      source: 'CRE_SIMULATION',
      recordedAt: '2026-09-16T10:30:00.000Z',
      orderId: '1',
      decision: 'WAIT',
      reason: 'CAPACITY_BELOW_MINIMUM',
      snapshotId: SNAPSHOT,
    }]);
    const ordersModel: OrdersReadModel = {
      state: 'READY',
      orders,
      cursor: persisted.cursor!,
      policyBlock: {blockNumber: '12', blockHash: BLOCK, blockTimestamp: '1789554600'},
    };
    const report = buildExecutionReport(orders[0]!.fills, [{
      transactionHash: TX,
      blockHash: BLOCK,
      blockTimestamp: '1789554000',
      effectiveGasPrice: '1000000000',
      gasLimit: '500000',
      gasUsed: '310000',
      takerFeeBps: '0',
    }], live.spent, live.received);
    const reportsModel: ExecutionReportsReadModel = {ordersModel, reports: [{order: orders[0]!, report}]};

    const detail = render(<OrderDetail order={orders[0]!} model={ordersModel} />);
    expect(screen.getByText('CAPACITY_BELOW_MINIMUM')).toBeInTheDocument();
    expect(screen.getByText('CRE SIMULATION')).toBeInTheDocument();
    expect(screen.getAllByText('40 USDC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8 MON').length).toBeGreaterThan(0);
    detail.unmount();

    render(<ExecutionReportsView model={reportsModel} />);
    expect(screen.getByText('5 USDC / MON')).toBeInTheDocument();
    expect(screen.getByText('0 MON (pinned taker fee = 0 bps)')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /explorer/i})).toHaveAttribute('href', expect.stringContaining(`/tx/${TX}`));
  });
});
