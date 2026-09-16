import {AppShell} from '@/components/app-shell';
import {CreateOrderForm} from '@/components/create-order-form';
import {PageHeader, SourceBadge} from '@/components/primitives';

export default function CreateOrderPage() {
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Create / Policy-authorized execution"
          title="Set the limits. Keep custody."
          description="Create a cumulative USDC-to-MON execution policy for the verified Kuru market. Approval and policy creation remain separate wallet actions."
          actions={<SourceBadge source="ONCHAIN" />}
        />
        <CreateOrderForm />
      </div>
    </AppShell>
  );
}
