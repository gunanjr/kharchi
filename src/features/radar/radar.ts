import type { Transaction } from '@/domain/types';
import { merchantKey } from '@/features/parser/merchants';

/**
 * Subscription radar (Pro): finds every repeating charge in the user's own entries, including ones whose price changed,
 * and works out the next charge, the yearly cost, price rises, charges that seem to have stopped, and charges that came
 * back after the user marked them cancelled. Pure; fixed rules; tested.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'merchant' | 'note' | 'occurred_at'> & { excluded?: number | null };
const DAY = 86_400_000;

export type Period = 7 | 30 | 91 | 365;
export interface RadarItem {
  key: string;
  name: string;
  amount: number;
  previous: number | null;
  /** latest minus previous charge (positive = price went up), 0 when unchanged */
  change: number;
  period: Period;
  lastAt: number;
  nextExpected: number;
  yearly: number;
  count: number;
  status: 'active' | 'stopped';
}

const PERIODS: [Period, number, number][] = [[7, 7, 1.5], [30, 30.4, 4], [91, 91, 10], [365, 365, 20]];

export function findRepeating(txs: Tx[], now: number): RadarItem[] {
  const groups = new Map<string, Tx[]>();
  for (const t of txs) {
    if (t.type !== 'expense' || t.excluded) continue;
    const k = merchantKey(t.merchant || t.note || '');
    if (!k) continue;
    const g = groups.get(k);
    if (g) g.push(t); else groups.set(k, [t]);
  }
  const out: RadarItem[] = [];
  for (const [key, list] of groups) {
    if (list.length < 3) continue;
    const s = [...list].sort((a, b) => a.occurred_at - b.occurred_at);
    // Use the recent run of charges (up to 8) so an old pattern does not hide a new one.
    const recent = s.slice(-8);
    const gaps = recent.slice(1).map((x, i) => (x.occurred_at - recent[i].occurred_at) / DAY);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const match = PERIODS.find(([, d, tol]) => Math.abs(avg - d) <= tol && gaps.every((g) => Math.abs(g - d) <= tol * 1.6));
    if (!match) continue;
    // Amounts may change (price rises) but must stay in one band: no charge more than double or under half the median.
    const amounts = recent.map((x) => x.amount);
    const med = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)];
    if (amounts.some((a) => a > med * 2 || a < med / 2)) continue;
    const [period, days] = match;
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    const change = Math.abs(last.amount - prev.amount) >= Math.max(500, prev.amount * 0.02) ? last.amount - prev.amount : 0;
    const nextExpected = last.occurred_at + Math.round(days * DAY);
    out.push({
      key, name: last.merchant || last.note || 'Unknown', amount: last.amount, previous: change ? prev.amount : null, change, period,
      lastAt: last.occurred_at, nextExpected, yearly: Math.round(last.amount * (365 / days)), count: s.length,
      status: now - last.occurred_at > days * DAY * 1.6 ? 'stopped' : 'active',
    });
  }
  return out.sort((a, b) => (a.status === b.status ? b.yearly - a.yearly : a.status === 'active' ? -1 : 1));
}

export interface RadarUserState { cancelledAt?: number; remind?: boolean }

export interface RadarView extends RadarItem {
  cancelled: boolean;
  /** charged again after the user marked it cancelled */
  chargedAfterCancel: boolean;
  renewsInDays: number;
}

export function radarView(items: RadarItem[], state: Record<string, RadarUserState>, now: number): { items: RadarView[]; yearlyActive: number; monthlyActive: number; rises: number } {
  const views = items.map((it) => {
    const st = state[it.key] ?? {};
    const cancelled = !!st.cancelledAt;
    return { ...it, cancelled, chargedAfterCancel: cancelled && it.lastAt > (st.cancelledAt ?? 0), renewsInDays: Math.ceil((it.nextExpected - now) / DAY) };
  });
  const live = views.filter((v) => v.status === 'active' && (!v.cancelled || v.chargedAfterCancel));
  const yearlyActive = live.reduce((a, v) => a + v.yearly, 0);
  return { items: views, yearlyActive, monthlyActive: Math.round(yearlyActive / 12), rises: live.filter((v) => v.change > 0).length };
}

export const periodLabel = (p: Period) => (p === 7 ? 'week' : p === 30 ? 'month' : p === 91 ? 'quarter' : 'year');
