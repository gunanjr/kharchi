import type { Category } from '@/domain/types';
import { MONTHS } from '@/lib/date';

/**
 * The questions the on-device assistant offers. The assistant only understands a fixed set of questions, so the app
 * offers exactly those as taps instead of a free text box. Category and month names come from the user's own data.
 */
export interface CatalogItem { id: string; label: string; question: string }
export interface CatalogGroup { key: string; title: string; short: string; items: CatalogItem[] }

const item = (label: string, question = label): CatalogItem => ({ id: question, label, question });

export function buildCatalog(categories: Category[], topCategoryIds: string[], now = Date.now()): CatalogGroup[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const top = topCategoryIds.map((id) => byId.get(id)).filter((c): c is Category => !!c && c.kind === 'expense').slice(0, 3);
  const d = new Date(now);
  const prev = MONTHS[(d.getMonth() + 11) % 12];
  return [
    { key: 'spending', title: 'Spending', short: 'Spent', items: [
      item('How much did I spend this month?'),
      item('How much did I spend last month?'),
      item('How much did I spend in the last 7 days?'),
      item('How much did I spend yesterday?'),
      item('What is my average spend per day this month?'),
      item('How many transactions this month?'),
    ] },
    { key: 'where', title: 'Where it went', short: 'Where', items: [
      item('Where did my money go this month?'),
      item('Where did my money go last month?'),
      ...top.map((c) => item(`How much on ${c.name} this month?`)),
      item('Top merchants this month'),
      item('Biggest expense this month'),
      item(`Biggest expense in ${prev}`),
    ] },
    { key: 'ahead', title: 'Looking ahead', short: 'Ahead', items: [
      item('Predict this month'),
      item('How much can I save?'),
      item('Compare with last month'),
      item('How are my budgets doing?', 'How are my budgets doing this month?'),
      item('Show my subscriptions'),
    ] },
    { key: 'people', title: 'Money & people', short: 'People', items: [
      item('Who do I owe?'),
      item('How much income did I receive this month?'),
    ] },
  ];
}
