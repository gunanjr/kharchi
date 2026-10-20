import { endsAt, status, reminderTimes, sortWarranties, validateWarranty, type Warranty } from '../warranty';
const at = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();
const w = (over: Partial<Warranty> = {}): Warranty => ({ id: 'a', item: 'Phone', store: 'Croma', boughtAt: at(2025, 0, 31), months: 13, amount: 5000000, receipt: null, ...over });

test('end date: same day N months later, clamped to month end', () => {
  expect(new Date(endsAt(w())).getDate()).toBe(28); // 31 Jan 2025 + 13 months = 28 Feb 2026
  expect(new Date(endsAt(w({ boughtAt: at(2025, 4, 10), months: 12 }))).toDateString()).toBe(new Date(2026, 4, 10).toDateString());
});
test('status: active, ending within 30 days, expired', () => {
  const x = w({ boughtAt: at(2025, 9, 20), months: 12 });
  expect(status(x, at(2026, 5, 1)).status).toBe('active');
  expect(status(x, at(2026, 9, 1)).status).toBe('ending');
  expect(status(x, at(2026, 10, 1)).status).toBe('expired');
});
test('reminders at 30 and 7 days before, only in the future', () => {
  const x = w({ boughtAt: at(2025, 9, 20), months: 12 });
  expect(reminderTimes(x, at(2026, 5, 1))).toHaveLength(2);
  expect(reminderTimes(x, at(2026, 9, 1))).toHaveLength(1);
  expect(reminderTimes(x, at(2026, 10, 1))).toHaveLength(0);
});
test('ending first, expired last; validation', () => {
  const now = at(2026, 9, 1);
  const list = sortWarranties([w({ id: 'old', boughtAt: at(2020, 0, 1), months: 12 }), w({ id: 'soon', boughtAt: at(2025, 9, 20), months: 12 }), w({ id: 'long', boughtAt: at(2026, 0, 1), months: 24 })], now);
  expect(list.map((x) => x.id)).toEqual(['soon', 'long', 'old']);
  expect(validateWarranty({ item: '', months: 12, boughtAt: now }, now)).toMatch(/buy/);
  expect(validateWarranty({ item: 'TV', months: 0, boughtAt: now }, now)).toMatch(/1 to 120/);
  expect(validateWarranty({ item: 'TV', months: 12, boughtAt: now + 5 * 86400000 }, now)).toMatch(/future/);
  expect(validateWarranty({ item: 'TV', months: 12, boughtAt: now }, now)).toBeNull();
});
