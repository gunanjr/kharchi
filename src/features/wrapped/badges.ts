import type { Transaction } from '@/domain/types';
import { longestStreak } from './recap';

/**
 * Achievements with tiers and progress (the Duolingo idea): each family has levels, the user sees what they have
 * earned and how close the next level is. Earned only, never taken away, no negative ones. Pure and tested.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'merchant' | 'occurred_at'> & { excluded?: number | null };
const DAY = 86_400_000;

export type Tier = 0 | 1 | 2 | 3 | 4; // 0 = not yet, 1 bronze, 2 silver, 3 gold, 4 legend
export interface BadgeFamily { key: string; title: string; icon: string; unit: string; levels: number[]; describe: (n: number) => string }
export interface BadgeState { key: string; title: string; icon: string; tier: Tier; value: number; next: number | null; progress: number; caption: string }

export const FAMILIES: BadgeFamily[] = [
  { key: 'logger', title: 'Logger', icon: 'create', unit: 'entries', levels: [10, 100, 500, 1000], describe: (n) => `${n} entries logged` },
  { key: 'fire', title: 'On fire', icon: 'flame', unit: 'days', levels: [3, 7, 30, 100], describe: (n) => `${n}-day logging streak` },
  { key: 'settler', title: 'Settler', icon: 'checkmark-done', unit: 'settle-ups', levels: [1, 5, 20, 50], describe: (n) => `${n} debts settled` },
  { key: 'explorer', title: 'Explorer', icon: 'compass', unit: 'places', levels: [10, 30, 75, 150], describe: (n) => `${n} different places` },
  { key: 'zen', title: 'Weekend zen', icon: 'leaf', unit: 'weekends', levels: [1, 3, 8, 20], describe: (n) => `${n} no-spend weekends` },
  { key: 'saver', title: 'Saver', icon: 'trending-down', unit: 'months', levels: [1, 3, 6, 12], describe: (n) => `${n} months cheaper than the one before` },
  { key: 'veteran', title: 'Veteran', icon: 'calendar', unit: 'days', levels: [30, 90, 180, 365], describe: (n) => `${n} days with BruhMe` },
];

const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** The raw counts behind every badge family. */
export function badgeCounts(txs: Tx[], extra: { settlements?: number; now: number }): Record<string, number> {
  const all = [...txs].sort((a, b) => a.occurred_at - b.occurred_at);
  const exp = all.filter((t) => t.type === 'expense' && !t.excluded);
  const logged = new Set(all.map((t) => sod(t.occurred_at)));
  const spend = new Set(exp.map((t) => sod(t.occurred_at)));
  // no-spend weekends, counted only when the Friday before and Monday after were logged (so unlogged weekends never count)
  let zen = 0;
  const saturdays = new Set([...logged].map((d) => { const back = (new Date(d).getDay() + 6) % 7; return sod(d - back * DAY + 5 * DAY + 12 * 3600_000); }));
  for (const sat of saturdays) {
    const sun = sod(sat + DAY + 43200000), fri = sod(sat - DAY + 43200000), mon = sod(sun + DAY + 43200000);
    if (logged.has(fri) && logged.has(mon) && !spend.has(sat) && !spend.has(sun) && mon + DAY <= extra.now) zen++;
  }
  const months = new Map<string, number>();
  for (const t of exp) { const d = new Date(t.occurred_at); const k = `${d.getFullYear() * 12 + d.getMonth()}`; months.set(k, (months.get(k) ?? 0) + t.amount); }
  const keys = [...months.keys()].map(Number).sort((a, b) => a - b);
  const nowKey = new Date(extra.now).getFullYear() * 12 + new Date(extra.now).getMonth();
  let saver = 0;
  for (let i = 1; i < keys.length; i++) if (keys[i] === keys[i - 1] + 1 && keys[i] < nowKey && months.get(String(keys[i]))! <= months.get(String(keys[i - 1]))! * 0.9) saver++;
  return {
    logger: all.length,
    fire: longestStreak(all).days,
    settler: extra.settlements ?? 0,
    explorer: new Set(exp.map((t) => (t.merchant ?? '').trim().toLowerCase()).filter(Boolean)).size,
    zen,
    saver,
    veteran: all.length ? Math.floor((extra.now - all[0].occurred_at) / DAY) : 0,
  };
}

export function badgeStates(counts: Record<string, number>): BadgeState[] {
  return FAMILIES.map((f) => {
    const v = counts[f.key] ?? 0;
    const tier = f.levels.filter((l) => v >= l).length as Tier;
    const next = tier < f.levels.length ? f.levels[tier] : null;
    const prev = tier > 0 ? f.levels[tier - 1] : 0;
    return {
      key: f.key, title: f.title, icon: f.icon, tier, value: v, next,
      progress: next === null ? 1 : Math.max(0, Math.min(1, (v - prev) / (next - prev))),
      caption: tier === 0 ? `${v} of ${next} ${f.unit}` : next === null ? `${f.describe(v)} · maxed out` : `${f.describe(v)} · next at ${next}`,
    };
  });
}

export const TIER_NAME: Record<Tier, string> = { 0: 'Locked', 1: 'Bronze', 2: 'Silver', 3: 'Gold', 4: 'Legend' };
