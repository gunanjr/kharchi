import * as A from '../analytics';
import { DAY } from '@/lib/date';

const t0 = new Date(2026, 9, 18, 12).getTime();
const tx = (o: Partial<Parameters<typeof A.byCategory>[0][0]> & { amount: number; at: number }) => ({ type: 'expense' as const, category_id: 'cat_food', merchant: null, note: null, occurred_at: o.at, ...o });

test('category + merchants', () => {
  const l = [tx({ amount: 100, at: t0, merchant: 'Swiggy' }), tx({ amount: 300, at: t0, merchant: 'swiggy@ybl' }), tx({ amount: 50, at: t0, category_id: 'cat_bills', merchant: 'Airtel' })];
  expect(A.byCategory(l)[0]).toEqual({ category_id: 'cat_food', total: 400 });
  expect(A.topMerchants(l)[0]).toMatchObject({ total: 400, count: 2 });
});
test('trend months', () => {
  const l = [tx({ amount: 10, at: t0 }), tx({ amount: 20, at: t0 - 40 * DAY })];
  const tr = A.monthlyTrend(l, t0, 3);
  expect(tr).toHaveLength(3);
  expect(tr[2].expense).toBe(10);
});
test('forecast', () => {
  const f = A.forecastMonth([tx({ amount: 1800, at: new Date(2026, 9, 5).getTime() })], t0);
  expect(f.day).toBe(18);
  expect(f.projectedTotal).toBe(Math.round((1800 / 18) * 31));
  expect(f.actual).toHaveLength(18);
  expect(f.projected).toHaveLength(13);
});
test('subscriptions: monthly steady amount detected; erratic ones not', () => {
  const nf = [0, 1, 2, 3].map((i) => tx({ amount: 19900, at: t0 - i * 30 * DAY, merchant: 'Netflix', category_id: 'cat_subscriptions' }));
  const noisy = [0, 1, 2, 3].map((i) => tx({ amount: 1000 + i * 900, at: t0 - i * 30 * DAY, merchant: 'Cafe' }));
  const s = A.detectSubscriptions([...nf, ...noisy]);
  expect(s).toHaveLength(1);
  expect(s[0]).toMatchObject({ name: 'Netflix', everyDays: 30, yearly: Math.round(19900 * (365 / 30)) });
});
test('anomalies', () => {
  const base = [100, 120, 90, 110, 105, 95].map((a, i) => tx({ amount: a, at: t0 - (20 - i) * DAY }));
  const big = tx({ amount: 5000, at: t0 });
  const a = A.detectAnomalies([...base, big], t0 - DAY);
  expect(a).toHaveLength(1);
  expect(a[0].tx.amount).toBe(5000);
  expect(A.detectAnomalies([...base, tx({ amount: 130, at: t0 })], t0 - DAY)).toHaveLength(0);
});
test('tips', () => {
  const tips = A.savingsTips({ byCat: [{ category_id: 'a', total: 200000 }], prevByCat: [{ category_id: 'a', total: 100000 }], subs: [], income: 100000, expense: 90000, names: () => 'Food' });
  expect(tips.join(' ')).toMatch(/Food is up 100%/);
  expect(tips.join(' ')).toMatch(/savings rate/);
});
