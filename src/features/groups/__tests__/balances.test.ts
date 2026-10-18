import type { ExpenseLike } from '../balances';
import { applyTransfers, computeBalances, greedySettle, pairwiseDebts, simplifyDebts, toGroupCurrency, type Balances } from '../balances';
import { upiLink } from '../upi';

const sum = (b: Balances) => Object.values(b).reduce((a, c) => a + c, 0);

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('balances: dinner paid by A, split 3 ways', () => {
  const b = computeBalances([{ amount: 3000, currency: 'INR', rate: 1, payers: { a: 3000 }, shares: { a: 1000, b: 1000, c: 1000 } }], []);
  expect(b).toEqual({ a: 2000, b: -1000, c: -1000 });
  expect(sum(b)).toBe(0);
});
test('settlements reduce balances', () => {
  const e = [{ amount: 3000, currency: 'INR', rate: 1, payers: { a: 3000 }, shares: { a: 1000, b: 1000, c: 1000 } }];
  const b = computeBalances(e, [{ from: 'b', to: 'a', amount: 1000 }]);
  expect(b).toEqual({ a: 1000, b: 0, c: -1000 });
});
test('multiple payers', () => {
  const b = computeBalances([{ amount: 1000, currency: 'INR', rate: 1, payers: { a: 600, b: 400 }, shares: { a: 500, b: 500 } }], []);
  expect(b).toEqual({ a: 100, b: -100 });
});
test('multi-currency conversion keeps balances zero-sum', () => {
  const e = { amount: 10001, currency: 'USD', rate: 83.37, payers: { a: 10001 }, shares: { a: 3334, b: 3334, c: 3333 } };
  const g = toGroupCurrency(e, 'INR');
  expect(Object.values(g.payers).reduce((x, y) => x + y, 0)).toBe(Object.values(g.shares).reduce((x, y) => x + y, 0));
  expect(sum(computeBalances([e], [], 'INR'))).toBe(0);
});

test('simplify: chain A->B->C collapses', () => {
  // A owes B 10, B owes C 10  => balances A -10, B 0, C +10  => single transfer
  const t = simplifyDebts({ a: -1000, b: 0, c: 1000 });
  expect(t).toEqual([{ from: 'a', to: 'c', amount: 1000 }]);
});
test('simplify beats greedy when zero-sum subgroups exist', () => {
  // two independent pairs plus... greedy can mix groups and need more transfers
  const b: Balances = { a: 5, b: -5, c: 3, d: -3, e: 2, f: -2 };
  const opt = simplifyDebts(b);
  expect(opt.length).toBe(3);
  expect(applyTransfers(b, opt)).toEqual({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 });
  const b2: Balances = { a: 7, b: 3, c: -4, d: -6 }; // 7-6... best is 3 transfers? a(7)<-d(6),c(1); b(3)<-c(3)
  expect(simplifyDebts(b2).length).toBeLessThanOrEqual(greedySettle(b2).length);
});
test('simplify rejects non zero-sum', () => {
  expect(() => simplifyDebts({ a: 1, b: 1 })).toThrow();
});
test('empty / all-zero', () => {
  expect(simplifyDebts({})).toEqual([]);
  expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
});

test('property: random expense sets -> balances sum to 0, transfers settle everyone, count <= n-1 and <= greedy', () => {
  const r = rng(99);
  for (let trial = 0; trial < 150; trial++) {
    const n = 2 + Math.floor(r() * 8);
    const ids = Array.from({ length: n }, (_, i) => `p${i}`);
    const expenses = Array.from({ length: 1 + Math.floor(r() * 12) }, () => {
      const total = 100 + Math.floor(r() * 90000);
      const payer = ids[Math.floor(r() * n)];
      const part = ids.filter(() => r() < 0.6);
      const people = part.length ? part : [ids[0]];
      const base = Math.floor(total / people.length);
      const shares = Object.fromEntries(people.map((p, i) => [p, base + (i === 0 ? total - base * people.length : 0)]));
      return { amount: total, currency: 'INR', rate: 1, payers: { [payer]: total }, shares };
    });
    const settlements = r() < 0.5 ? [{ from: ids[0], to: ids[1], amount: 100 + Math.floor(r() * 500) }] : [];
    const b = computeBalances(expenses, settlements);
    expect(sum(b)).toBe(0);
    const t = simplifyDebts(b);
    const after = applyTransfers(b, t);
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
    const nz = Object.values(b).filter((v) => v !== 0).length;
    expect(t.length).toBeLessThanOrEqual(Math.max(0, nz - 1));
    expect(t.length).toBeLessThanOrEqual(greedySettle(b).length);
    expect(t.every((x) => x.amount > 0 && x.from !== x.to)).toBe(true);
  }
});

test('pairwise debts net out to the same balances', () => {
  const e: ExpenseLike[] = [
    { amount: 3000, currency: 'INR', rate: 1, payers: { a: 3000 }, shares: { a: 1000, b: 1000, c: 1000 } },
    { amount: 1200, currency: 'INR', rate: 1, payers: { b: 1200 }, shares: { a: 400, b: 400, c: 400 } },
  ];
  const pw = pairwiseDebts(e, []);
  const b = computeBalances(e, []);
  expect(applyTransfers(b, pw)).toEqual({ a: 0, b: 0, c: 0 });
  // a<->b: b owes a 1000, a owes b 400 => b owes a 600
  expect(pw.find((t) => t.from === 'b' && t.to === 'a')?.amount).toBe(600);
});

test('upi link', () => {
  expect(upiLink({ vpa: 'ravi@okaxis', name: 'Ravi K', amountMinor: 45050, note: 'Goa trip' })).toBe(
    'upi://pay?pa=ravi%40okaxis&pn=Ravi%20K&am=450.50&cu=INR&tn=Goa%20trip',
  );
});
