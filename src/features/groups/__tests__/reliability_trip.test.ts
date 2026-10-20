import { reliability } from '../reliability';
import { tripStatus, nextPayer } from '../trip';

const D = 86400000;
const ex = (t: number, amount: number, payer: string) => ({ amount, currency: 'INR', rate: 1, occurred_at: t, payers: { [payer]: amount }, shares: { a: amount / 2, b: amount / 2 } });

describe('reliability', () => {
  it('says nothing until there are two paybacks', () => {
    const r = reliability([ex(0, 20000, 'a')], [{ from: 'b', to: 'a', amount: 10000, occurred_at: 2 * D }], 'INR', 10 * D);
    expect(r.b.badge).toBeNull();
    expect(r.b.paybacks).toBe(1);
  });
  it('quick payer, with a streak', () => {
    const e = [ex(0, 20000, 'a'), ex(10 * D, 20000, 'a'), ex(20 * D, 20000, 'a')];
    const s = [0, 10, 20].map((d) => ({ from: 'b', to: 'a', amount: 10000, occurred_at: (d + 1) * D }));
    const r = reliability(e, s, 'INR', 30 * D);
    expect(r.b.badge).toBe('quick');
    expect(r.b.medianDays).toBe(1);
    expect(r.b.streak).toBe(3);
    expect(r.b.openDays).toBeNull();
  });
  it('slow payer, and a debt still open is reported as its age', () => {
    const e = [ex(0, 20000, 'a'), ex(5 * D, 20000, 'a'), ex(40 * D, 20000, 'a')];
    const s = [{ from: 'b', to: 'a', amount: 10000, occurred_at: 20 * D }, { from: 'b', to: 'a', amount: 10000, occurred_at: 30 * D }];
    const r = reliability(e, s, 'INR', 60 * D);
    expect(r.b.badge).toBe('slow');
    expect(r.b.openDays).toBe(20);
    expect(r.b.streak).toBe(0);
  });
  it('payer a never owes, and tiny debts are not judged', () => {
    const r = reliability([ex(0, 400, 'a'), ex(D, 400, 'a')], [{ from: 'b', to: 'a', amount: 200, occurred_at: 2 * D }, { from: 'b', to: 'a', amount: 200, occurred_at: 3 * D }], 'INR', 9 * D);
    expect(r.a?.badge ?? null).toBeNull();
    expect(r.b.badge).toBeNull();
  });
});

describe('trip', () => {
  const today = new Date(2026, 9, 12, 15).getTime();
  const trip = { start: new Date(2026, 9, 10).getTime(), end: new Date(2026, 9, 14).getTime(), dailyBudget: 300000 };
  const e = (day: number, amount: number) => ({ amount, currency: 'INR', rate: 1, occurred_at: new Date(2026, 9, day, 12).getTime() });
  it('tracks day, budget and pace', () => {
    const t = tripStatus(trip, [e(10, 200000), e(11, 400000), e(12, 100000), e(20, 999999)], 'INR', today);
    expect(t.phase).toBe('on');
    expect([t.dayNo, t.totalDays, t.daysLeft]).toEqual([3, 5, 2]);
    expect(t.spentTotal).toBe(700000);
    expect(t.spentToday).toBe(100000);
    expect(t.leftToday).toBe(200000);
    expect(t.budgetTotal).toBe(1500000);
    expect(t.pace).toBe('under');
  });
  it('before and after', () => {
    expect(tripStatus(trip, [], 'INR', new Date(2026, 9, 1).getTime()).phase).toBe('upcoming');
    expect(tripStatus(trip, [e(11, 500000)], 'INR', new Date(2026, 9, 30).getTime())).toMatchObject({ phase: 'over', daysLeft: 0, perDay: 100000 });
  });
  it('next payer is the one furthest behind, stable on ties, none when even', () => {
    expect(nextPayer({ a: 90000, b: -60000, c: -30000 }, {})?.id).toBe('b');
    expect(nextPayer({ a: 60000, b: -30000, c: -30000 }, { b: 3, c: 1 })?.id).toBe('c');
    expect(nextPayer({ a: 60000, b: -30000, c: -30000 }, { b: 1, c: 1 })?.id).toBe('b');
    expect(nextPayer({ a: 1000, b: -1000 }, {})).toBeNull();
    expect(nextPayer({ a: 0 }, {})).toBeNull();
  });
});
