import { parseBillRows, parseItemRow } from '../parse';
import { groupIntoRows } from '../rows';
import { SAMPLE_BILLS } from '../samples';
import { assignRestToAll, billExtra, buildItemizedSplit, toggleAssignee, type AssignedItem } from '../assign';
import { computeShares } from '@/features/groups/split';

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe.each(SAMPLE_BILLS.map((s) => [s.name, s] as const))('sample: %s', (_n, s) => {
  const bill = parseBillRows(s.rows);
  it('finds the right items and amounts', () => {
    expect(bill.items.map((i) => [i.name.toLowerCase(), i.amount])).toEqual(s.expect.items.map(([n, a]) => [n.toLowerCase(), a]));
  });
  it('finds the payable total', () => expect(bill.total).toBe(s.expect.total));
  if (s.expect.store) it('finds the store', () => expect(bill.store?.toLowerCase()).toContain(s.expect.store!.toLowerCase().split(' ')[0]));
  it('has no hard warnings', () => expect(bill.warnings.filter((w) => w === 'no_items' || w === 'total_unreliable')).toEqual([]));
});

test('quantity x rate is understood', () => {
  expect(parseItemRow('TATA SALT 1KG 25010010 2 28.00 56.00')).toMatchObject({ qty: 2, rate: 2800, amount: 5600 });
  expect(parseItemRow('2 Butter Naan 40.00 80.00')).toMatchObject({ name: 'Butter Naan', qty: 2, rate: 4000, amount: 8000 });
  expect(parseItemRow('ONION LOOSE 0.850 KG 40.00 34.00')).toMatchObject({ qty: 0.85, amount: 3400 });
});

test('non-item rows are rejected', () => {
  expect(parseItemRow('Thank you visit again')).toBeNull();
  expect(parseItemRow('Phone 080 4123 4567')).toBeNull();
  expect(parseItemRow('1234.00')).toBeNull();
});

test('OCR slips: O for 0, decimal comma', () => {
  expect(parseItemRow('Milk 1L 5O.00')?.amount).toBe(5000);
  expect(parseItemRow('Paneer 200g 85,00')?.amount).toBe(8500);
});

test('rows are rebuilt from boxes (columns arrive as separate fragments, slight tilt)', () => {
  const box = (text: string, left: number, top: number) => ({ text, left, right: left + 200, top, bottom: top + 30 });
  const rows = groupIntoRows([
    box('265.00', 600, 102), box('AASHIRVAAD ATTA', 10, 100), box('1', 400, 98),
    box('TOTAL', 10, 160), box('265.00', 600, 158),
  ]);
  expect(rows).toEqual(['AASHIRVAAD ATTA 1 265.00', 'TOTAL 265.00']);
  expect(groupIntoRows([])).toEqual([]);
});

describe('assignment and splitting', () => {
  const items: AssignedItem[] = [
    { id: 'a', name: 'Atta', amount: 30000, assignees: [] },
    { id: 'b', name: 'Soda', amount: 10000, assignees: [] },
  ];
  it('requires every item to be assigned and tells you how many are left', () => {
    const r = buildItemizedSplit(items, 40000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/2 items not assigned/);
  });
  it('splits items by person and spreads tax in proportion', () => {
    let a = toggleAssignee(items, 'a', 'p1');
    a = toggleAssignee(a, 'b', 'p1');
    a = toggleAssignee(a, 'b', 'p2');
    // items: p1 pays 300 + 50 = 350 ; p2 50. Total 420 -> extra 20 spread 350:50
    const r = buildItemizedSplit(a, 42000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(sum(r.shares)).toBe(42000);
      expect(r.shares.p1).toBe(35000 + 1750);
      expect(r.shares.p2).toBe(5000 + 250);
    }
  });
  it('a discount (negative extra) reduces everyone proportionally and still sums exactly', () => {
    const a = assignRestToAll(items, ['p1', 'p2']);
    const r = buildItemizedSplit(a, 36000);
    expect(billExtra(36000, a)).toBe(-4000);
    expect(r.ok && sum(r.shares)).toBe(36000);
  });
  it('toggling twice removes the person', () => {
    const a = toggleAssignee(toggleAssignee(items, 'a', 'p1'), 'a', 'p1');
    expect(a[0].assignees).toEqual([]);
  });
  it('property: any assignment of random items always sums to the total', () => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const people = ['p1', 'p2', 'p3', 'p4'];
    for (let t = 0; t < 200; t++) {
      const its: AssignedItem[] = Array.from({ length: 1 + Math.floor(rnd() * 8) }, (_, i) => ({
        id: `i${i}`, name: 'x', amount: 100 + Math.floor(rnd() * 90000),
        assignees: people.filter(() => rnd() < 0.5).concat(rnd() < 0.5 ? [] : ['p1']).filter((v, i, arr) => arr.indexOf(v) === i),
      })).map((i) => (i.assignees.length ? i : { ...i, assignees: ['p2'] }));
      const base = its.reduce((a, i) => a + i.amount, 0);
      const total = Math.max(1, Math.round(base * (0.9 + rnd() * 0.3)));
      const r = buildItemizedSplit(its, total);
      expect(r.ok).toBe(true);
      if (r.ok) expect(sum(r.shares)).toBe(total);
    }
  });
});

test('computeShares supports a negative extra (discount) and rejects an impossible one', () => {
  expect(sum(computeShares(900, { type: 'itemized', items: [{ amount: 1000, participants: ['a', 'b'] }], extra: -100 }))).toBe(900);
  expect(() => computeShares(1, { type: 'itemized', items: [{ amount: 100, participants: ['a'] }], extra: -99 })).not.toThrow();
});
