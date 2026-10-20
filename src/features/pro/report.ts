import type { Transaction } from '@/domain/types';
import type { DueItem } from '@/features/dues/dues';

/**
 * Pro report card: the month graded on four habits, 25 points each, from the user's own entries. Kind by design:
 * it scores habits, never amounts, and always ends with one thing to try. Pure and tested.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'occurred_at'> & { excluded?: number | null };
const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface Habit { key: 'logging' | 'pace' | 'calm' | 'bills'; title: string; score: number; line: string }
export interface Report { month: string; total: number; grade: string; habits: Habit[]; tip: string; days: number }

const GRADES: [number, string][] = [[90, 'A+'], [80, 'A'], [70, 'B+'], [60, 'B'], [50, 'C']];
export const gradeOf = (n: number) => GRADES.find(([min]) => n >= min)?.[1] ?? 'D';

/** Report for the month containing `now` (so far), or a past month when `now` is after it. */
export function reportCard(txs: Tx[], dues: DueItem[], year: number, month: number, now: number): Report {
  const from = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 1).getTime();
  const to = Math.min(monthEnd, sod(now) + DAY);
  const days = Math.max(1, Math.round((to - from) / DAY));
  const inMonth = txs.filter((t) => t.occurred_at >= from && t.occurred_at < to);
  const logged = new Set(inMonth.map((t) => sod(t.occurred_at)));
  const spendDays = new Set(inMonth.filter((t) => t.type === 'expense' && !t.excluded).map((t) => sod(t.occurred_at)));
  const spent = inMonth.filter((t) => t.type === 'expense' && !t.excluded).reduce((a, t) => a + t.amount, 0);
  const prevFrom = new Date(year, month - 1, 1).getTime();
  const prevTo = Math.min(from, prevFrom + days * DAY);
  const prev = txs.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= prevFrom && t.occurred_at < prevTo).reduce((a, t) => a + t.amount, 0);

  const logging = Math.round((logged.size / days) * 25);
  const pct = prev > 0 ? (spent - prev) / prev : null;
  const pace = pct === null ? 15 : Math.round(Math.max(5, Math.min(25, 15 - pct * 50)));
  const calmDays = [...logged].filter((d) => !spendDays.has(d)).length;
  const calm = Math.round(Math.min(25, (calmDays / Math.max(1, days * 0.2)) * 25));
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const dueByNow = dues.filter((d) => new Date(year, month, Math.min(d.day, new Date(year, month + 1, 0).getDate())).getTime() < to);
  const paid = dueByNow.filter((d) => d.paid.includes(key)).length;
  const bills = dueByNow.length ? Math.round((paid / dueByNow.length) * 25) : 18;

  const habits: Habit[] = [
    { key: 'logging', title: 'Logging', score: logging, line: `${logged.size} of ${days} days logged` },
    { key: 'pace', title: 'Pace', score: pace, line: pct === null ? 'No last month to compare yet' : `${pct < 0 ? '−' : '+'}${Math.abs(Math.round(pct * 100))}% vs last month, same days` },
    { key: 'calm', title: 'Calm days', score: calm, line: `${calmDays} no-spend ${calmDays === 1 ? 'day' : 'days'}` },
    { key: 'bills', title: 'Bills on time', score: bills, line: dueByNow.length ? `${paid} of ${dueByNow.length} marked paid` : 'Add your bills in Due dates' },
  ];
  const total = habits.reduce((a, h) => a + h.score, 0);
  const weakest = [...habits].sort((a, b) => a.score - b.score)[0];
  const TIPS: Record<Habit['key'], string> = {
    logging: 'Log something every day, even a no-spend check-in. It lifts every other score.',
    pace: 'One calm week brings the pace back. Try the "lighter week" challenge.',
    calm: 'Plan one no-spend day a week. Weekends at home count.',
    bills: 'Mark bills paid in Due dates as you pay them.',
  };
  return { month: new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long' }), total, grade: gradeOf(total), habits, tip: TIPS[weakest.key], days };
}
