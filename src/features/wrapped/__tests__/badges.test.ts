import { badgeCounts, badgeStates, FAMILIES } from '../badges';
const D = 86_400_000;
const NOW = new Date(2026, 9, 30, 12).getTime();
const e = (daysAgo: number, merchant = 'Cafe', amount = 10000) => ({ type: 'expense' as const, amount, merchant, occurred_at: NOW - daysAgo * D });

test('counts and tiers with progress to the next level', () => {
  const txs = Array.from({ length: 12 }, (_, i) => e(i, `Place ${i}`));
  const s = Object.fromEntries(badgeStates(badgeCounts(txs, { settlements: 6, now: NOW })).map((b) => [b.key, b]));
  expect(s.logger).toMatchObject({ tier: 1, value: 12, next: 100 });
  expect(s.fire).toMatchObject({ tier: 2, value: 12, next: 30 }); // 3 and 7 reached
  expect(s.settler).toMatchObject({ tier: 2, next: 20 });
  expect(s.explorer).toMatchObject({ tier: 1, value: 12 });
  expect(s.logger.progress).toBeCloseTo(2 / 90);
});
test('empty is all locked with honest progress, never negative', () => {
  const s = badgeStates(badgeCounts([], { now: NOW }));
  expect(s).toHaveLength(FAMILIES.length);
  for (const b of s) { expect(b.tier).toBe(0); expect(b.progress).toBeGreaterThanOrEqual(0); }
});
test('maxed out shows full progress and no next level', () => {
  const s = badgeStates({ logger: 5000 });
  expect(s[0]).toMatchObject({ tier: 4, next: null, progress: 1 });
  expect(s[0].caption).toMatch(/maxed/);
});
