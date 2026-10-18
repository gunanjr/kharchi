import type { Db } from '@/db/types';
import { native } from './module';
import { ingest } from '@/features/pending/service';

/** Text shared into the app from the SMS app (Share > Kharchi) or pasted by the user. Same parser, origin 'share'. */
export async function ingestSharedText(db: Db, text: string): Promise<'created' | 'duplicate' | 'rejected'> {
  const r = await ingest(db, { origin: 'share', body: text, sender: null });
  return r.status;
}

export async function consumeAndIngestShared(db: Db): Promise<number> {
  const text = native?.consumeSharedText?.();
  if (!text) return 0;
  return (await ingestSharedText(db, text)) === 'created' ? 1 : 0;
}
