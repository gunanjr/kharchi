import { personaFor, scorable, currentStreak, roastFacts, roastLine, PERSONAS } from '../persona';
const D = 86_400_000;
const NOW = new Date(2026, 9, 30, 12).getTime();
const from = NOW - 30 * D;
const e = (amount: number, daysAgo: number, cat = 'cat_food', merchant = 'Cafe', hour = 13, extra = {}) => {
  const d = new Date(NOW - daysAgo * D); d.setHours(hour, 0, 0, 0);
  return { type: 'expense' as const, amount, category_id: cat, merchant, occurred_at: d.getTime(), ...extra };
};

describe('fair scoring', () => {
  test('rent, bills, health, education, investments and left-out entries never count', () => {
    const tx = [e(2000000, 3, 'cat_rent'), e(150000, 3, 'cat_bills'), e(90000, 3, 'cat_health'), e(500000, 3, 'cat_education'),
      e(500000, 3, 'cat_other', 'Zerodha', 13, { tags: '["investing"]' }), e(10000, 3, 'cat_food', 'X', 13, { excluded: 1 }), e(20000, 3)];
    expect(scorable(tx, from, NOW + 1).map((t) => t.amount)).toEqual([20000]);
  });
  test('a one-off big spend does not count', () => {
    const tx = [e(20000, 1), e(25000, 2), e(22000, 3), e(21000, 4), e(900000, 5)];
    expect(scorable(tx, from, NOW + 1).some((t) => t.amount === 900000)).toBe(false);
  });
});

describe('persona', () => {
  test('nothing until 30 spends over 3 weeks', () => {
    const few = Array.from({ length: 10 }, (_, i) => e(10000, i));
    expect(personaFor(few, from, NOW + 1)).toMatchObject({ status: 'not-enough' });
    const oneWeek = Array.from({ length: 40 }, (_, i) => e(10000, i % 5));
    expect(personaFor(oneWeek, from, NOW + 1).status).toBe('not-enough');
  });
  test('many small food spends make a Chai Philosopher, with a reason from the numbers', () => {
    const tx = Array.from({ length: 34 }, (_, i) => e(8000 + (i % 3) * 1000, i % 28, 'cat_food', `Tea ${i % 5}`));
    const p = personaFor(tx, from, NOW + 1);
    expect(p).toMatchObject({ status: 'ok', key: 'chai' });
    if (p.status === 'ok') expect(p.why).toMatch(/small food/);
  });
  test('stability: the previous persona stays unless another leads clearly', () => {
    const tx = Array.from({ length: 34 }, (_, i) => e(8000, i % 28, 'cat_food', `Tea ${i % 5}`));
    const p = personaFor(tx, from, NOW + 1, { previous: 'planner' });
    if (p.status === 'ok') expect(['planner', 'chai']).toContain(p.key);
  });
  test('every persona name is affectionate (no negative words)', () => {
    for (const p of Object.values(PERSONAS)) expect(p.name).not.toMatch(/broke|waste|bad|poor|lazy|spender/i);
  });
});

describe('streak', () => {
  const days = (list: number[]) => list.map((a) => ({ occurred_at: NOW - a * D }));
  test('counts consecutive days, alive if the last entry was yesterday', () => {
    expect(currentStreak(days([0, 1, 2, 3]), NOW).days).toBe(4);
    expect(currentStreak(days([1, 2, 3]), NOW).days).toBe(3);
    expect(currentStreak(days([2, 3]), NOW).days).toBe(0);
  });
  test('one missed day a week is forgiven, two in a week or two in a row are not', () => {
    expect(currentStreak(days([0, 1, 3, 4, 5]), NOW)).toEqual({ days: 5, freezesUsed: 1 });
    expect(currentStreak(days([0, 2, 4, 5]), NOW).days).toBe(2);
    expect(currentStreak(days([0, 1, 4, 5]), NOW).days).toBe(2);
  });
});

describe('roast or toast', () => {
  test('late-night needs at least 5 entries; facts use only fair spends', () => {
    expect(roastFacts([e(10000, 1, 'cat_food', 'A', 23), e(10000, 2, 'cat_food', 'A', 1)], from, NOW + 1).some((f) => f.kind === 'late')).toBe(false);
    const late = Array.from({ length: 6 }, (_, i) => e(10000, i + 1, 'cat_food', 'Snacks', 23));
    expect(roastFacts(late, from, NOW + 1).find((f) => f.kind === 'late')?.count).toBe(6);
    expect(roastFacts([e(90000, 1, 'cat_health', 'Clinic', 23)], from, NOW + 1)).toEqual([]);
  });
  test('every fact has a line for every tone, toast is kind, and nothing insults the person', () => {
    const kinds = ['late', 'place', 'weekend', 'saver', 'steady'] as const;
    for (const k of kinds) for (const tone of ['toast', 'gentle', 'playful', 'savage'] as const) {
      const line = roastLine({ kind: k, count: 9, amount: 428000, name: 'Cafe' }, tone, (n) => `₹${n / 100}`);
      expect(line.length).toBeGreaterThan(10);
      expect(line).not.toMatch(/stupid|idiot|loser|broke|fat|ugly/i);
    }
  });
});
