'use client';

import {usePrivy, useSendTransaction, useWallets} from '@privy-io/react-auth';
import {
  WaitForTransactionReceiptTimeoutError,
  createPublicClient,
  http,
  type Address,
  type Hash,
} from 'viem';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {erc20Abi} from '@/lib/abi';
import {MONAD_TESTNET_CHAIN_ID, monadTestnet} from '@/lib/chain';
import {runtimeConfig, walletConfiguration} from '@/lib/runtime-config';
import {
  buildApprovalTransaction,
  buildCancelOrderTransaction,
  buildCreateOrderTransaction,
  type CreateOrderArguments,
  type UnsignedKairosTransaction,
} from '@/lib/transactions';
import {
  WALLET_ATTEMPT_EVENT,
  persistWalletAttempt,
  type WalletAttemptPhase,
} from '@/lib/wallet-attempt-history';

const receiptTimeoutMs = 60_000;
const publicClient = createPublicClient({chain: monadTestnet, transport: http()});

export type TransactionPhase =
  | 'confirmed'
  | 'failed'
  | 'idle'
  | 'stale'
  | 'submitted'
  | 'wallet_prompt';

export interface WalletTransactionState {
  readonly action?: 'approve' | 'cancel' | 'create' | 'revoke';
  readonly detail?: string;
  readonly hash?: Hash;
  readonly phase: TransactionPhase;
}

export interface WalletBalances {
  readonly allowance?: bigint;
  readonly inputToken?: bigint;
  readonly native?: bigint;
  readonly tokenDecimals?: number;
}

export interface WalletSession {
  readonly address?: Address;
  readonly authenticated: boolean;
  readonly balances: WalletBalances;
  readonly blockers: readonly string[];
  readonly chainId?: number;
  readonly configured: boolean;
  readonly embeddedWallet: boolean;
  readonly ready: boolean;
  readonly transaction: WalletTransactionState;
  cancelOrder(orderId: bigint): Promise<Hash>;
  clearTransaction(): void;
  createOrder(order: CreateOrderArguments): Promise<Hash>;
  login(): void;
  logout(): Promise<void>;
  refreshBalances(): Promise<void>;
  revokeAllowance(): Promise<Hash>;
  setAllowance(amount: bigint): Promise<Hash>;
  switchToMonad(): Promise<void>;
}

const unavailable = async (): Promise<never> => {
  throw new Error('Privy wallet actions are not configured.');
};

const unconfiguredSession: WalletSession = {
  authenticated: false,
  balances: {},
  blockers: [
    'NEXT_PUBLIC_PRIVY_APP_ID is not set.',
    'Dashboard origins and embedded EVM wallet settings still require verification.',
  ],
  configured: false,
  embeddedWallet: false,
  ready: true,
  transaction: {phase: 'idle'},
  cancelOrder: unavailable,
  clearTransaction: () => undefined,
  createOrder: unavailable,
  login: () => undefined,
  logout: async () => undefined,
  refreshBalances: async () => undefined,
  revokeAllowance: unavailable,
  setAllowance: unavailable,
  switchToMonad: async () => undefined,
};

const WalletContext = createContext<WalletSession>(unconfiguredSession);

