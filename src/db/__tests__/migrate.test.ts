import { createTestDb } from '../testDb';
import { migrations } from '../migrations';
import { migrate } from '../migrate';

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

test('a database built under an earlier numbering still starts, and is repaired', async () => {
  const db = await createTestDb();
  // what the owner's phone looked like: version 5 (old numbering), excluded already added, no bills table
  await db.exec('DROP TABLE bills');
  await db.run("INSERT OR REPLACE INTO _meta (k, v) VALUES ('version', '5')");
  await expect(migrate(db)).resolves.toBeUndefined();
  const tables = (await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table'")).map((t) => t.name);
  expect(tables).toEqual(expect.arrayContaining(['bills', 'goals', 'goal_entries', 'feedback']));
  const v = await db.get<{ v: string }>("SELECT v FROM _meta WHERE k='version'");
  expect(Number(v!.v)).toBe(migrations.length);
});

test('running migrate twice changes nothing', async () => {
  const db = await createTestDb();
  await migrate(db);
  await migrate(db);
  const cols = (await db.all<{ name: string }>('PRAGMA table_info(transactions)')).map((c) => c.name);
  expect(cols.filter((c) => c === 'excluded')).toHaveLength(1);
});
