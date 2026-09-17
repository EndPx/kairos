import Link from 'next/link';

import {AppShell} from '@/components/app-shell';
import {KeyValueList, PageHeader, SourceBadge, StatusPill} from '@/components/primitives';

export default function HomePage() {
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Adaptive spot execution / Monad"
          title="Execute within your limits."
          description="Kairos sizes each proposed USDC → MON fill against Kuru liquidity, while an onchain policy keeps the budget, schedule, price, assets, recipient, and lifecycle bounded. Unused funds stay in your wallet."
          actions={
            <>
              <Link className="button" href="/orders/new">
                Create bounded order
              </Link>
              <Link className="button" data-tone="quiet" href="/orders">
                Inspect history
              </Link>
            </>
          }
        />

        <section className="system-section" aria-labelledby="control-heading">
          <div className="section-heading">
            <p className="eyebrow">Control model</p>
            <h2 id="control-heading">Automation proposes. The policy decides.</h2>
          </div>
          <div className="system-grid system-grid-two">
            <article className="primitive-card stack-md">
              <div className="section-heading">
                <p className="eyebrow">Wallet-held funds</p>
                <h3>Authority stays narrow</h3>
              </div>
              <p>
                Kairos never escrows the unused order budget. A separate token allowance authorizes only
                policy-bound execution, and cancellation does not masquerade as allowance revocation.
              </p>
              <KeyValueList
                items={[
                  {label: 'Unused budget', value: 'User wallet'},
                  {label: 'Execution authority', value: 'Policy contract'},
                  {label: 'Assets and recipient', value: 'Immutable per deployment'},
                ]}
              />
            </article>

            <article className="primitive-card stack-md">
              <div className="section-heading">
                <p className="eyebrow">Market-aware sizing</p>
                <h3>Every decision is inspectable</h3>
              </div>
              <p>
                The engine combines cumulative release, remaining budget, wallet capacity, and executable
                Kuru levels. Missing or stale data produces a reasoned WAIT instead of a blind proposal.
              </p>
              <KeyValueList
                items={[
                  {label: 'Arithmetic', value: 'Integer units'},
                  {label: 'Price rule', value: 'Effective average'},
                  {label: 'Final enforcement', value: 'Actual input / output'},
                ]}
              />
            </article>
          </div>
        </section>

        <section className="system-section" aria-labelledby="proof-heading">
          <div className="section-heading">
            <p className="eyebrow">Submission evidence</p>
            <h2 id="proof-heading">Proof before claims.</h2>
          </div>
          <article className="primitive-card stack-md">
            <div className="primitive-row">
              <StatusPill status="cancelled">Lifecycle order cancelled</StatusPill>
              <SourceBadge source="ONCHAIN" />
              <SourceBadge source="CRE SIMULATION" />
              <SourceBadge source="FORK" />
            </div>
            <p>
              The public Monad Testnet lifecycle proves Privy approve, create, cancel, and revoke actions;
              Envio recovers that order after reload. CRE delivery and public Kuru settlement are not
              inferred from those receipts.
            </p>
            <KeyValueList
              items={[
                {label: 'Public lifecycle transactions', value: '6 confirmed'},
                {label: 'Final allowance', value: '0 USDC'},
                {label: 'Indexed lifecycle events', value: '2'},
                {label: 'Public Kuru trades', value: 'Not claimed', tone: 'muted'},
              ]}
            />
            <div className="primitive-row">
              <Link className="button" data-tone="secondary" href="/orders/0">
                Open order 0
              </Link>
              <Link className="button" data-tone="quiet" href="/reports">
                Review reports
              </Link>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
