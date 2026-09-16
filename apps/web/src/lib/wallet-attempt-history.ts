import {isAddress, isHash, type Address, type Hash} from 'viem';

export const WALLET_ATTEMPT_STORAGE_KEY = 'kairos.wallet-attempts.v1';
export const WALLET_ATTEMPT_EVENT = 'kairos:wallet-attempts';
const MAX_ATTEMPTS = 50;

export type WalletAttemptAction = 'approve' | 'cancel' | 'create' | 'revoke';
export type WalletAttemptPhase = 'confirmed' | 'failed' | 'stale' | 'submitted';

export interface WalletAttemptRecord {
  readonly action: WalletAttemptAction;
  readonly address: Address;
  readonly chainId: number;
  readonly detail: string;
  readonly hash?: Hash;
  readonly phase: WalletAttemptPhase;
  readonly recordedAt: string;
}

function isRecord(value: unknown): value is WalletAttemptRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    ['approve', 'cancel', 'create', 'revoke'].includes(String(record.action)) &&
    typeof record.address === 'string' &&
    isAddress(record.address) &&
    Number.isSafeInteger(record.chainId) &&
    Number(record.chainId) > 0 &&
    typeof record.detail === 'string' &&
    record.detail.length <= 240 &&
    (record.hash === undefined || (typeof record.hash === 'string' && isHash(record.hash))) &&
    ['confirmed', 'failed', 'stale', 'submitted'].includes(String(record.phase)) &&
    typeof record.recordedAt === 'string' &&
    Number.isFinite(Date.parse(record.recordedAt))
  );
}

export function parseWalletAttemptHistory(serialized: string | null): readonly WalletAttemptRecord[] {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value) && value.every(isRecord) ? value.slice(0, MAX_ATTEMPTS) : [];
  } catch {
    return [];
  }
}

export function mergeWalletAttempt(
  current: readonly WalletAttemptRecord[],
  next: WalletAttemptRecord,
): readonly WalletAttemptRecord[] {
  if (!isRecord(next)) throw new Error('Wallet attempt record is invalid.');
  const remaining = next.hash
    ? current.filter(
        (record) =>
          record.hash?.toLowerCase() !== next.hash?.toLowerCase() ||
          record.action !== next.action ||
          record.address.toLowerCase() !== next.address.toLowerCase(),
      )
    : current;
  return [next, ...remaining].slice(0, MAX_ATTEMPTS);
}

export function readWalletAttemptHistory(storage: Pick<Storage, 'getItem'>): readonly WalletAttemptRecord[] {
  return parseWalletAttemptHistory(storage.getItem(WALLET_ATTEMPT_STORAGE_KEY));
}

export function persistWalletAttempt(storage: Pick<Storage, 'getItem' | 'setItem'>, next: WalletAttemptRecord): void {
  const merged = mergeWalletAttempt(readWalletAttemptHistory(storage), next);
  storage.setItem(WALLET_ATTEMPT_STORAGE_KEY, JSON.stringify(merged));
}
