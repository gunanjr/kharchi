import { createTestDb } from '@/db/testDb';
import { seedDefaults, listTransactions } from '@/features/tracker/repo';
import { ingestSharedText } from '@/features/native/share';
import { confirmPending, skipPending } from '@/features/pending/service';
import { suggestCategory, learnMerchant } from '@/features/parser/merchants';
import { parseVoice } from '@/features/voice/parse';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
jest.mock('@/features/native/module', () => ({ native: null }));

const MSG = 'Rs.450.00 debited from a/c **1234 on 18-10-26 to VPA swiggy@ybl (UPI Ref No 629415370122). If not you, call 18002586161';

async function setup() { const db = await createTestDb(); await seedDefaults(db); return db; }

test('a shared message becomes one pending item; sharing it again is a duplicate', async () => {
  const db = await setup();
  const a = await ingestSharedText(db, MSG);
  expect(a.status).toBe('created');
  expect((await ingestSharedText(db, MSG)).status).toBe('duplicate');
});

test('unsupported text is rejected without creating anything', async () => {
  const db = await setup();
  expect((await ingestSharedText(db, 'Hey, are we still on for dinner tonight?')).status).toBe('rejected');
  expect((await ingestSharedText(db, 'Your OTP is 482913. Do not share it.')).status).toBe('rejected');
  expect(await listTransactions(db)).toHaveLength(0);
});

test('confirming with corrections saves the corrected amount and merchant, and learns the merchant', async () => {
  const db = await setup();
  const r = await ingestSharedText(db, MSG);
  if (r.status !== 'created') throw new Error('expected created');
  await confirmPending(db, r.pendingId, { categoryId: 'cat_groceries', amount: 47500, merchant: 'Instamart' });
  const [tx] = await listTransactions(db);
  expect(tx.amount).toBe(47500);
  expect(tx.merchant).toBe('Instamart');
  expect(tx.category_id).toBe('cat_groceries');
  expect((await suggestCategory(db, 'Instamart')).source).toBe('learned');
  await expect(confirmPending(db, r.pendingId, { categoryId: null })).rejects.toThrow(); // no double save
});

test('discarding saves nothing', async () => {
  const db = await setup();
  const r = await ingestSharedText(db, MSG);
  if (r.status !== 'created') throw new Error('expected created');
  await skipPending(db, r.pendingId);
  expect(await listTransactions(db)).toHaveLength(0);
});

test('a learned category beats the keyword guess for a voice description', async () => {
  const db = await setup();
  expect((await suggestCategory(db, 'lunch')).source).toBe('keyword');
  await learnMerchant(db, 'lunch', 'cat_groceries');
  const s = await suggestCategory(db, 'lunch');
  expect(s).toMatchObject({ categoryId: 'cat_groceries', source: 'learned' });
  expect(parseVoice('spent 90 on lunch')[0].description).toBe('Lunch');
});
