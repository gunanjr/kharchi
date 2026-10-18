import { createTestDb } from '@/db/testDb';
import { seedDefaults, listTransactions } from '@/features/tracker/repo';
import { confirmPending, ingest, listPending, markNotMine, skipPending } from '../service';
import { setAlwaysCategorize, suggestCategory, merchantKey } from '@/features/parser/merchants';
import { parseNotification } from '@/features/parser/notification';
import { fingerprint, isDuplicate } from '@/features/parser/dedupe';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const T = new Date(2026, 9, 18, 14, 0).getTime();
const SMS = 'Rs.450.00 debited from a/c **1234 on 18-10-26 to VPA swiggy@ybl (UPI Ref No 629415370122). If not you, call 18002586161';
async function setup() {
  const db = await createTestDb();
  await seedDefaults(db);
  return db;
}

test('end-to-end: ingest -> pending -> confirm -> transaction', async () => {
  const db = await setup();
  const r = await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', receivedAt: T });
  expect(r.status).toBe('created');
  const pend = await listPending(db);
  expect(pend).toHaveLength(1);
  expect(pend[0]).toMatchObject({ amount: 45000, merchant: 'Swiggy', suggested_category_id: 'cat_food' });
  // raw body is never stored
  expect(JSON.stringify(pend[0])).not.toContain('If not you');
  const c = await confirmPending(db, pend[0].id, { categoryId: 'cat_food', note: 'lunch' });
  expect(c.txId).toBeTruthy();
  const txs = await listTransactions(db);
  expect(txs[0]).toMatchObject({ type: 'expense', amount: 45000, category_id: 'cat_food', note: 'lunch', source: 'sms', merchant: 'Swiggy' });
  expect(await listPending(db)).toHaveLength(0);
  await expect(confirmPending(db, pend[0].id, { categoryId: null })).rejects.toThrow();
});

test('retried SMS is deduped, even after saving', async () => {
  const db = await setup();
  await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', receivedAt: T });
  expect((await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', receivedAt: T })).status).toBe('duplicate');
  const [p] = await listPending(db);
  await confirmPending(db, p.id, { categoryId: 'cat_food' });
  expect((await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', receivedAt: T })).status).toBe('duplicate');
});

test('SMS + GPay notification for the same payment become ONE entry', async () => {
  const db = await setup();
  const noRef = 'Rs.450.00 debited from a/c **1234 on 18-10-26 14:02 to VPA swiggy@ybl';
  await ingest(db, { origin: 'sms', body: noRef, sender: 'AX-HDFCBK', receivedAt: T });
  const n = await ingest(db, { origin: 'notification', pkg: 'com.google.android.apps.nbu.paisa.user', title: 'Paid ₹450 to Swiggy', body: 'Payment successful', receivedAt: T + 60_000 });
  expect(n.status).toBe('duplicate');
  expect(await listPending(db)).toHaveLength(1);
});

test('different payment of same amount outside window is not a duplicate', async () => {
  const db = await setup();
  await ingest(db, { origin: 'sms', body: SMS.replace('(UPI Ref No 629415370122)', ''), sender: 'AX-HDFCBK', receivedAt: T });
  const later = SMS.replace('18-10-26', '18-10-26 20:00').replace('(UPI Ref No 629415370122)', '');
  expect((await ingest(db, { origin: 'sms', body: later, sender: 'AX-HDFCBK', receivedAt: T })).status).toBe('created');
});

test('non-financial / OTP / unknown sender are rejected and nothing is stored', async () => {
  const db = await setup();
  expect((await ingest(db, { origin: 'sms', body: '482915 is your OTP for login. Do not share.', sender: 'AX-HDFCBK' })).status).toBe('rejected');
  expect((await ingest(db, { origin: 'sms', body: SMS, sender: '+919876543210' })).status).toBe('rejected');
  expect((await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', allowlist: ['SBI'] })).status).toBe('rejected');
  expect(await listPending(db)).toHaveLength(0);
});

test('not-mine and skip remove the card; not-mine stays deduped', async () => {
  const db = await setup();
  await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', receivedAt: T });
  const [p] = await listPending(db);
  await markNotMine(db, p.id);
  expect(await listPending(db)).toHaveLength(0);
  expect((await ingest(db, { origin: 'sms', body: SMS, sender: 'AX-HDFCBK', receivedAt: T })).status).toBe('duplicate');
  await skipPending(db, p.id);
});

test('merchant learning: offer "always" after 2 consistent confirmations', async () => {
  const db = await setup();
  const mk = async (n: number, cat: string) => {
    const body = `Rs.${100 + n}.00 debited from a/c **1234 on 18-10-26 to VPA zomato@ybl (UPI Ref No 62941537${1000 + n})`;
    await ingest(db, { origin: 'sms', body, sender: 'AX-HDFCBK', receivedAt: T + n * 3_600_000 });
    const [p] = await listPending(db);
    return confirmPending(db, p.id, { categoryId: cat });
  };
  expect((await mk(1, 'cat_shopping')).offerAlways).toBeNull();
  const second = await mk(2, 'cat_shopping');
  expect(second.offerAlways).toEqual({ merchant: 'Zomato', categoryId: 'cat_shopping' });
  expect((await suggestCategory(db, 'ZOMATO')).source).toBe('learned');
  await setAlwaysCategorize(db, 'Zomato', 'cat_shopping');
  expect(await suggestCategory(db, 'Zomato Online')).toMatchObject({ categoryId: 'cat_shopping', source: 'auto-rule' });
  // changing the mind resets the streak
  expect((await mk(3, 'cat_food')).offerAlways).toBeNull();
});

test('merchantKey normalisation', () => {
  expect(merchantKey('swiggy@ybl')).toBe('swiggy');
  expect(merchantKey('UPI-Amazon Pay India Pvt Ltd')).toBe('amazon pay');
  expect(merchantKey(null)).toBe('');
});

test('keyword fallback suggestions', async () => {
  const db = await setup();
  expect((await suggestCategory(db, 'Uber India')).categoryId).toBe('cat_transport');
  expect((await suggestCategory(db, 'Blah Corp')).source).toBe('none');
});

test('notifications: tracked packages only', () => {
  expect(parseNotification({ pkg: 'com.whatsapp', title: 'Paid ₹450 to X', text: '' }).ok).toBe(false);
  const r = parseNotification({ pkg: 'com.phonepe.app', title: 'Paid ₹250', text: 'to Chai Point' });
  expect(r.ok && r.tx.amount).toBe(25000);
  const c = parseNotification({ pkg: 'com.google.android.apps.nbu.paisa.user', title: 'You received ₹500', text: 'from Rahul Kumar' });
  expect(c.ok && c.tx.direction).toBe('credit');
});

test('dedupe primitives', () => {
  const a = { amount: 100, direction: 'debit' as const, accountLast4: '1234', upiRef: null, occurredAt: T };
  expect(isDuplicate(a, { ...a, accountLast4: null, occurredAt: T + 5000 })).toBe(true);
  expect(isDuplicate(a, { ...a, accountLast4: '9999' })).toBe(false);
  expect(isDuplicate({ ...a, upiRef: '1' }, { ...a, upiRef: '2' })).toBe(false);
  expect(fingerprint({ ...a, upiRef: '77' })).toBe('ref:77');
});
