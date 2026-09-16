'use client';

import {useMemo, useState} from 'react';

import {Button, Field, KeyValueList, StatePanel, TransactionState} from '@/components/primitives';
import {formatInputAmount, validateApprovalAmount} from '@/lib/order-form';
import {useWalletSession} from '@/wallet/wallet-context';

export function OrderActions({orderId, owner, active}: {orderId: string; owner: string; active: boolean}) {
  const wallet = useWalletSession();
  const [approval, setApproval] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const parsed = useMemo(() => validateApprovalAmount(approval), [approval]);
  const isOwner = wallet.address?.toLowerCase() === owner.toLowerCase();
  const canAct = wallet.configured && wallet.authenticated && wallet.embeddedWallet && wallet.blockers.length === 0;

  const run = async (action: () => Promise<unknown>) => {
    setActionError(undefined);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The wallet action failed.');
    }
  };

  const feedback = wallet.transaction.phase === 'wallet_prompt' ? (
    <StatePanel state="loading" title="Wallet confirmation required">
      Review the exact transaction in your Privy wallet. It is not submitted yet.
    </StatePanel>
  ) : wallet.transaction.phase !== 'idle' ? (
    <TransactionState
      status={wallet.transaction.phase}
      title={`${wallet.transaction.action ?? 'Transaction'} ${wallet.transaction.phase}`}
      detail={wallet.transaction.detail ?? 'Check the receipt before retrying.'}
      hash={wallet.transaction.hash}
    />
  ) : null;

  return (
    <section className="order-action-panel" aria-labelledby="order-actions-heading">
      <div className="section-heading">
        <p className="eyebrow">Wallet controls</p>
        <h2 id="order-actions-heading">Authorization remains yours.</h2>
      </div>
      <KeyValueList
        items={[
          {label: 'Connected balance', value: formatInputAmount(wallet.balances.inputToken)},
          {label: 'Policy allowance', value: formatInputAmount(wallet.balances.allowance)},
          {label: 'Order owner', value: isOwner ? 'Connected wallet' : 'Different / unavailable wallet'},
        ]}
      />
      <Field
        id={`allowance-${orderId}`}
        label="Set a new finite allowance"
        hint="This replaces the policy spender allowance; it does not change the order budget."
        error={attempted ? parsed.error : undefined}
        suffix="USDC"
        inputMode="decimal"
        value={approval}
        onChange={(event) => setApproval(event.target.value)}
      />
      <div className="primitive-row">
        <Button
          type="button"
          disabled={!canAct || parsed.value === undefined}
          onClick={() => {
            setAttempted(true);
            if (parsed.value !== undefined) void run(() => wallet.setAllowance(parsed.value!));
          }}
        >
          Update allowance
        </Button>
        <Button type="button" tone="quiet" disabled={!canAct} onClick={() => void run(wallet.revokeAllowance)}>
          Revoke allowance
        </Button>
        <Button
          type="button"
          tone="danger"
          disabled={!canAct || !active || !isOwner}
          onClick={() => void run(() => wallet.cancelOrder(BigInt(orderId)))}
        >
          Cancel order
        </Button>
      </div>
      {!canAct ? (
        <StatePanel state="missing" title="Wallet actions unavailable">
          Configure Privy and deployment addresses, then connect the order owner wallet.
        </StatePanel>
      ) : !isOwner ? (
        <StatePanel state="missing" title="Owner wallet required">
          Only the onchain owner can cancel this order. Allowance controls apply to the connected wallet only.
        </StatePanel>
      ) : null}
      {actionError ? (
        <StatePanel state="error" title="Wallet action did not complete">
          {actionError}
        </StatePanel>
      ) : null}
      {feedback}
    </section>
  );
}
