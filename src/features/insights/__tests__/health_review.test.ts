import { healthScore } from '../health';
import { buildReview } from '../review';
import { DAY } from '@/lib/date';
import type { Transaction } from '@/domain/types';

const base = { income: 100000, expense: 70000, budgetPcts: [50, 90], subsMonthly: 3000, balance: 210000 };

test('a strong profile scores high and every part is capped at 25', () => {
  const h = healthScore({ income: 100000, expense: 60000, budgetPcts: [40, 80], subsMonthly: 2000, balance: 400000 });
  expect(h.score).toBe(100);
  expect(h.band).toBe('Strong');
  for (const p of h.parts) expect(p.points).toBeLessThanOrEqual(25);
});
test('weak parts drag the score and become the focus', () => {
  const h = healthScore({ income: 100000, expense: 120000, budgetPcts: [130, 160], subsMonthly: 20000, balance: 10000 });
  expect(h.score).toBeLessThan(15);
  expect(h.band).toBe('Building');
  expect(h.parts.map((p) => p.points)).toEqual([0, 0, 0, expect.any(Number)]);
});
test('score is the sum of parts and moves with savings', () => {
  const weaker = { ...base, expense: 90000, balance: 100000 };
  const a = healthScore(weaker);
  expect(a.score).toBe(a.parts.reduce((s, p) => s + p.points, 0));
  expect(healthScore({ ...weaker, expense: 85000 }).score).toBeGreaterThan(a.score);
});
test('no income or budgets does not divide by zero', () => {
  const h = healthScore({ income: 0, expense: 0, budgetPcts: [], subsMonthly: 0, balance: 0 });
  expect(Number.isFinite(h.score)).toBe(true);
  expect(h.parts.find((p) => p.key === 'budgets')!.value).toBe('None set');
});

const M = new Date(2026, 8, 1).getTime(); // 1 Sep 2026
const tx = (day: number, amount: number, extra: Partial<Transaction> = {}): Transaction =>
  ({ id: `${day}-${amount}`, type: 'expense', amount, currency: 'INR', category_id: 'cat_food', merchant: 'A', occurred_at: M + day * DAY + 12 * 3600_000, ...extra } as Transaction);

test('review totals, comparison, no-spend days and merchants', () => {
  const cur = [tx(0, 1000), tx(1, 3000, { merchant: 'B' }), tx(1, 500, { merchant: 'B' }), tx(5, 200), { ...tx(2, 9000), type: 'income' } as Transaction];
  const prev = [tx(0, 2000, { occurred_at: M - 10 * DAY })];
  const r = buildReview(cur, prev, M, M + 9 * DAY + 20 * 3600_000); // 10 days elapsed (1..10 Sep)
  expect(r.expense).toBe(4700);
  expect(r.income).toBe(9000);
  expect(r.saved).toBe(4300);
  expect(r.vsPrev).toBe(135); // 4700 vs 2000
  expect(r.biggest!.amount).toBe(3000);
  expect(r.topMerchant).toEqual({ name: 'B', total: 3500 });
  expect(r.noSpendDays).toBe(7); // days 0,1,5 had spending
  expect(r.longestNoSpendRun).toBe(4); // days 6..9
  expect(r.busiestWeekday).toBe(new Date(M + DAY).getDay());
});
test('review handles an empty month', () => {
  const r = buildReview([], [], M, M + 3 * DAY);
  expect(r.expense).toBe(0);
  expect(r.rate).toBeNull();
  expect(r.vsPrev).toBeNull();
  expect(r.biggest).toBeNull();
  expect(r.busiestWeekday).toBeNull();
});
