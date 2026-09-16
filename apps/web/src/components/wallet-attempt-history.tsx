'use client';

import {useCallback, useEffect, useState} from 'react';

import {ReceiptCard, SourceBadge, StatePanel} from '@/components/primitives';
import {monadTestnet} from '@/lib/chain';
import {
  readWalletAttemptHistory,
  WALLET_ATTEMPT_EVENT,
  WALLET_ATTEMPT_STORAGE_KEY,
  type WalletAttemptRecord,
} from '@/lib/wallet-attempt-history';

function explorer(hash: `0x${string}` | undefined): string | undefined {
  const base = monadTestnet.blockExplorers?.default.url;
  return hash && base ? `${base.replace(/\/$/, '')}/tx/${hash}` : undefined;
}

export function WalletAttemptHistory() {
  const [attempts, setAttempts] = useState<readonly WalletAttemptRecord[]>([]);
  const refresh = useCallback(() => setAttempts(readWalletAttemptHistory(window.localStorage)), []);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === WALLET_ATTEMPT_STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(WALLET_ATTEMPT_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(WALLET_ATTEMPT_EVENT, refresh);
    };
  }, [refresh]);

  return (
    <section className="wallet-attempts">
      <div className="section-heading">
        <p className="eyebrow">Local wallet attempt history</p>
        <h2>Submitted, confirmed, failed, and stale.</h2>
      </div>
      <p className="muted-note">
        This restart-persistent browser journal records Privy wallet actions on this device. It is not an onchain event index.
      </p>
      <SourceBadge source="LOCAL WALLET" />
      {attempts.length > 0 ? (
        <div className="receipt-grid">
          {attempts.map((attempt, index) => (
            <ReceiptCard
              key={`${attempt.hash ?? attempt.recordedAt}-${attempt.action}-${index}`}
              eyebrow="Wallet attempt"
              title={`${attempt.action} · ${attempt.phase}`}
              source="LOCAL WALLET"
              status={attempt.phase}
              explorerHref={explorer(attempt.hash)}
              items={[
                {label: 'Status', value: attempt.phase},
                {label: 'Recorded', value: new Date(attempt.recordedAt).toISOString()},
                {label: 'Chain', value: attempt.chainId},
                {label: 'Detail', value: attempt.detail},
              ]}
            />
          ))}
        </div>
      ) : (
        <StatePanel state="empty" title="No local wallet attempts">
          No Privy transaction attempt has been recorded by this browser profile.
        </StatePanel>
      )}
    </section>
  );
}
