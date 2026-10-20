import { lighten, seasonTheme } from '../theme';

describe('season theme', () => {
  it('changes every month and lightens tiles', () => {
    const oct = seasonTheme(new Date(2026, 9, 20).getTime()), nov = seasonTheme(new Date(2026, 10, 2).getTime());
    expect(oct.base).not.toBe(nov.base);
    expect(oct.name).toBe('October');
    expect(lighten('#000000', 0.5)).toBe('#808080');
  });
});
