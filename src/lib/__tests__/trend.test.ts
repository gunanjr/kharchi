import assert from 'node:assert/strict';

import {
  REVEAL_TOTAL_MS,
  areaPath,
  axisLabels,
  dayMonthLabel,
  clampTooltipLeft,
  curveYAtX,
  describeChange,
  endsAtNetWorth,
  monthShort,
  monthYearLabel,
  nearestPointIndex,
  organicLinePath,
  revealPaths,
  revealState,
  sampleCurve,
  valueFromY,
  scaleSeries,
  smoothLinePath,
  trendRange,
} from '../trend';

const PAD = { left: 4, right: 4, top: 10, bottom: 10 };
const at = <T>(list: readonly T[], i: number): T => list[i] as T;
const rupees = (paise: string): string => `₹${Number(paise) / 100}`;

describe('scaleSeries', () => {
  it('puts the oldest value at the left and the largest at the top', () => {
    const pts = scaleSeries([10, 20, 15, 30], 104, 60, PAD);
    assert.equal(at(pts, 0).x, 4);
    assert.equal(at(pts, 3).x, 100);
    assert.equal(at(pts, 3).y, 10);
    assert.equal(at(pts, 0).y, 10 + (1 - 0) * 40);
  });

  it('draws a flat series mid-height instead of dividing by zero', () => {
    for (const p of scaleSeries([5, 5, 5], 100, 60, PAD)) assert.equal(p.y, 30);
  });

  it('handles empty and single-value series', () => {
    assert.deepEqual(scaleSeries([], 100, 60, PAD), []);
    assert.equal(scaleSeries([7], 100, 60, PAD).length, 1);
  });

  it('keeps every point inside the box', () => {
    for (const p of scaleSeries([1, 9, 3, 7, 5, 8], 90, 50, PAD)) {
      assert.ok(p.x >= PAD.left && p.x <= 90 - PAD.right);
      assert.ok(p.y >= PAD.top && p.y <= 50 - PAD.bottom);
    }
  });
});

describe('smoothLinePath', () => {
  const pts = scaleSeries([10, 14, 13, 18, 22], 200, 80, PAD);
  const d = smoothLinePath(pts);

  it('starts at the first point and ends at the last', () => {
    assert.match(d, /^M4 /);
    assert.ok(d.endsWith(`${at(pts, 4).x} ${at(pts, 4).y}`));
  });

  it('has one cubic segment per interval and no NaN', () => {
    assert.equal((d.match(/C/g) ?? []).length, 4);
    assert.doesNotMatch(d, /NaN|Infinity/);
  });

  it('never overshoots: control points stay between neighbouring y values', () => {
    const nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
    const ys = pts.map((p: { y: number }) => p.y);
    const [lo, hi] = [Math.min(...ys), Math.max(...ys)];
    for (let i = 1; i < nums.length; i += 2) {
      const y = at(nums, i);
      assert.ok(y >= lo - 0.01 && y <= hi + 0.01, `y ${y} outside ${lo}..${hi}`);
    }
  });

  it('copes with one point, none, and a flat line', () => {
    assert.equal(smoothLinePath([]), '');
    assert.match(smoothLinePath([{ x: 1, y: 2 }]), /^M1 2$/);
    assert.doesNotMatch(smoothLinePath(scaleSeries([3, 3, 3], 100, 50, PAD)), /NaN/);
  });
});

describe('areaPath', () => {
  it('closes the line down to the baseline', () => {
    const pts = scaleSeries([1, 2, 3], 100, 50, PAD);
    const area = areaPath(smoothLinePath(pts), pts, 50);
    assert.ok(area.endsWith('Z'));
    assert.match(area, /L96 50 L4 50 Z$/);
    assert.equal(areaPath('', pts.slice(0, 1), 50), '');
  });
});

describe('describeChange', () => {
  it('formats a rise with amount and percent', () => {
    assert.deepEqual(describeChange({ amountPaise: '5519400', percent: 4.24 }, rupees), {
      text: '+₹55194 (4.24%) vs last month',
      direction: 'up',
    });
  });

  it('formats a fall with a minus', () => {
    assert.deepEqual(describeChange({ amountPaise: '-100000', percent: -1.5 }, rupees), {
      text: '-₹1000 (1.50%) vs last month',
      direction: 'down',
    });
  });

  it('says so plainly when nothing changed — not "+₹0"', () => {
    assert.deepEqual(describeChange({ amountPaise: '0', percent: 0 }, rupees), {
      text: 'No change vs last month',
      direction: 'flat',
    });
  });

  it('drops the percent when the backend has none', () => {
    assert.equal(describeChange({ amountPaise: '500', percent: null }, rupees)?.text, '+₹5 vs last month');
  });

  it('shows nothing for an unreadable amount or an unformattable one', () => {
    assert.equal(describeChange({ amountPaise: 'abc', percent: 1 }, rupees), null);
    assert.equal(describeChange({ amountPaise: '500', percent: 1 }, () => null), null);
  });
});

