import { recap, lastWeek, monthWindow, longestStreak, milestones } from '../recap';
const D = 86_400_000;
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();
const e = (amount: number, t: number, merchant = 'Chai', category_id: string | null = 'cat_food', extra = {}) => ({ type: 'expense' as const, amount, merchant, category_id, occurred_at: t, ...extra });

test('last week is the previous full Monday to Sunday', () => {
  const w = lastWeek(at(2026, 9, 21)); // Wednesday 21 Oct 2026
  expect(new Date(w.from)).toEqual(new Date(2026, 9, 12));
  expect(new Date(w.to)).toEqual(new Date(2026, 9, 19));
});

test('recap numbers: totals, comparison, top places, biggest, busiest day, no-spend days', () => {
  const w = monthWindow(2026, 9);
  const txs = [
    e(10000, at(2026, 8, 10)), // September: 10000
    e(4000, at(2026, 9, 2), 'Chai'), e(5000, at(2026, 9, 2), 'Cab', 'cat_transport'), e(2000, at(2026, 9, 5), 'chai'),
    e(50000, at(2026, 9, 10), 'Laptop', 'cat_shopping', { excluded: 1 }), // left out
    { type: 'income' as const, amount: 90000, merchant: 'Salary', category_id: 'cat_salary', occurred_at: at(2026, 9, 1) },
  ];
  const r = recap(txs, w);
  expect(r).toMatchObject({ spent: 11000, income: 90000, entries: 3, change: 1000, changePct: 10 });
  expect(r.topPlaces[0]).toMatchObject({ name: 'Chai', total: 6000, count: 2 }); // case-insensitive merge
  expect(r.biggest).toMatchObject({ name: 'Cab', amount: 5000 });
  expect(new Date(r.busiestDay!.at).getDate()).toBe(2);
  expect(r.noSpendDays).toBe(1); // the 1st had only income
});

test('empty windows are calm, not broken', () => {
  const r = recap([], monthWindow(2026, 9));
  expect(r).toMatchObject({ spent: 0, entries: 0, change: null, biggest: null, busiestDay: null, priciestWeekday: null });
});

test('streaks and milestones are earned, never negative, and need real data', () => {
  const days = Array.from({ length: 31 }, (_, i) => e(1000, at(2026, 8, 1) + i * D));
  expect(longestStreak(days).days).toBe(31);
  const ms = milestones(days, { settlements: [at(2026, 8, 3)] }, at(2026, 9, 20));
  const keys = ms.map((m) => m.key);
  expect(keys).toEqual(expect.arrayContaining(['first', 'streak-7', 'streak-30', 'settled-1']));
  expect(keys).not.toContain('entries-100');
  expect(milestones([], {}, at(2026, 9, 20))).toEqual([]);
});

test('no-spend weekend and spent-less month', () => {
  const txs = [
    e(20000, at(2026, 8, 5)), // September 20000
    e(3000, at(2026, 9, 9)), // Friday 9 Oct
    e(2000, at(2026, 9, 12)), // Monday 12 Oct; October total 5000 (75% less)
  ];
  const keys = milestones(txs, {}, at(2026, 10, 20)).map((m) => m.key);
  expect(keys).toEqual(expect.arrayContaining(['no-spend-weekend', 'less-month']));
  // A weekend the user simply did not log (no entries on the Friday or Monday around it) does not count.
  const sparse = milestones([e(1000, at(2026, 9, 7)), e(1000, at(2026, 9, 14))], {}, at(2026, 10, 20)).map((m) => m.key);
  expect(sparse).not.toContain('no-spend-weekend');
});

import { nextMonday10 } from '../useWeeklyRecap';
test('next Monday 10 am', () => {
  expect(new Date(nextMonday10(at(2026, 9, 21, 9)))).toEqual(new Date(2026, 9, 26, 10)); // Wed -> next Mon
  expect(new Date(nextMonday10(new Date(2026, 9, 26, 9).getTime()))).toEqual(new Date(2026, 9, 26, 10)); // Mon 9am -> same day
  expect(new Date(nextMonday10(new Date(2026, 9, 26, 11).getTime()))).toEqual(new Date(2026, 10, 2, 10)); // Mon 11am -> next week
  expect(new Date(nextMonday10(new Date(2026, 9, 25, 23).getTime()))).toEqual(new Date(2026, 9, 26, 10)); // Sun night
});
