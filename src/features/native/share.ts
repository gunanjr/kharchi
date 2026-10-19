import type { Db } from '@/db/types';
import { native } from './module';
import { ingest } from '@/features/pending/service';

export type SharedResult = { status: 'created'; pendingId: string } | { status: 'duplicate' } | { status: 'rejected' };

/** Text shared into the app (Share > Kharchi) or pasted by the user. Same parser and dedupe as every other source, origin 'share'. */
export async function ingestSharedText(db: Db, text: string): Promise<SharedResult> {
  const r = await ingest(db, { origin: 'share', body: text, sender: null });
  return r.status === 'created' ? { status: 'created', pendingId: r.pendingId } : { status: r.status === 'duplicate' ? 'duplicate' : 'rejected' };
}

/** Reads (and clears) text handed over by the Android share intent, if any. */
export async function consumeShared(db: Db): Promise<SharedResult | null> {
  const text = native?.consumeSharedText?.();
  return text ? ingestSharedText(db, text) : null;
}