describe('month labels', () => {
  it('reads the month from the date string', () => {
    assert.equal(monthShort('2026-04-30'), 'Apr');
    assert.equal(monthShort('2026-12-01'), 'Dec');
    assert.equal(monthShort('nope'), null);
    assert.equal(trendRange('2026-04-30', '2026-10-07'), 'Apr to Oct');
    assert.equal(trendRange('x', '2026-10-07'), null);
  });
});

describe('endsAtNetWorth', () => {
  it('requires the last point to equal the headline net worth exactly', () => {
    const points = [{ valuePaise: '100' }, { valuePaise: '135734400' }];
    assert.equal(endsAtNetWorth(points, '135734400'), true);
    assert.equal(endsAtNetWorth(points, '135734401'), false);
    assert.equal(endsAtNetWorth(points, null), false);
    assert.equal(endsAtNetWorth([], '1'), false);
  });
});

describe('organicLinePath', () => {
  const pts = scaleSeries([10, 14, 13, 18, 22, 21, 27], 300, 100, PAD);
  const d = organicLinePath(pts);

  it('passes through the first and last point, one cubic per interval', () => {
    assert.match(d, /^M4 /);
    assert.ok(d.endsWith(`${at(pts, 6).x} ${at(pts, 6).y}`));
    assert.equal((d.match(/C/g) ?? []).length, 6);
    assert.doesNotMatch(d, /NaN|Infinity/);
  });

  it('never leaves the data range vertically', () => {
    const ys = pts.map((p: { y: number }) => p.y);
    const [lo, hi] = [Math.min(...ys), Math.max(...ys)];
    const nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
    for (let i = 1; i < nums.length; i += 2) {
      const y = at(nums, i);
      assert.ok(y >= lo - 0.01 && y <= hi + 0.01, `y ${y} outside ${lo}..${hi}`);
    }
  });

  it('is genuinely curved, not a polyline: control points are not on the chord', () => {
    const nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
    // second segment: from point 1 to point 2; its first control point is nums[8], nums[9]
    const [x1, y1, x2, y2] = [at(pts, 1).x, at(pts, 1).y, at(pts, 2).x, at(pts, 2).y];
    const cx = at(nums, 8);
    const cy = at(nums, 9);
    const t = (cx - x1) / (x2 - x1);
    assert.ok(Math.abs(cy - (y1 + t * (y2 - y1))) > 0.2);
  });

  it('copes with none, one and a flat series', () => {
    assert.equal(organicLinePath([]), '');
    assert.match(organicLinePath([{ x: 1, y: 2 }]), /^M1 2$/);
    assert.doesNotMatch(organicLinePath(scaleSeries([3, 3, 3], 100, 50, PAD)), /NaN/);
  });
});

describe('selection helpers', () => {
  it('finds the nearest point to a touch', () => {
    const pts = scaleSeries([1, 2, 3, 4], 100, 50, { left: 0, right: 0, top: 0, bottom: 0 });
    assert.equal(nearestPointIndex(pts, -20), 0);
    assert.equal(nearestPointIndex(pts, 49), 1);
    assert.equal(nearestPointIndex(pts, 52), 2);
    assert.equal(nearestPointIndex(pts, 400), 3);
    assert.equal(nearestPointIndex([], 5), -1);
  });

  it('labels the month and year from the date string', () => {
    assert.equal(monthYearLabel('2026-09-30'), 'Sep 2026');
    assert.equal(monthYearLabel('2026-10-08'), 'Oct 2026');
    assert.equal(monthYearLabel('bad'), null);
  });

  it('keeps the tooltip inside the chart', () => {
    assert.equal(clampTooltipLeft(5, 96, 300), 0);
    assert.equal(clampTooltipLeft(150, 96, 300), 102);
    assert.equal(clampTooltipLeft(299, 96, 300), 204);
  });
});

describe('revealState', () => {
  it('starts empty, finishes drawn, and only pulses after the line is nearly done', () => {
    const start = revealState(0);
    assert.deepEqual([start.draw, start.dot, start.pulse], [0, 0, 0]);
    const end = revealState(REVEAL_TOTAL_MS);
    assert.equal(end.draw, 1);
    assert.equal(end.dot, 1);
    assert.ok(end.pulse < 1e-9);
    assert.equal(revealState(400).pulse, 0);
    assert.ok(revealState(1050).pulse > 0.9);
  });

  it('draws monotonically left to right', () => {
    let last = -1;
    for (let t = 0; t <= 900; t += 50) {
      const { draw } = revealState(t);
      assert.ok(draw >= last);
      last = draw;
    }
  });
});

