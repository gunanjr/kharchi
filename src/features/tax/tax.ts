import type { Transaction } from '@/domain/types';
import { readTags } from '@/features/tracker/tags';

/**
 * Tax-time totals (Pro): yearly totals for the payments people usually show their CA, by Indian financial year
 * (April to March). Totals only, from the user's own entries and tags. Not tax advice and no limits are applied.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'category_id' | 'occurred_at' | 'tags' | 'merchant'> & { excluded?: number | null };

export interface TaxGroup { key: string; title: string; hint: string; tags: string[]; categories: string[] }
export const TAX_GROUPS: TaxGroup[] = [
  { key: 'invest', title: 'Investments and life cover (80C)', hint: 'Tag entries: elss, ppf, epf, lic, life-insurance, tuition', tags: ['elss', 'ppf', 'epf', 'lic', 'life-insurance', 'tuition', 'nsc', 'sukanya'], categories: [] },
  { key: 'health', title: 'Health insurance (80D)', hint: 'Tag entries: health-insurance, mediclaim', tags: ['health-insurance', 'mediclaim', 'health insurance'], categories: [] },
  { key: 'rent', title: 'Rent paid (HRA)', hint: 'The Rent & Home category, or tag: rent', tags: ['rent'], categories: ['cat_rent'] },
  { key: 'donation', title: 'Donations (80G)', hint: 'Tag entries: donation', tags: ['donation', 'charity'], categories: [] },
  { key: 'homeloan', title: 'Home loan interest', hint: 'Tag entries: home-loan', tags: ['home-loan', 'home loan'], categories: [] },
  { key: 'nps', title: 'NPS', hint: 'Tag entries: nps', tags: ['nps'], categories: [] },
];

/** Financial year starting 1 April of `startYear`, in local time. */
export function fyWindow(startYear: number) {
  return { from: new Date(startYear, 3, 1).getTime(), to: new Date(startYear + 1, 3, 1).getTime(), label: `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}` };
}
export const currentFyStart = (now: number) => { const d = new Date(now); return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; };

export interface TaxTotal { key: string; title: string; hint: string; total: number; count: number }
export function taxTotals(txs: Tx[], startYear: number): TaxTotal[] {
  const { from, to } = fyWindow(startYear);
  return TAX_GROUPS.map((g) => {
    let total = 0, count = 0;
    for (const t of txs) {
      if (t.type !== 'expense' || t.occurred_at < from || t.occurred_at >= to) continue;
      const tags = readTags(t.tags).map((x) => x.toLowerCase());
      if (g.categories.includes(t.category_id ?? '') || g.tags.some((x) => tags.includes(x))) { total += t.amount; count++; }
    }
    return { key: g.key, title: g.title, hint: g.hint, total, count };
  });
}

export function taxCsv(rows: TaxTotal[], label: string): string {
  return [`${label},Total (INR),Entries`, ...rows.map((r) => `"${r.title}",${(r.total / 100).toFixed(2)},${r.count}`)].join('\n');
}
