'use client';

import {useCallback, useEffect, useState} from 'react';
import {createPublicClient, http, type Address} from 'viem';

import {OrderActions} from '@/components/order-actions';
import {KeyValueList, SourceBadge, StatePanel, StatusPill} from '@/components/primitives';
import {kairosPolicyAbi} from '@/lib/abi';
import {monadTestnet} from '@/lib/chain';
import {runtimeConfig} from '@/lib/runtime-config';
import {useWalletSession} from '@/wallet/wallet-context';

const publicClient = createPublicClient({chain: monadTestnet, transport: http()});
const statusNames = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'] as const;

interface LifecycleState {
  readonly blockNumber: bigint;
  readonly owner: Address;
  readonly status: number;
}

export function LimitedLifecycleCleanup() {
  const wallet = useWalletSession();
  const [state, setState] = useState<LifecycleState>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!runtimeConfig.policyAddress) return;
    const blockNumber = await publicClient.getBlockNumber();
    const nextOrderId = await publicClient.readContract({
      address: runtimeConfig.policyAddress,
      abi: kairosPolicyAbi,
      functionName: 'nextOrderId',
      blockNumber,
    });
    if (nextOrderId === 0n) throw new Error('The configured lifecycle policy has no order 0.');
    const [order, status] = await Promise.all([
      publicClient.readContract({
        address: runtimeConfig.policyAddress,
        abi: kairosPolicyAbi,
        functionName: 'getOrder',
        args: [0n],
        blockNumber,
      }),
      publicClient.readContract({
        address: runtimeConfig.policyAddress,
        abi: kairosPolicyAbi,
        functionName: 'statusOf',
        args: [0n],
        blockNumber,
      }),
    ]);
    setState({blockNumber, owner: order.owner, status});
    setError(undefined);
  }, []);

  useEffect(() => {
    if (!runtimeConfig.limitedDeployment || !runtimeConfig.policyAddress) return;
    void refresh().catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Unable to read the limited lifecycle order.');
    });
  }, [refresh, wallet.transaction.hash, wallet.transaction.phase]);

  if (!runtimeConfig.policyAddress) {
    return (
      <StatePanel state="missing" title="Confirmed policy not configured">
        Configure the confirmed lifecycle-only policy address locally before cleanup.
      </StatePanel>
    );
  }
  if (error) return <StatePanel state="error" title="Lifecycle cleanup unavailable">{error}</StatePanel>;
  if (!state) return <StatePanel state="loading" title="Reading lifecycle order">Reading order 0 at one named block.</StatePanel>;

  const status = statusNames[state.status] ?? `UNKNOWN_${state.status}`;
  return (
    <section className="system-section" aria-labelledby="limited-cleanup-heading">
      <div className="section-heading">
        <p className="eyebrow">Authorized lifecycle cleanup</p>
        <h2 id="limited-cleanup-heading">Cancel and revoke without enabling execution.</h2>
      </div>
      <div className="primitive-card stack-md">
        <div className="primitive-row">
          <SourceBadge source="ONCHAIN" />
          <StatusPill status={status === 'ACTIVE' ? 'active' : 'cancelled'}>{status}</StatusPill>
        </div>
        <KeyValueList items={[
          {label: 'Policy', value: runtimeConfig.policyAddress},
          {label: 'Order', value: '0'},
          {label: 'Owner', value: state.owner},
          {label: 'Pinned block', value: state.blockNumber.toString()},
        ]} />
        <p>This local-only control reads the confirmed policy directly. It is not an Envio history fallback and cannot execute or trade.</p>
      </div>
      <OrderActions orderId="0" owner={state.owner} active={status === 'ACTIVE'} />
    </section>
  );
}
