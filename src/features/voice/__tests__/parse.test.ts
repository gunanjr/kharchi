import { parseVoice } from '../parse';
import { DAY, startOfDay } from '@/lib/date';

const NOW = new Date(2026, 9, 19, 15).getTime();
const one = (s: string) => { const r = parseVoice(s, NOW); expect(r).toHaveLength(1); return r[0]; };

test('simple expenses', () => {
  const a = one('Spent 180 rupees on lunch');
  expect(a).toMatchObject({ type: 'expense', amount: 18000, description: 'Lunch', categoryKey: 'food', paymentMethod: null, directionCertain: true });
  expect(one('Paid 250 for petrol')).toMatchObject({ amount: 25000, description: 'Petrol', categoryKey: 'transport' });
  expect(one('Paid 500 for electricity')).toMatchObject({ amount: 50000, categoryKey: 'bills' });
});
test('income', () => {
  expect(one('Received 2000 from freelance work')).toMatchObject({ type: 'income', amount: 200000, categoryKey: 'freelance' });
  expect(one('Got my salary 85000')).toMatchObject({ type: 'income', amount: 8500000, categoryKey: 'salary' });
});
test('dates', () => {
  expect(one('Spent 120 on groceries yesterday').occurredAt).toBe(startOfDay(NOW) - DAY + 12 * 3600_000);
  expect(one('spent 90 on chai 3 days ago')).toMatchObject({ amount: 9000 });
  expect(one('spent 90 on chai 3 days ago').occurredAt).toBe(startOfDay(NOW) - 3 * DAY + 12 * 3600_000);
  expect(one('Spent 50 on tea').occurredAt).toBe(NOW);
});
test('amount forms', () => {
  expect(one('paid ₹1,250 for rent').amount).toBe(125000);
  expect(one('spent 2k on shopping').amount).toBe(200000);
  expect(one('spent 1.5 thousand on books').amount).toBe(150000);
  expect(one('paid rs 75.50 for parking').amount).toBe(7550);
});
test('time words are not amounts', () => {
  expect(one('spent 40 on lunch 2 days ago').amount).toBe(4000);
  expect(one('spent 40 on lunch at 5 pm').amount).toBe(4000);
});
test('several amounts become separate drafts', () => {
  const r = parseVoice('Spent 180 on lunch and 60 on tea', NOW);
  expect(r.map((d) => d.amount)).toEqual([18000, 6000]);
  expect(r.map((d) => d.description)).toEqual(['Lunch', 'Tea']);
});
test('a clause without an amount stays attached', () => {
  const r = parseVoice('spent 300 on pizza and drinks', NOW);
  expect(r).toHaveLength(1);
  expect(r[0].amount).toBe(30000);
});
test('payment method', () => {
  expect(one('paid 300 for dinner by cash').paymentMethod).toBe('cash');
  expect(one('paid 300 for dinner on credit card').paymentMethod).toBe('card');
  expect(one('paid 300 for dinner via gpay').paymentMethod).toBe('upi');
});
test('missing or unclear amounts are never invented', () => {
  expect(one('spent money on lunch').amount).toBeNull();
  expect(parseVoice('', NOW)).toEqual([]);
  expect(parseVoice('   ', NOW)).toEqual([]);
  const d = one('coffee 120');
  expect(d.amount).toBe(12000);
  expect(d.directionCertain).toBe(false);
});
