import { buildFrame, frameStart, RANGES, rolling, ymd } from '../frames';
import { DAY, startOfDay } from '@/lib/date';
import type { Transaction } from '@/domain/types';

const NOW = new Date(2026, 9, 19, 15).getTime(); // 19 Oct 2026
const tx = (daysAgo: number, amount: number, type: 'expense' | 'income' = 'expense'): Transaction =>
  ({ id: `${daysAgo}-${amount}-${type}`, type, amount, currency: 'INR', occurred_at: startOfDay(NOW) - daysAgo * DAY + 12 * 3600_000 }) as Transaction;

test('each range has one point per day and ends today', () => {
  const spans = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365 } as const;
  for (const r of RANGES) {
    const f = buildFrame([], NOW, r);
    expect(f.points).toHaveLength(spans[r]);
    expect(f.points[f.points.length - 1].date).toBe('2026-10-19');
  }
});
test('totals, income and the comparison with the stretch before', () => {
  const f = buildFrame([tx(0, 100), tx(1, 200), tx(5, 50), tx(35, 999), tx(31, 100), tx(3, 5000, 'income')], NOW, '1M');
  expect(f.spent).toBe(350);
  expect(f.income).toBe(5000);
  expect(f.prevSpent).toBe(1099);
  expect(f.delta).toBe(-749);
  expect(f.percent).toBe(-68.15);
});
test('the line is a short average, so one big day does not flatten the rest', () => {
  const f = buildFrame([tx(10, 7000)], NOW, '3M');
  expect(f.spent).toBe(7000);
  expect(Math.max(...f.points.map((p) => Number(p.valuePaise)))).toBeLessThanOrEqual(1000);
});
test('empty data gives zeros, no percent and no NaN', () => {
  for (const r of RANGES) {
    const f = buildFrame([], NOW, r);
    expect(f.spent).toBe(0);
    expect(f.percent).toBeNull();
    expect(f.points.every((p) => Number.isFinite(Number(p.valuePaise)))).toBe(true);
  }
});
test('frameStart reaches back far enough for the comparison', () => {
  expect(frameStart('1M', NOW)).toBeLessThanOrEqual(startOfDay(NOW) - 59 * DAY);
  expect(frameStart('1Y', NOW)).toBeLessThanOrEqual(startOfDay(NOW) - 729 * DAY);
});
test('rolling average keeps length, softens spikes, never goes negative', () => {
  expect(rolling([0, 0, 90, 0, 0])).toEqual([0, 30, 30, 30, 0]);
  expect(rolling([])).toEqual([]);
  expect(rolling([5])).toEqual([5]);
});
test('ymd is a plain local date string', () => {
  expect(ymd(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
});
