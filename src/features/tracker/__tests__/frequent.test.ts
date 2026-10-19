import { createTestDb } from '@/db/testDb';
import { seedDefaults, addTransaction } from '../repo';
import { loadFrequent } from '../frequent';
import { DAY } from '@/lib/date';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
const NOW = new Date(2026, 9, 19, 15).getTime();

test('finds repeated merchants with their usual amount, most frequent first', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const add = (m: string, amount: number, d: number, cat = 'cat_food') => addTransaction(db, { type: 'expense', amount, merchant: m, category_id: cat, occurred_at: NOW - d * DAY });
  for (const [a, d] of [[18000, 1], [20000, 3], [30000, 5]]) await add('Swiggy', a, d);
  await add('Chai Point', 6000, 2); await add('chai point', 8000, 4);
  await add('One-off cafe', 50000, 6);
  await add('Old place', 9000, 120); await add('Old place', 9000, 121);
  const f = await loadFrequent(db, NOW);
  expect(f.map((x) => x.merchant)).toEqual(['Swiggy', 'Chai Point']);
  expect(f[0]).toMatchObject({ amount: 20000, count: 3, categoryId: 'cat_food' });
  expect(f[1].amount).toBe(7000);
});
test('empty data gives an empty list; income and blank merchants are ignored', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  expect(await loadFrequent(db, NOW)).toEqual([]);
  await addTransaction(db, { type: 'income', amount: 100, merchant: 'Acme', occurred_at: NOW - DAY });
  await addTransaction(db, { type: 'income', amount: 100, merchant: 'Acme', occurred_at: NOW - 2 * DAY });
  await addTransaction(db, { type: 'expense', amount: 100, merchant: '   ', occurred_at: NOW - DAY });
  expect(await loadFrequent(db, NOW)).toEqual([]);
});
