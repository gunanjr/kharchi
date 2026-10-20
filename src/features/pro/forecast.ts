import type { Transaction } from '@/domain/types';
import type { DueItem } from '@/features/dues/dues';

/**
 * Month-end forecast (an estimate, labelled as one): spent so far + the usual daily pace for the days left + bills
 * still due this month and not yet marked paid. Pure and tested.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'occurred_at' | 'category_id'> & { excluded?: number | null };
const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const FIXED = new Set(['cat_rent', 'cat_bills', 'cat_subscriptions']);

export interface Forecast { soFar: number; forecast: number; lastMonth: number; daily: number; duesLeft: number; daysLeft: number }

export function monthForecast(txs: Tx[], dues: DueItem[], now: number): Forecast {
  const d = new Date(now);
  const from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const today = sod(now);
  const exp = (t: Tx) => t.type === 'expense' && !t.excluded;
  const soFar = txs.filter((t) => exp(t) && t.occurred_at >= from && t.occurred_at < today + DAY).reduce((a, t) => a + t.amount, 0);
  // usual everyday pace: the last 60 days of everyday spending (fixed costs excluded), spread over every day
  const daily = Math.round(txs.filter((t) => exp(t) && !FIXED.has(t.category_id ?? '') && t.occurred_at >= today - 60 * DAY && t.occurred_at < today).reduce((a, t) => a + t.amount, 0) / 60);
  const daysLeft = Math.round((end - (today + DAY)) / DAY);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const duesLeft = dues.filter((x) => Math.min(x.day, last) > d.getDate() && !x.paid.includes(key) && x.amount).reduce((a, x) => a + (x.amount ?? 0), 0);
  const lastMonth = txs.filter((t) => exp(t) && t.occurred_at >= new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime() && t.occurred_at < from).reduce((a, t) => a + t.amount, 0);
  return { soFar, forecast: soFar + daily * daysLeft + duesLeft, lastMonth, daily, duesLeft, daysLeft };
}
