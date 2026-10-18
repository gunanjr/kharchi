import { computeShares, SplitError, validatePayers } from '../split';

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

test('equal split distributes remainder paise', () => {
  const r = computeShares(10000, { type: 'equal', participants: ['a', 'b', 'c'] });
  expect(Object.values(r).sort()).toEqual([3333, 3333, 3334]);
  expect(sum(r)).toBe(10000);
});
test('exact', () => {
  expect(computeShares(1000, { type: 'exact', amounts: { a: 400, b: 600 } })).toEqual({ a: 400, b: 600 });
  expect(() => computeShares(1000, { type: 'exact', amounts: { a: 400, b: 500 } })).toThrow(SplitError);
});
test('percent', () => {
  const r = computeShares(10001, { type: 'percent', percents: { a: 33.3, b: 33.3, c: 33.4 } });
  expect(sum(r)).toBe(10001);
  expect(() => computeShares(1000, { type: 'percent', percents: { a: 50, b: 40 } })).toThrow(SplitError);
});
test('shares', () => {
  expect(computeShares(900, { type: 'shares', shares: { a: 1, b: 2, c: 0 } })).toEqual({ a: 300, b: 600 });
});
test('adjustment', () => {
  // 1000 total, a gets +100 extra: remaining 900 split equally = 450 each; a = 550
  expect(computeShares(1000, { type: 'adjustment', participants: ['a', 'b'], adjustments: { a: 100 } })).toEqual({ a: 550, b: 450 });
  expect(() => computeShares(100, { type: 'adjustment', participants: ['a'], adjustments: { a: 200 } })).toThrow(SplitError);
});
test('itemized with proportional tax', () => {
  // items: 600 shared by a,b ; 400 only a. subtotal a=700,b=300. extra 100 -> a 70, b 30
  const r = computeShares(1100, { type: 'itemized', items: [{ amount: 600, participants: ['a', 'b'] }, { amount: 400, participants: ['a'] }], extra: 100 });
  expect(r).toEqual({ a: 770, b: 330 });
  expect(() => computeShares(1000, { type: 'itemized', items: [{ amount: 600, participants: ['a'] }] })).toThrow(SplitError);
});
test('validation', () => {
  expect(() => computeShares(0, { type: 'equal', participants: ['a'] })).toThrow();
  expect(() => computeShares(100, { type: 'equal', participants: [] })).toThrow();
  expect(() => validatePayers(100, { a: 50, b: 40 })).toThrow();
  expect(() => validatePayers(100, { a: 50, b: 50 })).not.toThrow();
});
test('property: every split type always sums to the total', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let t = 0; t < 300; t++) {
    const total = 1 + Math.floor(rnd() * 500000);
    const n = 1 + Math.floor(rnd() * 7);
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    expect(sum(computeShares(total, { type: 'equal', participants: ids }))).toBe(total);
    expect(sum(computeShares(total, { type: 'shares', shares: Object.fromEntries(ids.map((i) => [i, 1 + Math.floor(rnd() * 5)])) }))).toBe(total);
    const raw = ids.map(() => rnd() + 0.05);
    const tot = raw.reduce((a, b) => a + b, 0);
    expect(sum(computeShares(total, { type: 'percent', percents: Object.fromEntries(ids.map((i, k) => [i, (raw[k] / tot) * 100])) }))).toBe(total);
  }
});
