import type { Transaction } from '@/domain/types';
import { DAY, startOfDay } from '@/lib/date';

/** The hero's time frames: the same four a person finds on the Fermor Home, measured back from today. */
export type Range = '1M' | '3M' | '6M' | '1Y';
export const RANGES: readonly Range[] = ['1M', '3M', '6M', '1Y'];
export const RANGE_LABEL: Record<Range, string> = { '1M': '1 month', '3M': '3 months', '6M': '6 months', '1Y': '1 year' };
/** What the change line is measured against for each time frame. */
export const VERSUS_LABEL: Record<Range, string> = { '1M': 'last month', '3M': '3 months ago', '6M': '6 months ago', '1Y': 'last year' };
const SPAN: Record<Range, number> = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365 };

export interface FramePoint { date: string; valuePaise: string }
export interface FrameData {
  range: Range;
  spent: number;
  income: number;
  prevSpent: number;
  /** Amount more (positive) or less (negative) than the stretch before. */
  delta: number;
  /** Percent change against that stretch, two decimals, or null when there was no earlier spending. */
  percent: number | null;
  /** One point per day: spend, softened with a short moving average so one big day does not flatten the rest. */
  points: FramePoint[];
}

const sum = (l: Transaction[], type: Transaction['type']) => l.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);
const within = (l: Transaction[], from: number, to: number) => l.filter((t) => t.occurred_at >= from && t.occurred_at < to);

/** Centered moving average: softens one-off spikes so the trend reads as hills, not a single peak. */
export const rolling = (a: number[], radius = 1) => a.map((_, i) => { const s = a.slice(Math.max(0, i - radius), i + radius + 1); return Math.round(s.reduce((x, y) => x + y, 0) / s.length); });

/** `YYYY-MM-DD` in local time (the chart reads this string, so no timezone can shift a date). */
export const ymd = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Pure: everything the Home hero shows for one time frame. `txs` must already exclude entries the user left out of totals. */
export function buildFrame(txs: Transaction[], now: number, range: Range): FrameData {
  const span = SPAN[range];
  const end = startOfDay(now) + DAY; // exclusive
  const from = end - span * DAY;
  const cur = within(txs, from, end);
  const prev = within(txs, from - span * DAY, from);
  const daily = Array.from({ length: span }, (_, k) => sum(within(cur, from + k * DAY, from + (k + 1) * DAY), 'expense'));
  const shown = rolling(daily, range === '1M' ? 1 : 3);
  const spent = sum(cur, 'expense');
  const prevSpent = sum(prev, 'expense');
  return {
    range, spent, income: sum(cur, 'income'), prevSpent, delta: spent - prevSpent,
    percent: prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 10000) / 100 : null,
    points: shown.map((v, k) => ({ date: ymd(from + k * DAY + 12 * 3600_000), valuePaise: String(v) })),
  };
}

/** Earliest date a frame needs, including the stretch it is compared with. */
export const frameStart = (range: Range, now: number) => startOfDay(now) + DAY - SPAN[range] * 2 * DAY;
