import type { Db } from './types';
import { migrations } from './migrations';

const ALREADY_THERE = /duplicate column name|already exists/i;

/**
 * Runs one migration. If a database was built by an earlier numbering of the same changes (so a table or column is
 * already there), the statement that collides is skipped and the rest still run, instead of the app failing to start.
 */
async function execTolerant(db: Db, sql: string): Promise<void> {
  try {
    await db.exec(sql);
  } catch (e) {
    if (!ALREADY_THERE.test(String((e as Error)?.message ?? e))) throw e;
    for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      try {
        await db.exec(stmt);
      } catch (err) {
        if (!ALREADY_THERE.test(String((err as Error)?.message ?? err))) throw err;
      }
    }
  }
}

export async function migrate(db: Db): Promise<void> {
  await db.exec('CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT)');
  const row = await db.get<{ v: string }>("SELECT v FROM _meta WHERE k='version'");
  let current = row ? Number(row.v) : 0;
  for (let i = current; i < migrations.length; i++) {
    await db.transaction(async () => {
      await execTolerant(db, migrations[i]);
      await db.run("INSERT OR REPLACE INTO _meta (k, v) VALUES ('version', ?)", [String(i + 1)]);
    });
    current = i + 1;
  }
}