describe('sampleCurve and the in-between value', () => {
  const values = [100, 140, 130, 180, 220, 210, 270];
  const pad = { left: 4, right: 16, top: 16, bottom: 4 };
  const pts = scaleSeries(values, 300, 100, pad);
  const samples = sampleCurve(pts, 24);

  it('is dense, strictly increasing in x, and passes through every checkpoint', () => {
    assert.equal(samples.length, 6 * 24 + 1);
    for (let i = 1; i < samples.length; i += 1) assert.ok(at(samples, i).x > at(samples, i - 1).x);
    pts.forEach((p: { x: number; y: number }, i: number) => {
      const s = at(samples, i * 24);
      assert.ok(Math.abs(s.x - p.x) < 1e-6 && Math.abs(s.y - p.y) < 1e-6);
    });
  });

  it('reads the curve and maps it back to the real value at every checkpoint', () => {
    pts.forEach((p: { x: number; y: number }, i: number) => {
      const y = curveYAtX(samples, p.x);
      assert.ok(y !== null);
      const v = valueFromY(y as number, values, 100, pad);
      assert.ok(Math.abs((v as number) - at(values, i)) < 1e-6, `checkpoint ${i}: ${v}`);
    });
  });

  it('gives a value between neighbouring checkpoints when between them', () => {
    const mid = (at(pts, 5).x + at(pts, 6).x) / 2;
    const v = valueFromY(curveYAtX(samples, mid) as number, values, 100, pad) as number;
    assert.ok(v > Math.min(at(values, 5), at(values, 6)) - 1 && v < Math.max(at(values, 5), at(values, 6)) + 1);
    assert.ok(v !== at(values, 5) && v !== at(values, 6));
  });

  it('never leaves the real range and clamps outside the chart', () => {
    for (let x = -50; x <= 400; x += 7) {
      const v = valueFromY(curveYAtX(samples, x) as number, values, 100, pad) as number;
      assert.ok(v >= 100 - 1e-6 && v <= 270 + 1e-6);
    }
    assert.equal(curveYAtX(samples, 9999), at(samples, samples.length - 1).y);
    assert.equal(curveYAtX([], 3), null);
  });

  it('handles a flat series without dividing by zero', () => {
    assert.equal(valueFromY(30, [5, 5, 5], 100, pad), 5);
    assert.equal(valueFromY(30, [], 100, pad), null);
  });
});

describe('revealPaths', () => {
  const pts = scaleSeries([1, 3, 2, 5, 4, 6, 8], 300, 100, { left: 4, right: 16, top: 16, bottom: 4 });
  const samples = sampleCurve(pts, 24);

  it('draws nothing at zero and the whole curve at the end', () => {
    assert.equal(revealPaths(samples, 0, 100).line, '');
    const all = revealPaths(samples, at(samples, samples.length - 1).x, 100);
    assert.equal((all.line.match(/L/g) ?? []).length, samples.length - 1);
    assert.ok(all.area.endsWith('Z'));
  });

  it('stops exactly at the requested x, partway through', () => {
    const { line } = revealPaths(samples, 120, 100);
    const last = line.split(' L').pop() as string;
    assert.equal(Number(last.split(' ')[0]), 120);
  });
});


describe('axisLabels', () => {
  const dates = Array.from({ length: 31 }, (_, i) => `2026-09-${String(8 + i).padStart(2, '0')}`).map((d) => {
    const day = Number(d.slice(8));
    return day > 30 ? `2026-10-${String(day - 30).padStart(2, '0')}` : d;
  });
  it('uses days over a month', () => {
    const labels = axisLabels(dates, '1M');
    assert.equal(labels.length, 5);
    assert.equal(labels[0], '8 Sep');
    assert.equal(labels[4], '8 Oct');
  });
  it('uses months over longer frames and adds the year for a year', () => {
    assert.deepEqual(axisLabels(['2026-04-11', '2026-07-10', '2026-10-08'], '6M', 3), ['Apr', 'Jul', 'Oct']);
    assert.deepEqual(axisLabels(['2025-10-09', '2026-10-08'], '1Y', 2), ['Oct 25', 'Oct 26']);
  });
  it('formats a day', () => {
    assert.equal(dayMonthLabel('2026-09-08'), '8 Sep');
    assert.equal(dayMonthLabel('nope'), null);
  });
});

describe('describeChange versus label', () => {
  const fmt = (p: string): string => `₹${p}`;
  it('names what the change is measured against', () => {
    assert.equal(describeChange({ amountPaise: '500', percent: 5 }, fmt, '6 months ago')?.text, '+₹500 (5.00%) vs 6 months ago');
    assert.equal(describeChange({ amountPaise: '0', percent: 0 }, fmt, 'last year')?.text, 'No change vs last year');
  });
  it('still says last month by default', () => {
    assert.equal(describeChange({ amountPaise: '-500', percent: -5 }, fmt)?.text, '-₹500 (5.00%) vs last month');
  });
});
