/**
 * The Pro tab changes colour every month, like a store's festive theme, so it feels new each season. Flat colours only.
 * `base` is the page, `tile`/`tile2` are surfaces, `accent` is the highlight. White ink reads on every base.
 */
export interface SeasonTheme { name: string; base: string; tile: string; tile2: string; accent: string; ink: string; soft: string; line: string }

const BASES: [string, string][] = [
  ['#0F2340', '#FFB547'], // Jan: night navy, marigold
  ['#3A0F2E', '#FF8AC4'], // Feb: plum, pink
  ['#0F2F25', '#C6F432'], // Mar: forest, lime
  ['#3B1D0B', '#FFB547'], // Apr: cocoa, marigold
  ['#0B2E36', '#5BF0B8'], // May: deep teal, mint
  ['#1A1F3B', '#7FD3FF'], // Jun: monsoon slate, sky
  ['#0E2A1C', '#C6F432'], // Jul: rain green, lime
  ['#2E1A0B', '#FFE14D'], // Aug: earth, sun
  ['#14213D', '#FFB547'], // Sep: ink blue, marigold
  ['#3A0D12', '#FFC940'], // Oct: festive maroon, gold
  ['#2B1240', '#FFB547'], // Nov: festival purple, marigold
  ['#0D2238', '#7FD3FF'], // Dec: winter blue, ice
];

/** Mix a hex colour with white by `amt` (0..1). */
export function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v + (255 - v) * amt);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

export function seasonTheme(now: number): SeasonTheme {
  const d = new Date(now);
  const [base, accent] = BASES[d.getMonth()];
  return {
    name: d.toLocaleDateString('en-IN', { month: 'long' }),
    base, tile: lighten(base, 0.07), tile2: lighten(base, 0.14), accent,
    ink: '#FFFFFF', soft: 'rgba(255,255,255,0.62)', line: 'rgba(255,255,255,0.1)',
  };
}

/** Flat colours for the tool "store" cards, one each, so the rail reads like a row of shop fronts. */
export const TOOL_COLORS: Record<string, string> = {
  vault: '#1460FF', dues: '#0C9C74', warranty: '#4B1FD1', spaces: '#FF2E7E', radar: '#FF6A00', reimburse: '#0A7EA4', tax: '#5B6573', deepdive: '#8B5CFF', wrappedYear: '#E0A400', bruh: '#C2185B', challenges: '#FF8106',
};
