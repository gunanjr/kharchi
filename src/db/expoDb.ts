import * as SQLite from 'expo-sqlite';
import type { Db, SqlValue } from './types';

export async function openExpoDb(name = 'kharchi.db'): Promise<Db> {
  const raw = await SQLite.openDatabaseAsync(name);
  await raw.execAsync('PRAGMA journal_mode = WAL;');
  let depth = 0;
  const db: Db = {
    run: async (sql, params = []) => void (await raw.runAsync(sql, params as SQLite.SQLiteBindParams)),
    all: (sql, params = []) => raw.getAllAsync(sql, params as SQLite.SQLiteBindParams) as Promise<any[]>,
    get: async (sql, params = []) =>
      ((await raw.getFirstAsync(sql, params as SQLite.SQLiteBindParams)) ?? undefined) as any,
    exec: (sql) => raw.execAsync(sql),
    async transaction(fn) {
      if (depth > 0) return fn(); // flatten nested transactions
      depth++;
      try {
        await raw.execAsync('BEGIN');
        const r = await fn();
        await raw.execAsync('COMMIT');
        return r;
      } catch (e) {
        await raw.execAsync('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        depth--;
      }
    },
  };
  return db;
}

export type { SqlValue };
