import type { Db } from '@/db/types';
import { ingest, confirmPending, markNotMine } from '@/features/pending/service';
import { drainNativeQueue, ackNativeQueue } from './sms';
import { suggestCategory } from '@/features/parser/merchants';
import { useSettings } from '@/store/settings';

/**
 * Pull everything the Kotlin side captured while the app was closed through the full TS pipeline.
 * Items are acked (and their transient raw text deleted natively) only after being handled.
 */
let inFlight: Promise<{ created: number; saved: number }> | null = null;

/** Serialised: bootstrap + foreground events + headless task can overlap, and must not ingest the same item twice. */
export function drainAndIngest(db: Db): Promise<{ created: number; saved: number }> {
  inFlight ??= drainOnce(db).finally(() => (inFlight = null));
  return inFlight;
}

async function drainOnce(db: Db): Promise<{ created: number; saved: number }> {
  const items = drainNativeQueue();
  if (!items.length) return { created: 0, saved: 0 };
  const allowlist = useSettings
    .getState()
    .senderAllowlist.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let created = 0;
  let saved = 0;
  const done: string[] = [];
  for (const it of items) {
    try {
      const r = await ingest(db, {
        origin: it.origin,
        body: it.body,
        sender: it.origin === 'sms' ? it.sender : null,
        pkg: it.origin === 'notification' ? (it.sender ?? undefined) : undefined,
        title: it.title ?? undefined,
        receivedAt: it.receivedAt,
        allowlist,
      });
      if (r.status === 'created') {
        created++;
        const res = it.resolution;
        if (res?.notMine) await markNotMine(db, r.pendingId);
        else if (res && (res.categoryKey || res.note)) {
          let cat = res.categoryKey ? `cat_${res.categoryKey}` : null;
          if (!cat && res.note) cat = (await suggestCategory(db, res.note)).categoryId;
          await confirmPending(db, r.pendingId, { categoryId: cat, note: res.note ?? null });
          saved++;
        }
      }
      done.push(it.id);
    } catch (e) {
      console.warn('drain item failed', e);
    }
  }
  ackNativeQueue(done);
  return { created, saved };
}
