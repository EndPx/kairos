'use client';

import {LogIn, LogOut, RefreshCw, ShieldAlert, WalletCards} from 'lucide-react';

import {MONAD_TESTNET_CHAIN_ID} from '@/lib/chain';
import {useWalletSession} from '@/wallet/wallet-context';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletControl() {
  const session = useWalletSession();

  if (!session.configured) {
    return (
      <div className="wallet-control" data-state="blocked">
        <ShieldAlert aria-hidden="true" size={16} />
        <span>
          <strong>Wallet not configured</strong>
          <small>Local App ID required</small>
        </span>
      </div>
    );
  }

  if (!session.ready) {
    return (
      <div className="wallet-control" data-state="loading">
        <RefreshCw aria-hidden="true" size={16} />
        <span>
          <strong>Loading wallet</strong>
          <small>Checking Privy session</small>
        </span>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <button className="wallet-control wallet-control-button" type="button" onClick={session.login}>
        <LogIn aria-hidden="true" size={16} />
        <span>
          <strong>Connect with Privy</strong>
          <small>Embedded EVM wallet</small>
        </span>
      </button>
    );
  }

  if (!session.address) {
    return (
      <div className="wallet-control" data-state="blocked">
        <ShieldAlert aria-hidden="true" size={16} />
        <span>
          <strong>No embedded wallet</strong>
          <small>Check Privy dashboard</small>
        </span>
      </div>
    );
  }

  return (
    <div className="wallet-session">
      <div className="wallet-control" data-state="connected">
        <WalletCards aria-hidden="true" size={16} />
        <span>
          <strong>{shortAddress(session.address)}</strong>
          <small>{session.chainId === MONAD_TESTNET_CHAIN_ID ? 'Monad Testnet' : 'Wrong network'}</small>
        </span>
      </div>
      <button className="wallet-icon-button" type="button" onClick={() => void session.logout()} aria-label="Log out">
        <LogOut aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
