'use client';

import {useMemo, useState, type ChangeEvent, type FormEvent} from 'react';

import {
  Button,
  Field,
  KeyValueList,
  SourceBadge,
  StatePanel,
  TransactionState,
} from '@/components/primitives';
import {
  formatInputAmount,
  POLICY_PRICE_DECIMALS,
  validateApprovalAmount,
  validateOrderDraft,
  type OrderDraft,
  type OrderDraftField,
} from '@/lib/order-form';
import {MONAD_TESTNET_CHAIN_ID} from '@/lib/chain';
import {useWalletSession} from '@/wallet/wallet-context';

const initialDraft: OrderDraft = {
  approval: '250',
  budget: '250',
  startTime: '',
  endTime: '',
  maxPerFill: '40',
  minFill: '5',
  maxEffectivePrice: '',
};

function dateLabel(seconds: bigint): string {
  return `${new Date(Number(seconds) * 1_000).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function TransactionFeedback() {
  const {transaction} = useWalletSession();
  if (transaction.phase === 'idle') return null;
  if (transaction.phase === 'wallet_prompt') {
    return (
      <StatePanel state="loading" title="Wallet confirmation required">
        Review the exact transaction in your Privy wallet. No transaction has been submitted yet.
      </StatePanel>
    );
  }

  const action = transaction.action ?? 'transaction';
  return (
    <TransactionState
      status={transaction.phase}
      title={`${action.charAt(0).toUpperCase()}${action.slice(1)} ${transaction.phase}`}
      detail={transaction.detail ?? 'Check the transaction state before continuing.'}
      hash={transaction.hash}
    />
  );
}

export function CreateOrderForm() {
  const wallet = useWalletSession();
  const [draft, setDraft] = useState<OrderDraft>(initialDraft);
  const [attempted, setAttempted] = useState(false);
  const [approvalAttempted, setApprovalAttempted] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const validation = useMemo(() => validateOrderDraft(draft), [draft]);
  const approvalValidation = useMemo(() => validateApprovalAmount(draft.approval), [draft.approval]);
  const canTransact =
    wallet.configured &&
    wallet.authenticated &&
    wallet.embeddedWallet &&
    wallet.blockers.length === 0;

  const setField = (field: OrderDraftField) => (event: ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({...current, [field]: event.target.value}));
    setActionError(undefined);
  };

  const errorFor = (field: OrderDraftField) => {
    if (field === 'approval') return approvalAttempted ? approvalValidation.error : undefined;
    return attempted ? validation.errors[field] : undefined;
  };

  const submitApproval = async () => {
    setApprovalAttempted(true);
    setActionError(undefined);
    if (approvalValidation.value === undefined || !canTransact) return;
    try {
      await wallet.setAllowance(approvalValidation.value);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Approval failed.');
    }
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    setActionError(undefined);
    if (!validation.value || !canTransact) return;
    try {
      await wallet.createOrder(validation.value.order);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Order creation failed.');
    }
  };

  const chainReady = wallet.chainId === MONAD_TESTNET_CHAIN_ID;
  const allowanceCoversFill =
    validation.value !== undefined &&
    wallet.balances.allowance !== undefined &&
    wallet.balances.allowance >= validation.value.order.maxPerFill;

  return (
    <div className="create-order-layout">
      <form className="order-form" onSubmit={submitOrder} noValidate>
        <section className="form-section" aria-labelledby="order-market-heading">
          <header className="form-section-heading">
            <span>01</span>
            <div>
              <h2 id="order-market-heading">Market</h2>
              <p>The initial application path is intentionally fixed to the verified Kuru market.</p>
            </div>
          </header>
          <div className="locked-market">
            <div>
              <small>Direction</small>
              <strong>Buy MON with USDC</strong>
            </div>
            <div>
              <small>Venue</small>
              <strong>Kuru order book</strong>
            </div>
            <SourceBadge source="ONCHAIN" />
          </div>
        </section>

        <section className="form-section" aria-labelledby="order-policy-heading">
          <header className="form-section-heading">
            <span>02</span>
            <div>
              <h2 id="order-policy-heading">Policy limits</h2>
              <p>Values are converted to exact integer units before calldata is assembled.</p>
            </div>
          </header>
          <div className="form-grid">
            <Field
              id="order-budget"
              label="Total budget"
              hint="Maximum cumulative USDC spend for this order."
              error={errorFor('budget')}
              suffix="USDC"
              inputMode="decimal"
              value={draft.budget}
              onChange={setField('budget')}
            />
            <Field
              id="order-price"
              label="Maximum effective price"
              hint={`USDC per MON, including venue outcome; up to ${POLICY_PRICE_DECIMALS} decimals.`}
              error={errorFor('maxEffectivePrice')}
              suffix="USDC / MON"
              inputMode="decimal"
              placeholder="e.g. 6.125"
              value={draft.maxEffectivePrice}
              onChange={setField('maxEffectivePrice')}
            />
            <Field
              id="order-max-fill"
              label="Maximum per fill"
              hint="An execution proposal cannot exceed this amount."
              error={errorFor('maxPerFill')}
              suffix="USDC"
              inputMode="decimal"
              value={draft.maxPerFill}
              onChange={setField('maxPerFill')}
            />
            <Field
              id="order-min-fill"
              label="Minimum fill"
              hint="Actual input below this amount causes the transaction to revert."
              error={errorFor('minFill')}
              suffix="USDC"
              inputMode="decimal"
              value={draft.minFill}
              onChange={setField('minFill')}
            />
          </div>
        </section>

        <section className="form-section" aria-labelledby="order-schedule-heading">
          <header className="form-section-heading">
            <span>03</span>
            <div>
              <h2 id="order-schedule-heading">Cumulative schedule</h2>
              <p>Budget unlocks linearly; unused funds stay in your wallet.</p>
            </div>
          </header>
          <div className="form-grid">
            <Field
              id="order-start"
              label="Start time (browser local)"
              error={errorFor('startTime')}
              type="datetime-local"
              value={draft.startTime}
              onChange={setField('startTime')}
            />
            <Field
              id="order-end"
              label="Expiry (browser local)"
              error={errorFor('endTime')}
              type="datetime-local"
              value={draft.endTime}
              onChange={setField('endTime')}
            />
          </div>
          {validation.value ? (
            <ol className="schedule-preview" aria-label="Cumulative budget release preview">
              {validation.value.schedule.map((point, index) => {
                const duration = validation.value!.order.endTime - validation.value!.order.startTime;
                const timestamp = validation.value!.order.startTime + (duration * BigInt(index)) / 4n;
                return (
                  <li key={point.label}>
                    <span>{point.label}</span>
                    <strong>{formatInputAmount(point.released)}</strong>
                    <small>{dateLabel(timestamp)}</small>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </section>

        <section className="form-section" aria-labelledby="order-authorization-heading">
          <header className="form-section-heading">
            <span>04</span>
            <div>
              <h2 id="order-authorization-heading">Token authorization</h2>
              <p>Allowance is a separate ERC-20 permission, not a reservation or policy.</p>
            </div>
          </header>
          <Field
            id="order-approval"
            label="Approval amount"
            hint="Independent from the policy budget. Low finite approvals may require re-approval."
            error={errorFor('approval')}
            suffix="USDC"
            inputMode="decimal"
            value={draft.approval}
            onChange={setField('approval')}
          />
          <KeyValueList
            items={[
              {label: 'Wallet balance', value: formatInputAmount(wallet.balances.inputToken)},
              {label: 'Current allowance', value: formatInputAmount(wallet.balances.allowance)},
              {
                label: 'Network',
                value: chainReady ? 'Monad Testnet · 10143' : wallet.chainId ? `Wrong chain · ${wallet.chainId}` : 'Unavailable',
              },
              {label: 'Allowance covers one max fill', value: allowanceCoversFill ? 'Yes' : 'No / unknown'},
            ]}
          />
          <Button
            type="button"
            disabled={!canTransact || approvalValidation.value === undefined}
            onClick={submitApproval}
          >
            Approve exact amount
          </Button>
        </section>

        {actionError ? (
          <StatePanel state="error" title="Wallet action did not complete">
            {actionError}
          </StatePanel>
        ) : null}
        <TransactionFeedback />

        <div className="form-submit-row">
          <div>
            <strong>Create the onchain policy</strong>
            <p>Creation does not move funds or guarantee execution.</p>
          </div>
          <Button type="submit" tone="secondary" disabled={!canTransact || !validation.value}>
            Review in wallet
          </Button>
        </div>
      </form>

      <aside className="order-supporting-pane" aria-label="Order risk and authorization summary">
        <section>
          <p className="eyebrow">Risk summary</p>
          <h2>Execution is conditional.</h2>
          <ul className="plain-list">
            <li>Kairos may complete only part of the budget before expiry.</li>
            <li>Market movement can make every future decision WAIT.</li>
            <li>Funds remain spendable elsewhere and are not reserved for this order.</li>
            <li>Balance and allowance must remain sufficient at execution time.</li>
            <li>The contract rechecks schedule, price, minimum fill, nonce, and lifecycle.</li>
          </ul>
        </section>
        <section>
          <p className="eyebrow">Action boundary</p>
          {wallet.blockers.length > 0 ? (
            <StatePanel state="missing" title="Transactions unavailable">
              {wallet.blockers.join(' ')}
            </StatePanel>
          ) : !wallet.authenticated ? (
            <StatePanel state="missing" title="Connect your Privy wallet">
              Sign in from the navigation rail before approving or creating a policy.
            </StatePanel>
          ) : (
            <KeyValueList
              items={[
                {label: 'Approval', value: 'User-confirmed transaction'},
                {label: 'Create policy', value: 'Separate user-confirmed transaction'},
                {label: 'Per-fill signature', value: 'Not required'},
                {label: 'Delegated signer', value: 'Not used'},
              ]}
            />
          )}
        </section>
      </aside>
    </div>
  );
}
