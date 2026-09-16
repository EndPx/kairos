import {AppShell} from '@/components/app-shell';
import {
  Button,
  DecisionTrace,
  Field,
  MoneyValue,
  PageHeader,
  ReceiptCard,
  SourceBadge,
  StatePanel,
  StatusPill,
  TransactionState,
} from '@/components/primitives';

const sampleHash = `0x${'4'.repeat(64)}` as const;
const sampleSnapshot = `0x${'9a'.repeat(32)}`;

export default function SystemPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="M3 / Primitive contract"
          title="A truthful interface starts with truthful states."
          description="Every state below is a reusable product primitive. Fixtures are shown here only to verify language, hierarchy, and accessibility before live application data is connected."
          actions={<SourceBadge source="FIXTURE" />}
        />

        <section className="system-section" aria-labelledby="system-statuses">
          <div className="section-heading">
            <p className="eyebrow">Lifecycle</p>
            <h2 id="system-statuses">Status and provenance</h2>
          </div>
          <div className="primitive-row">
            <StatusPill status="active" />
            <StatusPill status="waiting" />
            <StatusPill status="submitted" />
            <StatusPill status="confirmed" />
            <StatusPill status="failed" />
            <StatusPill status="stale" />
            <StatusPill status="cancelled" />
            <StatusPill status="expired" />
            <StatusPill status="completed" />
          </div>
          <div className="primitive-row">
            <SourceBadge source="ONCHAIN" />
            <SourceBadge source="LIVE READ" />
            <SourceBadge source="CRE SIMULATION" />
            <SourceBadge source="REPLAY" />
            <SourceBadge source="FORK" />
            <SourceBadge source="FIXTURE" />
          </div>
        </section>

        <section className="system-section" aria-labelledby="system-actions">
          <div className="section-heading">
            <p className="eyebrow">Authorization</p>
            <h2 id="system-actions">Fields and actions</h2>
          </div>
          <div className="system-grid">
            <div className="primitive-card stack-md">
              <Field
                id="sample-budget"
                label="Total budget"
                hint="Converted to six-decimal integer units before calldata is assembled."
                suffix="USDC"
                inputMode="decimal"
                defaultValue="250.00"
              />
              <Field
                id="sample-minimum"
                label="Minimum fill"
                error="Minimum fill cannot exceed maximum per fill."
                suffix="USDC"
                inputMode="decimal"
                defaultValue="75.00"
              />
              <div className="primitive-row">
                <Button>Approve USDC</Button>
                <Button tone="secondary">Create policy</Button>
                <Button tone="quiet">Review</Button>
                <Button tone="danger">Cancel order</Button>
              </div>
            </div>
            <div className="primitive-card value-showcase">
              <MoneyValue value="250.000000" symbol="USDC" estimate="$250.00" label="Policy budget" />
              <MoneyValue value="0.037842" symbol="MON" label="Actual output" />
              <p>Estimated values are subordinate to integer-derived token quantities.</p>
            </div>
          </div>
        </section>

        <section className="system-section" aria-labelledby="system-transactions">
          <div className="section-heading">
            <p className="eyebrow">Wallet transaction</p>
            <h2 id="system-transactions">Submission is not confirmation</h2>
          </div>
          <div className="system-grid system-grid-two">
            <TransactionState
              status="submitted"
              title="Approval submitted onchain"
              detail="The wallet returned a transaction hash. Kairos is waiting for a receipt."
              hash={sampleHash}
            />
            <TransactionState
              status="confirmed"
              title="Order creation confirmed"
              detail="The indexed receipt contains OrderCreated for order 12."
              hash={sampleHash}
            />
            <TransactionState
              status="failed"
              title="Cancellation reverted"
              detail="The order was already completed before this transaction executed."
              hash={sampleHash}
            />
            <TransactionState
              status="stale"
              title="Receipt status is stale"
              detail="The RPC timeout expired. Recheck the hash before retrying; do not create a duplicate order."
              hash={sampleHash}
            />
          </div>
        </section>

        <section className="system-section" aria-labelledby="system-proof">
          <div className="section-heading">
            <p className="eyebrow">Inspectable proof</p>
            <h2 id="system-proof">Decision and settlement</h2>
          </div>
          <div className="system-grid system-grid-two">
            <DecisionTrace
              decision="WAIT"
              reason="Executable capacity is below the policy minimum fill. No proposal was submitted."
              source="CRE SIMULATION"
              snapshot={sampleSnapshot}
              items={[
                {label: 'Released budget', value: '48.000000 USDC'},
                {label: 'Estimated capacity', value: '7.250000 USDC'},
                {label: 'Minimum fill', value: '10.000000 USDC'},
                {label: 'Snapshot age', value: '1.4 s'},
              ]}
            />
            <ReceiptCard
              title="Fill 3 of order 12"
              source="FORK"
              status="confirmed"
              items={[
                {label: 'Actual input', value: '24.000000 USDC'},
                {label: 'Actual output', value: '0.037842 MON'},
                {label: 'Effective average price', value: '634.210000 USDC / MON'},
                {label: 'Trading fee', value: '0.024000 USDC'},
                {label: 'Gas', value: '0.001540 MON'},
              ]}
            />
          </div>
        </section>

        <section className="system-section" aria-labelledby="system-boundaries">
          <div className="section-heading">
            <p className="eyebrow">Boundary states</p>
            <h2 id="system-boundaries">Loading, missing, empty, error</h2>
          </div>
          <div className="system-grid system-grid-two">
            <StatePanel state="loading" title="Recovering indexed state">
              Reading the last checkpoint and verifying its block hash.
            </StatePanel>
            <StatePanel state="missing" title="Privy is not configured">
              Set the local App ID and allowed origin before proving real wallet actions.
            </StatePanel>
            <StatePanel state="empty" title="No orders yet">
              Create a policy to begin; Kairos will not move funds before an approved execution.
            </StatePanel>
            <StatePanel state="error" title="Market snapshot unavailable">
              Execution remains waiting. No proposal is produced from missing data.
            </StatePanel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
