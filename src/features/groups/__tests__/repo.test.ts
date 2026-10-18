import { createTestDb } from '@/db/testDb';
import { seedDefaults, listTransactions, totalsBetween } from '@/features/tracker/repo';
import {
  addGroupExpense, addPerson, addSharedRecurring, createGroup, deleteGroupExpense, ensureSelf, friendBalances, groupSummary,
  listActivity, materializeSharedDue, recordSettlement, undeleteGroupExpense, updateGroupExpense, listExpenses,
} from '../repo';
import { groupSummaryText } from '../summary';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

async function setup() {
  const db = await createTestDb();
  await seedDefaults(db);
  const me = await ensureSelf(db);
  const a = await addPerson(db, { name: 'Asha' });
  const b = await addPerson(db, { name: 'Bala' });
  const g = await createGroup(db, { name: 'Goa Trip', memberIds: [a, b] });
  return { db, me: me.id, a, b, g };
}

test('expense -> balances, personal tracker mirror, activity', async () => {
  const { db, me, a, b, g } = await setup();
  const id = await addGroupExpense(db, { groupId: g, description: 'Beach dinner', amount: 300000, payers: { [me]: 300000 }, split: { type: 'equal', participants: [me, a, b] }, categoryId: 'cat_food' });
  const s = (await groupSummary(db, g))!;
  expect(s.balances).toEqual({ [me]: 200000, [a]: -100000, [b]: -100000 });
  expect(s.myBalance).toBe(200000);
  expect(s.transfers).toHaveLength(2);
  const tx = await listTransactions(db);
  expect(tx).toHaveLength(1);
  expect(tx[0]).toMatchObject({ amount: 100000, source: 'group', group_expense_id: id, category_id: 'cat_food' });
  expect((await listActivity(db, g)).map((x) => x.kind)).toEqual(expect.arrayContaining(['expense_added', 'group_created']));
});

test('edit updates mirror + audit trail; delete/undo', async () => {
  const { db, me, a, g } = await setup();
  const id = await addGroupExpense(db, { groupId: g, description: 'Cab', amount: 60000, payers: { [a]: 60000 }, split: { type: 'equal', participants: [me, a] } });
  await updateGroupExpense(db, id, { groupId: g, description: 'Cab', amount: 80000, payers: { [a]: 80000 }, split: { type: 'equal', participants: [me, a] } });
  expect((await listTransactions(db))[0].amount).toBe(40000);
  const act = await listActivity(db, g);
  expect(act.find((x) => x.kind === 'expense_edited')!.summary).toMatch(/from .*600.* to .*800/);
  await deleteGroupExpense(db, id);
  expect(await listTransactions(db)).toHaveLength(0);
  expect((await groupSummary(db, g))!.balances).toEqual({});
  await undeleteGroupExpense(db, id);
  expect(await listTransactions(db)).toHaveLength(1);
});

test('payer not participating: I paid but am not in the split => no personal expense', async () => {
  const { db, me, a, b, g } = await setup();
  await addGroupExpense(db, { groupId: g, description: 'Gift for them', amount: 1000, payers: { [me]: 1000 }, split: { type: 'equal', participants: [a, b] } });
  expect(await listTransactions(db)).toHaveLength(0);
  expect((await groupSummary(db, g))!.myBalance).toBe(1000);
});

test('settle up zeroes the debt and simplification can be toggled off', async () => {
  const { db, me, a, b, g } = await setup();
  await addGroupExpense(db, { groupId: g, description: 'x', amount: 300, payers: { [me]: 300 }, split: { type: 'equal', participants: [me, a, b] } });
  await recordSettlement(db, { groupId: g, from: a, to: me, amount: 100, method: 'upi' });
  const s = (await groupSummary(db, g))!;
  expect(s.balances[a]).toBe(0);
  expect(s.transfers).toEqual([{ from: b, to: me, amount: 100 }]);
  await expect(recordSettlement(db, { groupId: g, from: a, to: a, amount: 5 })).rejects.toThrow();
  const text = groupSummaryText(s);
  expect(text).toContain('Bala → You');
});

test('validation errors do not write anything', async () => {
  const { db, me, a, g } = await setup();
  await expect(addGroupExpense(db, { groupId: g, description: 'bad', amount: 1000, payers: { [me]: 900 }, split: { type: 'equal', participants: [me, a] } })).rejects.toThrow();
  expect(await listExpenses(db, g)).toHaveLength(0);
});

test('friend balances aggregate across groups and non-group expenses', async () => {
  const { db, me, a, b, g } = await setup();
  await addGroupExpense(db, { groupId: g, description: 'g1', amount: 200, payers: { [me]: 200 }, split: { type: 'equal', participants: [me, a] } });
  await addGroupExpense(db, { groupId: null, description: 'lunch', amount: 400, payers: { [a]: 400 }, split: { type: 'equal', participants: [me, a] } });
  const fb = await friendBalances(db);
  expect(fb.find((x) => x.person.id === a)!.net).toBe(100 - 200);
  expect(fb.find((x) => x.person.id === b)!.net).toBe(0);
});

test('multi-currency group keeps zero-sum and skips personal mirror', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const me = (await ensureSelf(db)).id;
  const a = await addPerson(db, { name: 'Asha' });
  const g = await createGroup(db, { name: 'Dubai', currency: 'AED', memberIds: [a] });
  await addGroupExpense(db, { groupId: g, description: 'Taxi', amount: 5000, currency: 'USD', rate: 3.6725, payers: { [me]: 5000 }, split: { type: 'equal', participants: [me, a] } });
  const s = (await groupSummary(db, g))!;
  expect(Object.values(s.balances).reduce((x, y) => x + y, 0)).toBe(0);
  expect(await listTransactions(db)).toHaveLength(0);
});

test('recurring shared expense catches up', async () => {
  const { db, me, a, g } = await setup();
  const start = new Date(2026, 6, 1).getTime();
  await addSharedRecurring(db, { groupId: g, description: 'Rent', amount: 1000000, payers: { [me]: 1000000 }, split: { type: 'equal', participants: [me, a] } }, 'monthly', start);
  expect(await materializeSharedDue(db, new Date(2026, 9, 5).getTime())).toBe(4);
  expect(await materializeSharedDue(db, new Date(2026, 9, 5).getTime())).toBe(0);
  const spent = await totalsBetween(db, 0, Date.now() + 1e12);
  expect(spent.expense).toBe(4 * 500000);
});
