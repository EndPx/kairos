import {formatUnits} from '@kairos/shared/units';
import {ArrowRight, Clock3} from 'lucide-react';
import type {Route} from 'next';
import Link from 'next/link';

import type {EvidenceSource, StatusTone} from '@/components/primitives';
import {
  AddressValue,
  DecisionTrace,
  KeyValueList,
  ReceiptCard,
  SourceBadge,
  StatePanel,
  StatusPill,
} from '@/components/primitives';
import {POLICY_PRICE_DECIMALS} from '@/lib/order-form';
import {progressBasisPoints, type OrderViewModel, type OrdersReadModel} from '@/lib/order-read-model';

import {OrderActions} from './order-actions';

function statusTone(status: OrderViewModel['status']): StatusTone {
  return status === 'ACTIVE'
    ? 'active'
    : status === 'COMPLETED'
      ? 'completed'
      : status === 'CANCELLED'
        ? 'cancelled'
        : status === 'EXPIRED'
          ? 'expired'
          : 'stale';
}

function dateTime(seconds: string): string {
  return `${new Date(Number(BigInt(seconds)) * 1_000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function amount(value: string, decimals: number, symbol: string): string {
  return `${formatUnits(BigInt(value), decimals)} ${symbol}`;
}

function percentage(basisPoints: bigint): string {
  return `${basisPoints / 100n}.${(basisPoints % 100n).toString().padStart(2, '0')}%`;
}

function decisionSource(source: NonNullable<OrderViewModel['latestDecision']>['source']): EvidenceSource {
  if (source === 'CRE_SIMULATION') return 'CRE SIMULATION';
  if (source === 'CRE_WORKFLOW') return 'CRE WORKFLOW';
  if (source === 'LOCAL_ENGINE') return 'LOCAL ENGINE';
  return 'REPLAY';
}

export function OrdersList({model}: {model: OrdersReadModel}) {
  if (model.state === 'CONFIG_REQUIRED') {
    return (
      <StatePanel state="missing" title="Order index is not configured">
        {model.message} No sample orders are substituted for chain state.
      </StatePanel>
    );
  }
  if (model.state === 'READ_FAILED') {
    return (
      <StatePanel state="error" title="Order recovery failed">
        {model.message}
      </StatePanel>
    );
  }
  if (model.state === 'SYNCING') {
    return (
      <StatePanel state="loading" title="Envio history is syncing">
        {model.message} Progress {model.indexSync?.progressBlock ?? 'not available'}; source head{' '}
        {model.indexSync?.sourceBlock ?? 'not available'}.
      </StatePanel>
    );
  }
  if (model.state === 'EMPTY') {
    return (
      <StatePanel state="empty" title="No indexed orders">
        The configured index is valid but contains no OrderCreated event yet.
      </StatePanel>
    );
  }

  return (
    <div className="orders-list">
      <div className="orders-provenance">
        <SourceBadge source="ONCHAIN" />
        <span>Envio HyperIndex progress {model.indexSync?.progressBlock ?? 'unavailable'}</span>
        <span>Source head {model.indexSync?.sourceBlock ?? 'unavailable'}</span>
        <span>Lag {model.indexSync?.lagBlocks ?? 'unknown'} blocks</span>
        <span>Policy comparison read {model.policyBlock?.blockNumber ?? 'unavailable'}</span>
      </div>
      {model.orders.map((order) => {
        const progress = progressBasisPoints(order.spent, order.budget);
        return (
          <article className="order-row" key={order.orderId}>
            <div className="order-row-id">
              <small>Order</small>
              <strong>#{order.orderId}</strong>
            </div>
            <div className="order-row-main">
              <div>
                <h2>Buy MON with USDC</h2>
                <StatusPill status={statusTone(order.status)}>{order.status}</StatusPill>
              </div>
              <div className="progress-track" aria-label={`${percentage(progress)} spent`}>
                <span style={{width: `${Number(progress) / 100}%`}} />
              </div>
              <p>
                {amount(order.spent, 6, 'USDC')} of {amount(order.budget, 6, 'USDC')} actual spend ·{' '}
                {order.fills.length} confirmed {order.fills.length === 1 ? 'fill' : 'fills'}
              </p>
            </div>
            <div className="order-row-time">
              <Clock3 aria-hidden="true" size={14} />
              <span>{dateTime(order.endTime)}</span>
            </div>
            <Link className="order-row-link" href={`/orders/${order.orderId}` as Route} aria-label={`Open order ${order.orderId}`}>
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export function OrderDetail({order, model}: {order: OrderViewModel; model: OrdersReadModel}) {
  const progress = progressBasisPoints(order.spent, order.budget);
  const decision = order.latestDecision;
  const constraintItems = decision?.constraints
    ? [
        {label: 'Released available', value: amount(decision.constraints.releasedAvailable, 6, 'USDC')},
        {label: 'Remaining budget', value: amount(decision.constraints.remainingBudget, 6, 'USDC')},
        {label: 'Maximum per fill', value: amount(decision.constraints.maxPerFill, 6, 'USDC')},
        {label: 'Wallet balance', value: amount(decision.constraints.walletBalance, 6, 'USDC')},
        {label: 'Token allowance', value: amount(decision.constraints.tokenAllowance, 6, 'USDC')},
        {label: 'Manual L2 capacity', value: amount(decision.constraints.estimatedLiquidityCapacity, 6, 'USDC')},
        {label: 'Selected input', value: amount(decision.constraints.selectedInput, 6, 'USDC')},
      ]
    : [
        {label: 'Recorded at', value: decision?.recordedAt ?? 'Unavailable'},
        {label: 'Constraint trace', value: 'Not present in this journal record'},
      ];

  return (
    <div className="order-detail-grid">
      <section className="order-overview-card">
        <header>
          <div>
            <p className="eyebrow">Onchain lifecycle</p>
            <h2>Order #{order.orderId}</h2>
          </div>
          <StatusPill status={statusTone(order.status)}>{order.status}</StatusPill>
        </header>
        <div className="progress-display">
          <strong>{percentage(progress)}</strong>
          <span>of budget spent</span>
          <div className="progress-track"><span style={{width: `${Number(progress) / 100}%`}} /></div>
        </div>
        <KeyValueList items={[
          {label: 'Actual spend', value: amount(order.spent, 6, 'USDC')},
          {label: 'Total budget', value: amount(order.budget, 6, 'USDC')},
          {label: 'Actual output', value: amount(order.received, 18, 'MON')},
          {label: 'Released budget', value: amount(order.releasedBudget, 6, 'USDC')},
          {label: 'Available by schedule', value: amount(order.availableToSpend, 6, 'USDC')},
          {label: 'Execution nonce', value: order.executionNonce},
        ]} />
        <footer><SourceBadge source="LIVE READ" /><span>Envio comparison block {model.policyBlock?.blockNumber}</span></footer>
      </section>

      <section className="detail-card">
        <div className="section-heading"><p className="eyebrow">Immutable limits</p><h2>Policy</h2></div>
        <KeyValueList items={[
          {label: 'Owner', value: <AddressValue value={order.owner} />},
          {label: 'Starts', value: dateTime(order.startTime)},
          {label: 'Expires', value: dateTime(order.endTime)},
          {label: 'Maximum per fill', value: amount(order.maxPerFill, 6, 'USDC')},
          {label: 'Minimum fill', value: amount(order.minFill, 6, 'USDC')},
          {label: 'Maximum effective price', value: amount(order.maxEffectivePrice, POLICY_PRICE_DECIMALS, 'USDC / MON')},
        ]} />
      </section>

      <section className="detail-card">
        <div className="section-heading"><p className="eyebrow">Market snapshot</p><h2>Manual Kuru L2</h2></div>
        {model.market ? (
          <>
            <KeyValueList items={[
              {label: 'Best ask', value: model.market.bestAskPrice ? `${model.market.bestAskPrice} USDC / MON` : 'No manual ask'},
              {label: 'Ask levels', value: model.market.askLevels},
              {label: 'Bid levels', value: model.market.bidLevels},
              {label: 'Coverage', value: 'Manual L2 only; AMM vault excluded'},
              {label: 'Snapshot block', value: model.market.blockNumber},
            ]} />
            <SourceBadge source="LIVE READ" />
          </>
        ) : (
          <StatePanel state="error" title="Market snapshot unavailable">{model.marketError ?? 'No market read was returned.'}</StatePanel>
        )}
      </section>

      <section className="detail-wide">
        <div className="section-heading"><p className="eyebrow">Offchain proposal state</p><h2>Latest decision</h2></div>
        {decision ? (
          <DecisionTrace
            decision={decision.decision}
            reason={decision.reason}
            source={decisionSource(decision.source)}
            snapshot={decision.snapshotId}
            items={constraintItems}
          />
        ) : (
          <StatePanel state="empty" title="No recorded decision">
            WAIT and EXECUTE decisions appear here only after an explicitly sourced journal record exists.
          </StatePanel>
        )}
      </section>

      <section className="detail-wide">
        <div className="section-heading"><p className="eyebrow">Confirmed chain events</p><h2>Settlement receipts</h2></div>
        {order.fills.length > 0 ? (
          <div className="receipt-grid">
            {order.fills.map((fill) => (
              <ReceiptCard
                key={`${fill.transactionHash}-${fill.nonce}`}
                title={`Fill nonce ${fill.nonce}`}
                source="ONCHAIN"
                status="confirmed"
                items={[
                  {label: 'Actual input', value: amount(fill.actualInput, 6, 'USDC')},
                  {label: 'Actual output', value: amount(fill.actualOutput, 18, 'MON')},
                  {label: 'Returned input', value: amount(fill.returnedInput, 6, 'USDC')},
                  {label: 'Block', value: fill.blockNumber},
                  {label: 'Snapshot', value: `${fill.snapshotId.slice(0, 12)}…${fill.snapshotId.slice(-8)}`},
                ]}
              />
            ))}
          </div>
        ) : (
          <StatePanel state="empty" title="No confirmed fills">
            WAIT decisions are not receipts. This order has no indexed ExecutionSettled event.
          </StatePanel>
        )}
      </section>

      <div className="detail-wide"><OrderActions orderId={order.orderId} owner={order.owner} active={order.status === 'ACTIVE'} /></div>
    </div>
  );
}
