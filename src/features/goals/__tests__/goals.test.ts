import { createTestDb } from '@/db/testDb';
import { addGoal, contribute, listEntries, listGoals, progressOf, removeGoal } from '../repo';
import { exportBackup, restoreBackup, wipeAll } from '@/db/backup';
import { DAY } from '@/lib/date';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const NOW = new Date(2026, 9, 19).getTime();

test('a goal tracks contributions and completes at the target', async () => {
  const db = await createTestDb();
  const id = await addGoal(db, { name: 'Goa trip', target: 5000000 });
  await contribute(db, id, 2000000, 'first', NOW);
  let [p] = await listGoals(db, NOW);
  expect(p.saved).toBe(2000000);
  expect(p.pct).toBe(40);
  expect(p.done).toBe(false);
  await contribute(db, id, 3500000, null, NOW);
  [p] = await listGoals(db, NOW);
  expect(p.done).toBe(true);
  expect(p.pct).toBe(100);
  expect(p.remaining).toBe(0);
  expect(p.goal.achieved_at).not.toBeNull();
});

test('withdrawals reduce the total, cannot go below zero, and reopen a finished goal', async () => {
  const db = await createTestDb();
  const id = await addGoal(db, { name: 'Laptop', target: 100000 });
  await contribute(db, id, 100000, null, NOW);
  await contribute(db, id, -30000, 'bought a case', NOW);
  const [p] = await listGoals(db, NOW);
  expect(p.saved).toBe(70000);
  expect(p.goal.achieved_at).toBeNull();
  await expect(contribute(db, id, -80000)).rejects.toThrow();
  expect((await listEntries(db, id)).length).toBe(2);
});

test('per-month suggestion splits what is left over the months to the deadline', () => {
  const goal = { id: 'g', name: 'x', icon: 'target', color: '#000', target: 1200000, deadline: NOW + 90 * DAY, achieved_at: null };
  const p = progressOf(goal, 300000, NOW);
  expect(p.daysLeft).toBe(90);
  expect(p.perMonth).toBe(300000); // 900000 left over 3 months
  expect(progressOf({ ...goal, deadline: null }, 0, NOW).perMonth).toBeNull();
  expect(progressOf(goal, 1200000, NOW).perMonth).toBeNull();
});

test('validation, soft delete, and backup round-trip', async () => {
  const db = await createTestDb();
  await expect(addGoal(db, { name: ' ', target: 100 })).rejects.toThrow();
  await expect(addGoal(db, { name: 'x', target: 12.5 })).rejects.toThrow();
  const id = await addGoal(db, { name: 'Keep', target: 100000 });
  await contribute(db, id, 5000, null, NOW);
  const file = await exportBackup(db);
  await wipeAll(db);
  expect(await listGoals(db, NOW)).toHaveLength(0);
  await restoreBackup(db, file);
  expect((await listGoals(db, NOW))[0].saved).toBe(5000);
  await removeGoal(db, id);
  expect(await listGoals(db, NOW)).toHaveLength(0);
});

