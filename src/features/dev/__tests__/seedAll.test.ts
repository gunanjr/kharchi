import { createTestDb } from '@/db/testDb';
import { seedDefaults, listTransactions, listAccounts, listBudgets } from '@/features/tracker/repo';
import { seedEverything } from '../seedAll';
import { listGroups, groupSummary, listExpenses, listComments, listPeople } from '@/features/groups/repo';
import { listGoals } from '@/features/goals/repo';
import { listPending } from '@/features/pending/service';
import { loadPulse } from '@/features/tracker/pulse';
import { readTags } from '@/features/tracker/tags';
import { loadHealth } from '@/features/insights/healthLoad';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

test('the complete demo fills every part of the app and stays consistent', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const now = new Date(2026, 9, 19, 15).getTime();
  await seedEverything(db, now);

  const tx = await listTransactions(db);
  expect(tx.length).toBeGreaterThan(100);
  expect(tx.some((t) => readTags(t.tags).length > 0)).toBe(true);
  expect(tx.some((t) => t.note)).toBe(true);
  expect(tx.some((t) => t.type === 'transfer')).toBe(true);
  expect((await listAccounts(db)).length).toBe(6);
  expect((await listBudgets(db)).length).toBeGreaterThanOrEqual(7);

  const goals = await listGoals(db, now);
  expect(goals).toHaveLength(4);
  expect(goals.filter((g) => g.done)).toHaveLength(1);
  expect(goals.some((g) => g.pct > 0 && g.pct < 100)).toBe(true);

  const groups = await listGroups(db);
  expect(groups.length).toBe(3);
  const types = new Set<string>();
  for (const g of groups) {
    const s = (await groupSummary(db, g.id))!;
    expect(Object.values(s.balances).reduce((a, b) => a + b, 0)).toBe(0);
    for (const e of await listExpenses(db, g.id)) types.add(e.split_type);
  }
  for (const t of ['equal', 'exact', 'percent', 'shares', 'adjustment', 'itemized']) expect(types).toContain(t);
  const exp = (await listExpenses(db, groups.find((g) => g.name === 'Office lunch club')!.id))[0];
  expect(exp).toBeTruthy();
  const withComments = (await Promise.all((await listExpenses(db, null)).concat(await listExpenses(db, groups[0].id)).map((e) => listComments(db, e.id)))).flat();
  expect(withComments.length).toBeGreaterThan(0);
  expect((await listPeople(db)).length).toBeGreaterThanOrEqual(6);

  expect((await listPending(db)).length).toBeGreaterThan(0);
  const pulse = await loadPulse(db, now);
  expect(pulse.upcoming.length).toBeGreaterThanOrEqual(4);
  expect(pulse.safePerDay).not.toBeNull();
});

test('the health score loads from the demo data', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const now = new Date(2026, 9, 19, 15).getTime();
  await seedEverything(db, now);
  const h = await loadHealth(db, now);
  expect(h.score).toBeGreaterThan(0);
  expect(h.score).toBeLessThanOrEqual(100);
  expect(h.parts).toHaveLength(4);
});
