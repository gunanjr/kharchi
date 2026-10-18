/* Test-only: in-memory SQLite via Node's built-in node:sqlite. */
import type { Db, SqlValue } from './types';
import { migrate } from './migrate';

export async function createTestDb(): Promise<Db> {
   
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  let depth = 0;
  const db: Db = {
    run: async (sql, params = []) => void raw.prepare(sql).run(...(params as SqlValue[])),
    all: async (sql, params = []) => raw.prepare(sql).all(...(params as SqlValue[])) as any[],
    get: async (sql, params = []) => raw.prepare(sql).get(...(params as SqlValue[])) as any,
    exec: async (sql) => void raw.exec(sql),
    async transaction(fn) {
      if (depth > 0) return fn();
      depth++;
      try {
        raw.exec('BEGIN');
        const r = await fn();
        raw.exec('COMMIT');
        return r;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
  };
  await migrate(db);
  return db;
}
