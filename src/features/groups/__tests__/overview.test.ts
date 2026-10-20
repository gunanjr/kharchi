import { overview, sortByOutstanding, memberLine } from '../overview';

test('totals split into owed to you and owed by you', () => {
  const o = overview([{ net: 500 }, { net: -200 }, { net: 0 }, { net: 300 }]);
  expect(o).toEqual({ owed: 800, owe: 200, net: 600, owedBy: 2, oweTo: 1 });
});
test('empty and all-settled give zeros', () => {
  expect(overview([])).toEqual({ owed: 0, owe: 0, net: 0, owedBy: 0, oweTo: 0 });
  expect(overview([{ net: 0 }]).net).toBe(0);
});
test('unsettled groups come first, biggest first, settled keep their order', () => {
  const g = [{ id: 'a', myBalance: 0 }, { id: 'b', myBalance: -50 }, { id: 'c', myBalance: 400 }, { id: 'd', myBalance: 0 }];
  expect(sortByOutstanding(g).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd']);
});
test('member line reads naturally', () => {
  expect(memberLine([])).toBe('Just you');
  expect(memberLine(['Asha'])).toBe('Asha');
  expect(memberLine(['Asha', 'Ravi'])).toBe('Asha and Ravi');
  expect(memberLine(['Asha', 'Ravi', 'Meera', 'Dev'])).toBe('Asha, Ravi and 2 more');
});
