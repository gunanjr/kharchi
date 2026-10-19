import type { Db } from '@/db/types';
import { seedDefaults } from '@/features/tracker/repo';
import { seedEverything } from './seedAll';

export async function hasAnyData(db: Db): Promise<boolean> {
  const r = await db.get<{ n: number }>(`SELECT (SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL) + (SELECT COUNT(*) FROM groups_ WHERE deleted_at IS NULL) n`);
  return (r?.n ?? 0) > 0;
}

/** Fills the whole app with sample data. Safe on a fresh install; callers confirm first when data already exists. */
export async function loadCompleteDemo(db: Db): Promise<void> {
  await seedDefaults(db);
  await seedEverything(db);
}
