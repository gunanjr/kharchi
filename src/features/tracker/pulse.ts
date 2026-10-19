import type { Db } from '@/db/types';
import { DAY, daysInMonth, endOfMonth, startOfDay, startOfMonth } from '@/lib/date';
import { accountBalance, listAccounts, listBudgets, totalsBetween } from './repo';
import type { Account } from '@/domain/types';

export interface Pulse {
  /** Expense totals for the last 7 days, oldest first; the last entry is today. */
  week: { day: number; total: number }[];
  weekTotal: number;
  /** What can be spent per day for the rest of the month, from the overall monthly budget. Null without one. */
  safePerDay: number | null;
  overBudget: boolean;
  daysLeft: number;
  accounts: { account: Account; balance: number }[];
  upcoming: { id: string; name: string; amount: number; due: number }[];
}

/** Everything the Home "pulse" widgets need, from the local database only. */
export async function loadPulse(db: Db, now = Date.now()): Promise<Pulse> {
  const today = startOfDay(now);
  const from = today - 6 * DAY;
  const rows = await db.all<{ d: number; t: number }>(
    `SELECT occurred_at o, amount a FROM transactions WHERE deleted_at IS NULL AND excluded=0 AND type='expense' AND occurred_at >= ?`,
    [from],
  ).then((r: any[]) => r.map((x) => ({ d: startOfDay(x.o), t: x.a as number })));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = from + i * DAY;
    return { day, total: rows.filter((r) => r.d === day).reduce((a, r) => a + r.t, 0) };
  });

  const budgets = await listBudgets(db);
  const overall = budgets.find((b) => !b.category_id);
  const month = await totalsBetween(db, startOfMonth(now), endOfMonth(now));
  const daysLeft = daysInMonth(now) - new Date(now).getDate() + 1;
  const remaining = overall ? overall.amount - month.expense : 0;
  const safePerDay = overall ? Math.max(0, Math.floor(remaining / daysLeft)) : null;

  const accs = await listAccounts(db);
  const accounts = await Promise.all(accs.map(async (account) => ({ account, balance: await accountBalance(db, account.id) })));

  const due = await db.all<{ id: string; template: string; next_due: number }>(
    `SELECT id, template, next_due FROM recurring WHERE deleted_at IS NULL AND active=1 AND scope='personal' AND next_due BETWEEN ? AND ? ORDER BY next_due`,
    [today, today + 10 * DAY],
  );
  const upcoming = due.map((r) => {
    const t = JSON.parse(r.template);
    return { id: r.id, name: t.merchant ?? 'Recurring', amount: t.amount as number, due: r.next_due };
  });

  return { week, weekTotal: week.reduce((a, d) => a + d.total, 0), safePerDay, overBudget: !!overall && remaining < 0, daysLeft, accounts, upcoming };
}
