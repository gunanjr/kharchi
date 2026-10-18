import type { ParsedTx } from './types';

export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/** Stable fingerprint used as a unique key (exact dedupe). Fuzzy matching is done by isDuplicate(). */
export function fingerprint(p: Pick<ParsedTx, 'upiRef' | 'amount' | 'direction' | 'accountLast4' | 'occurredAt'>): string {
  if (p.upiRef) return `ref:${p.upiRef}`;
  const bucket = Math.floor(p.occurredAt / DEDUPE_WINDOW_MS);
  return `amt:${p.direction}:${p.amount}:${p.accountLast4 ?? '-'}:${bucket}`;
}

export interface Comparable {
  amount: number;
  direction: 'debit' | 'credit';
  accountLast4: string | null;
  upiRef: string | null;
  occurredAt: number;
}

/**
 * Same payment seen twice (SMS + app notification, or retried SMS)?
 * - same UPI ref => duplicate
 * - same amount+direction within the window, and account matches (or either side doesn't know it) => duplicate
 */
export function isDuplicate(a: Comparable, b: Comparable): boolean {
  if (a.upiRef && b.upiRef) return a.upiRef === b.upiRef;
  if (a.amount !== b.amount || a.direction !== b.direction) return false;
  if (Math.abs(a.occurredAt - b.occurredAt) > DEDUPE_WINDOW_MS) return false;
  if (a.accountLast4 && b.accountLast4 && a.accountLast4 !== b.accountLast4) return false;
  return true;
}
