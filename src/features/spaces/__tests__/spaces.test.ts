import { summarize, validateSpace, type Space } from '../spaces';
const t = (type: 'income' | 'expense', amount: number, space_id: string | null, day = 5, extra = {}) => ({ type, amount, space_id, occurred_at: new Date(2026, 9, day).getTime(), ...extra });
const from = new Date(2026, 9, 1).getTime(), to = new Date(2026, 10, 1).getTime();

test('side hustle: profit, margin and tax to set aside', () => {
  const side: Space = { id: 's1', name: 'Design work', kind: 'side', emoji: '💼', taxPct: 20 };
  const r = summarize(side, [t('income', 4200000, 's1'), t('expense', 900000, 's1'), t('expense', 50000, null), t('income', 1000, 's1', 5, { excluded: 1 })], from, to);
  expect(r).toMatchObject({ income: 4200000, spent: 900000, profit: 3300000, margin: 79, taxSetAside: 660000, entries: 2 });
});
test('home: your share by ratio; trip: budget left and used', () => {
  const home: Space = { id: 'h', name: 'Flat', kind: 'home', emoji: '🏠', myShare: 60 };
  expect(summarize(home, [t('expense', 100000, 'h')], from, to).myShare).toBe(60000);
  const trip: Space = { id: 'g', name: 'Goa', kind: 'trip', emoji: '✈️', budget: 3000000 };
  expect(summarize(trip, [t('expense', 1200000, 'g')], from, to)).toMatchObject({ budgetLeft: 1800000, budgetUsedPct: 40 });
  expect(summarize({ ...trip, budget: null }, [], from, to)).toMatchObject({ budgetLeft: null, margin: null, profit: 0 });
});
test('out-of-range values are clamped and a loss never sets tax aside', () => {
  const side: Space = { id: 's', name: 'x', kind: 'side', emoji: '💼', taxPct: 400 };
  expect(summarize(side, [t('income', 1000, 's'), t('expense', 5000, 's')], from, to).taxSetAside).toBe(0);
  expect(summarize({ ...side, taxPct: 400 }, [t('income', 10000, 's')], from, to).taxSetAside).toBe(5000); // capped at 50%
});
test('validation', () => {
  const ex: Space[] = [{ id: 'a', name: 'Flat', kind: 'home', emoji: '🏠' }];
  expect(validateSpace({ name: '', existing: ex })).toMatch(/name/);
  expect(validateSpace({ name: 'personal', existing: ex })).toMatch(/Personal/);
  expect(validateSpace({ name: 'flat', existing: ex })).toMatch(/already/);
  expect(validateSpace({ name: 'Flat', existing: ex, id: 'a' })).toBeNull(); // renaming itself
  expect(validateSpace({ name: 'Trip', existing: ex })).toBeNull();
});
