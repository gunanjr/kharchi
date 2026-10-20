import { useEffect } from 'react';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { notifyAt } from '@/lib/notify';

/** The next Monday at 10 am after `now`. */
export function nextMonday10(now: number): number {
  const d = new Date(now);
  d.setHours(10, 0, 0, 0);
  const add = (8 - d.getDay()) % 7 || (d.getTime() > now ? 0 : 7);
  d.setDate(d.getDate() + (d.getDay() === 1 && d.getTime() > now ? 0 : add));
  return d.getTime();
}

/** When the Monday recap is on, keeps one local notification set for the coming Monday (re-armed each time the app opens). */
export function useWeeklyRecap() {
  const db = useDb();
  const on = useSettings((s) => s.hydrated && s.onboarded && s.weeklySummary);
  const scheduled = useSettings((s) => s.recapScheduledFor);
  const set = useSettings((s) => s.set);
  useEffect(() => {
    if (!on) return;
    const next = nextMonday10(Date.now());
    if (scheduled === next) return;
    notifyAt(next, 'Your week, wrapped', 'See what you spent last week, your top place and how it compares. Tap to open BruhMe.').then((r) => {
      if (r === 'scheduled') set(db, 'recapScheduledFor', next);
    });
  }, [on, scheduled, db, set]);
}
