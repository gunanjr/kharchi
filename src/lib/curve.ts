export interface Pt { x: number; y: number }

/**
 * Slopes for a monotone cubic through the points (Fritsch-Carlson). Unlike a plain smooth curve it never overshoots:
 * between two points the line stays between their heights, so a running total never appears to dip.
 */
export function monotoneTangents(p: Pt[]): number[] {
  const n = p.length;
  if (n < 2) return new Array(n).fill(0);
  const d = p.slice(1).map((q, i) => (q.x === p[i].x ? 0 : (q.y - p[i].y) / (q.x - p[i].x)));
  const m = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return m;
}

/** SVG path through the points as a smooth monotone curve. */
export function smoothPath(p: Pt[]): string {
  if (!p.length) return '';
  if (p.length === 1) return `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  const m = monotoneTangents(p);
  let out = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const dx = (p[i + 1].x - p[i].x) / 3;
    out += ` C${(p[i].x + dx).toFixed(1)},${(p[i].y + m[i] * dx).toFixed(1)} ${(p[i + 1].x - dx).toFixed(1)},${(p[i + 1].y - m[i + 1] * dx).toFixed(1)} ${p[i + 1].x.toFixed(1)},${p[i + 1].y.toFixed(1)}`;
  }
  return out;
}
