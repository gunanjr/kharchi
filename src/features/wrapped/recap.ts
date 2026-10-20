import type { Transaction } from '@/domain/types';

/**
 * Recaps and Wrapped: the same small engine over different time windows (a week, a month, a year), plus milestones.
 * Pure and tested. Counts only expenses that count in totals; never judges, only reports.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'merchant' | 'category_id' | 'occurred_at'> & { excluded?: number | null };
const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface Window { from: number; to: number; label: string }

/** The last full Monday-to-Sunday week before `now`. */
export function lastWeek(now: number): Window {
  const d = new Date(sod(now));
  const back = (d.getDay() + 6) % 7; // days since Monday
  const thisMonday = d.getTime() - back * DAY;
  const from = thisMonday - 7 * DAY;
  return { from, to: thisMonday, label: 'Last week' };
}
export function monthWindow(year: number, month: number): Window {
  return { from: new Date(year, month, 1).getTime(), to: new Date(year, month + 1, 1).getTime(), label: new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
}
export function yearWindow(year: number): Window {
  return { from: new Date(year, 0, 1).getTime(), to: new Date(year + 1, 0, 1).getTime(), label: String(year) };
}
const shift = (w: Window): Window => ({ from: w.from - (w.to - w.from), to: w.from, label: '' });

export interface Recap {
  window: Window;
  spent: number;
  income: number;
  entries: number;
  /** spent minus the window before (null when nothing to compare) */
  change: number | null;
  changePct: number | null;
  topPlaces: { name: string; total: number; count: number }[];
  topCategory: { id: string | null; total: number } | null;
  biggest: { name: string; amount: number; at: number } | null;
  busiestDay: { at: number; total: number } | null;
  /** weekday with the highest total, 0 = Sunday */
  priciestWeekday: number | null;
  loggedDays: number;
  noSpendDays: number;
}

export function recap(txs: Tx[], w: Window): Recap {
  const inW = (t: Tx) => t.occurred_at >= w.from && t.occurred_at < w.to && !t.excluded;
  const exp = txs.filter((t) => t.type === 'expense' && inW(t));
  const income = txs.filter((t) => t.type === 'income' && inW(t)).reduce((a, t) => a + t.amount, 0);
  const spent = exp.reduce((a, t) => a + t.amount, 0);
  const prevW = shift(w);
  const prev = txs.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= prevW.from && t.occurred_at < prevW.to).reduce((a, t) => a + t.amount, 0);
  const places = new Map<string, { name: string; total: number; count: number }>();
  const cats = new Map<string | null, number>();
  const days = new Map<number, number>();
  const wd = new Array(7).fill(0);
  let biggest: Recap['biggest'] = null;
  for (const t of exp) {
    const name = (t.merchant ?? '').trim();
    if (name) { const k = name.toLowerCase(); const p = places.get(k) ?? { name, total: 0, count: 0 }; p.total += t.amount; p.count++; places.set(k, p); }
    cats.set(t.category_id, (cats.get(t.category_id) ?? 0) + t.amount);
    const day = sod(t.occurred_at);
    days.set(day, (days.get(day) ?? 0) + t.amount);
    wd[new Date(t.occurred_at).getDay()] += t.amount;
    if (!biggest || t.amount > biggest.amount) biggest = { name: name || 'An expense', amount: t.amount, at: t.occurred_at };
  }
  const logged = new Set(txs.filter(inW).map((t) => sod(t.occurred_at)));
  const spendDays = new Set(exp.map((t) => sod(t.occurred_at)));
  const topCat = [...cats.entries()].sort((a, b) => b[1] - a[1])[0];
  const busy = [...days.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const maxWd = Math.max(...wd);
  return {
    window: w, spent, income, entries: exp.length,
    change: prev > 0 ? spent - prev : null,
    changePct: prev > 0 ? Math.round(((spent - prev) / prev) * 100) : null,
    topPlaces: [...places.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, 3),
    topCategory: topCat ? { id: topCat[0], total: topCat[1] } : null,
    biggest, busiestDay: busy ? { at: busy[0], total: busy[1] } : null,
    priciestWeekday: maxWd > 0 ? wd.indexOf(maxWd) : null,
    loggedDays: logged.size,
    noSpendDays: [...logged].filter((d) => !spendDays.has(d)).length,
  };
}

/* ---------- milestones ---------- */
export interface Milestone { key: string; title: string; detail: string; emoji: string; earnedAt: number }

/** Longest run of consecutive calendar days with at least one entry, and the day it was reached. */
export function longestStreak(txs: Tx[]): { days: number; at: number } {
  const days = [...new Set(txs.map((t) => sod(t.occurred_at)))].sort((a, b) => a - b);
  let best = { days: 0, at: 0 };
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && Math.round((days[i] - days[i - 1]) / DAY) === 1 ? run + 1 : 1;
    if (run > best.days) best = { days: run, at: days[i] };
  }
  return best;
}

