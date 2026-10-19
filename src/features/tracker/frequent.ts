import type { Db } from '@/db/types';
import { DAY } from '@/lib/date';
import { merchantKey } from '@/features/parser/merchants';

export interface Frequent { merchant: string; categoryId: string | null; amount: number; count: number }

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

/** The few things this person pays for again and again: same merchant at least twice in 90 days, with its usual amount. */
export async function loadFrequent(db: Db, now = Date.now(), limit = 5): Promise<Frequent[]> {
  const rows = await db.all<{ merchant: string; category_id: string | null; amount: number }>(
    `SELECT merchant, category_id, amount FROM transactions WHERE deleted_at IS NULL AND excluded=0 AND type='expense' AND merchant IS NOT NULL AND merchant <> '' AND occurred_at BETWEEN ? AND ?`,
    [now - 90 * DAY, now],
  );
  type G = { names: Map<string, number>; cats: Map<string | null, number>; amounts: number[] };
  const groups = new Map<string, G>();
  for (const r of rows) {
    const k = merchantKey(r.merchant);
    if (!k) continue;
    const g: G = groups.get(k) ?? { names: new Map(), cats: new Map(), amounts: [] };
    g.names.set(r.merchant, (g.names.get(r.merchant) ?? 0) + 1);
    g.cats.set(r.category_id, (g.cats.get(r.category_id) ?? 0) + 1);
    g.amounts.push(r.amount);
    groups.set(k, g);
  }
  const top = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const topName = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1] || Number(/^[A-Z]/.test(b[0])) - Number(/^[A-Z]/.test(a[0])) || a[0].localeCompare(b[0]))[0][0];
  return [...groups.values()]
    .filter((g) => g.amounts.length >= 2)
    .sort((a, b) => b.amounts.length - a.amounts.length)
    .slice(0, limit)
    .map((g) => ({ merchant: topName(g.names), categoryId: top(g.cats), amount: median(g.amounts), count: g.amounts.length }));
}
