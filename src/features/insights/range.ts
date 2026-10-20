import type { Transaction } from '@/domain/types';
import { DAY, startOfDay } from '@/lib/date';
import { SPAN, buildFrame, type FrameData, type Range } from '@/features/tracker/frames';
import { byCategory, monthlyTrend, topMerchants } from './analytics';

export interface RangeInsights {
  range: Range;
  /** Spent, income, change versus the stretch before (the same maths as the Home hero). */
  frame: FrameData;
  cats: { category_id: string | null; total: number; share: number }[];
  merchants: { name: string; total: number }[];
  /** Calendar months for the month-by-month bars: 3 for 1M and 3M, 6 for 6M, 12 for 1Y. */
  months: { month: number; income: number; expense: number }[];
  /** Average spend on each weekday inside the window (0 = Sunday), so a weekday that occurs more often is not unfairly high. */
  weekday: number[];
  /** The weekday with the highest average, or null when there is no spending. */
  priciest: number | null;
  noSpendDays: number;
}

const MONTHS_FOR: Record<Range, number> = { '1M': 6, '3M': 6, '6M': 6, '1Y': 12 };

/** Pure: everything the range-driven part of the Insights screen shows. `all` must already exclude entries left out of totals. */
export function buildRangeInsights(all: Transaction[], now: number, range: Range): RangeInsights {
  const end = startOfDay(now) + DAY;
  const from = end - SPAN[range] * DAY;
  const inWin = all.filter((t) => t.occurred_at >= from && t.occurred_at < end);
  const spend = inWin.filter((t) => t.type === 'expense');
  const total = spend.reduce((a, t) => a + t.amount, 0);

  const cats = byCategory(spend).map((c) => ({ ...c, share: total ? c.total / total : 0 }));

  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);
  for (let d = from; d < end; d += DAY) counts[new Date(d + 12 * 3600_000).getDay()]++;
  for (const t of spend) sums[new Date(t.occurred_at).getDay()] += t.amount;
  const weekday = sums.map((s, i) => (counts[i] ? Math.round(s / counts[i]) : 0));
  const max = Math.max(...weekday);

  const days = new Set(spend.map((t) => startOfDay(t.occurred_at)));
  const span = SPAN[range];
  const elapsedDays = Math.min(span, Math.max(0, Math.round((end - from) / DAY)));
  const noSpendDays = Math.max(0, elapsedDays - days.size);

  return {
    range,
    frame: buildFrame(all, now, range),
    cats,
    // places you chose to spend at: rent, bills and subscriptions are not places
    merchants: topMerchants(spend.filter((t) => !['cat_rent', 'cat_bills', 'cat_subscriptions'].includes(t.category_id ?? '')), 6),
    months: monthlyTrend(all, now, MONTHS_FOR[range]),
    weekday,
    priciest: max > 0 ? weekday.indexOf(max) : null,
    noSpendDays,
  };
}
