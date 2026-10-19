import { createTestDb } from '@/db/testDb';
import { seedDefaults, addTransaction, setBudget } from '../repo';
import { addRecurring } from '../recurring';
import { loadPulse } from '../pulse';
import { DAY, startOfDay } from '@/lib/date';
import type { Db } from '@/db/types';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

let db: Db;
beforeEach(async () => { db = await createTestDb(); await seedDefaults(db); });

const NOW = new Date(2026, 9, 19, 15, 0).getTime(); // 19 Oct 2026

test('week buckets expenses per day, oldest first, today last', async () => {
  await addTransaction(db, { type: 'expense', amount: 10000, currency: 'INR', occurred_at: NOW, merchant: 'A' } as any);
  await addTransaction(db, { type: 'expense', amount: 5000, currency: 'INR', occurred_at: NOW - 2 * DAY, merchant: 'B' } as any);
  await addTransaction(db, { type: 'income', amount: 99999, currency: 'INR', occurred_at: NOW, merchant: 'C' } as any);
  const p = await loadPulse(db, NOW);
  expect(p.week).toHaveLength(7);
  expect(p.week[6].day).toBe(startOfDay(NOW));
  expect(p.week[6].total).toBe(10000);
  expect(p.week[4].total).toBe(5000);
  expect(p.weekTotal).toBe(15000);
});

test('safe per day divides the remaining overall budget over the days left', async () => {
  await setBudget(db, null, 3_100_000); // 31,000 for October
  await addTransaction(db, { type: 'expense', amount: 1_300_000, currency: 'INR', occurred_at: NOW, merchant: 'A' } as any);
  const p = await loadPulse(db, NOW);
  expect(p.daysLeft).toBe(13); // 19th..31st inclusive
  expect(p.safePerDay).toBe(Math.floor(1_800_000 / 13));
  expect(p.overBudget).toBe(false);
});

test('no overall budget means no safe figure; overspending clamps to zero and flags it', async () => {
  expect((await loadPulse(db, NOW)).safePerDay).toBeNull();
  await setBudget(db, null, 100_000);
  await addTransaction(db, { type: 'expense', amount: 200_000, currency: 'INR', occurred_at: NOW, merchant: 'A' } as any);
  const p = await loadPulse(db, NOW);
  expect(p.safePerDay).toBe(0);
  expect(p.overBudget).toBe(true);
});

test('upcoming lists recurring items due within ten days', async () => {
  await addRecurring(db, { type: 'expense', amount: 19900, merchant: 'Netflix' } as any, 'monthly', NOW + 3 * DAY);
  const p = await loadPulse(db, NOW);
  expect(p.upcoming.map((u) => u.name)).toContain('Netflix');
});
