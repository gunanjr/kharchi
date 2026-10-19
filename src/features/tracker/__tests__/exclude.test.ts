import { createTestDb } from '@/db/testDb';
import { seedDefaults, addTransaction, listTransactions, totalsBetween, spendByCategory, accountBalance, addAccount, setBudget , listCategories } from '../repo';
import { setExcluded } from '../exclude';
import { loadPulse } from '../pulse';
import { loadFrequent } from '../frequent';
import { loadReview } from '@/features/insights/review';
import { loadInsights } from '@/features/insights/load';
import { LocalRulesProvider } from '@/features/ai/local';
import { toCsv, importCsv } from '../csv';
import { exportBackup, restoreBackup, wipeAll } from '@/db/backup';
import { startOfMonth, DAY } from '@/lib/date';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
const NOW = new Date(2026, 9, 19, 15).getTime();

async function setup() {
  const db = await createTestDb(); await seedDefaults(db);
  const acct = await addAccount(db, { name: 'Bank', type: 'bank', opening_balance: 100000 });
  await addTransaction(db, { type: 'expense', amount: 10000, merchant: 'Cafe', category_id: 'cat_food', account_id: acct, occurred_at: NOW - DAY });
  const big = await addTransaction(db, { type: 'expense', amount: 90000, merchant: 'Laptop for work', category_id: 'cat_shopping', account_id: acct, occurred_at: NOW - 2 * DAY });
  await addTransaction(db, { type: 'expense', amount: 10000, merchant: 'Cafe', category_id: 'cat_food', account_id: acct, occurred_at: NOW - 3 * DAY });
  return { db, acct, big };
}

test('a left-out entry disappears from totals, categories, lists and weekly bars but not from the account balance', async () => {
  const { db, acct, big } = await setup();
  const from = startOfMonth(NOW), to = NOW + 1;
  expect((await totalsBetween(db, from, to)).expense).toBe(110000);
  await setExcluded(db, big, true);
  expect((await totalsBetween(db, from, to)).expense).toBe(20000);
  expect((await spendByCategory(db, from, to)).find((c) => c.category_id === 'cat_shopping')).toBeUndefined();
  expect(await listTransactions(db)).toHaveLength(2);
  expect(await listTransactions(db, { includeExcluded: true })).toHaveLength(3);
  expect((await listTransactions(db, { onlyExcluded: true })).map((t) => t.id)).toEqual([big]);
  expect((await loadPulse(db, NOW)).weekTotal).toBe(20000);
  expect(await accountBalance(db, acct)).toBe(100000 - 110000); // the money did leave the account
});

test('putting it back restores everything', async () => {
  const { db, big } = await setup();
  await setExcluded(db, big, true);
  await setExcluded(db, big, false);
  expect((await totalsBetween(db, startOfMonth(NOW), NOW + 1)).expense).toBe(110000);
});

test('budgets, insights, review, assistant and frequent all ignore it', async () => {
  const { db, big } = await setup();
  await setExcluded(db, big, true);
  expect((await loadInsights(db, NOW)).expense).toBe(20000);
  expect((await loadReview(db, startOfMonth(NOW), NOW)).expense).toBe(20000);
  const a = await new LocalRulesProvider().answer('How much did I spend this month?', { db, now: NOW });
  expect(a.text).toContain('₹200');
  expect(a.text).not.toContain('1,100');
  expect((await loadFrequent(db, NOW)).map((f) => f.merchant)).toEqual(['Cafe']);
  await setBudget(db, 'cat_shopping', 50000);
});

test('csv round-trips the flag, and backup keeps it', async () => {
  const { db, big } = await setup();
  await setExcluded(db, big, true);
  const csv = toCsv(await listTransactions(db, { includeExcluded: true }), await listCategories(db), {});
  const rows = importCsv(csv).rows;
  expect(rows.filter((r) => r.excluded)).toHaveLength(1);
  const file = await exportBackup(db);
  await wipeAll(db);
  await restoreBackup(db, JSON.parse(JSON.stringify(file)));
  expect(await listTransactions(db, { onlyExcluded: true })).toHaveLength(1);
});
