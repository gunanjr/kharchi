import type { Transaction } from '@/domain/types';

/** Pro Insights: spending calendar, month against month, and budgets suggested from history. Pure and tested. */
type Tx = Pick<Transaction, 'type' | 'amount' | 'category_id' | 'occurred_at'> & { excluded?: number | null };
const counted = (t: Tx) => t.type === 'expense' && !t.excluded;

export interface CalDay { day: number; total: number; level: 0 | 1 | 2 | 3 | 4 }
/** Each day of a month with its spend and a 0 to 4 intensity relative to that month's own busier days. */
export function spendCalendar(txs: Tx[], year: number, month: number): { days: CalDay[]; firstWeekday: number; total: number } {
  const n = new Date(year, month + 1, 0).getDate();
  const totals = new Array(n).fill(0);
  const from = new Date(year, month, 1).getTime(), to = new Date(year, month + 1, 1).getTime();
  for (const t of txs) if (counted(t) && t.occurred_at >= from && t.occurred_at < to) totals[new Date(t.occurred_at).getDate() - 1] += t.amount;
  const nonzero = totals.filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p: number) => nonzero[Math.min(nonzero.length - 1, Math.floor(p * nonzero.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const days = totals.map((total, i) => ({ day: i + 1, total, level: (total <= 0 ? 0 : total <= q1 ? 1 : total <= q2 ? 2 : total <= q3 ? 3 : 4) as CalDay['level'] }));
  return { days, firstWeekday: new Date(year, month, 1).getDay(), total: totals.reduce((a, b) => a + b, 0) };
}

export interface CompareRow { category_id: string | null; a: number; b: number; diff: number }
/** Category totals for month A and month B, biggest differences first. */
export function compareMonths(txs: Tx[], a: { y: number; m: number }, b: { y: number; m: number }) {
  const sum = (y: number, m: number) => {
    const from = new Date(y, m, 1).getTime(), to = new Date(y, m + 1, 1).getTime();
    const map = new Map<string | null, number>();
    for (const t of txs) if (counted(t) && t.occurred_at >= from && t.occurred_at < to) map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount);
    return map;
  };
  const A = sum(a.y, a.m), B = sum(b.y, b.m);
  const keys = new Set([...A.keys(), ...B.keys()]);
  const rows: CompareRow[] = [...keys].map((k) => ({ category_id: k, a: A.get(k) ?? 0, b: B.get(k) ?? 0, diff: (B.get(k) ?? 0) - (A.get(k) ?? 0) }));
  rows.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff) || (x.category_id ?? '').localeCompare(y.category_id ?? ''));
  const totalA = [...A.values()].reduce((s, v) => s + v, 0), totalB = [...B.values()].reduce((s, v) => s + v, 0);
  return { rows, totalA, totalB, diff: totalB - totalA };
}

export interface BudgetSuggestion { category_id: string; suggested: number; months: number[] }
/**
 * Budgets from the last three complete months: the middle month of the three (median), rounded up to the next ₹500,
 * only for categories with spending in at least two of those months. Rent, EMIs and investments are left alone.
 */
export function suggestBudgets(txs: Tx[], now: number, skip: string[] = ['cat_rent', 'cat_salary', 'cat_freelance', 'cat_interest', 'cat_refund', 'cat_gift', 'cat_income_other']): BudgetSuggestion[] {
  const d = new Date(now);
  const months = [1, 2, 3].map((k) => new Date(d.getFullYear(), d.getMonth() - k, 1));
  const per = new Map<string, number[]>();
  months.forEach((m, i) => {
    const from = m.getTime(), to = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
    for (const t of txs) {
      if (!counted(t) || !t.category_id || skip.includes(t.category_id) || t.occurred_at < from || t.occurred_at >= to) continue;
      const arr = per.get(t.category_id) ?? [0, 0, 0];
      arr[i] += t.amount;
      per.set(t.category_id, arr);
    }
  });
  const out: BudgetSuggestion[] = [];
  for (const [cat, arr] of per) {
    if (arr.filter((v) => v > 0).length < 2) continue;
    const med = [...arr].sort((a, b) => a - b)[1];
    const suggested = Math.ceil(med / 50000) * 50000;
    if (suggested > 0) out.push({ category_id: cat, suggested, months: arr });
  }
  return out.sort((a, b) => b.suggested - a.suggested);
}
