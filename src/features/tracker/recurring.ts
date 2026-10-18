import type { Db } from '@/db/types';
import type { Frequency } from '@/domain/types';
import { insertRow, updateRow } from '@/db/rows';
import { addMonths, DAY } from '@/lib/date';
import { addTransaction, type NewTx } from './repo';

export function nextDue(from: number, freq: Frequency): number {
  switch (freq) {
    case 'daily':
      return from + DAY;
    case 'weekly':
      return from + 7 * DAY;
    case 'monthly':
      return addMonths(from, 1);
    case 'yearly':
      return addMonths(from, 12);
  }
}

export async function addRecurring(db: Db, template: NewTx, frequency: Frequency, firstDue: number) {
  return insertRow(db, 'recurring', { template: JSON.stringify(template), frequency, next_due: firstDue, scope: 'personal', active: 1 });
}

/** Create all due occurrences up to `asOf` (catches up after the app was closed). Returns how many were created. */
export async function materializeDue(db: Db, asOf = Date.now()): Promise<number> {
  const due = await db.all<{ id: string; template: string; frequency: Frequency; next_due: number }>(
    `SELECT * FROM recurring WHERE deleted_at IS NULL AND active=1 AND scope='personal' AND next_due <= ?`,
    [asOf],
  );
  let created = 0;
  for (const r of due) {
    let when = r.next_due;
    const tpl = JSON.parse(r.template) as NewTx;
    let guard = 0;
    while (when <= asOf && guard++ < 400) {
      await addTransaction(db, { ...tpl, occurred_at: when, source: 'recurring', recurring_id: r.id });
      created++;
      when = nextDue(when, r.frequency);
    }
    await updateRow(db, 'recurring', r.id, { next_due: when });
  }
  return created;
}
