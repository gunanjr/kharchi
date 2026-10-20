import { buildWrapped } from '../wrapped';

const M = [{ id: 'a', name: 'Asha Rao' }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }];
const day = (n: number) => new Date(2026, 9, n, 12).getTime();
const ex = (description: string, amount: number, payer: string, d: number) => ({ description, amount, currency: 'INR', rate: 1, occurred_at: day(d), payers: { [payer]: amount }, shares: { a: amount / 3, b: amount / 3, c: amount / 3 } });
const fmt = (t: number) => `D${new Date(t).getDate()}`;

describe('buildWrapped', () => {
  it('finds the wallet hero, biggest bill, busiest day, banker and debtor', () => {
    const w = buildWrapped([ex('Dinner', 3000, 'a', 1), ex('Cab', 600, 'b', 2), ex('Hotel', 9000, 'a', 2)], M, { a: 8000, b: -3000, c: -5000 }, 'INR', fmt);
    expect(w.total).toBe(12600);
    expect(w.count).toBe(3);
    const by = Object.fromEntries(w.awards.map((a) => [a.key, a]));
    expect(by.hero.who).toBe('Asha');
    expect(by.hero.amount).toBe(12000);
    expect(by.bill.who).toBe('Hotel');
    expect(by.day.who).toBe('D2');
    expect(by.banker.who).toBe('Asha');
    expect(by.owes.who).toBe('Cy');
    expect(by.owes.amount).toBe(5000);
  });
  it('skips awards with nothing to say', () => {
    const w = buildWrapped([ex('Tea', 100, 'a', 1)], M, { a: 0, b: 0, c: 0 }, 'INR', fmt);
    expect(w.awards.map((a) => a.key)).toEqual(['hero', 'bill']);
    expect(buildWrapped([], M, {}, 'INR', fmt).awards).toEqual([]);
  });
  it('converts other currencies with the stored rate', () => {
    const w = buildWrapped([{ ...ex('Taxi', 10, 'b', 1), currency: 'USD', rate: 83 }], M, {}, 'INR', fmt);
    expect(w.total).toBe(830);
  });
});
