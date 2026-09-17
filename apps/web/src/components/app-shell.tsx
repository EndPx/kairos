'use client';

import {
  Blocks,
  ClipboardList,
  FileCheck2,
  ListTree,
  Plus,
  RadioTower,
} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {Route} from 'next';
import type {ReactNode} from 'react';

import {runtimeConfig} from '@/lib/runtime-config';

import {StatePanel} from './primitives';
import {WalletControl} from './wallet-control';

const navigation: ReadonlyArray<{
  href: Route | null;
  label: string;
  icon: typeof Blocks;
}> = [
  {href: '/', label: 'Overview', icon: Blocks},
  ...(runtimeConfig.deploymentMode === 'execution'
    ? [{href: '/orders/new' as Route, label: 'Create order', icon: Plus}]
    : []),
  {href: '/orders', label: 'Orders', icon: ClipboardList},
  {href: '/reports' as Route, label: 'Reports', icon: FileCheck2},
  {href: '/system', label: 'System', icon: ListTree},
  ...(runtimeConfig.limitedDeployment
    ? [{href: '/system/limited-deployment' as Route, label: 'Limited deployment', icon: RadioTower}]
    : []),
];

function NavigationLinks() {
  const pathname = usePathname();

  return (
    <ul className="rail-nav-list">
      {navigation.map(({href, label, icon: Icon}) => {
        const active = href ? (href === '/' ? pathname === href : pathname.startsWith(href)) : false;
        return (
          <li key={label}>
            {href ? (
              <Link className="rail-nav-link" data-active={active || undefined} href={href}>
                <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            ) : (
              <span className="rail-nav-link" aria-disabled="true">
                <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({children}: {children: ReactNode}) {
  return (
    <div className="app-frame">
      <aside className="app-rail">
        <Link className="wordmark" href="/" aria-label="Kairos overview">
          <span className="wordmark-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Kairos</span>
        </Link>

        <nav className="rail-nav" aria-label="Primary navigation">
          <NavigationLinks />
        </nav>

        <div className="rail-footer">
          <WalletControl />
          <div className="rail-network" aria-label="Configured network">
          <RadioTower aria-hidden="true" size={15} />
          <span>
            <strong>Monad Testnet</strong>
            <small>Chain 10143</small>
          </span>
          </div>
        </div>
      </aside>

      <header className="mobile-header">
        <Link className="wordmark wordmark-mobile" href="/" aria-label="Kairos overview">
          <span className="wordmark-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Kairos</span>
        </Link>
        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <NavigationLinks />
            <WalletControl />
          </nav>
        </details>
      </header>

      <main className="app-main" id="main-content">
        {runtimeConfig.deploymentMode === 'lifecycle-only' ? (
          <StatePanel state="missing" title="Read-only preview">
            This preview reads the separately verified public create/cancel history. Wallet writes and Kuru execution
            remain disabled until the public execution interlock is cleared.
          </StatePanel>
        ) : null}
        {children}
      </main>
    </div>
  );
}
