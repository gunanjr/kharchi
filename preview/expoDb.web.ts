// Browser preview stand-in for src/db/expoDb.ts: the same Db interface over an in-memory SQLite (sql.js, pure JS).
// On first open it runs the app's own migrations and fills the app's own demo data, so every screen has content.
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Db, SqlValue } from '@/db/types';
import { migrate } from '@/db/migrate';
import { seedDefaults } from '@/features/tracker/repo';
import { seedEverything } from '@/features/dev/seedAll';
import { useSettings } from '@/store/settings';

export async function openExpoDb(): Promise<Db> {
  const SQL = await (initSqlJs as any)();
  const raw = new SQL.Database();
  let depth = 0;
  const rows = (sql: string, params: SqlValue[] = []) => {
    const st = raw.prepare(sql);
    st.bind(params as any[]);
    const out: any[] = [];
    while (st.step()) out.push(st.getAsObject());
    st.free();
    return out;
  };
  const db: Db = {
    run: async (sql, params = []) => void raw.run(sql, params as any[]),
    all: async (sql, params = []) => rows(sql, params) as any,
    get: async (sql, params = []) => rows(sql, params)[0] as any,
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
        try { raw.exec('ROLLBACK'); } catch {}
        throw e;
      } finally {
        depth--;
      }
    },
  };
  await migrate(db);
  await seedDefaults(db);
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  if (!q.has('empty')) {
    await seedEverything(db);
  }
  if (!q.has('onboarding')) await useSettings.getState().set(db, 'onboarded', true);
  if (q.get('theme') === 'dark' || q.get('theme') === 'light') await useSettings.getState().set(db, 'theme', q.get('theme') as any);
  return db;
}

export type { SqlValue };