function parseChainId(chainId: string | undefined): number | undefined {
  const value = chainId?.split(':').at(-1);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function transactionBlockers(): string[] {
  const blockers: string[] = [];
  if (!runtimeConfig.policyAddress) blockers.push('Kairos policy address is not configured.');
  if (!runtimeConfig.inputTokenAddress) blockers.push('Input token address is not configured.');
  if (!runtimeConfig.marketAddress) blockers.push('Kuru market address is not configured.');
  return blockers;
}

export function UnconfiguredWalletBridge({children}: {children: ReactNode}) {
  return <WalletContext.Provider value={unconfiguredSession}>{children}</WalletContext.Provider>;
}

export function PrivyWalletBridge({children}: {children: ReactNode}) {
  const {authenticated, error, login, logout, ready} = usePrivy();
  const {ready: walletsReady, wallets} = useWallets();
  const {sendTransaction} = useSendTransaction();
  const [balances, setBalances] = useState<WalletBalances>({});
  const [transaction, setTransaction] = useState<WalletTransactionState>({phase: 'idle'});

  const wallet = useMemo(
    () =>
      wallets.find((candidate) => candidate.type === 'ethereum' && candidate.walletClientType === 'privy'),
    [wallets],
  );
  const address = wallet?.address as Address | undefined;
  const chainId = parseChainId(wallet?.chainId);

  const refreshBalances = useCallback(async () => {
    if (!address) {
      setBalances({});
      return;
    }

    const native = await publicClient.getBalance({address});
    if (!runtimeConfig.inputTokenAddress || !runtimeConfig.policyAddress) {
      setBalances({native});
      return;
    }

    const [inputToken, allowance, tokenDecimals] = await Promise.all([
      publicClient.readContract({
        address: runtimeConfig.inputTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }),
      publicClient.readContract({
        address: runtimeConfig.inputTokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, runtimeConfig.policyAddress],
      }),
      publicClient.readContract({
        address: runtimeConfig.inputTokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
    ]);
    setBalances({native, inputToken, allowance, tokenDecimals});
  }, [address]);

  useEffect(() => {
    void refreshBalances().catch(() => setBalances({}));
  }, [refreshBalances]);

  const switchToMonad = useCallback(async () => {
    if (!wallet) throw new Error('No Privy embedded EVM wallet is available.');
    if (parseChainId(wallet.chainId) !== MONAD_TESTNET_CHAIN_ID) {
      await wallet.switchChain(MONAD_TESTNET_CHAIN_ID);
    }
  }, [wallet]);

  const recordTransaction = useCallback(
    (next: WalletTransactionState) => {
      setTransaction(next);
      if (
        !address ||
        !next.action ||
        !['confirmed', 'failed', 'stale', 'submitted'].includes(next.phase)
      ) return;
      persistWalletAttempt(window.localStorage, {
        action: next.action,
        address,
        chainId: MONAD_TESTNET_CHAIN_ID,
        detail: next.detail ?? 'No additional wallet detail was recorded.',
        hash: next.hash,
        phase: next.phase as WalletAttemptPhase,
        recordedAt: new Date().toISOString(),
      });
      window.dispatchEvent(new Event(WALLET_ATTEMPT_EVENT));
    },
    [address],
  );

  const runTransaction = useCallback(
    async (
      action: NonNullable<WalletTransactionState['action']>,
      unsignedTransaction: UnsignedKairosTransaction,
    ): Promise<Hash> => {
      if (!wallet || !address) throw new Error('No Privy embedded EVM wallet is available.');

      recordTransaction({action, phase: 'wallet_prompt', detail: 'Waiting for wallet confirmation.'});
      let submittedHash: Hash | undefined;
      try {
        await switchToMonad();
        const {hash} = await sendTransaction(unsignedTransaction, {address});
        submittedHash = hash;
        recordTransaction({action, phase: 'submitted', hash, detail: 'Submitted onchain; waiting for a receipt.'});

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: receiptTimeoutMs,
        });
        if (receipt.status !== 'success') {
          recordTransaction({action, phase: 'failed', hash, detail: 'The transaction receipt reports a revert.'});
          throw new Error('Transaction reverted.');
        }

        recordTransaction({action, phase: 'confirmed', hash, detail: 'Confirmed with one block receipt.'});
        await refreshBalances();
        return hash;
      } catch (caught) {
        if (caught instanceof WaitForTransactionReceiptTimeoutError) {
          recordTransaction({
            action,
            phase: 'stale',
            hash: submittedHash,
            detail: 'Receipt lookup timed out. Recheck this hash before retrying.',
          });
        } else if (!(caught instanceof Error && caught.message === 'Transaction reverted.')) {
          recordTransaction({
            action,
            phase: 'failed',
            detail: 'The wallet request was rejected or the transaction could not be submitted.',
          });
        }
        throw caught;
      }
    },
    [address, recordTransaction, refreshBalances, sendTransaction, switchToMonad, wallet],
  );

  const setAllowance = useCallback(
    async (amount: bigint) => {
      if (!runtimeConfig.inputTokenAddress || !runtimeConfig.policyAddress) {
        throw new Error('Token and policy addresses are required for approval.');
      }
      return runTransaction(
        amount === 0n ? 'revoke' : 'approve',
        buildApprovalTransaction(runtimeConfig.inputTokenAddress, runtimeConfig.policyAddress, amount),
      );
    },
    [runTransaction],
  );

  const createOrder = useCallback(
    async (order: CreateOrderArguments) => {
      if (!runtimeConfig.policyAddress) throw new Error('Policy address is required to create an order.');
      return runTransaction('create', buildCreateOrderTransaction(runtimeConfig.policyAddress, order));
    },
    [runTransaction],
  );

  const cancelOrder = useCallback(
    async (orderId: bigint) => {
      if (!runtimeConfig.policyAddress) throw new Error('Policy address is required to cancel an order.');
      return runTransaction('cancel', buildCancelOrderTransaction(runtimeConfig.policyAddress, orderId));
    },
    [runTransaction],
  );

  const value = useMemo<WalletSession>(() => {
    const blockers = transactionBlockers();
    if (error) blockers.unshift('Privy failed to initialize.');
    if (authenticated && walletsReady && !wallet) blockers.unshift('No Privy embedded EVM wallet is available.');

    return {
      address,
      authenticated,
      balances,
      blockers,
      chainId,
      configured: walletConfiguration.privy,
      embeddedWallet: Boolean(wallet),
      ready: ready && walletsReady,
      transaction,
      cancelOrder,
      clearTransaction: () => setTransaction({phase: 'idle'}),
      createOrder,
      login,
      logout,
      refreshBalances,
      revokeAllowance: () => setAllowance(0n),
      setAllowance,
      switchToMonad,
    };
  }, [
    address,
    authenticated,
    balances,
    cancelOrder,
    chainId,
    createOrder,
    error,
    login,
    logout,
    ready,
    refreshBalances,
    setAllowance,
    switchToMonad,
    transaction,
    wallet,
    walletsReady,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletSession(): WalletSession {
  return useContext(WalletContext);
}
