import {AppShell} from '@/components/app-shell';
import {OrdersList} from '@/components/orders-view';
import {PageHeader, SourceBadge} from '@/components/primitives';
import {loadOrdersReadModel} from '@/lib/order-read-model.server';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const model = await loadOrdersReadModel();
  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow="Orders / Envio HyperIndex history"
          title="Policies, not promises."
          description="Lifecycle is reread from the contract at the Envio comparison block. Confirmed fills come from HyperIndex; offchain decisions remain visibly separate."
          actions={model.state === 'READY' || model.state === 'EMPTY' ? <SourceBadge source="ONCHAIN" /> : undefined}
        />
        <OrdersList model={model} />
      </div>
    </AppShell>
  );
}
