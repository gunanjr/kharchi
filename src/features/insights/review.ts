import type { Db } from '@/db/types';
import type { Transaction } from '@/domain/types';
import { listTransactions } from '@/features/tracker/repo';
import { DAY, daysInMonth, endOfMonth, monthLabel, startOfDay, startOfMonth } from '@/lib/date';
import { byCategory } from './analytics';

export interface Review {
  label: string;
  monthStart: number;
  income: number;
  expense: number;
  saved: number;
  /** Savings as a share of income, 0..1, or null with no income. */
  rate: number | null;
  prevExpense: number;
  /** Percent change in spending versus the previous full month, or null with no previous spending. */
  vsPrev: number | null;
  topCategories: { category_id: string | null; total: number; share: number }[];
  biggest: Transaction | null;
  topMerchant: { name: string; total: number } | null;
  noSpendDays: number;
  /** Longest run of consecutive days with no spending. */
  longestNoSpendRun: number;
  busiestWeekday: number | null; // 0 = Sunday
  txCount: number;
}

/** Pure: builds the monthly review from that month's and the previous month's transactions. */
export function buildReview(cur: Transaction[], prev: Transaction[], monthStart: number, now = Date.now()): Review {
  const exp = cur.filter((t) => t.type === 'expense');
  const income = cur.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = exp.reduce((a, t) => a + t.amount, 0);
  const prevExpense = prev.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  const cats = byCategory(cur).slice(0, 3).map((c) => ({ ...c, share: expense ? c.total / expense : 0 }));
  const biggest = exp.reduce<Transaction | null>((b, t) => (!b || t.amount > b.amount ? t : b), null);

  const m = new Map<string, number>();
  for (const t of exp) if (t.merchant) m.set(t.merchant, (m.get(t.merchant) ?? 0) + t.amount);
  const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];

  const lastDay = Math.min(endOfMonth(monthStart), now);
  const days = Math.max(0, Math.floor((startOfDay(lastDay) - monthStart) / DAY) + 1);
  const spent = new Set(exp.map((t) => startOfDay(t.occurred_at)));
  let noSpend = 0, run = 0, longest = 0;
  for (let d = 0; d < days; d++) {
    if (spent.has(startOfDay(monthStart + d * DAY))) run = 0;
    else { noSpend++; run++; longest = Math.max(longest, run); }
  }

  const byDow = new Array(7).fill(0);
  for (const t of exp) byDow[new Date(t.occurred_at).getDay()] += t.amount;
  const maxDow = Math.max(...byDow);

  return {
    label: monthLabel(monthStart), monthStart, income, expense, saved: income - expense,
    rate: income > 0 ? (income - expense) / income : null,
    prevExpense, vsPrev: prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null,
    topCategories: cats, biggest, topMerchant: top ? { name: top[0], total: top[1] } : null,
    noSpendDays: noSpend, longestNoSpendRun: longest,
    busiestWeekday: maxDow > 0 ? byDow.indexOf(maxDow) : null, txCount: cur.length,
  };
}

export async function loadReview(db: Db, monthStart: number, now = Date.now()): Promise<Review> {
  const cur = await listTransactions(db, { from: monthStart, to: endOfMonth(monthStart) });
  const prevStart = startOfMonth(monthStart - 1);
  const prev = await listTransactions(db, { from: prevStart, to: endOfMonth(prevStart) });
  return buildReview(cur, prev, monthStart, now);
}

export const daysIn = daysInMonth;
