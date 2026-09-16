import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock3,
  LoaderCircle,
  Radio,
} from 'lucide-react';
import type {ButtonHTMLAttributes, InputHTMLAttributes, ReactNode} from 'react';

export type StatusTone =
  | 'active'
  | 'cancelled'
  | 'completed'
  | 'confirmed'
  | 'expired'
  | 'failed'
  | 'stale'
  | 'submitted'
  | 'waiting';

const statusIcon = {
  active: Radio,
  cancelled: CircleX,
  completed: CircleCheck,
  confirmed: CircleCheck,
  expired: Clock3,
  failed: CircleX,
  stale: CircleAlert,
  submitted: LoaderCircle,
  waiting: CircleDashed,
} satisfies Record<StatusTone, typeof CircleCheck>;

export function StatusPill({status, children}: {status: StatusTone; children?: ReactNode}) {
  const Icon = statusIcon[status];
  const label = children ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className="status-pill" data-tone={status}>
      <Icon aria-hidden="true" size={13} />
      {label}
    </span>
  );
}

export type EvidenceSource =
  | 'CRE SIMULATION'
  | 'FIXTURE'
  | 'FORK'
  | 'LIVE READ'
  | 'ONCHAIN'
  | 'REPLAY';

export function SourceBadge({source}: {source: EvidenceSource}) {
  return <span className="source-badge">{source}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-lede">{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function Button({
  children,
  tone = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: 'danger' | 'primary' | 'quiet' | 'secondary';
}) {
  return (
    <button className="button" data-tone={tone} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  suffix,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? helpId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input id={id} aria-describedby={describedBy || undefined} aria-invalid={Boolean(error)} {...props} />
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </span>
      {hint ? (
        <span className="field-hint" id={helpId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function MoneyValue({
  value,
  symbol,
  estimate,
  label,
}: {
  value: string;
  symbol: string;
  estimate?: string;
  label: string;
}) {
  return (
    <span className="money-value" aria-label={`${label}: ${value} ${symbol}`}>
      <span>
        <strong>{value}</strong>
        <small>{symbol}</small>
      </span>
      {estimate ? <em>Estimated {estimate}</em> : null}
    </span>
  );
}

export function AddressValue({value}: {value: `0x${string}`}) {
  return (
    <code className="address-value" title={value} aria-label={`Address ${value}`}>
      {value.slice(0, 8)}…{value.slice(-6)}
    </code>
  );
}

export function StatePanel({
  state,
  title,
  children,
}: {
  state: 'empty' | 'error' | 'loading' | 'missing';
  title: string;
  children: ReactNode;
}) {
  const Icon = state === 'error' ? CircleX : state === 'loading' ? LoaderCircle : CircleAlert;
  return (
    <section className="state-panel" data-state={state} aria-live={state === 'loading' ? 'polite' : undefined}>
      <Icon aria-hidden="true" size={19} />
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </section>
  );
}

export function TransactionState({
  status,
  title,
  detail,
  hash,
}: {
  status: Extract<StatusTone, 'confirmed' | 'failed' | 'stale' | 'submitted'>;
  title: string;
  detail: string;
  hash?: `0x${string}`;
}) {
  return (
    <section className="transaction-state" data-tone={status} aria-live="polite">
      <span className="transaction-marker" aria-hidden="true">
        <CircleDot size={16} />
      </span>
      <div>
        <div className="transaction-title-row">
          <strong>{title}</strong>
          <StatusPill status={status} />
        </div>
        <p>{detail}</p>
        {hash ? <AddressValue value={hash} /> : null}
      </div>
    </section>
  );
}

export function KeyValueList({
  items,
}: {
  items: ReadonlyArray<{label: string; value: ReactNode; tone?: 'muted'}>;
}) {
  return (
    <dl className="key-value-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd data-tone={item.tone}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DecisionTrace({
  decision,
  reason,
  source,
  snapshot,
  items,
}: {
  decision: 'EXECUTE' | 'WAIT';
  reason: string;
  source: EvidenceSource;
  snapshot: string;
  items: ReadonlyArray<{label: string; value: ReactNode}>;
}) {
  return (
    <article className="decision-trace">
      <header>
        <div>
          <p className="eyebrow">Deterministic decision</p>
          <h3>{decision}</h3>
        </div>
        <StatusPill status={decision === 'EXECUTE' ? 'active' : 'waiting'} />
      </header>
      <p className="decision-reason">{reason}</p>
      <KeyValueList items={items} />
      <footer>
        <SourceBadge source={source} />
        <code title={snapshot}>{snapshot.slice(0, 12)}…{snapshot.slice(-8)}</code>
      </footer>
    </article>
  );
}

export function ReceiptCard({
  title,
  source,
  status,
  items,
  explorerHref,
}: {
  title: string;
  source: EvidenceSource;
  status: Extract<StatusTone, 'confirmed' | 'failed'>;
  items: ReadonlyArray<{label: string; value: ReactNode}>;
  explorerHref?: string;
}) {
  return (
    <article className="receipt-card">
      <header>
        <div>
          <p className="eyebrow">Settlement receipt</p>
          <h3>{title}</h3>
        </div>
        <StatusPill status={status} />
      </header>
      <KeyValueList items={items} />
      <footer>
        <SourceBadge source={source} />
        {explorerHref ? (
          <a href={explorerHref} target="_blank" rel="noreferrer">
            Explorer <ArrowUpRight aria-hidden="true" size={14} />
          </a>
        ) : (
          <span className="muted-note">No public transaction</span>
        )}
      </footer>
    </article>
  );
}