/** Milestones the user has earned. Earned only, never taken away, no negative ones. */
export function milestones(txs: Tx[], extra: { settlements?: number[]; sharedCode?: boolean } = {}, now = Date.now()): Milestone[] {
  const all = [...txs].sort((a, b) => a.occurred_at - b.occurred_at);
  const out: Milestone[] = [];
  if (extra.sharedCode) out.push({ key: 'og', title: 'OG Bruh', detail: 'Shared BruhMe with a friend', emoji: '👑', earnedAt: now });
  if (!all.length) return out;
  out.push({ key: 'first', title: 'First entry', detail: 'You started tracking', emoji: '🌱', earnedAt: all[0].occurred_at });
  for (const n of [100, 500, 1000]) if (all.length >= n) out.push({ key: `entries-${n}`, title: `${n} entries`, detail: `${n} things logged`, emoji: n >= 1000 ? '🏆' : n >= 500 ? '🥇' : '💯', earnedAt: all[n - 1].occurred_at });
  const streak = longestStreak(all);
  for (const n of [7, 30, 100]) if (streak.days >= n) out.push({ key: `streak-${n}`, title: `${n}-day streak`, detail: `Logged something ${n} days in a row`, emoji: n >= 100 ? '⚡' : '🔥', earnedAt: streak.at });
  if (now - all[0].occurred_at >= 365 * DAY) out.push({ key: 'year', title: 'One year with BruhMe', detail: 'A full year of your money, sorted', emoji: '🎂', earnedAt: all[0].occurred_at + 365 * DAY });
  const s = [...(extra.settlements ?? [])].sort((a, b) => a - b);
  for (const n of [1, 10, 50]) if (s.length >= n) out.push({ key: `settled-${n}`, title: n === 1 ? 'First settle-up' : `${n} settle-ups`, detail: n === 1 ? 'Paid back or got paid back' : `${n} debts settled`, emoji: '🤝', earnedAt: s[n - 1] });
  // A weekend with entries logged that week but no spending on Saturday or Sunday.
  const exp = all.filter((t) => t.type === 'expense' && !t.excluded);
  const spendDays = new Set(exp.map((t) => sod(t.occurred_at)));
  const loggedDays = new Set(all.map((t) => sod(t.occurred_at)));
  // Saturdays of every week (Monday to Sunday) in which something was logged, newest first.
  const saturdays = [...new Set([...loggedDays].map((d) => { const back = (new Date(d).getDay() + 6) % 7; return sod(d - back * DAY + 5 * DAY + 12 * 3600_000); }))].sort((a, b) => b - a);
  for (const sat of saturdays) {
    const sun = sod(sat + DAY + 12 * 3600_000);
    // Only when the user was clearly logging around it (entries on the Friday before and the Monday after), so a
    // weekend they simply did not log is never mistaken for a weekend without spending.
    const fri = sod(sat - DAY + 12 * 3600_000), mon = sod(sun + DAY + 12 * 3600_000);
    if (loggedDays.has(fri) && loggedDays.has(mon) && !spendDays.has(sat) && !spendDays.has(sun) && mon + DAY <= now) { out.push({ key: 'no-spend-weekend', title: 'No-spend weekend', detail: 'A whole weekend without spending', emoji: '🧘', earnedAt: sun }); break; }
  }
  // A month that cost at least 10% less than the month before (both months with real spending).
  const byMonth = new Map<string, number>();
  for (const t of exp) { const d = new Date(t.occurred_at); const k = `${d.getFullYear()}-${d.getMonth()}`; byMonth.set(k, (byMonth.get(k) ?? 0) + t.amount); }
  const months = [...byMonth.entries()].map(([k, v]) => { const [y, m] = k.split('-').map(Number); return { y, m, v, at: new Date(y, m + 1, 1).getTime() }; }).sort((a, b) => a.at - b.at);
  for (let i = 1; i < months.length; i++) {
    const a = months[i - 1], b = months[i];
    const consecutive = (a.y * 12 + a.m) + 1 === b.y * 12 + b.m;
    if (consecutive && a.v > 0 && b.v <= a.v * 0.9 && b.at <= now) { out.push({ key: 'less-month', title: 'Spent less than last month', detail: `${Math.round((1 - b.v / a.v) * 100)}% less than the month before`, emoji: '📉', earnedAt: b.at }); break; }
  }
  return out.sort((a, b) => b.earnedAt - a.earnedAt);
}
