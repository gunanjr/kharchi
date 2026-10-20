/**
 * Payback habit: how quickly someone usually settles what they owe, worked out on the phone from the group's own
 * expenses and settlements. It is shown only to the user, never shared, and is deliberately cautious: it needs at
 * least two real paybacks before it says anything, ignores tiny amounts, and compares like with like (first debt is
 * paid back first). It describes a habit, not a person.
 */
export interface RelExpense { amount: number; currency: string; rate: number; occurred_at: number; payers: Record<string, number>; shares: Record<string, number> }
export interface RelSettlement { from: string; to: string; amount: number; occurred_at: number }

export type Badge = 'quick' | 'steady' | 'slow';
export interface Reliability { badge: Badge | null; medianDays: number | null; paybacks: number; streak: number; openDays: number | null }

const DAY = 86400000;
const MIN_AMOUNT = 5000; // ignore debts under 50 in the main unit
const MIN_PAYBACKS = 2;

export function reliability(expenses: RelExpense[], settlements: RelSettlement[], groupCurrency: string, now: number): Record<string, Reliability> {
  const conv = (e: RelExpense, v: number) => (e.currency === groupCurrency || e.rate === 1 ? v : v * e.rate);
  // debts[D][C] = chronological queue of {t, left}
  const debts = new Map<string, { t: number; left: number }[]>();
  const key = (d: string, c: string) => `${d}\u0000${c}`;
  for (const e of [...expenses].sort((a, b) => a.occurred_at - b.occurred_at)) {
    const total = Object.values(e.payers).reduce((a, b) => a + b, 0);
    if (total <= 0) continue;
    for (const [d, share] of Object.entries(e.shares)) {
      for (const [c, paid] of Object.entries(e.payers)) {
        if (d === c || share <= 0 || paid <= 0) continue;
        const owed = conv(e, (share * paid) / total);
        if (owed < 1) continue;
        const k = key(d, c);
        debts.set(k, [...(debts.get(k) ?? []), { t: e.occurred_at, left: owed }]);
      }
    }
  }
  const lags = new Map<string, { lag: number; w: number }[]>(); // per debtor, per chunk
  const perSettle = new Map<string, number[]>(); // per debtor: average lag of each settlement in time order
  for (const s of [...settlements].sort((a, b) => a.occurred_at - b.occurred_at)) {
    const q = debts.get(key(s.from, s.to));
    if (!q) continue;
    let rest = s.amount;
    let wsum = 0;
    let lsum = 0;
    for (const d of q) {
      if (rest <= 0) break;
      if (d.left <= 0 || d.t > s.occurred_at) continue;
      const take = Math.min(d.left, rest);
      d.left -= take;
      rest -= take;
      if (take >= 1) {
        const lag = (s.occurred_at - d.t) / DAY;
        lags.set(s.from, [...(lags.get(s.from) ?? []), { lag, w: take }]);
        wsum += take;
        lsum += lag * take;
      }
    }
    if (wsum >= MIN_AMOUNT) perSettle.set(s.from, [...(perSettle.get(s.from) ?? []), lsum / wsum]);
  }
  const out: Record<string, Reliability> = {};
  const people = new Set<string>([...Object.keys(Object.fromEntries([...debts.keys()].map((k) => [k.split('\u0000')[0], 1]))), ...lags.keys()]);
  for (const p of people) {
    const chunks = (lags.get(p) ?? []).filter((c) => c.w >= 1).sort((a, b) => a.lag - b.lag);
    const totalW = chunks.reduce((a, c) => a + c.w, 0);
    let med: number | null = null;
    if (totalW > 0) {
      let acc = 0;
      for (const c of chunks) { acc += c.w; if (acc >= totalW / 2) { med = c.lag; break; } }
    }
    const per = perSettle.get(p) ?? [];
    let streak = 0;
    for (let i = per.length - 1; i >= 0 && per[i] <= 7; i--) streak++;
    let open: number | null = null;
    for (const [k, q] of debts) {
      if (!k.startsWith(`${p}\u0000`)) continue;
      const left = q.filter((d) => d.left >= MIN_AMOUNT && d.t <= now);
      if (left.length) open = Math.max(open ?? 0, Math.floor((now - Math.min(...left.map((d) => d.t))) / DAY));
    }
    const enough = per.length >= MIN_PAYBACKS && med !== null;
    out[p] = {
      badge: enough ? (med! <= 3 ? 'quick' : med! <= 10 ? 'steady' : 'slow') : null,
      medianDays: enough ? Math.round(med!) : null,
      paybacks: per.length,
      streak,
      openDays: open,
    };
  }
  return out;
}

export const BADGE_LABEL: Record<Badge, string> = { quick: 'Pays fast', steady: 'Pays steady', slow: 'Slow to pay' };
