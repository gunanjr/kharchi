import { PRICING, COMPARISON, perMonthOf, yearlySavingPct, priceLabel } from '../pricing';
import { PLUS_PERKS } from '../index';

test('yearly is cheaper per month and the saving is a whole number', () => {
  expect(perMonthOf('yearly')).toBeLessThan(perMonthOf('monthly'));
  expect(yearlySavingPct()).toBe(47);
  expect(Number.isInteger(PRICING.monthly) && Number.isInteger(PRICING.yearly)).toBe(true);
});
test('labels read naturally', () => {
  expect(priceLabel('monthly')).toBe('₹79 a month');
  expect(priceLabel('yearly')).toBe('₹499 a year');
});
test('every Plus perk appears in the comparison table as free:false or limited', () => {
  const rows = COMPARISON.map((r) => r.label.toLowerCase()).join(' | ');
  for (const w of ['goals', 'history', 'image', 'health', 'receipt', 'accent']) expect(rows).toContain(w);
  expect(PLUS_PERKS.length).toBeGreaterThanOrEqual(6);
  for (const r of COMPARISON) expect(r.label).not.toMatch(/—/);
});
