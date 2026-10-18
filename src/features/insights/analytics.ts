import type { Transaction } from '@/domain/types';
import { DAY, daysInMonth, startOfDay, startOfMonth } from '@/lib/date';
import { merchantKey } from '@/features/parser/merchants';

type Tx = Pick<Transaction, 'type' | 'amount' | 'category_id' | 'merchant' | 'note' | 'occurred_at'>;

const expenses = (t: Tx[]) => t.filter((x) => x.type === 'expense');
const sum = (t: Tx[]) => t.reduce((a, x) => a + x.amount, 0);

export function byCategory(txs: Tx[]) {
  const m = new Map<string | null, number>();
  for (const t of expenses(txs)) m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount);
  return [...m.entries()].map(([category_id, total]) => ({ category_id, total })).sort((a, b) => b.total - a.total);
}

export function topMerchants(txs: Tx[], n = 5) {
  const m = new Map<string, { name: string; total: number; count: number }>();
  for (const t of expenses(txs)) {
    const name = t.merchant || t.note;
    const k = merchantKey(name);
    if (!k) continue;
    const e = m.get(k) ?? { name: name!, total: 0, count: 0 };
    e.total += t.amount;
    e.count++;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.total - a.total).slice(0, n);
}

/** Last `months` calendar months ending with the month of `now`. */
export function monthlyTrend(txs: Tx[], now: number, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const off = i - (months - 1);
    const from = startOfMonth(now, off);
    const to = startOfMonth(now, off + 1);
    const inM = txs.filter((t) => t.occurred_at >= from && t.occurred_at < to);
    return { month: from, expense: sum(expenses(inM)), income: sum(inM.filter((t) => t.type === 'income')) };
  });
}

export function dailyTotals(txs: Tx[], from: number, days: number) {
  const out = Array.from({ length: days }, (_, i) => ({ date: startOfDay(from) + i * DAY, value: 0 }));
  for (const t of expenses(txs)) {
    const i = Math.floor((startOfDay(t.occurred_at) - startOfDay(from)) / DAY);
    if (i >= 0 && i < days) out[i].value += t.amount;
  }
  return out;
}

/** Month-end projection at the current daily pace, plus cumulative series for a line chart. */
export function forecastMonth(txs: Tx[], now: number) {
  const start = startOfMonth(now);
  const dim = daysInMonth(now);
  const day = new Date(now).getDate();
  const daily = dailyTotals(txs, start, dim);
  let cum = 0;
  const actual = daily.slice(0, day).map((d) => (cum += d.value));
  const spent = cum;
  const pace = day > 0 ? spent / day : 0;
  const projectedTotal = Math.round(pace * dim);
  const projected = Array.from({ length: dim - day }, (_, i) => Math.round(spent + pace * (i + 1)));
  return { spent, projectedTotal, actual, projected, dim, day };
}

export interface Subscription { name: string; amount: number; everyDays: number; count: number; nextExpected: number; yearly: number }

/** Merchants charged 3+ times at a steady ~weekly/monthly/yearly rhythm and a near-constant amount. */
export function detectSubscriptions(txs: Tx[]): Subscription[] {
  const groups = new Map<string, Tx[]>();
  for (const t of expenses(txs)) {
    const k = merchantKey(t.merchant || t.note);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const out: Subscription[] = [];
  for (const list of groups.values()) {
    if (list.length < 3) continue;
    const s = [...list].sort((a, b) => a.occurred_at - b.occurred_at);
    const amounts = s.map((x) => x.amount);
    const med = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
    if (amounts.some((a) => Math.abs(a - med) > med * 0.1)) continue;
    const gaps = s.slice(1).map((x, i) => (x.occurred_at - s[i].occurred_at) / DAY);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const near = (t: number, tol: number) => Math.abs(avg - t) <= tol && gaps.every((g) => Math.abs(g - t) <= tol * 1.5);
    const period = near(7, 1.5) ? 7 : near(30.5, 4) ? 30 : near(365, 20) ? 365 : 0;
    if (!period) continue;
    const last = s[s.length - 1];
    out.push({
      name: last.merchant || last.note || 'Unknown', amount: med, everyDays: period, count: s.length,
      nextExpected: last.occurred_at + period * DAY, yearly: Math.round(med * (365 / period)),
    });
  }
  return out.sort((a, b) => b.yearly - a.yearly);
}

export interface Anomaly { tx: Tx; reason: string; typical: number }

/** Spend far above the user's own norm for that category (robust: median + 3x MAD, min 4 prior samples). */
export function detectAnomalies(txs: Tx[], since: number): Anomaly[] {
  const byCat = new Map<string | null, Tx[]>();
  for (const t of expenses(txs)) byCat.set(t.category_id, [...(byCat.get(t.category_id) ?? []), t]);
  const out: Anomaly[] = [];
  for (const list of byCat.values()) {
    for (const t of list.filter((x) => x.occurred_at >= since)) {
      const prior = list.filter((x) => x !== t && x.occurred_at < t.occurred_at).map((x) => x.amount).sort((a, b) => a - b);
      if (prior.length < 4) continue;
      const med = prior[Math.floor(prior.length / 2)];
      const mad = [...prior].map((a) => Math.abs(a - med)).sort((a, b) => a - b)[Math.floor(prior.length / 2)] || med * 0.2;
      if (t.amount > med + 6 * mad && t.amount > med * 2.5) out.push({ tx: t, typical: med, reason: `${(t.amount / med).toFixed(1)}× your usual in this category` });
    }
  }
  return out.sort((a, b) => b.tx.amount - a.tx.amount);
}

export function savingsTips(opts: { byCat: { category_id: string | null; total: number }[]; prevByCat: { category_id: string | null; total: number }[]; subs: Subscription[]; income: number; expense: number; names: (id: string | null) => string }): string[] {
  const tips: string[] = [];
  const prev = new Map(opts.prevByCat.map((c) => [c.category_id, c.total]));
  for (const c of opts.byCat.slice(0, 5)) {
    const p = prev.get(c.category_id) ?? 0;
    if (p > 0 && c.total > p * 1.3 && c.total - p > 50000) tips.push(`${opts.names(c.category_id)} is up ${Math.round(((c.total - p) / p) * 100)}% on last month. Trimming it back would save about ₹${Math.round((c.total - p) / 100).toLocaleString('en-IN')}.`);
  }
  if (opts.subs.length) {
    const yearly = opts.subs.reduce((a, s) => a + s.yearly, 0);
    tips.push(`You have ${opts.subs.length} recurring charges costing about ₹${Math.round(yearly / 100).toLocaleString('en-IN')} a year. Cancel any you don't use.`);
  }
  if (opts.income > 0) {
    const rate = Math.round(((opts.income - opts.expense) / opts.income) * 100);
    if (rate < 20) tips.push(`Your savings rate this month is ${rate}%. A common target is 20%: try automating a transfer on payday.`);
    else tips.push(`Nice: you're saving ${rate}% of your income this month.`);
  }
  return tips;
}
