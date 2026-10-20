import { spendCalendar, compareMonths, suggestBudgets } from '../deep';
const at = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();
const e = (amount: number, t: number, category_id: string | null = 'cat_food', extra = {}) => ({ type: 'expense' as const, amount, category_id, occurred_at: t, ...extra });

test('calendar: totals per day, levels relative to the month, left-out entries ignored', () => {
  const c = spendCalendar([e(100, at(2026, 9, 1)), e(900, at(2026, 9, 2)), e(400, at(2026, 9, 3)), e(5000, at(2026, 9, 4), 'x', { excluded: 1 })], 2026, 9);
  expect(c.days).toHaveLength(31);
  expect(c.total).toBe(1400);
  expect(c.days[0].level).toBeGreaterThan(0);
  expect(c.days[1].level).toBeGreaterThanOrEqual(c.days[2].level);
  expect(c.days[3]).toMatchObject({ total: 0, level: 0 });
  expect(c.firstWeekday).toBe(4); // 1 Oct 2026 is a Thursday
  expect(spendCalendar([], 2026, 1).days).toHaveLength(28);
});

test('compare months: per category with the biggest change first', () => {
  const r = compareMonths([e(10000, at(2026, 8, 5)), e(3000, at(2026, 8, 6), 'cat_transport'), e(4000, at(2026, 9, 5)), e(9000, at(2026, 9, 6), 'cat_transport')], { y: 2026, m: 8 }, { y: 2026, m: 9 });
  expect(r.totalA).toBe(13000);
  expect(r.totalB).toBe(13000);
  expect(r.rows.map((x) => Math.abs(x.diff))).toEqual([6000, 6000]);
  expect(r.rows.find((x) => x.category_id === 'cat_food')).toMatchObject({ a: 10000, b: 4000, diff: -6000 });
});

test('budget autopilot: median of last 3 full months, rounded up to ₹500, needs 2 months, skips rent and income', () => {
  const now = at(2026, 9, 20);
  const s = suggestBudgets([
    e(800000, at(2026, 6, 10)), e(1000000, at(2026, 7, 10)), e(1200000, at(2026, 8, 10)), // food: Jul 8k, Aug 10k, Sep 12k -> 10k
    e(320000, at(2026, 8, 10), 'cat_transport'), e(410000, at(2026, 7, 10), 'cat_transport'), // 0, 4.1k, 3.2k -> median 3.2k -> 3.5k
    e(5000000, at(2026, 8, 1), 'cat_rent'), e(5000000, at(2026, 7, 1), 'cat_rent'),
    e(90000, at(2026, 8, 3), 'cat_gifts_once'),
    e(999999, at(2026, 9, 10)), // current month ignored
  ], now);
  expect(s.find((x) => x.category_id === 'cat_food')!.suggested).toBe(1000000);
  expect(s.find((x) => x.category_id === 'cat_transport')!.suggested).toBe(350000);
  expect(s.find((x) => x.category_id === 'cat_rent')).toBeUndefined();
  expect(s.find((x) => x.category_id === 'cat_gifts_once')).toBeUndefined();
});
