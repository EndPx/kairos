import {formatUnits} from '@kairos/shared/units';

import {KeyValueList, ReceiptCard, SourceBadge, StatePanel, StatusPill} from '@/components/primitives';
import {monadTestnet} from '@/lib/chain';
import type {ExecutionReportsReadModel} from '@/lib/execution-report';
import type {EvidenceSource, StatusTone} from '@/components/primitives';

function amount(value: string, decimals: number, symbol: string): string {
  return `${formatUnits(BigInt(value), decimals)} ${symbol}`;
}

function seconds(value: string | undefined): string {
  if (value === undefined) return 'Unavailable until every fill is enriched';
  const secondsValue = BigInt(value);
  if (secondsValue < 60n) return `${secondsValue} s`;
  return `${secondsValue / 60n} min ${secondsValue % 60n} s`;
}

function transactionExplorer(hash: `0x${string}`): string | undefined {
  const base = monadTestnet.blockExplorers?.default.url;
  return base ? `${base.replace(/\/$/, '')}/tx/${hash}` : undefined;
}

function attemptSource(source: ExecutionReportsReadModel['attempts'][number]['source']): EvidenceSource {
  if (source === 'CRE_SIMULATION') return 'CRE SIMULATION';
  if (source === 'CRE_WORKFLOW') return 'CRE WORKFLOW';
  if (source === 'LOCAL_ENGINE') return 'LOCAL ENGINE';
  return 'REPLAY';
}

function attemptTone(status: ExecutionReportsReadModel['attempts'][number]['status']): Extract<StatusTone, 'confirmed' | 'failed' | 'stale' | 'submitted'> {
  if (status === 'CONFIRMED') return 'confirmed';
  if (status === 'SUBMITTED') return 'submitted';
  if (status === 'STALE') return 'stale';
  return 'failed';
}

