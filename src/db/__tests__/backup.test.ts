import { createTestDb } from '@/db/testDb';
import { exportBackup, inspectBackup, restoreBackup, fnv1a } from '@/db/backup';
import { seedDefaults, addTransaction, listTransactions } from '@/features/tracker/repo';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

async function withData() {
  const db = await createTestDb();
  await seedDefaults(db);
  await addTransaction(db, { type: 'expense', amount: 45000, merchant: 'Swiggy', occurred_at: Date.now() - 1000, source: 'manual' });
  await addTransaction(db, { type: 'expense', amount: 21200, merchant: 'Uber', occurred_at: Date.now() - 2000, source: 'manual' });
  return db;
}

describe('backup files', () => {
  test('a real backup round-trips into a freshly installed app', async () => {
    const a = await withData();
    const text = JSON.stringify(await exportBackup(a));
    const b = await createTestDb(); // new install: empty
    const { summary } = inspectBackup(text);
    expect(summary.entries).toBe(2);
    const r = await restoreBackup(b, text);
    expect(r.skipped).toBe(0);
    expect((await listTransactions(b)).map((t) => t.merchant).sort()).toEqual(['Swiggy', 'Uber']);
  });

  test('junk, half-written, edited, foreign and future files are refused before anything changes', async () => {
    const db = await withData();
    const good = await exportBackup(db);
    const text = JSON.stringify(good);
    const cases: [string, RegExp][] = [
      ['', /empty/],
      ['hello world', /not a BruhMe backup|cut short/],
      ['%PDF-1.7 binary', /not a BruhMe backup|cut short/],
      [text.slice(0, Math.floor(text.length / 2)), /cut short/],
      [JSON.stringify({ app: 'splitwise', version: 1, tables: {} }), /not a BruhMe backup/],
      [JSON.stringify({ ...good, version: 99 }), /newer BruhMe/],
      [JSON.stringify({ ...good, tables: { ...good.tables, transactions: [] } }), /changed or cut short/],
      [JSON.stringify({ app: 'bruhme', version: 1, tables: { 'x; DROP TABLE y': [] } }), /bad table name/],
      [JSON.stringify({ app: 'bruhme', version: 1, tables: { transactions: 5 } }), /bad table/],
      ['[]', /not a BruhMe backup/],
    ];
    for (const [bad, msg] of cases) {
      expect(() => inspectBackup(bad)).toThrow(msg);
      await expect(restoreBackup(db, bad)).rejects.toThrow();
    }
    expect((await listTransactions(db)).length).toBe(2); // untouched
  });

  test('old files without a checksum, unknown columns and broken rows are handled safely', async () => {
    const db = await withData();
    const file = await exportBackup(db);
    const tx = file.tables.transactions as Record<string, unknown>[];
    const tables = {
      ...file.tables,
      transactions: [
        { ...tx[0], from_the_future: 'ignored column' },
        { ...tx[1], amount: -5 }, // invalid amount: skipped
        { id: 'evil', type: 'expense', amount: 100, occurred_at: Date.now(), merchant: { $gt: 1 } }, // object value: skipped
        'not a row',
      ],
    };
    const legacy = { app: 'kharchi', version: 1, exportedAt: Date.now(), tables }; // pre-rename, no checksum
    const r = await restoreBackup(db, JSON.stringify(legacy));
    expect(r.skipped).toBe(3);
    const after = await listTransactions(db);
    expect(after.map((t) => t.merchant)).toEqual(['Swiggy']);
  });

  test('if every row is broken, the current data is kept', async () => {
    const db = await withData();
    const junk = { app: 'bruhme', version: 1, tables: { transactions: [{ id: 1 }, { nope: true }] } };
    const text = JSON.stringify({ ...junk, checksum: fnv1a(JSON.stringify(junk.tables)) });
    await expect(restoreBackup(db, text)).rejects.toThrow(/current data was kept/);
    expect((await listTransactions(db)).length).toBe(2);
  });
});
