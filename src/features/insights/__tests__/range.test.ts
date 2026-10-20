import { buildRangeInsights } from '../range';
import { DAY, startOfDay } from '@/lib/date';
import type { Transaction } from '@/domain/types';

const NOW = new Date(2026, 9, 19, 15).getTime(); // Monday 19 Oct 2026
const tx = (daysAgo: number, amount: number, cat = 'cat_food', merchant = 'A', type: 'expense' | 'income' = 'expense'): Transaction =>
  ({ id: `${daysAgo}-${amount}-${cat}-${merchant}-${type}`, type, amount, currency: 'INR', category_id: cat, merchant, occurred_at: startOfDay(NOW) - daysAgo * DAY + 12 * 3600_000 }) as Transaction;

test('categories are ranked with shares that add to 100 percent', () => {
  const r = buildRangeInsights([tx(1, 600, 'cat_food'), tx(2, 300, 'cat_rent'), tx(3, 100, 'cat_other')], NOW, '1M');
  expect(r.cats.map((c) => c.category_id)).toEqual(['cat_food', 'cat_rent', 'cat_other']);
  expect(r.cats.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1);
  expect(r.cats[0].share).toBeCloseTo(0.6);
});
test('the window limits what counts: 1M excludes older spending that 3M includes', () => {
  const data = [tx(5, 100), tx(60, 900)];
  expect(buildRangeInsights(data, NOW, '1M').frame.spent).toBe(100);
  expect(buildRangeInsights(data, NOW, '3M').frame.spent).toBe(1000);
});
test('month-by-month bars: 3 months for 1M and 3M, 6 for 6M, 12 for 1Y', () => {
  expect(buildRangeInsights([], NOW, '1M').months).toHaveLength(6);
  expect(buildRangeInsights([], NOW, '3M').months).toHaveLength(6);
  expect(buildRangeInsights([], NOW, '6M').months).toHaveLength(6);
  expect(buildRangeInsights([], NOW, '1Y').months).toHaveLength(12);
});
test('weekday averages find the priciest day and are fair to days that occur more often', () => {
  // 19 Oct is a Monday; 12 Oct and 5 Oct are Mondays too.
  const r = buildRangeInsights([tx(0, 900), tx(7, 900), tx(14, 900)], NOW, '1M');
  expect(r.priciest).toBe(1);
  expect(r.weekday[1]).toBeGreaterThan(r.weekday[3]);
  expect(r.weekday).toHaveLength(7);
});
test('top places come from merchant totals', () => {
  const r = buildRangeInsights([tx(1, 500, 'cat_food', 'Swiggy'), tx(2, 400, 'cat_food', 'Swiggy'), tx(3, 300, 'cat_food', 'Zomato')], NOW, '1M');
  expect(r.merchants[0]).toMatchObject({ total: 900 });
  expect(r.merchants).toHaveLength(2);
});
test('no-spend days are days with nothing spent', () => {
  const r = buildRangeInsights([tx(0, 100), tx(1, 100)], NOW, '1M');
  expect(r.noSpendDays).toBe(28);
});
test('an empty range is all zeros with no priciest day and no NaN', () => {
  for (const range of ['1M', '3M', '6M', '1Y'] as const) {
    const r = buildRangeInsights([], NOW, range);
    expect(r.frame.spent).toBe(0);
    expect(r.cats).toEqual([]);
    expect(r.priciest).toBeNull();
    expect(r.weekday.every(Number.isFinite)).toBe(true);
  }
});
test('income is not counted as spending', () => {
  const r = buildRangeInsights([tx(1, 100), tx(1, 9999, 'cat_salary', 'Acme', 'income')], NOW, '1M');
  expect(r.frame.spent).toBe(100);
  expect(r.frame.income).toBe(9999);
  expect(r.cats).toHaveLength(1);
});
