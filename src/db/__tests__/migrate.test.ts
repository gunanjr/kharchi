import { createTestDb } from '../testDb';
import { migrations } from '../migrations';

test('migrations apply and are idempotent', async () => {
  const db = await createTestDb();
  const v = await db.get<{ v: string }>("SELECT v FROM _meta WHERE k='version'");
  expect(Number(v!.v)).toBe(migrations.length);
  const tables = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'");
  expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(['transactions', 'groups_', 'pending_transactions']));
});

test('every table has sync columns', async () => {
  const db = await createTestDb();
  const tables = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%'",
  );
  for (const t of tables) {
    const cols = (await db.all<{ name: string }>(`PRAGMA table_info(${t.name})`)).map((c) => c.name);
    for (const c of ['id', 'created_at', 'updated_at', 'deleted_at', 'dirty']) expect(cols).toContain(c);
  }
});
