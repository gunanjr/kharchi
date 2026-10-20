import { nudgeContext } from '../context';
const day = 86400000;
const e = (description: string, amount: number, payer: string, t: number) => ({ description, amount, rate: 1, currency: 'INR', occurred_at: t, payers: { [payer]: amount }, shares: { a: amount / 2, b: amount / 2 } });
test('picks the biggest things the friend owes me for and the oldest age', () => {
  const now = 100 * day;
  const r = nudgeContext([e('Tea', 100, 'a', 99 * day), e('Hotel', 9000, 'a', 90 * day), e('Cab', 600, 'a', 95 * day), e('Mine', 5000, 'b', 80 * day)], 'b', 'a', now);
  expect(r.items).toEqual(['Hotel', 'Cab']);
  expect(r.daysOwed).toBe(10);
});
test('nothing owed means no context', () => {
  expect(nudgeContext([e('Mine', 100, 'b', 1)], 'b', 'a', 5)).toEqual({ items: [], daysOwed: null });
  expect(nudgeContext([], 'b', 'a', 5)).toEqual({ items: [], daysOwed: null });
});