export function ExecutionReportsView({model}: {model: ExecutionReportsReadModel}) {
  const source = model.ordersModel;
  if (source.state === 'CONFIG_REQUIRED') {
    return <StatePanel state="missing" title="Execution reports are not configured">{source.message}</StatePanel>;
  }
  if (source.state === 'READ_FAILED') {
    return <StatePanel state="error" title="Execution report recovery failed">{source.message}</StatePanel>;
  }
  if (source.state === 'SYNCING') {
    return <StatePanel state="loading" title="Envio history is syncing">{source.message} Partial reports are not shown.</StatePanel>;
  }
  if (source.state === 'EMPTY') {
    return <StatePanel state="empty" title="No indexed orders">A report is created only from indexed settlement events.</StatePanel>;
  }

  return (
    <div className="reports-stack">
      <div className="orders-provenance">
        <SourceBadge source="ONCHAIN" />
        <span>Envio HyperIndex progress {source.indexSync?.progressBlock ?? 'unavailable'}</span>
        <span>Lag {source.indexSync?.lagBlocks ?? 'unknown'} blocks</span>
        <span>Receipts and market fees are pinned to each fill block</span>
      </div>
      {model.reports.map(({order, report}) => (
        <article className="execution-report" key={order.orderId}>
          <header>
            <div>
              <p className="eyebrow">Execution report / order {order.orderId}</p>
              <h2>Actual settlement, not an estimate.</h2>
            </div>
            <StatusPill status={report.evidenceComplete && report.indexMatchesPolicy ? 'confirmed' : 'stale'}>
              {report.evidenceComplete && report.indexMatchesPolicy ? 'Verified' : 'Incomplete'}
            </StatusPill>
          </header>

          <div className="report-summary-grid">
            <section>
              <p>Actual input</p>
              <strong>{amount(report.actualInput, 6, 'USDC')}</strong>
            </section>
            <section>
              <p>Actual output</p>
              <strong>{amount(report.actualOutput, 18, 'MON')}</strong>
            </section>
            <section>
              <p>Weighted average price</p>
              <strong>{report.weightedAveragePrice ? amount(report.weightedAveragePrice, 8, 'USDC / MON') : 'Unavailable'}</strong>
            </section>
          </div>

          <div className="report-evidence-grid">
            <section className="detail-card">
              <div className="section-heading"><p className="eyebrow">Execution</p><h3>Fill accounting</h3></div>
              <KeyValueList items={[
                {label: 'Confirmed fill count', value: report.fillCount},
                {label: 'First-to-last fill duration', value: seconds(report.durationSeconds)},
                {label: 'Index matches live policy totals', value: report.indexMatchesPolicy ? 'Yes' : 'No — index may be behind'},
                {label: 'Receipt enrichment', value: report.evidenceComplete ? 'Complete' : 'Incomplete'},
              ]} />
            </section>
            <section className="detail-card">
              <div className="section-heading"><p className="eyebrow">Costs</p><h3>Venue fee and network gas</h3></div>
              <KeyValueList items={[
                {
                  label: 'Trading fee',
                  value: report.tradingFee.status === 'EXACT_ZERO' ? '0 MON (pinned taker fee = 0 bps)' : 'Unavailable exactly',
                },
                {label: 'Charged network gas', value: amount(report.chargedGas, 18, 'MON')},
                {label: 'Submitted gas limit total', value: report.submittedGasLimit},
                {label: 'Gas rule', value: 'Submitted gas limit × effective gas price'},
              ]} />
              {report.tradingFee.status === 'UNAVAILABLE' ? <p className="muted-note">{report.tradingFee.reason}</p> : null}
            </section>
          </div>

          <section className="report-receipts">
            <div className="section-heading"><p className="eyebrow">Transaction evidence</p><h3>Confirmed fills</h3></div>
            {report.fills.length > 0 ? (
              <div className="receipt-grid">
                {report.fills.map((fill) => {
                  const evidence = fill.chainEvidence;
                  return (
                    <ReceiptCard
                      key={`${fill.transactionHash}-${fill.nonce}`}
                      title={`Fill nonce ${fill.nonce}`}
                      source="ONCHAIN"
                      status="confirmed"
                      explorerHref={transactionExplorer(fill.transactionHash)}
                      items={[
                        {label: 'Actual input', value: amount(fill.actualInput, 6, 'USDC')},
                        {label: 'Actual output', value: amount(fill.actualOutput, 18, 'MON')},
                        {label: 'Returned input', value: amount(fill.returnedInput, 6, 'USDC')},
                        {label: 'Block', value: fill.blockNumber},
                        {label: 'Gas charged', value: evidence ? amount((BigInt(evidence.gasLimit) * BigInt(evidence.effectiveGasPrice)).toString(), 18, 'MON') : 'Unavailable'},
                        {label: 'Receipt', value: evidence ? 'Pinned and successful' : 'Could not be enriched'},
                      ]}
                    />
                  );
                })}
              </div>
            ) : (
              <StatePanel state="empty" title="No confirmed fills">This order has no indexed ExecutionSettled event.</StatePanel>
            )}
          </section>

          <section className="report-failures">
            <div className="section-heading"><p className="eyebrow">Executor transaction attempts</p><h3>Submitted, confirmed, failed, and stale.</h3></div>
            {model.attemptJournalError ? (
              <StatePanel state="error" title="Attempt journal unavailable">{model.attemptJournalError}</StatePanel>
            ) : model.attempts.some((attempt) => attempt.orderId === order.orderId) ? (
              <div className="receipt-grid">
                {model.attempts.filter((attempt) => attempt.orderId === order.orderId).map((attempt) => (
                  <ReceiptCard
                    key={`${attempt.orderId}-${attempt.nonce}-${attempt.proposalHash}`}
                    eyebrow="Execution attempt"
                    title={`Nonce ${attempt.nonce} · ${attempt.status.toLowerCase()}`}
                    source={attemptSource(attempt.source)}
                    status={attemptTone(attempt.status)}
                    explorerHref={attempt.transactionHash ? transactionExplorer(attempt.transactionHash) : undefined}
                    items={[
                      {label: 'Reason', value: attempt.reason},
                      {label: 'Recorded', value: new Date(attempt.recordedAt).toISOString()},
                      {label: 'Proposal', value: `${attempt.proposalHash.slice(0, 12)}…${attempt.proposalHash.slice(-8)}`},
                      {label: 'Public hash', value: attempt.transactionHash ?? 'None recorded'},
                    ]}
                  />
                ))}
              </div>
            ) : (
              <p>
                No attempt record exists. Kairos does not infer a failure from a missing <code>ExecutionSettled</code> event;
                local wallet attempts are reported separately below.
              </p>
            )}
          </section>
        </article>
      ))}
    </div>
  );
}
