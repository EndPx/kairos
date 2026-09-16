import {AppShell} from '@/components/app-shell';
import {ExecutionReportsView} from '@/components/execution-reports-view';
import {PageHeader, SourceBadge} from '@/components/primitives';
import {WalletAttemptHistory} from '@/components/wallet-attempt-history';
import {loadExecutionReportsReadModel} from '@/lib/order-read-model.server';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const model = await loadExecutionReportsReadModel();
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Reports / confirmed execution"
          title="What actually settled."
          description="Actual input and output come from Kairos settlement events. Gas receipts and Kuru fee parameters are read at each fill block; unavailable evidence stays unavailable."
          actions={model.ordersModel.state === 'READY' ? <SourceBadge source="ONCHAIN" /> : undefined}
        />
        <ExecutionReportsView model={model} />
        <WalletAttemptHistory />
      </div>
    </AppShell>
  );
}
