import { pickRoast, markSeen, type Seen } from '../fresh';
import { LINES } from '../roastLines';
import type { RoastFact } from '../persona';

const money = (n: number) => `₹${n / 100}`;
const facts: RoastFact[] = [{ kind: 'late', count: 6, amount: 120000 }, { kind: 'streak', count: 12, amount: 0 }];

describe('fresh roasts', () => {
  it('is stable within a day', () => {
    expect(pickRoast(facts, 'toast', money, 100, [])?.id).toBe(pickRoast(facts, 'toast', money, 100, [])?.id);
  });
  it('never repeats a line until the pool is used up, one line a day', () => {
    let seen: Seen[] = [];
    const ids: string[] = [];
    const pool = LINES.late.toast.length + LINES.streak.toast.length;
    for (let d = 0; d < pool; d++) {
      const p = pickRoast(facts, 'toast', money, 1000 + d, seen)!;
      ids.push(p.id);
      seen = markSeen(seen, p.id, 1000 + d);
    }
    expect(new Set(ids).size).toBe(pool);
    // after the pool is used up, the line seen longest ago comes back first
    expect(pickRoast(facts, 'toast', money, 1000 + pool, seen)!.id).toBe(ids[0]);
  });
  it('"another one" gives a different line the same day', () => {
    const a = pickRoast(facts, 'savage', money, 50, [], 0)!;
    const b = pickRoast(facts, 'savage', money, 50, [], 1)!;
    expect(a.id).not.toBe(b.id);
  });
  it('has six lines for every topic and tone, without emojis', () => {
    for (const k of Object.keys(LINES) as (keyof typeof LINES)[]) for (const t of ['toast', 'gentle', 'playful', 'savage'] as const) {
      expect(LINES[k][t]).toHaveLength(6);
      for (const fn of LINES[k][t]) expect(fn({ kind: k, count: 5, amount: 1000, name: 'Fridays' }, '₹10')).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
