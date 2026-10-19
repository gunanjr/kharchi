import { createTestDb } from '@/db/testDb';
import { addGroupExpense, addPerson, createGroup, ensureSelf, getExpense } from '../repo';
import { computeShares } from '../split';
import { prefillSplit } from '../editPrefill';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

async function setup() {
  const db = await createTestDb();
  const me = (await ensureSelf(db)).id;
  const a = await addPerson(db, { name: 'A' });
  const g = await createGroup(db, { name: 'G', memberIds: [a] });
  return { db, me, a, g };
}

test('exact splits reopen with each person’s amount in rupees', async () => {
  const { db, me, a, g } = await setup();
  const id = await addGroupExpense(db, { groupId: g, description: 'x', amount: 10000, payers: { [me]: 10000 }, split: { type: 'exact', amounts: { [me]: 6050, [a]: 3950 } } });
  const p = prefillSplit((await getExpense(db, id))!);
  expect(p.type).toBe('exact');
  expect(p.vals).toEqual({ [me]: '60.5', [a]: '39.5' });
});

test('percent and shares reopen with what was typed', async () => {
  const { db, me, a, g } = await setup();
  const pct = await addGroupExpense(db, { groupId: g, description: 'p', amount: 10000, payers: { [me]: 10000 }, split: { type: 'percent', percents: { [me]: 70, [a]: 30 } } });
  expect(prefillSplit((await getExpense(db, pct))!)).toEqual({ type: 'percent', vals: { [me]: '70', [a]: '30' } });
  const sh = await addGroupExpense(db, { groupId: g, description: 's', amount: 9000, payers: { [me]: 9000 }, split: { type: 'shares', shares: { [me]: 1, [a]: 2 } } });
  expect(prefillSplit((await getExpense(db, sh))!)).toEqual({ type: 'shares', vals: { [me]: '1', [a]: '2' } });
});

test('adjustment and itemised open as exact amounts that re-save to the same shares', async () => {
  const { db, me, a, g } = await setup();
  const id = await addGroupExpense(db, { groupId: g, description: 'adj', amount: 28000, payers: { [me]: 28000 }, split: { type: 'adjustment', participants: [me, a], adjustments: { [a]: 2000 } } });
  const e = (await getExpense(db, id))!;
  const p = prefillSplit(e);
  expect(p.type).toBe('exact');
  const again = computeShares(e.amount, { type: 'exact', amounts: Object.fromEntries(Object.entries(p.vals).map(([k, v]) => [k, Math.round(Number(v) * 100)])) });
  expect(again).toEqual(e.shares);
});

test('equal needs nothing prefilled', async () => {
  const { db, me, a, g } = await setup();
  const id = await addGroupExpense(db, { groupId: g, description: 'e', amount: 5000, payers: { [me]: 5000 }, split: { type: 'equal', participants: [me, a] } });
  expect(prefillSplit((await getExpense(db, id))!)).toEqual({ type: 'equal', vals: {} });
});
