import type { SplitType } from '@/domain/types';
import type { StoredExpense } from './repo';

/**
 * How to reopen a saved shared expense in the editor. Equal, exact, percent and shares splits come back as they were.
 * Adjustment and itemised splits cannot be rebuilt from what is stored (the per-item detail is not kept), so they open
 * as exact amounts: the same result for every person, nothing lost.
 */
export function prefillSplit(e: StoredExpense): { type: SplitType; vals: Record<string, string> } {
  const fmt = (n: number) => String(Math.round(n) / 100);
  switch (e.split_type) {
    case 'equal': return { type: 'equal', vals: {} };
    case 'percent': return { type: 'percent', vals: Object.fromEntries(Object.entries(e.inputs).map(([k, v]) => [k, String(v ?? 0)])) };
    case 'shares': return { type: 'shares', vals: Object.fromEntries(Object.entries(e.inputs).map(([k, v]) => [k, String(v ?? 1)])) };
    default: return { type: 'exact', vals: Object.fromEntries(Object.entries(e.shares).map(([k, v]) => [k, fmt(v)])) };
  }
}
