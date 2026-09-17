import {AppShell} from '@/components/app-shell';
import {LimitedDeploymentPanel} from '@/components/limited-deployment-panel';
import {LimitedLifecycleCleanup} from '@/components/limited-lifecycle-cleanup';
import {PageHeader, SourceBadge} from '@/components/primitives';

export default function LimitedDeploymentPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="M3 / Privy lifecycle proof"
          title="Deploy a target that cannot execute trades."
          description="This local-only route prepares the minimum Monad Testnet contracts required for approval, creation, cancellation, and revocation evidence while retaining two independent execution locks."
          actions={<SourceBadge source="LOCAL WALLET" />}
        />
        <LimitedDeploymentPanel />
        <LimitedLifecycleCleanup />
      </div>
    </AppShell>
  );
}
