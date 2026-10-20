import { useEffect } from 'react';
import { useDb } from '@/db/provider';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';

export const FREE_AURA_DAYS = 7;

/** Pure: is the free aura week still open? Starts the first time the aura is shown; a clock set back never reopens it. */
export function freeAuraOpen(startedAt: number, now: number): boolean {
  if (!startedAt) return true;
  return now >= startedAt && now - startedAt < FREE_AURA_DAYS * 86_400_000;
}

/**
 * What this user may see of their aura: 'full' (Pro), 'basic' (free, first 7 days: score and rank only, never the
 * reasons or moves) or 'locked' (free, after the week). Starts the week the first time it is called.
 */
export function useAuraAccess(): { access: 'full' | 'basic' | 'locked'; daysLeft: number } {
  const pro = useIsPro();
  const db = useDb();
  const startedAt = useSettings((s) => s.auraStartedAt);
  const hydrated = useSettings((s) => s.hydrated);
  const set = useSettings((s) => s.set);
  useEffect(() => { if (hydrated && !startedAt) set(db, 'auraStartedAt', Date.now()); }, [hydrated, startedAt, db, set]);
  const now = Date.now();
  const daysLeft = startedAt ? Math.max(0, Math.ceil((startedAt + FREE_AURA_DAYS * 86_400_000 - now) / 86_400_000)) : FREE_AURA_DAYS;
  if (pro) return { access: 'full', daysLeft };
  return { access: freeAuraOpen(startedAt, now) ? 'basic' : 'locked', daysLeft };
}
