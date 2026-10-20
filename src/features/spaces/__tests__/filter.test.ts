import { createTestDb } from '@/db/testDb';
import { seedDefaults, addTransaction, listTransactions, totalsBetween } from '@/features/tracker/repo';
import { useSettings } from '@/store/settings';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

test('entries go to the active space and every total follows it; exports see all', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const t = Date.now() - 1000;
  useSettings.setState({ activeSpace: '' });
  await addTransaction(db, { type: 'expense', amount: 10000, merchant: 'Chai', occurred_at: t, source: 'manual' });
  useSettings.setState({ activeSpace: 'side1' });
  await addTransaction(db, { type: 'income', amount: 500000, merchant: 'Client', occurred_at: t, source: 'manual' });
  expect((await listTransactions(db)).map((x) => x.merchant)).toEqual(['Client']);
  expect((await totalsBetween(db, 0, Date.now())).income).toBe(500000);
  useSettings.setState({ activeSpace: '' });
  expect((await listTransactions(db)).map((x) => x.merchant)).toEqual(['Chai']);
  expect((await totalsBetween(db, 0, Date.now())).income).toBe(0);
  expect((await listTransactions(db, { allSpaces: true })).length).toBe(2);
  // an explicit space wins over the active one
  await addTransaction(db, { type: 'expense', amount: 100, merchant: 'Moved', occurred_at: t, source: 'manual', space_id: 'side1' });
  expect((await listTransactions(db)).map((x) => x.merchant)).toEqual(['Chai']);
});
