import {notFound} from 'next/navigation';

import {AppShell} from '@/components/app-shell';
import {OrderDetail} from '@/components/orders-view';
import {PageHeader, SourceBadge, StatePanel} from '@/components/primitives';
import {loadOrdersReadModel} from '@/lib/order-read-model.server';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({params}: {params: Promise<{orderId: string}>}) {
  const {orderId} = await params;
  if (!/^(0|[1-9][0-9]*)$/.test(orderId)) notFound();
  const model = await loadOrdersReadModel();
  const order = model.orders.find((candidate) => candidate.orderId === orderId);

  return (
    <AppShell>
      <div className="page-stack">
        <PageHeader
          eyebrow={`Order / ${orderId}`}
          title="Every limit and receipt, in context."
          description="Pinned contract state, Envio settlement history, wallet authorization, market coverage, and offchain decisions are shown with separate provenance."
          actions={model.state === 'READY' || model.state === 'EMPTY' ? <SourceBadge source="LIVE READ" /> : undefined}
        />
        {order ? (
          <OrderDetail order={order} model={model} />
        ) : model.state === 'CONFIG_REQUIRED' ? (
          <StatePanel state="missing" title="Order source is not configured">{model.message}</StatePanel>
        ) : model.state === 'READ_FAILED' ? (
          <StatePanel state="error" title="Order recovery failed">{model.message}</StatePanel>
        ) : model.state === 'SYNCING' ? (
          <StatePanel state="loading" title="Envio history is syncing">{model.message}</StatePanel>
        ) : (
          <StatePanel state="empty" title="Order not found">No indexed OrderCreated event exists for this ID.</StatePanel>
        )}
      </div>
    </AppShell>
  );
}
