import { monotoneTangents, smoothPath, type Pt } from '../curve';

const pts = (ys: number[]): Pt[] => ys.map((y, i) => ({ x: i * 10, y }));

test('a rising series gets non-negative slopes and never overshoots between points', () => {
  const p = pts([0, 1, 1, 8, 9, 30]);
  const m = monotoneTangents(p);
  for (const s of m) expect(s).toBeGreaterThanOrEqual(0);
  // sample the cubic and check it stays inside each segment's range
  for (let i = 0; i < p.length - 1; i++) {
    const h = p[i + 1].x - p[i].x;
    for (let t = 0; t <= 1; t += 0.05) {
      const t2 = t * t, t3 = t2 * t;
      const y = (2 * t3 - 3 * t2 + 1) * p[i].y + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * p[i + 1].y + (t3 - t2) * h * m[i + 1];
      expect(y).toBeGreaterThanOrEqual(Math.min(p[i].y, p[i + 1].y) - 1e-9);
      expect(y).toBeLessThanOrEqual(Math.max(p[i].y, p[i + 1].y) + 1e-9);
    }
  }
});
test('flat stretches stay flat', () => {
  const m = monotoneTangents(pts([5, 5, 5, 9]));
  expect(m[0]).toBe(0);
  expect(m[1]).toBe(0);
});
test('path has one curve segment per gap and handles tiny inputs', () => {
  expect((smoothPath(pts([1, 2, 3, 4])).match(/C/g) ?? []).length).toBe(3);
  expect(smoothPath([])).toBe('');
  expect(smoothPath(pts([3]))).toBe('M0.0,3.0');
  expect(smoothPath(pts([1, 1]))).toContain('C');
});
test('never produces NaN, even with duplicate x or huge values', () => {
  expect(smoothPath([{ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 1e12 }])).not.toMatch(/NaN|Infinity/);
});
