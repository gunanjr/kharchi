import type { Db } from '@/db/types';
import { insertRow, updateRow, softDelete, restoreRow } from '@/db/rows';
import type { Account, Budget, Category, Transaction, TxType } from '@/domain/types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from './defaults';

const ALIVE = 'deleted_at IS NULL';

/* ---------- seeding ---------- */
export async function seedDefaults(db: Db): Promise<void> {
  const c = await db.get<{ n: number }>(`SELECT COUNT(*) n FROM categories`);
  if (c && c.n > 0) return;
  let i = 0;
  for (const cat of DEFAULT_EXPENSE_CATEGORIES)
    await insertRow(db, 'categories', { id: `cat_${cat.key}`, name: cat.name, icon: cat.icon, color: cat.color, kind: 'expense', sort: i++, builtin: 1 });
  for (const cat of DEFAULT_INCOME_CATEGORIES)
    await insertRow(db, 'categories', { id: `cat_${cat.key}`, name: cat.name, icon: cat.icon, color: cat.color, kind: 'income', sort: i++, builtin: 1 });
  for (const a of DEFAULT_ACCOUNTS)
    await insertRow(db, 'accounts', { name: a.name, type: a.type, icon: a.icon, currency: 'INR', opening_balance: 0, archived: 0 });
}

/* ---------- categories ---------- */
export const listCategories = (db: Db) =>
  db.all<Category>(`SELECT * FROM categories WHERE ${ALIVE} ORDER BY sort, name`);

export const addCategory = (db: Db, c: { name: string; icon: string; color: string; kind: 'expense' | 'income' }) =>
  insertRow(db, 'categories', { ...c, sort: 100, builtin: 0 });

export const updateCategory = (db: Db, id: string, patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>) =>
  updateRow(db, 'categories', id, patch);

export async function deleteCategory(db: Db, id: string) {
  await db.run(`UPDATE transactions SET category_id=NULL, dirty=1, updated_at=? WHERE category_id=?`, [Date.now(), id]);
  await softDelete(db, 'categories', id);
}

/* ---------- accounts ---------- */
export const listAccounts = (db: Db) =>
  db.all<Account>(`SELECT * FROM accounts WHERE ${ALIVE} AND archived=0 ORDER BY created_at`);

export const addAccount = (
  db: Db,
  a: { name: string; type: Account['type']; currency?: string; opening_balance?: number; last4?: string | null; icon?: string },
) => insertRow(db, 'accounts', { currency: 'INR', opening_balance: 0, archived: 0, ...a });

export const updateAccount = (db: Db, id: string, patch: Partial<Account>) => updateRow(db, 'accounts', id, patch as any);
export const archiveAccount = (db: Db, id: string) => updateRow(db, 'accounts', id, { archived: 1 });

/** Balance = opening + income - expense +/- transfers. */
export async function accountBalance(db: Db, accountId: string): Promise<number> {
  const a = await db.get<Account>(`SELECT * FROM accounts WHERE id=?`, [accountId]);
  if (!a) return 0;
  const r = await db.get<{ s: number }>(
    `SELECT COALESCE(SUM(CASE
        WHEN type='income' AND account_id=?1 THEN amount
        WHEN type='expense' AND account_id=?1 THEN -amount
        WHEN type='transfer' AND account_id=?1 THEN -amount
        WHEN type='transfer' AND to_account_id=?1 THEN amount
        ELSE 0 END),0) s FROM transactions WHERE ${ALIVE}`,
    [accountId],
  );
  return a.opening_balance + (r?.s ?? 0);
}

/* ---------- transactions ---------- */
export type NewTx = {
  type: TxType;
  amount: number;
  currency?: string;
  category_id?: string | null;
  account_id?: string | null;
  to_account_id?: string | null;
  merchant?: string | null;
  note?: string | null;
  occurred_at?: number;
  payment_method?: Transaction['payment_method'];
  tags?: string[];
  receipt_uri?: string | null;
  source?: Transaction['source'];
  fingerprint?: string | null;
  group_expense_id?: string | null;
  recurring_id?: string | null;
};

export async function addTransaction(db: Db, t: NewTx): Promise<string> {
  if (!Number.isInteger(t.amount) || t.amount <= 0) throw new Error('amount must be a positive integer (minor units)');
  return insertRow(db, 'transactions', {
    type: t.type,
    amount: t.amount,
    currency: t.currency ?? 'INR',
    category_id: t.category_id ?? null,
    account_id: t.account_id ?? null,
    to_account_id: t.to_account_id ?? null,
    merchant: t.merchant ?? null,
    note: t.note ?? null,
    occurred_at: t.occurred_at ?? Date.now(),
    payment_method: t.payment_method ?? null,
    tags: t.tags?.length ? JSON.stringify(t.tags) : null,
    receipt_uri: t.receipt_uri ?? null,
    source: t.source ?? 'manual',
    fingerprint: t.fingerprint ?? null,
    group_expense_id: t.group_expense_id ?? null,
    recurring_id: t.recurring_id ?? null,
  });
}

