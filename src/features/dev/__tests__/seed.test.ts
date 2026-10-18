import { createTestDb } from '@/db/testDb';
import { seedDefaults, listTransactions } from '@/features/tracker/repo';
import { seedDemoData } from '../seed';
import { seedGroupDemo } from '../seedGroups';
import { friendBalances, listGroups, groupSummary } from '@/features/groups/repo';
import { loadInsights } from '@/features/insights/load';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

test('demo data seeds and every group balances to zero', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const now = new Date(2026, 9, 18, 15).getTime();
  const n = await seedDemoData(db, now);
  expect(n).toBeGreaterThan(100);
  await seedGroupDemo(db, now);
  for (const g of await listGroups(db)) {
    const s = (await groupSummary(db, g.id))!;
    expect(Object.values(s.balances).reduce((a, b) => a + b, 0)).toBe(0);
  }
  expect((await friendBalances(db)).some((f) => f.net !== 0)).toBe(true);
  const ins = await loadInsights(db, now);
  expect(ins.subs.length).toBeGreaterThan(0);
  expect(ins.anomalies.length).toBeGreaterThan(0);
  expect((await listTransactions(db, { limit: 5 })).length).toBe(5);
});
