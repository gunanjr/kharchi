import { challengeView, usualWeek } from '../challenges';

const DAY = 86_400_000;
const T = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();
const money = (n: number) => `₹${n / 100}`;
const exp = (t: number, amount = 10000, category_id: string | null = 'cat_food') => ({ type: 'expense' as const, amount, occurred_at: t, category_id });
const inc = (t: number) => ({ type: 'income' as const, amount: 100, occurred_at: t, category_id: null });

describe('challenges', () => {
  it('counts logged no-spend days and wins at 7', () => {
    const start = T(2026, 9, 1, 9);
    const txs = Array.from({ length: 7 }, (_, i) => inc(T(2026, 9, 1 + i)));
    const v = challengeView({ id: 'a', key: 'nospend7', startedAt: start }, txs, T(2026, 9, 7, 20), money);
    expect(v.progress).toBe(7);
    expect(v.status).toBe('won');
  });
  it('starts tomorrow when joined after noon', () => {
    const v = challengeView({ id: 'a', key: 'nospend7', startedAt: T(2026, 9, 1, 15) }, [inc(T(2026, 9, 1))], T(2026, 9, 1, 20), money);
    expect(v.progress).toBe(0);
  });
  it('a missed day ends the 30-day logging challenge, today still has time', () => {
    const start = T(2026, 9, 1, 9);
    const ok = challengeView({ id: 'a', key: 'log30', startedAt: start }, [exp(T(2026, 9, 1)), exp(T(2026, 9, 2))], T(2026, 9, 3, 9), money);
    expect(ok.status).toBe('running');
    expect(ok.progress).toBe(2);
    const missed = challengeView({ id: 'a', key: 'log30', startedAt: start }, [exp(T(2026, 9, 1)), exp(T(2026, 9, 3))], T(2026, 9, 4, 9), money);
    expect(missed.status).toBe('missed');
  });
  it('usual week needs 4 weeks of history and ignores fixed costs', () => {
    const from = T(2026, 9, 1, 0);
    const txs = [1, 2, 3, 4].flatMap((w) => [exp(from - w * 7 * DAY + DAY, 50000), exp(from - w * 7 * DAY + DAY, 900000, 'cat_rent')]);
    expect(usualWeek(txs, from)).toBe(50000);
    expect(usualWeek(txs.slice(0, 4), from)).toBe(0);
  });
  it('a lighter week fails once spending passes 80% of usual', () => {
    const start = T(2026, 9, 5, 9);
    const hist = [1, 2, 3, 4].map((w) => exp(sodMinus(start, w), 100000));
    const v = challengeView({ id: 'a', key: 'lowweek', startedAt: start }, [...hist, exp(T(2026, 9, 6), 90000)], T(2026, 9, 7, 9), money);
    expect(v.status).toBe('missed');
    const ok = challengeView({ id: 'a', key: 'lowweek', startedAt: start }, [...hist, exp(T(2026, 9, 6), 30000)], T(2026, 9, 7, 9), money);
    expect(ok.status).toBe('running');
  });
});
function sodMinus(t: number, w: number) { const d = new Date(t); d.setHours(12, 0, 0, 0); return d.getTime() - w * 7 * DAY + DAY; }

describe('no-spend challenge can be missed', () => {
  it('is missed when too few days are left', () => {
    const start = T(2026, 9, 1, 9);
    const spends = Array.from({ length: 9 }, (_, i) => exp(T(2026, 9, 1 + i)));
    const v = challengeView({ id: 'a', key: 'nospend7', startedAt: start }, spends, T(2026, 9, 9, 20), money);
    expect(v.status).toBe('missed');
  });
});

describe('custom challenges', () => {
  const start = T(2026, 9, 1, 9);
  it('skip a category: breaks on a spend there, wins after the days pass', () => {
    const spec = { kind: 'skipcat' as const, category: 'cat_food', categoryName: 'Food', days: 3 };
    const ok = challengeView({ id: 'c', key: 'custom', startedAt: start, custom: spec }, [exp(T(2026, 9, 2), 100, 'cat_shopping')], T(2026, 9, 4, 9), money);
    expect(ok.status).toBe('won');
    expect(ok.def.title).toBe('No Food for 3 days');
    const broke = challengeView({ id: 'c', key: 'custom', startedAt: start, custom: spec }, [exp(T(2026, 9, 2), 100, 'cat_food')], T(2026, 9, 3, 9), money);
    expect(broke.status).toBe('missed');
  });
  it('daily cap: any day over the cap ends it; fixed costs never count', () => {
    const spec = { kind: 'daycap' as const, cap: 50000, days: 5 };
    const run = challengeView({ id: 'c', key: 'custom', startedAt: start, custom: spec }, [exp(T(2026, 9, 1), 40000), exp(T(2026, 9, 2), 900000, 'cat_rent')], T(2026, 9, 3, 9), money);
    expect(run.status).toBe('running');
    expect(run.progress).toBe(2);
    const over = challengeView({ id: 'c', key: 'custom', startedAt: start, custom: spec }, [exp(T(2026, 9, 2), 60000)], T(2026, 9, 3, 9), money);
    expect(over.status).toBe('missed');
  });
});
