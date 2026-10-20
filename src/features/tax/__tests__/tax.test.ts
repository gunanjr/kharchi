import { taxTotals, fyWindow, currentFyStart, taxCsv } from '../tax';
const at = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();
const e = (amount: number, t: number, tags: string[] = [], category_id: string | null = 'cat_other') => ({ type: 'expense' as const, amount, category_id, occurred_at: t, tags: JSON.stringify(tags), merchant: null });

test('financial year runs April to March', () => {
  expect(fyWindow(2026).label).toBe('FY 2026-27');
  expect(currentFyStart(at(2026, 2, 31))).toBe(2025);
  expect(currentFyStart(at(2026, 3, 1))).toBe(2026);
});
test('totals by tag or category inside the year only; tags are case-insensitive', () => {
  const r = taxTotals([e(15000000, at(2026, 4, 1), ['ELSS']), e(2500000, at(2026, 6, 1), ['health-insurance']), e(2200000, at(2026, 5, 4), [], 'cat_rent'), e(99, at(2027, 3, 2), ['elss']), e(500000, at(2026, 8, 1), ['donation'])], 2026);
  const by = Object.fromEntries(r.map((x) => [x.key, x]));
  expect(by.invest).toMatchObject({ total: 15000000, count: 1 });
  expect(by.health.total).toBe(2500000);
  expect(by.rent.total).toBe(2200000);
  expect(by.donation.total).toBe(500000);
  expect(by.homeloan.total).toBe(0);
  expect(taxCsv(r, 'FY 2026-27').split('\n')[1]).toContain('150000.00');
});
