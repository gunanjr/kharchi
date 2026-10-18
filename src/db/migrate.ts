import type { Db } from './types';
import { migrations } from './migrations';

export async function migrate(db: Db): Promise<void> {
  await db.exec('CREATE TABLE IF NOT EXISTS _meta (k TEXT PRIMARY KEY, v TEXT)');
  const row = await db.get<{ v: string }>("SELECT v FROM _meta WHERE k='version'");
  let current = row ? Number(row.v) : 0;
  for (let i = current; i < migrations.length; i++) {
    await db.transaction(async () => {
      await db.exec(migrations[i]);
      await db.run("INSERT OR REPLACE INTO _meta (k, v) VALUES ('version', ?)", [String(i + 1)]);
    });
    current = i + 1;
  }
}
