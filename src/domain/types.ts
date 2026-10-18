import type { Minor } from './money';

export type TxType = 'expense' | 'income' | 'transfer';
export type TxSource = 'manual' | 'sms' | 'notification' | 'share' | 'quick' | 'group' | 'import' | 'recurring';
export type AccountType = 'cash' | 'bank' | 'upi' | 'card' | 'wallet';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'netbanking' | 'wallet' | 'other';

export interface SyncMeta {
  id: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  dirty: number;
}

export interface Account extends SyncMeta {
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: Minor;
  last4: string | null;
  color: string | null;
  icon: string | null;
  archived: number;
}

export interface Category extends SyncMeta {
  name: string;
  icon: string; // an emoji glyph (kept simple + font-independent)
  color: string;
  kind: 'expense' | 'income';
  sort: number;
  builtin: number;
}

export interface Transaction extends SyncMeta {
  type: TxType;
  amount: Minor; // always positive; direction comes from `type`
  currency: string;
  category_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
  merchant: string | null;
  note: string | null;
  occurred_at: number;
  payment_method: PaymentMethod | null;
  tags: string | null; // JSON string[]
  receipt_uri: string | null;
  source: TxSource;
  fingerprint: string | null;
  group_expense_id: string | null;
  recurring_id: string | null;
}

export interface Budget extends SyncMeta {
  category_id: string | null; // null = overall monthly budget
  amount: Minor;
  alert_pct: number;
}

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface PendingTx extends SyncMeta {
  amount: Minor;
  direction: 'debit' | 'credit';
  currency: string;
  account_last4: string | null;
  merchant: string | null;
  upi_ref: string | null;
  occurred_at: number;
  balance: Minor | null;
  sender: string | null;
  origin: 'sms' | 'notification' | 'share' | 'simulated';
  raw_hash: string | null;
  fingerprint: string;
  suggested_category_id: string | null;
  status: 'pending' | 'saved' | 'skipped' | 'not_mine';
}

export type SplitType = 'equal' | 'exact' | 'percent' | 'shares' | 'adjustment' | 'itemized';

export interface Person extends SyncMeta {
  name: string;
  phone: string | null;
  upi_id: string | null;
  is_self: number;
  remote_user_id: string | null;
}
