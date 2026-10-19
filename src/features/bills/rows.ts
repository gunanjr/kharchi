import type { OcrLine } from './types';

/**
 * OCR engines return text fragments (lines/blocks). A receipt is a table, so one printed row often arrives as
 * several fragments ("PANEER 250.00" + "2" + "500.00"). We rebuild rows from the boxes: fragments whose vertical
 * centres are close belong to the same row; inside a row they are ordered left to right.
 */
export function groupIntoRows(lines: OcrLine[]): string[] {
  const usable = lines.filter((l) => l.text.trim() && l.bottom > l.top);
  if (!usable.length) return [];
  const heights = usable.map((l) => l.bottom - l.top).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)];
  const sorted = [...usable].sort((a, b) => a.top + a.bottom - (b.top + b.bottom));
  const rows: { cy: number; items: OcrLine[] }[] = [];
  for (const l of sorted) {
    const cy = (l.top + l.bottom) / 2;
    const h = l.bottom - l.top;
    const row = rows[rows.length - 1];
    // same row when the centres are within ~55% of the text height (handles slight camera tilt)
    if (row && Math.abs(cy - row.cy) <= Math.max(medianH, h) * 0.55) {
      row.items.push(l);
      row.cy = row.items.reduce((a, x) => a + (x.top + x.bottom) / 2, 0) / row.items.length;
    } else rows.push({ cy, items: [l] });
  }
  return rows.map((r) =>
    r.items
      .sort((a, b) => a.left - b.left)
      .map((x) => x.text.trim().replace(/\s+/g, ' '))
      .join(' '),
  );
}
