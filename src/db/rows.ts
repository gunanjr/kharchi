import type { Db, SqlValue } from './types';
import { uuid, now } from '@/lib/id';

/** Insert a row with sync metadata filled in. Returns the id. */
export async function insertRow(db: Db, table: string, data: Record<string, SqlValue | undefined>): Promise<string> {
  const t = now();
  const row: Record<string, SqlValue> = { id: uuid(), created_at: t, updated_at: t, dirty: 1, deleted_at: null };
  for (const [k, v] of Object.entries(data)) if (v !== undefined) row[k] = v;
  const keys = Object.keys(row);
  await db.run(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
    keys.map((k) => row[k]),
  );
  return row.id as string;
}

export async function updateRow(db: Db, table: string, id: string, patch: Record<string, SqlValue | undefined>) {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined) as [string, SqlValue][];
  const sets = [...entries.map(([k]) => `${k}=?`), 'updated_at=?', 'dirty=1'];
  await db.run(`UPDATE ${table} SET ${sets.join(',')} WHERE id=?`, [...entries.map(([, v]) => v), now(), id]);
}

/** Soft delete (tombstone) so a future sync can propagate deletions. */
export async function softDelete(db: Db, table: string, id: string) {
  await db.run(`UPDATE ${table} SET deleted_at=?, updated_at=?, dirty=1 WHERE id=?`, [now(), now(), id]);
}

export async function restoreRow(db: Db, table: string, id: string) {
  await db.run(`UPDATE ${table} SET deleted_at=NULL, updated_at=?, dirty=1 WHERE id=?`, [now(), id]);
}
