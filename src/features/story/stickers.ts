import type { Transaction } from '@/domain/types';

/**
 * Story stickers: small, see-through overlays for the user's own photo (the Strava idea). Each one states a good habit
 * with a "track" drawing; none shows an amount. Only stickers worth showing off are offered. Pure and tested.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'occurred_at'> & { excluded?: number | null };
const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** The last `n` days, oldest first: was anything logged that day? */
export function dayTrack(txs: Tx[], now: number, n = 30): boolean[] {
  const logged = new Set(txs.map((t) => sod(t.occurred_at)));
  const today = sod(now);
  return Array.from({ length: n }, (_, i) => logged.has(sod(today - (n - 1 - i) * DAY + 12 * 3600_000)));
}

/** Logged days in a row ending today (or yesterday, if today has nothing yet). */
export function runLength(track: boolean[]): number {
  let i = track.length - 1;
  if (i >= 0 && !track[i]) i--;
  let n = 0;
  while (i >= 0 && track[i]) { n++; i--; }
  return n;
}

const spendOf = (t: Tx) => (t.type === 'expense' && !t.excluded ? t.amount : 0);

/**
 * This month's running spend against last month's, one point per day, both scaled to the same maximum so they draw on
 * one chart. `pct` compares this month so far with the same days of last month (negative = spent less).
 */
export function monthLines(txs: Tx[], now: number): { cur: number[]; prev: number[]; pct: number | null; prevLabel: string } {
  const d = new Date(now);
  const y = d.getFullYear(), m = d.getMonth();
  const curStart = new Date(y, m, 1).getTime(), prevStart = new Date(y, m - 1, 1).getTime();
  const prevDays = new Date(y, m, 0).getDate();
  const today = d.getDate();
  const daily = (start: number, n: number) => {
    const out = new Array(n).fill(0);
    for (const t of txs) { const i = Math.floor((sod(t.occurred_at) - start) / DAY); if (i >= 0 && i < n) out[i] += spendOf(t); }
    let run = 0;
    return out.map((v) => (run += v));
  };
  const cur = daily(curStart, today);
  const prev = daily(prevStart, prevDays);
  const max = Math.max(1, ...cur, ...prev);
  const prevSame = prev[Math.min(today, prevDays) - 1] ?? 0;
  const pct = prevSame > 0 ? Math.round(((cur[cur.length - 1] - prevSame) / prevSame) * 100) : null;
  return { cur: cur.map((v) => v / max), prev: prev.map((v) => v / max), pct, prevLabel: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }) };
}

export type Cell = 'nospend' | 'spend' | 'empty' | 'future';
/** This month as calendar cells: a logged day with no spending, a spending day, nothing logged, or still to come. */
export function monthCells(txs: Tx[], now: number): { cells: Cell[]; noSpend: number; firstWeekday: number } {
  const d = new Date(now);
  const y = d.getFullYear(), m = d.getMonth();
  const start = new Date(y, m, 1).getTime();
  const n = new Date(y, m + 1, 0).getDate();
  const logged = new Set<number>(), spent = new Set<number>();
  for (const t of txs) {
    const i = Math.floor((sod(t.occurred_at) - start) / DAY);
    if (i < 0 || i >= n) continue;
    logged.add(i);
    if (spendOf(t) > 0) spent.add(i);
  }
  const cells: Cell[] = Array.from({ length: n }, (_, i) => (i + 1 > d.getDate() ? 'future' : spent.has(i) ? 'spend' : logged.has(i) ? 'nospend' : 'empty'));
  return { cells, noSpend: cells.filter((c) => c === 'nospend').length, firstWeekday: new Date(y, m, 1).getDay() };
}

export type StickerKey = 'streak' | 'less' | 'nospend' | 'aura';
/** Stickers worth posting right now; the rest are left out rather than shown with a weak number. */
export function worthSharing(txs: Tx[], now: number): StickerKey[] {
  const out: StickerKey[] = [];
  if (runLength(dayTrack(txs, now)) >= 3) out.push('streak');
  const l = monthLines(txs, now);
  if (l.pct !== null && l.pct <= -5 && new Date(now).getDate() >= 5) out.push('less');
  if (monthCells(txs, now).noSpend >= 2) out.push('nospend');
  out.push('aura');
  return out;
}
