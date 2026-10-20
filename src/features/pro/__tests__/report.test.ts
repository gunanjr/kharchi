import { reportCard, gradeOf } from '../report';
import { monthForecast } from '../forecast';

const T = (m: number, d: number) => new Date(2026, m, d, 12).getTime();
const exp = (t: number, amount = 10000, category_id: string | null = 'cat_food') => ({ type: 'expense' as const, amount, occurred_at: t, category_id });
const inc = (t: number) => ({ type: 'income' as const, amount: 100, occurred_at: t, category_id: null });

describe('report card', () => {
  it('grades the month so far on four habits', () => {
    const txs = [...Array.from({ length: 10 }, (_, i) => (i % 3 === 0 ? inc(T(9, 1 + i)) : exp(T(9, 1 + i)))), ...Array.from({ length: 10 }, (_, i) => exp(T(8, 1 + i), 20000))];
    const r = reportCard(txs, [], 2026, 9, T(9, 10));
    expect(r.days).toBe(10);
    expect(r.habits.find((h) => h.key === 'logging')!.score).toBe(25);
    expect(r.habits.find((h) => h.key === 'pace')!.score).toBe(25); // spent much less than last month
    expect(r.habits.find((h) => h.key === 'calm')!.line).toBe('4 no-spend days');
    expect(r.grade).toBe(gradeOf(r.total));
    expect(r.tip.length).toBeGreaterThan(10);
  });
  it('counts bills marked paid', () => {
    const dues = [{ id: 'a', name: 'Rent', kind: 'rent' as const, amount: 100, day: 5, remindBefore: 0 as const, paid: ['2026-10'] }, { id: 'b', name: 'Card', kind: 'card' as const, amount: null, day: 8, remindBefore: 0 as const, paid: [] }];
    const r = reportCard([], dues, 2026, 9, T(9, 10));
    expect(r.habits.find((h) => h.key === 'bills')!.score).toBe(13);
  });
});

describe('month forecast', () => {
  it('adds the usual pace and unpaid bills to what is spent so far', () => {
    const past = Array.from({ length: 60 }, (_, i) => exp(new Date(2026, 9, 20, 12).getTime() - (i + 1) * 86_400_000, 6000));
    const dues = [{ id: 'a', name: 'EMI', kind: 'emi' as const, amount: 500000, day: 25, remindBefore: 0 as const, paid: [] }];
    const f = monthForecast([...past, exp(T(9, 20), 10000)], dues, T(9, 20));
    expect(f.daily).toBe(6000);
    expect(f.daysLeft).toBe(11);
    expect(f.duesLeft).toBe(500000);
    expect(f.forecast).toBe(f.soFar + 6000 * 11 + 500000);
  });
});

describe('verdict', () => {
  const { verdict } = jest.requireActual('../report') as typeof import('../report');
  it('says how far the next grade is', () => {
    expect(verdict(57)).toEqual({ line: 'Getting there.', next: 'B', toNext: 3 });
    expect(verdict(95).next).toBeNull();
  });
});
