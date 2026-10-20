import { dueIn, viewOf, viewAll, togglePaid, monthKey, reminderAt, monthSummary, calendarMonth, validateDue, type DueItem } from '../dues';

const item = (over: Partial<DueItem> = {}): DueItem => ({ id: 'a', name: 'Card', kind: 'card', amount: 500000, day: 5, remindBefore: 1, paid: [], ...over });
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).getTime();

test('short months clamp the due day', () => {
  expect(new Date(dueIn({ day: 31 }, 2026, 1)).getDate()).toBe(28); // Feb 2026
  expect(new Date(dueIn({ day: 31 }, 2028, 1)).getDate()).toBe(29); // leap year
  expect(new Date(dueIn({ day: 31 }, 2026, 3)).getDate()).toBe(30); // April
});

test('status moves from later to soon, today, overdue, and paid jumps to next month', () => {
  expect(viewOf(item(), at(2026, 9, 1)).status).toBe('later');
  expect(viewOf(item(), at(2026, 9, 3)).status).toBe('soon');
  expect(viewOf(item(), at(2026, 9, 5)).status).toBe('today');
  const late = viewOf(item(), at(2026, 9, 9));
  expect(late).toMatchObject({ status: 'overdue', inDays: -4, month: '2026-10' });
  const paid = viewOf(item({ paid: ['2026-10'] }), at(2026, 9, 9));
  expect(paid.month).toBe('2026-11');
  expect(paid.status).toBe('later');
});

test('December rolls into January', () => {
  const v = viewOf(item({ paid: ['2026-12'] }), at(2026, 11, 20));
  expect(v.month).toBe('2027-01');
});

test('sorting puts overdue first, paid last', () => {
  const list = viewAll([item({ id: '1', day: 25 }), item({ id: '2', day: 2 }), item({ id: '3', day: 10, paid: ['2026-10'] })], at(2026, 9, 9));
  expect(list.map((v) => v.id)).toEqual(['2', '1', '3']);
});

test('togglePaid adds and removes a month and keeps 24 months', () => {
  const months = Array.from({ length: 30 }, (_, i) => monthKey(at(2024, i, 1)));
  let x = item({ paid: months });
  x = togglePaid(x, '2027-01');
  expect(x.paid).toHaveLength(24);
  expect(togglePaid(x, '2027-01').paid).not.toContain('2027-01');
});

test('reminder time is 10 am the chosen days before, never in the past, none when paid', () => {
  const v = viewOf(item({ remindBefore: 3 }), at(2026, 9, 1));
  expect(new Date(reminderAt(v, at(2026, 9, 1))!)).toEqual(new Date(2026, 9, 2, 10));
  expect(reminderAt(v, at(2026, 9, 2, 11))).toBeNull();
  expect(reminderAt(viewOf(item({ paid: ['2026-10', '2026-11'] }), at(2026, 9, 9)), at(2026, 9, 9))).toBeNull();
});

test('month summary and calendar', () => {
  const items = [item({ id: '1', amount: 100000, paid: ['2026-10'] }), item({ id: '2', amount: null, day: 31 }), item({ id: '3', amount: 50000, day: 5 })];
  expect(monthSummary(items, at(2026, 9, 9))).toMatchObject({ due: 150000, paid: 100000, count: 3, paidCount: 1 });
  const cal = calendarMonth(items, 2026, 1);
  expect(cal).toHaveLength(28);
  expect(cal[4].count).toBe(2);
  expect(cal[27].count).toBe(1);
});

test('validation explains what is wrong', () => {
  expect(validateDue({ name: '', day: 5 })).toMatch(/name/);
  expect(validateDue({ name: 'Rent', day: 0 })).toMatch(/1 to 31/);
  expect(validateDue({ name: 'Rent', day: 32 })).toMatch(/1 to 31/);
  expect(validateDue({ name: 'x'.repeat(41), day: 5 })).toMatch(/40/);
  expect(validateDue({ name: 'Rent', day: 1 })).toBeNull();
});
