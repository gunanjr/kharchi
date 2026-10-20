import { LINES } from './roastLines';
import type { RoastFact, RoastTone } from './persona';

/**
 * Fresh roasts: one line a day, stable for that day, never a line the user has already seen until every line for
 * their current topics has been shown. "Another one" walks further down the same order. Pure and tested.
 * `seen` holds line ids with the day they were first shown (kept on the phone in settings `roastSeen`).
 */
export interface Seen { id: string; day: number }
export interface RoastPick { id: string; text: string; fact: RoastFact }

export const dayNumber = (t: number) => { const d = new Date(t); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000); };

// small stable hash so the order is deterministic but looks shuffled, and different each day
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function pickRoast(facts: RoastFact[], tone: RoastTone, money: (n: number) => string, day: number, seen: Seen[], skip = 0): RoastPick | null {
  if (!facts.length) return null;
  const before = new Map(seen.filter((x) => x.day < day).map((x) => [x.id, x.day]));
  const all = facts.flatMap((f) => LINES[f.kind][tone].map((fn, i) => ({ id: `${f.kind}.${tone}.${i}`, fact: f, fn })));
  all.sort((a, b) => {
    const sa = before.get(a.id), sb = before.get(b.id);
    if ((sa === undefined) !== (sb === undefined)) return sa === undefined ? -1 : 1; // unseen first
    if (sa !== undefined && sb !== undefined && sa !== sb) return sa - sb; // then the longest ago
    return hash(`${a.id}:${day}`) - hash(`${b.id}:${day}`);
  });
  const p = all[((skip % all.length) + all.length) % all.length];
  return { id: p.id, text: p.fn(p.fact, money(p.fact.amount)), fact: p.fact };
}

/** Remember a shown line (first time only), keeping the list bounded. */
export function markSeen(seen: Seen[], id: string, day: number, cap = 1500): Seen[] {
  if (seen.some((x) => x.id === id)) return seen;
  const next = [...seen, { id, day }];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
