import type { Db } from './types';

const SKIP = new Set(['_meta']);

async function tableNames(db: Db) {
  const rows = await db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%'",
  );
  return rows.map((r) => r.name).filter((n) => !SKIP.has(n));
}

export interface BackupFile {
  app: 'kharchi';
  version: number;
  exportedAt: number;
  tables: Record<string, Record<string, any>[]>;
}

export async function exportBackup(db: Db): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const t of await tableNames(db)) tables[t] = await db.all(`SELECT * FROM ${t}`);
  return { app: 'kharchi', version: 1, exportedAt: Date.now(), tables };
}

export async function restoreBackup(db: Db, file: BackupFile): Promise<void> {
  if (file.app !== 'kharchi' || typeof file.tables !== 'object') throw new Error('Not a backup file');
  const known = new Set(await tableNames(db));
  await db.transaction(async () => {
    for (const t of known) await db.run(`DELETE FROM ${t}`);
    for (const [t, rows] of Object.entries(file.tables)) {
      if (!known.has(t)) continue;
      for (const row of rows) {
        const keys = Object.keys(row);
        if (!keys.every((k) => /^[a-z_0-9]+$/.test(k))) throw new Error('Bad column name in backup');
        await db.run(`INSERT INTO ${t} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => row[k]));
      }
    }
  });
}

/** "Delete all my data": wipes every table. */
export async function wipeAll(db: Db): Promise<void> {
  await db.transaction(async () => {
    for (const t of await tableNames(db)) await db.run(`DELETE FROM ${t}`);
  });
}