export async function updateTransaction(db: Db, id: string, patch: Partial<NewTx>) {
  const p: Record<string, any> = { ...patch };
  if (patch.tags) p.tags = patch.tags.length ? JSON.stringify(patch.tags) : null;
  if (patch.amount !== undefined && (!Number.isInteger(patch.amount) || patch.amount <= 0)) throw new Error('bad amount');
  await updateRow(db, 'transactions', id, p);
}

export const deleteTransaction = (db: Db, id: string) => softDelete(db, 'transactions', id);
export const undeleteTransaction = (db: Db, id: string) => restoreRow(db, 'transactions', id);
export const getTransaction = (db: Db, id: string) => db.get<Transaction>(`SELECT * FROM transactions WHERE id=?`, [id]);

export interface TxFilter {
  from?: number;
  to?: number;
  type?: TxType;
  categoryId?: string;
  accountId?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export function listTransactions(db: Db, f: TxFilter = {}): Promise<Transaction[]> {
  const w: string[] = [ALIVE];
  const p: (string | number)[] = [];
  if (f.from !== undefined) (w.push('occurred_at >= ?'), p.push(f.from));
  if (f.to !== undefined) (w.push('occurred_at <= ?'), p.push(f.to));
  if (f.type) (w.push('type = ?'), p.push(f.type));
  if (f.categoryId) (w.push('category_id = ?'), p.push(f.categoryId));
  if (f.accountId) (w.push('(account_id = ? OR to_account_id = ?)'), p.push(f.accountId, f.accountId));
  if (f.minAmount !== undefined) (w.push('amount >= ?'), p.push(f.minAmount));
  if (f.maxAmount !== undefined) (w.push('amount <= ?'), p.push(f.maxAmount));
  if (f.search?.trim()) {
    const q = `%${f.search.trim().toLowerCase().replace(/[%_]/g, '')}%`;
    w.push(`(LOWER(COALESCE(merchant,'')) LIKE ? OR LOWER(COALESCE(note,'')) LIKE ? OR LOWER(COALESCE(tags,'')) LIKE ?)`);
    p.push(q, q, q);
  }
  const lim = f.limit ? ` LIMIT ${Math.floor(f.limit)} OFFSET ${Math.floor(f.offset ?? 0)}` : '';
  return db.all<Transaction>(`SELECT * FROM transactions WHERE ${w.join(' AND ')} ORDER BY occurred_at DESC, created_at DESC${lim}`, p);
}

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
}
export async function totalsBetween(db: Db, from: number, to: number): Promise<PeriodTotals> {
  const r = await db.get<{ i: number; e: number }>(
    `SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) i,
            COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) e
     FROM transactions WHERE ${ALIVE} AND occurred_at BETWEEN ? AND ?`,
    [from, to],
  );
  const income = r?.i ?? 0;
  const expense = r?.e ?? 0;
  return { income, expense, net: income - expense };
}

export const spendByCategory = (db: Db, from: number, to: number) =>
  db.all<{ category_id: string | null; total: number; n: number }>(
    `SELECT category_id, SUM(amount) total, COUNT(*) n FROM transactions
     WHERE ${ALIVE} AND type='expense' AND occurred_at BETWEEN ? AND ? GROUP BY category_id ORDER BY total DESC`,
    [from, to],
  );

/* ---------- budgets ---------- */
export const listBudgets = (db: Db) => db.all<Budget>(`SELECT * FROM budgets WHERE ${ALIVE}`);

export async function setBudget(db: Db, categoryId: string | null, amount: number, alertPct = 80): Promise<string> {
  const existing = await db.get<Budget>(
    `SELECT * FROM budgets WHERE ${ALIVE} AND ${categoryId ? 'category_id=?' : 'category_id IS NULL'}`,
    categoryId ? [categoryId] : [],
  );
  if (existing) {
    await updateRow(db, 'budgets', existing.id, { amount, alert_pct: alertPct });
    return existing.id;
  }
  return insertRow(db, 'budgets', { category_id: categoryId, amount, alert_pct: alertPct });
}
export const removeBudget = (db: Db, id: string) => softDelete(db, 'budgets', id);
