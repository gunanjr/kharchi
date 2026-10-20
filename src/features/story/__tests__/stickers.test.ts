import { dayTrack, runLength, monthLines, monthCells, worthSharing } from '../stickers';

const NOW = new Date(2026, 9, 20, 18).getTime();
const at = (m: number, d: number, amount = 10000, type: 'expense' | 'income' = 'expense') => ({ type, amount, occurred_at: new Date(2026, m, d, 12).getTime() });

describe('story stickers', () => {
  it('tracks logged days and the run ending today or yesterday', () => {
    const txs = [at(9, 18), at(9, 19), at(9, 20), at(9, 15)];
    const t = dayTrack(txs, NOW, 7);
    expect(t).toEqual([false, true, false, false, true, true, true]);
    expect(runLength(t)).toBe(3);
    expect(runLength([true, true, false])).toBe(2); // nothing today yet: counts up to yesterday
  });
  it('compares this month so far with the same days last month', () => {
    const txs = [at(8, 5, 100000), at(8, 25, 500000), at(9, 5, 50000)];
    const l = monthLines(txs, NOW);
    expect(l.cur).toHaveLength(20);
    expect(l.prev).toHaveLength(30);
    expect(l.pct).toBe(-50);
    expect(Math.max(...l.cur, ...l.prev)).toBe(1);
    expect(l.prevLabel).toBe('Sept');
  });
  it('marks no-spend, spend, empty and future days', () => {
    const txs = [at(9, 1), at(9, 2, 5000, 'income'), at(9, 3, 0)];
    const c = monthCells(txs, NOW);
    expect(c.cells.slice(0, 4)).toEqual(['spend', 'nospend', 'nospend', 'empty']);
    expect(c.cells[25]).toBe('future');
    expect(c.noSpend).toBe(2);
  });
  it('offers only stickers worth showing off, aura always', () => {
    expect(worthSharing([], NOW)).toEqual(['aura']);
    const streak = [at(9, 18), at(9, 19), at(9, 20)];
    expect(worthSharing(streak, NOW)).toContain('streak');
  });
});
