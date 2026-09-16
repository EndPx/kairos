'use client';

import {PrivyProvider} from '@privy-io/react-auth';
import type {ReactNode} from 'react';

import {monadTestnet} from '@/lib/chain';
import {runtimeConfig} from '@/lib/runtime-config';
import {PrivyWalletBridge, UnconfiguredWalletBridge} from '@/wallet/wallet-context';

export function ApplicationProviders({children}: {children: ReactNode}) {
  if (!runtimeConfig.privyAppId) {
    return <UnconfiguredWalletBridge>{children}</UnconfiguredWalletBridge>;
  }

  return (
    <PrivyProvider
      appId={runtimeConfig.privyAppId}
      clientId={runtimeConfig.privyClientId}
      config={{
        appearance: {
          theme: 'light',
          landingHeader: 'Connect to Kairos',
        },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        loginMethods: ['email', 'wallet'],
        embeddedWallets: {
          ethereum: {createOnLogin: 'all-users'},
          showWalletUIs: true,
        },
      }}
    >
      <PrivyWalletBridge>{children}</PrivyWalletBridge>
    </PrivyProvider>
  );
}
