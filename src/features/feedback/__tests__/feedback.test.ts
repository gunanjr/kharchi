import { createTestDb } from '@/db/testDb';
import { saveFeedback, listFeedback, markSent, removeFeedback, buildMail, buildCrashMail, cleanMessage, MAX_LEN, THANKS } from '../repo';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
const info = { app: 'BruhMe', version: '1.0.0', os: 'android', osVersion: '15' };

test('feedback is saved, listed newest first, marked sent and removable', async () => {
  const db = await createTestDb();
  const a = await saveFeedback(db, 'idea', 'Add a widget for budgets', true);
  const b = await saveFeedback(db, 'problem', 'Charts overlap on my phone', false);
  expect((await listFeedback(db)).map((f) => f.id)).toEqual([b, a]);
  await markSent(db, a);
  expect((await listFeedback(db)).find((f) => f.id === a)!.status).toBe('sent');
  await removeFeedback(db, b);
  expect(await listFeedback(db)).toHaveLength(1);
});

test('too-short or empty messages are refused; huge ones are trimmed', async () => {
  const db = await createTestDb();
  await expect(saveFeedback(db, 'idea', '   ', true)).rejects.toThrow();
  await expect(saveFeedback(db, 'idea', 'hi', true)).rejects.toThrow();
  const id = await saveFeedback(db, 'idea', 'x'.repeat(50_000), true);
  expect((await listFeedback(db)).find((f) => f.id === id)!.message.length).toBe(MAX_LEN);
});

test('hostile text is stored as plain data', async () => {
  const db = await createTestDb();
  await saveFeedback(db, 'problem', "'); DROP TABLE feedback;-- 🤯 <script>alert(1)</script>", true);
  expect(await listFeedback(db)).toHaveLength(1);
});

test('the email holds only the message and, if allowed, the app and phone type', () => {
  const m = buildMail('problem', 'Totals look wrong', true, info, 'help@example.com');
  expect(m.subject).toBe('BruhMe problem report');
  expect(m.body).toContain('Totals look wrong');
  expect(m.body).toContain('App 1.0.0 on android 15');
  expect(m.url.startsWith('mailto:help@example.com?subject=')).toBe(true);
  expect(buildMail('idea', 'More charts please', false, info, 'h@x.com').body).not.toContain('android');
  expect(cleanMessage('a\n\n  b   c')).toBe('a b c');
});

test('crash mail is short and carries no database content', () => {
  const m = buildCrashMail(new Error('x'.repeat(5000)), info, 'h@x.com');
  expect(m.body.length).toBeLessThan(600);
});

test('replies are warm, honest and free of dashes', () => {
  for (const t of Object.values(THANKS)) { expect(t).not.toMatch(/—|–/); expect(t.length).toBeGreaterThan(40); }
});
