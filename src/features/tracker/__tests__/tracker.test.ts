import { createTestDb } from '@/db/testDb';
import { exportBackup, restoreBackup, wipeAll } from '@/db/backup';
import {
  accountBalance, addAccount, addTransaction, deleteTransaction, listAccounts, listCategories, listTransactions,
  seedDefaults, setBudget, listBudgets, spendByCategory, totalsBetween, undeleteTransaction,
} from '../repo';
import { budgetProgress, crossedThreshold } from '../budgets';
import { addRecurring, materializeDue, nextDue } from '../recurring';
import { importCsv, parseCsv, toCsv } from '../csv';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

async function setup() {
  const db = await createTestDb();
  await seedDefaults(db);
  return db;
}

test('seed is idempotent', async () => {
  const db = await setup();
  await seedDefaults(db);
  expect((await listCategories(db)).length).toBe(18);
  expect((await listAccounts(db)).length).toBe(3);
});

test('rejects non-integer amounts', async () => {
  const db = await setup();
  await expect(addTransaction(db, { type: 'expense', amount: 12.5 })).rejects.toThrow();
  await expect(addTransaction(db, { type: 'expense', amount: 0 })).rejects.toThrow();
});

test('totals, categories, search, soft-delete + undo', async () => {
  const db = await setup();
  const t = new Date(2026, 9, 10).getTime();
  const a = await addTransaction(db, { type: 'expense', amount: 45000, category_id: 'cat_food', merchant: 'Swiggy', occurred_at: t });
  await addTransaction(db, { type: 'expense', amount: 12000, category_id: 'cat_food', merchant: 'Chai Point', occurred_at: t });
  await addTransaction(db, { type: 'income', amount: 5000000, category_id: 'cat_salary', occurred_at: t });
  const tot = await totalsBetween(db, t - 1000, t + 1000);
  expect(tot).toEqual({ income: 5000000, expense: 57000, net: 4943000 });
  const byCat = await spendByCategory(db, t - 1000, t + 1000);
  expect(byCat[0]).toMatchObject({ category_id: 'cat_food', total: 57000, n: 2 });
  expect((await listTransactions(db, { search: 'swig' })).length).toBe(1);
  await deleteTransaction(db, a);
  expect((await totalsBetween(db, t - 1000, t + 1000)).expense).toBe(12000);
  await undeleteTransaction(db, a);
  expect((await totalsBetween(db, t - 1000, t + 1000)).expense).toBe(57000);
});

test('account balance with transfers', async () => {
  const db = await setup();
  const [cash, upi] = await listAccounts(db);
  await addAccount(db, { name: 'HDFC', type: 'bank', opening_balance: 100000 });
  await addTransaction(db, { type: 'income', amount: 50000, account_id: cash.id });
  await addTransaction(db, { type: 'expense', amount: 20000, account_id: cash.id });
  await addTransaction(db, { type: 'transfer', amount: 10000, account_id: cash.id, to_account_id: upi.id });
  expect(await accountBalance(db, cash.id)).toBe(20000);
  expect(await accountBalance(db, upi.id)).toBe(10000);
});

test('budgets', async () => {
  const db = await setup();
  const id1 = await setBudget(db, 'cat_food', 500000);
  const id2 = await setBudget(db, 'cat_food', 600000);
  expect(id1).toBe(id2);
  const [b] = await listBudgets(db);
  expect(b.amount).toBe(600000);
  expect(budgetProgress(b, 540000, 10, 30)).toMatchObject({ pct: 90, status: 'warn', projected: 1620000 });
  expect(budgetProgress(b, 700000, 10, 30).status).toBe('over');
  expect(crossedThreshold(400000, 490000, b)).toBe('warn');
  expect(crossedThreshold(500000, 590000, b)).toBe(null);
  expect(crossedThreshold(590000, 610000, b)).toBe('over');
});

test('recurring catch-up creates each missed occurrence once', async () => {
  const db = await setup();
  const start = new Date(2026, 0, 31, 9).getTime();
  await addRecurring(db, { type: 'expense', amount: 99900, merchant: 'Netflix' }, 'monthly', start);
  const asOf = new Date(2026, 3, 15).getTime();
  expect(await materializeDue(db, asOf)).toBe(3); // Jan 31, Feb 28, Mar 28
  expect(await materializeDue(db, asOf)).toBe(0);
  expect(new Date(nextDue(new Date(2026, 0, 31).getTime(), 'monthly')).getDate()).toBe(28);
});

test('csv roundtrip + bank-statement import', async () => {
  const db = await setup();
  await addTransaction(db, { type: 'expense', amount: 129950, category_id: 'cat_shopping', merchant: 'Amazon, "Prime"', note: 'a\nb' });
  const csv = toCsv(await listTransactions(db), await listCategories(db));
  const parsed = parseCsv(csv);
  expect(parsed[1][5]).toBe('Amazon, "Prime"');
  expect(parsed[1][2]).toBe('1299.50');
  const re = importCsv(csv);
  expect(re.rows[0]).toMatchObject({ type: 'expense', amount: 129950, categoryName: 'Shopping' });
  const bank = 'Date,Narration,Debit,Credit\n18/10/2026,UPI-SWIGGY,450.00,\n19/10/2026,SALARY,,50000\nbad,x,1,';
  const r = importCsv(bank);
  expect(r.rows.map((x) => [x.type, x.amount])).toEqual([['expense', 45000], ['income', 5000000]]);
  expect(r.skipped).toBe(1);
});

test('backup / restore / wipe', async () => {
  const db = await setup();
  await addTransaction(db, { type: 'expense', amount: 100 });
  const file = await exportBackup(db);
  await wipeAll(db);
  expect((await listTransactions(db)).length).toBe(0);
  await restoreBackup(db, JSON.parse(JSON.stringify(file)));
  expect((await listTransactions(db)).length).toBe(1);
  await expect(restoreBackup(db, { app: 'x' } as any)).rejects.toThrow();
});
