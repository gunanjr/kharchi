import type { Db } from '@/db/types';
/** Replaced in phase 6. */
export async function materializeSharedDue(_db: Db, _asOf = Date.now()): Promise<number> {
  return 0;
}
