/**
 * HOME-01 Net Worth trend — pure presentation helpers (no money maths: the
 * backend owns every figure; this only formats and draws them). Kept free of
 * React so it can be unit-tested with `node --test`.
 */

export interface Pt {
  x: number;
  y: number;
}

const fixed = (n: number): string => (Math.round(n * 100) / 100).toString();

/**
 * Maps a value series onto a `width` x `height` box, oldest at the left. Pixel
 * y grows downward, so the largest value sits at `pad.top`. A flat series is
 * drawn mid-height rather than dividing by zero. Values are only plotted, never
 * summed, so plain numbers are fine here.
 */
export function scaleSeries(
  values: readonly number[],
  width: number,
  height: number,
  pad: { left: number; right: number; top: number; bottom: number },
): Pt[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = Math.max(0, height - pad.top - pad.bottom);
  const span = max - min;
  return values.map((v, i) => ({
    x: pad.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    y: pad.top + (span === 0 ? innerH / 2 : (1 - (v - min) / span) * innerH),
  }));
}

/**
 * A smooth SVG path through the points: a monotone cubic (Fritsch–Carlson), so
 * the curve is rounded but never overshoots a data point — a dip stays a dip
 * and the line never wiggles above the peak.
 */
export function smoothLinePath(pts: readonly Pt[]): string {
  const n = pts.length;
  if (n === 0) return '';
  const first = pts[0] as Pt;
  if (n === 1) return `M${fixed(first.x)} ${fixed(first.y)}`;

  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    const dx = b.x - a.x;
    slope.push(dx === 0 ? 0 : (b.y - a.y) / dx);
  }

  const t: number[] = new Array<number>(n).fill(0);
  t[0] = slope[0] as number;
  t[n - 1] = slope[n - 2] as number;
  for (let i = 1; i < n - 1; i += 1) {
    const l = slope[i - 1] as number;
    const r = slope[i] as number;
    t[i] = l * r <= 0 ? 0 : (l + r) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const m = slope[i] as number;
    if (m === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = (t[i] as number) / m;
    const b = (t[i + 1] as number) / m;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m;
      t[i + 1] = tau * b * m;
    }
  }

  let d = `M${fixed(first.x)} ${fixed(first.y)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    const third = (b.x - a.x) / 3;
    d += ` C${fixed(a.x + third)} ${fixed(a.y + (t[i] as number) * third)} ${fixed(b.x - third)} ${fixed(
      b.y - (t[i + 1] as number) * third,
    )} ${fixed(b.x)} ${fixed(b.y)}`;
  }
  return d;
}

/** The closed area under a line, down to `baseline`, for the soft fill. */
export function areaPath(linePath: string, pts: readonly Pt[], baseline: number): string {
  if (pts.length < 2) return '';
  const first = pts[0] as Pt;
  const last = pts[pts.length - 1] as Pt;
  return `${linePath} L${fixed(last.x)} ${fixed(baseline)} L${fixed(first.x)} ${fixed(baseline)} Z`;
}

export interface ChangeView {
  text: string;
  direction: 'up' | 'down' | 'flat';
}

/**
 * The "+₹55,194 (4.24%) vs last month" line. `formatAmount` formats an integer
 * paise string (the caller passes `formatPaiseString` + the hide-amounts mask);
 * a null result means the amount cannot be shown, so no change line is shown at
 * all. The percent is the backend's own two-decimal figure; absent when the
 * previous month was not positive.
 */
export function describeChange(
  change: { amountPaise: string; percent: number | null },
  formatAmount: (absolutePaise: string) => string | null,
  /** What the change is measured against, e.g. "last month" or "6 months ago" (follows the selected time frame). */
  versus = 'last month',
): ChangeView | null {
  const negative = change.amountPaise.startsWith('-');
  const absolute = negative ? change.amountPaise.slice(1) : change.amountPaise;
  if (!/^\d+$/.test(absolute)) return null;

  if (/^0+$/.test(absolute)) return { text: `No change vs ${versus}`, direction: 'flat' };

  const amount = formatAmount(absolute);
  if (amount === null) return null;
  const percent = change.percent === null ? '' : ` (${Math.abs(change.percent).toFixed(2)}%)`;
  return {
    text: `${negative ? '-' : '+'}${amount}${percent} vs ${versus}`,
    direction: negative ? 'down' : 'up',
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-04-30" -> "Apr". Reads the string, not a Date, so no timezone can shift the month. */
export function monthShort(isoDate: string): string | null {
  const m = /^\d{4}-(\d{2})-\d{2}/.exec(isoDate);
  if (!m) return null;
  return MONTHS[Number(m[1]) - 1] ?? null;
}

/** "Apr to Oct" for the first and last point, or null if either date is unreadable. */
export function trendRange(first: string, last: string): string | null {
  const a = monthShort(first);
  const b = monthShort(last);
  return a === null || b === null ? null : `${a} to ${b}`;
}

/**
 * True when the series' last point is exactly the headline net worth — the rule
 * that the trend may never disagree with the figure beside it. Both are integer
 * paise strings.
 */
export function endsAtNetWorth(
  points: readonly { valuePaise: string }[],
  netWorthPaise: string | null,
): boolean {
  if (netWorthPaise === null || points.length === 0) return false;
  return (points[points.length - 1] as { valuePaise: string }).valuePaise === netWorthPaise;
}

// --- Organic curve, selection and reveal (the interactive hero chart) ---------

/**
 * A softer, more natural curve than `smoothLinePath`: a Catmull–Rom spline
 * through the points, so a handful of monthly values read as a flowing line with
 * gentle rises and dips rather than near-straight segments. Control points are
 * clamped to the data's own vertical range, so the curve never overshoots the
 * highest or lowest point (and so never leaves the chart box). The curve passes
 * through every data point exactly.
 */
export function organicLinePath(pts: readonly Pt[]): string {
  const n = pts.length;
  if (n === 0) return '';
  const first = pts[0] as Pt;
  if (n === 1) return `M${fixed(first.x)} ${fixed(first.y)}`;

  let d = `M${fixed(first.x)} ${fixed(first.y)}`;
  for (const [, c1, c2, p2] of organicSegments(pts)) {
    d += ` C${fixed(c1.x)} ${fixed(c1.y)} ${fixed(c2.x)} ${fixed(c2.y)} ${fixed(p2.x)} ${fixed(p2.y)}`;
  }
  return d;
}

type Segment = readonly [Pt, Pt, Pt, Pt];

/** The Catmull–Rom cubic segments (start, two control points, end) behind `organicLinePath`. */
function organicSegments(pts: readonly Pt[]): Segment[] {
  const n = pts.length;
  const ys = pts.map((p) => p.y);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const clampY = (y: number): number => Math.min(hi, Math.max(lo, y));

  const segments: Segment[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)] as Pt;
    const p1 = pts[i] as Pt;
    const p2 = pts[i + 1] as Pt;
    const p3 = pts[Math.min(n - 1, i + 2)] as Pt;
    segments.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: clampY(p1.y + (p2.y - p0.y) / 6) },
      { x: p2.x - (p3.x - p1.x) / 6, y: clampY(p2.y - (p3.y - p1.y) / 6) },
      p2,
    ]);
  }
  return segments;
}

/**
 * The same curve as `organicLinePath`, as a dense polyline (`perSegment` samples per
 * interval, x strictly increasing). It is what the chart draws and what a finger or
 * mouse is mapped onto, so the marker always sits exactly on the visible line, and it
 * lets the reveal animation and the in-between values work without platform clipping.
 */
export function sampleCurve(pts: readonly Pt[], perSegment = 24): Pt[] {
  if (pts.length < 2) return pts.map((p) => ({ x: p.x, y: p.y }));
  const out: Pt[] = [{ x: (pts[0] as Pt).x, y: (pts[0] as Pt).y }];
  for (const [p1, c1, c2, p2] of organicSegments(pts)) {
    for (let k = 1; k <= perSegment; k += 1) {
      const t = k / perSegment;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const e = t * t * t;
      out.push({
        x: a * p1.x + b * c1.x + c * c2.x + e * p2.x,
        y: a * p1.y + b * c1.y + c * c2.y + e * p2.y,
      });
    }
  }
  return out;
}

/** The curve's y at `x` (clamped to the curve's ends), by linear interpolation between samples. */
export function curveYAtX(samples: readonly Pt[], x: number): number | null {
  const n = samples.length;
  if (n === 0) return null;
  const first = samples[0] as Pt;
  const last = samples[n - 1] as Pt;
  if (x <= first.x) return first.y;
  if (x >= last.x) return last.y;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((samples[mid] as Pt).x <= x) lo = mid;
    else hi = mid;
  }
  const a = samples[lo] as Pt;
  const b = samples[hi] as Pt;
  const span = b.x - a.x;
  return span === 0 ? a.y : a.y + ((x - a.x) / span) * (b.y - a.y);
}

/**
 * Inverse of `scaleSeries`' vertical mapping: the value a pixel row stands for, for a
 * chart drawn from `values` into `height` with `pad`. A flat series maps back to its one
 * value. The result is only ever inside [min, max] of the real history.
 */
export function valueFromY(
  y: number,
  values: readonly number[],
  height: number,
  pad: { top: number; bottom: number },
): number | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerH = Math.max(0, height - pad.top - pad.bottom);
  if (max === min || innerH === 0) return min;
  const ratio = Math.min(1, Math.max(0, 1 - (y - pad.top) / innerH));
  return min + ratio * (max - min);
}

/**
 * The part of a sampled curve left of `xLimit`, ending exactly at `xLimit`, as an SVG
 * polyline path (and the same shape closed down to `baseline` for the fill). Used for the
 * left-to-right reveal: changing a path's `d` repaints reliably on every platform.
 */
export function revealPaths(
  samples: readonly Pt[],
  xLimit: number,
  baseline: number,
): { line: string; area: string } {
  if (samples.length < 2) return { line: '', area: '' };
  const visible: Pt[] = [];
  for (const s of samples) {
    if (s.x <= xLimit) visible.push(s);
    else break;
  }
  const endY = curveYAtX(samples, xLimit);
  const tail = visible[visible.length - 1];
  if (endY !== null && (!tail || tail.x < xLimit)) visible.push({ x: xLimit, y: endY });
  if (visible.length < 2) return { line: '', area: '' };

  const line = visible.map((p, i) => `${i === 0 ? 'M' : 'L'}${fixed(p.x)} ${fixed(p.y)}`).join(' ');
  const first = visible[0] as Pt;
  const end = visible[visible.length - 1] as Pt;
  return { line, area: `${line} L${fixed(end.x)} ${fixed(baseline)} L${fixed(first.x)} ${fixed(baseline)} Z` };
}

/** Index of the point whose x is nearest `px`, or -1 for an empty series. */
export function nearestPointIndex(pts: readonly Pt[], px: number): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < pts.length; i += 1) {
    const distance = Math.abs((pts[i] as Pt).x - px);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

/** "2026-09-30" -> "Sep 2026". Reads the string, so no timezone can shift the month. */
export function monthYearLabel(isoDate: string): string | null {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(isoDate);
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  return month === undefined ? null : `${month} ${m[1]}`;
}

/** Left edge for a tooltip centred on `centerX`, kept inside `[0, containerWidth]`. */
export function clampTooltipLeft(centerX: number, tooltipWidth: number, containerWidth: number): number {
  return Math.max(0, Math.min(containerWidth - tooltipWidth, centerX - tooltipWidth / 2));
}

/** Total time of the first-appearance reveal, in ms. */
export const REVEAL_TOTAL_MS = 1250;

export interface RevealState {
  /** 0–1: how much of the line is drawn, left to right (ease-out). */
  draw: number;
  /** 0–1: the latest point settling in (grows once the line is nearly there). */
  dot: number;
  /** 0–1: a single soft pulse of the latest point's halo after it settles. */
  pulse: number;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * The reveal timeline for `elapsed` ms since the chart first appeared: the line
 * draws over the first 850 ms, the latest point settles from 700 ms to 1000 ms,
 * and the halo pulses once between 850 ms and 1250 ms. Pure, so it is testable
 * and the same on every platform; a reduced-motion user is simply given
 * `REVEAL_TOTAL_MS` straight away.
 */
export function revealState(elapsed: number): RevealState {
  const t = clamp01(elapsed / 850);
  return {
    draw: 1 - Math.pow(1 - t, 3),
    dot: clamp01((elapsed - 700) / 300),
    pulse: Math.sin(Math.PI * clamp01((elapsed - 850) / 400)),
  };
}

/** "8 Sep" for a `YYYY-MM-DD` date (null if unreadable). */
export function dayMonthLabel(isoDate: string): string | null {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  const month = MONTHS[Number(m[1]) - 1];
  return month === undefined ? null : `${Number(m[2])} ${month}`;
}

/**
 * The x-axis labels under the trend: `count` evenly spaced points of the series, first to last.
 * Over a month the labels are days ("8 Sep"); over longer frames they are months ("Apr"), with the
 * two-digit year added for a year ("Oct 25") so the same month at both ends is not ambiguous.
 */
export function axisLabels(dates: readonly string[], range: '1M' | '3M' | '6M' | '1Y', count = 5): string[] {
  if (dates.length === 0) return [];
  const n = Math.min(count, dates.length);
  const out: string[] = [];
  for (let k = 0; k < n; k += 1) {
    const idx = n === 1 ? 0 : Math.round((k * (dates.length - 1)) / (n - 1));
    const date = dates[idx] ?? '';
    let label: string | null;
    if (range === '1M') label = dayMonthLabel(date);
    else if (range === '1Y') {
      const short = monthShort(date);
      const yy = /^\d{2}(\d{2})-/.exec(date)?.[1];
      label = short && yy ? `${short} ${yy}` : short;
    } else label = monthShort(date);
    out.push(label ?? '');
  }
  return out;
}

/** "8 Oct 2026" for the chart's tooltip (null if unreadable). */
export function fullDateLabel(isoDate: string): string | null {
  const day = dayMonthLabel(isoDate);
  const year = /^(\d{4})-/.exec(isoDate)?.[1];
  return day && year ? `${day} ${year}` : null;
}
