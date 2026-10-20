import { auraDays, auraScore, eraFor, promptsFor, RANKS } from '../aura';
const D = 86_400_000;
const NOW = new Date(2026, 9, 30, 20).getTime();
const at = (daysAgo: number, h = 13) => { const d = new Date(NOW - daysAgo * D); d.setHours(h, 0, 0, 0); return d.getTime(); };
const e = (amount: number, daysAgo: number, cat = 'cat_food', merchant = 'Cafe') => ({ type: 'expense' as const, amount, category_id: cat, merchant, occurred_at: at(daysAgo) });
const inc = (daysAgo: number) => ({ type: 'income' as const, amount: 1, category_id: 'cat_salary', merchant: 'x', occurred_at: at(daysAgo) });

test('points are earned, never negative; unlogged days earn nothing (gaps are not savings)', () => {
  const days = auraDays([e(10000, 0), inc(1)], [at(0)], NOW, 30);
  expect(days).toHaveLength(30);
  expect(days.every((d) => d.points >= 0)).toBe(true);
  const today = days[days.length - 1];
  expect(today.reasons).toEqual(expect.arrayContaining(['Logged your day', 'Settled up']));
  expect(days[days.length - 2].reasons).toContain('No-spend day'); // logged income, no spend
  expect(days[0].points).toBe(0); // nothing logged
});
test('rent and bills never cost you a no-spend day', () => {
  const days = auraDays([e(2000000, 0, 'cat_rent')], [], NOW, 5);
  expect(days[4].reasons).toContain('No-spend day');
});
test('score, rank and distance to the next rank', () => {
  const empty = auraScore(auraDays([], [], NOW));
  expect(empty).toMatchObject({ score: 0, rank: RANKS[0] });
  const busy = Array.from({ length: 30 }, (_, i) => inc(i));
  const r = auraScore(auraDays(busy, [], NOW));
  expect(r.score).toBeGreaterThanOrEqual(80); // logged + no-spend + streak every day
  expect(['armor', 'boss', 'main']).toContain(r.rank.key);
});
test('era picks the month story, needs 15 spends, always kind', () => {
  const oct = (d: number, amount: number, cat = 'cat_food') => ({ type: 'expense' as const, amount, category_id: cat, merchant: 'X', occurred_at: new Date(2026, 9, d, 12).getTime() });
  const sep = (d: number, amount: number) => ({ type: 'expense' as const, amount, category_id: 'cat_food', merchant: 'X', occurred_at: new Date(2026, 8, d, 12).getTime() });
  expect(eraFor([oct(1, 100)], 2026, 9)).toBeNull();
  const saving = [...Array.from({ length: 16 }, (_, i) => oct(i + 1, 1000)), ...Array.from({ length: 16 }, (_, i) => sep(i + 1, 5000))];
  expect(eraFor(saving, 2026, 9)?.key).toBe('saving');
  const cafe = Array.from({ length: 16 }, (_, i) => oct(i + 1, 1000));
  expect(eraFor(cafe, 2026, 9)?.key).toBe('cafe');
  const travel = Array.from({ length: 16 }, (_, i) => oct(i + 1, 1000, 'cat_travel'));
  expect(eraFor(travel, 2026, 9)?.key).toBe('travel');
});
test('prompts come from real thresholds and skip sensitive categories', () => {
  const tx = [...Array.from({ length: 5 }, (_, i) => e(15000, i * 2, 'cat_food', 'Chai Point')), e(90000, 3, 'cat_health', 'Clinic'), inc(1), inc(5), inc(9)];
  const p = promptsFor(tx, [at(2)], NOW, (n) => `₹${n / 100}`);
  expect(p.find((x) => x.q === 'My toxic trait')?.a).toContain('Chai Point');
  expect(p.some((x) => x.a.includes('Clinic'))).toBe(false);
  expect(p.find((x) => x.q === 'I’m weirdly good at')?.a).toContain('settling up');
  expect(promptsFor([], [], NOW, String)).toEqual([]);
});
